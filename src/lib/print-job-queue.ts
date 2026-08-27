type JobStatus = 'pending' | 'running' | 'done' | 'failed';

interface PrintJob<T = unknown> {
  id: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

interface PrintQueueOptions<T = unknown> {
  concurrency: number;
  maxAttempts: number;
  onRun: (job: PrintJob<T>) => Promise<void>;
  onError?: (job: PrintJob<T>, error: Error) => void;
}

export class PrintJobQueue<T = unknown> {
  private queue: PrintJob<T>[] = [];
  private running = 0;
  private options: Required<Pick<PrintQueueOptions<T>, 'onError'>> &
    Omit<PrintQueueOptions<T>, 'onError'>;

  constructor(options: PrintQueueOptions<T>) {
    this.options = {
      concurrency: options.concurrency ?? 2,
      maxAttempts: options.maxAttempts ?? 3,
      onRun: options.onRun,
      onError: options.onError ?? (() => {}),
    };
  }

  enqueue(payload: T): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: PrintJob<T> = {
      id,
      payload,
      status: 'pending',
      attempts: 0,
      maxAttempts: this.options.maxAttempts,
      createdAt: Date.now(),
    };
    this.queue.push(job);
    this.drain();
    return id;
  }

  enqueueBatch(payloads: T[]): string[] {
    return payloads.map((p) => this.enqueue(p));
  }

  private async drain() {
    while (this.running < this.options.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.running++;
      job.status = 'running';
      job.attempts += 1;
      job.startedAt = Date.now();

      try {
        await this.options.onRun(job);
        job.status = 'done';
        job.finishedAt = Date.now();
      } catch (error) {
        job.error = (error as Error).message;
        if (job.attempts < job.maxAttempts) {
          job.status = 'pending';
          this.queue.push(job);
        } else {
          job.status = 'failed';
          job.finishedAt = Date.now();
          this.options.onError(job, error as Error);
        }
      } finally {
        this.running--;
        this.drain();
      }
    }
  }

  get pending() {
    return this.queue.filter((j) => j.status === 'pending').length;
  }

  get runningCount() {
    return this.running;
  }

  get stats() {
    const all = this.queue;
    return {
      pending: all.filter((j) => j.status === 'pending').length,
      running: this.running,
      failed: all.filter((j) => j.status === 'failed').length,
      total: all.length,
    };
  }

  reset() {
    this.queue = [];
    this.running = 0;
  }
}

export const labelPrintQueue = new PrintJobQueue<unknown>({
  concurrency: 2,
  maxAttempts: 3,
  onRun: async (job) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  },
  onError(job: PrintJob<unknown>, error: Error) {
    console.error(`[PrintQueue] job=${job.id} failed:`, error.message);
  },
});
