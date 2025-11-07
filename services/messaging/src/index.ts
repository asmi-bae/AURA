import express from 'express';
import { createServer } from 'http';
import { WebSocketChannel } from './channels/websocket';
import { DiscordChannel } from './channels/discord';
import { TelegramChannel } from './channels/telegram';
import { EmailChannel } from './channels/email';
import { createLogger } from '@aura/utils';
// Config initialization - optional
// import { initConfig } from '@aura/config';
import { ServiceRegistration } from '@aura/core';

const logger = createLogger();
const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3009;

// Initialize configuration (optional)
// initConfig();

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'messaging-service',
  name: 'Messaging Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Multi-channel messaging service',
  },
});

app.use(express.json());

// Initialize channels
const wsChannel = new WebSocketChannel({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  },
});
wsChannel.initialize(httpServer);

const discordChannel = process.env.DISCORD_TOKEN
  ? new DiscordChannel({ token: process.env.DISCORD_TOKEN })
  : null;

const telegramChannel = process.env.TELEGRAM_TOKEN
  ? new TelegramChannel({ token: process.env.TELEGRAM_TOKEN })
  : null;

const emailChannel = process.env.SMTP_HOST
  ? new EmailChannel({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.SMTP_FROM,
    })
  : null;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'messaging',
    channels: {
      websocket: true,
      discord: !!discordChannel,
      telegram: !!telegramChannel,
      email: !!emailChannel,
    },
  });
});

// Send message via WebSocket
app.post('/channels/websocket/send', (req, res) => {
  try {
    const { channel, message, clientId } = req.body;
    
    if (clientId) {
      wsChannel.sendToClient(clientId, message);
    } else if (channel) {
      wsChannel.sendToChannel(channel, message);
    } else {
      wsChannel.broadcast(message);
    }
    
    res.json({ message: 'Message sent' });
  } catch (error) {
    logger.error('Error sending WebSocket message', { error });
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Send message via Discord
app.post('/channels/discord/send', async (req, res) => {
  try {
    if (!discordChannel) {
      return res.status(503).json({ error: 'Discord channel not configured' });
    }

    const { channelId, content } = req.body;
    
    if (!channelId || !content) {
      return res.status(400).json({ error: 'channelId and content are required' });
    }

    await discordChannel.sendToChannel(channelId, content);
    res.json({ message: 'Message sent to Discord' });
  } catch (error) {
    logger.error('Error sending Discord message', { error });
    res.status(500).json({ 
      error: 'Failed to send Discord message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send message via Telegram
app.post('/channels/telegram/send', async (req, res) => {
  try {
    if (!telegramChannel) {
      return res.status(503).json({ error: 'Telegram channel not configured' });
    }

    const { chatId, message } = req.body;
    
    if (!chatId || !message) {
      return res.status(400).json({ error: 'chatId and message are required' });
    }

    await telegramChannel.sendToChat(chatId, message);
    res.json({ message: 'Message sent to Telegram' });
  } catch (error) {
    logger.error('Error sending Telegram message', { error });
    res.status(500).json({ 
      error: 'Failed to send Telegram message',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Send email
app.post('/channels/email/send', async (req, res) => {
  try {
    if (!emailChannel) {
      return res.status(503).json({ error: 'Email channel not configured' });
    }

    const { to, subject, text, html, attachments } = req.body;
    
    if (!to || !subject) {
      return res.status(400).json({ error: 'to and subject are required' });
    }

    await emailChannel.send({ to, subject, text, html, attachments });
    res.json({ message: 'Email sent' });
  } catch (error) {
    logger.error('Error sending email', { error });
    res.status(500).json({ 
      error: 'Failed to send email',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get WebSocket connection count
app.get('/channels/websocket/stats', (req, res) => {
  res.json({
    connectedClients: wsChannel.getConnectedCount(),
  });
});

// Connect external channels on startup
(async () => {
  if (discordChannel) {
    try {
      await discordChannel.connect();
    } catch (error) {
      logger.error('Failed to connect Discord channel', { error });
    }
  }

  if (telegramChannel) {
    try {
      await telegramChannel.connect();
    } catch (error) {
      logger.error('Failed to connect Telegram channel', { error });
    }
  }

  if (emailChannel) {
    try {
      const verified = await emailChannel.verify();
      if (!verified) {
        logger.warn('Email configuration verification failed');
      }
    } catch (error) {
      logger.error('Email verification error', { error });
    }
  }
})();

// Start server
httpServer.listen(port, async () => {
  logger.info(`Messaging service running on port ${port}`);
  
  // Register with registry service
  await serviceRegistration.register();
  serviceRegistration.setupGracefulShutdown();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await serviceRegistration.unregister();
  
  if (discordChannel) {
    await discordChannel.disconnect();
  }
  
  if (telegramChannel) {
    await telegramChannel.disconnect();
  }
  
  httpServer.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await serviceRegistration.unregister();
  
  if (discordChannel) {
    await discordChannel.disconnect();
  }
  
  if (telegramChannel) {
    await telegramChannel.disconnect();
  }
  
  httpServer.close(() => {
    process.exit(0);
  });
});
