import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { TextOperation } from 'ot';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export class CollaborationServer {
  private app = express();
  private server = http.createServer(this.app);
  private io = new Server(this.server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });
  private documents: Record<string, { text: string; operations: TextOperation[]; history: string[] }> = {};
  private users: Record<string, { id: string; name: string }[]> = {};

  constructor(private port: number = 3005) {
    this.setupMiddleware();
    this.setupSocket();
  }

  private setupMiddleware() {
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        service: 'collaboration',
        documents: Object.keys(this.documents).length,
        activeConnections: this.io.sockets.sockets.size,
      });
    });
  }

  private setupSocket() {
    this.io.on('connection', (socket) => {
      logger.info('User connected', { socketId: socket.id });

      socket.on('join_workflow', (workflowId: string, userName: string) => {
        socket.join(workflowId);
        logger.info('User joined workflow', { socketId: socket.id, workflowId, userName });

        // Initialize document if not exists
        if (!this.documents[workflowId]) {
          this.documents[workflowId] = {
            text: '',
            operations: [],
            history: []
          };
        }

        // Add user to presence list
        if (!this.users[workflowId]) {
          this.users[workflowId] = [];
        }
        this.users[workflowId].push({ id: socket.id, name: userName });
        
        // Send current document state to new user
        socket.emit('workflow_state', this.documents[workflowId].text);
        
        // Broadcast updated user list
        this.io.to(workflowId).emit('presence_update', this.users[workflowId]);
      });

      socket.on('workflow_operation', (workflowId: string, operationJson: any) => {
        try {
          const operation = TextOperation.fromJSON(operationJson);
          const doc = this.documents[workflowId];

          if (!doc) {
            logger.warn('Operation on non-existent document', { workflowId });
            return;
          }

          // Transform operation against pending operations
          const transformedOp = TextOperation.transform(operation, ...doc.operations);
          
          // Apply operation to document
          const newContent = transformedOp.apply(doc.text);
          
          // Save snapshot every 10 operations
          if (doc.operations.length % 10 === 0) {
            doc.history.push(doc.text);
          }
          
          doc.text = newContent;
          doc.operations.push(transformedOp);

          // Broadcast transformed operation to other clients
          socket.to(workflowId).emit('workflow_operation', transformedOp.toJSON());
        } catch (error) {
          logger.error('Error processing workflow operation', { error, workflowId });
          socket.emit('error', { message: 'Failed to process operation' });
        }
      });

      socket.on('request_history', (workflowId: string) => {
        if (this.documents[workflowId]) {
          socket.emit('workflow_history', this.documents[workflowId].history);
        }
      });

      socket.on('restore_version', (workflowId: string, versionIndex: number) => {
        if (this.documents[workflowId] && this.documents[workflowId].history[versionIndex]) {
          const content = this.documents[workflowId].history[versionIndex];
          this.documents[workflowId].text = content;
          this.io.to(workflowId).emit('workflow_restore', content);
        }
      });

      socket.on('disconnect', () => {
        logger.info('User disconnected', { socketId: socket.id });
        
        // Remove user from all presence lists
        Object.keys(this.users).forEach(workflowId => {
          this.users[workflowId] = this.users[workflowId].filter(user => user.id !== socket.id);
          this.io.to(workflowId).emit('presence_update', this.users[workflowId]);
        });
      });
    });
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`Collaboration server running on port ${this.port}`);
    });
  }

  stop() {
    this.server.close(() => {
      logger.info('Collaboration server stopped');
    });
  }
}

// Start the server if this file is run directly
const port = Number(process.env.PORT || 3005);
const server = new CollaborationServer(port);
server.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.stop();
  process.exit(0);
});

export { CollaborationServer };
