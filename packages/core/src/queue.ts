import { Queue as BullQueue, Worker } from 'bullmq';

export class Queue {
  private queue: BullQueue;

  constructor() {
    this.queue = new BullQueue('workflow-queue');
  }

  async enqueue(workflowId: string, data: any) {
    return this.queue.add(workflowId, data);
  }

  process(processor: (job: any) => Promise<any>) {
    new Worker(this.queue.name, processor);
  }
}
