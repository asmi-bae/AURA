import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createWorker, Worker } from 'mediasoup';
import { createLogger } from '@aura/utils';
import Redis from 'ioredis';

const logger = createLogger();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const port = Number(process.env.PORT || 3006);
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
});

// MediaSoup workers
const workers: Worker[] = [];
const workersMap = new Map<string, Worker>();

// Initialize MediaSoup workers
async function initializeWorkers() {
  const numWorkers = Number(process.env.MEDIASOUP_NUM_WORKERS || 1);
  
  for (let i = 0; i < numWorkers; i++) {
    const worker = await createWorker({
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    worker.on('died', () => {
      logger.error('MediaSoup worker died', { pid: worker.pid });
      process.exit(1);
    });

    workers.push(worker);
  }

  logger.info(`Initialized ${workers.length} MediaSoup workers`);
}

// Round-robin worker selection
function getWorker(sessionId: string): Worker {
  const index = sessionId.length % workers.length;
  return workers[index];
}

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
    // Cleanup MediaSoup resources
    const worker = workersMap.get(socket.id);
    if (worker) {
      workersMap.delete(socket.id);
    }
  });

  // WebRTC signaling for voice/video
  socket.on('create-transport', async (data: { sessionId: string; direction: 'send' | 'recv' }) => {
    try {
      const worker = getWorker(data.sessionId);
      const router = await worker.createRouter({
        mediaCodecs: [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2,
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
          },
        ],
      });

      const transport = await router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });

      socket.emit('transport-created', {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });

      transport.on('connect', async ({ dtlsParameters }, callback) => {
        try {
          await transport.connect({ dtlsParameters });
          callback();
        } catch (error) {
          callback(error);
        }
      });

      transport.on('produce', async ({ kind, rtpParameters }, callback) => {
        try {
          const producer = await transport.produce({ kind, rtpParameters });
          callback(null, { id: producer.id });
          socket.emit('producer-created', { id: producer.id, kind });
        } catch (error) {
          callback(error);
        }
      });
    } catch (error) {
      logger.error('Error creating transport', { error });
      socket.emit('error', { message: 'Failed to create transport' });
    }
  });

  // Screen sharing
  socket.on('start-screen-share', async (data: { sessionId: string }) => {
    try {
      const worker = getWorker(data.sessionId);
      // Create producer for screen sharing
      socket.emit('screen-share-started', { sessionId: data.sessionId });
    } catch (error) {
      logger.error('Error starting screen share', { error });
      socket.emit('error', { message: 'Failed to start screen share' });
    }
  });

  // Voice streaming
  socket.on('start-voice-stream', async (data: { sessionId: string }) => {
    try {
      const worker = getWorker(data.sessionId);
      // Create producer for voice streaming
      socket.emit('voice-stream-started', { sessionId: data.sessionId });
    } catch (error) {
      logger.error('Error starting voice stream', { error });
      socket.emit('error', { message: 'Failed to start voice stream' });
    }
  });

  // Redis pub/sub for multi-agent coordination
  socket.on('subscribe', async (channel: string) => {
    const subscriber = redis.duplicate();
    await subscriber.subscribe(channel);

    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        socket.emit('message', {
          channel: ch,
          data: JSON.parse(message),
        });
      }
    });

    socket.on('disconnect', () => {
      subscriber.unsubscribe();
      subscriber.quit();
    });
  });

  socket.on('publish', async (data: { channel: string; message: any }) => {
    await redis.publish(data.channel, JSON.stringify(data.message));
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'realtime', workers: workers.length });
});

// Start server
async function start() {
  await initializeWorkers();
  
  server.listen(port, () => {
    logger.info(`Realtime service running on port ${port}`);
  });
}

start().catch((error) => {
  logger.error('Error starting realtime service', { error });
  process.exit(1);
});

