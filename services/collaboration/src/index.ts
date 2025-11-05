import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { TextOperation } from 'ot';
import fs from 'fs';
import path from 'path';

export class CollaborationServer {
  private app = express();
  private server = http.createServer(this.app);
  private io = new Server(this.server);
  private documents: Record<string, { text: string; operations: TextOperation[]; history: string[] }> = {};
  private users: Record<string, { id: string; name: string }[]> = {};

  constructor(private port: number = 3005) {
    this.setupSocket();
  }

  private setupSocket() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('join_workflow', (workflowId: string, userName: string) => {
        socket.join(workflowId);
        console.log(`User ${socket.id} joined workflow ${workflowId}`);

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
        const operation = TextOperation.fromJSON(operationJson);
        const doc = this.documents[workflowId];

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
        console.log('User disconnected:', socket.id);
        
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
      console.log(`Collaboration server running on port ${this.port}`);
    });
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new CollaborationServer();
  server.start();
}

export { CollaborationServer };
