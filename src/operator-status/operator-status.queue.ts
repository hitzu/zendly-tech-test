import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import {
  OperatorAvailability,
  OperatorStatus,
} from './entities/operator-status.entity';
import { OperatorStatusService } from './operator-status.service';

type OperatorStatusJob = {
  tenantId: number;
  operatorId: number;
  status?: OperatorAvailability;
  attempts: number;
};

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

/**
 * Very small in-memory queue to set operator status asynchronously without external brokers.
 * This is best-effort and non-durable: jobs are lost on process restart.
 */
@Injectable()
export class OperatorStatusQueue implements OnModuleInit {
  private readonly logger = new Logger(OperatorStatusQueue.name);
  private readonly queue: OperatorStatusJob[] = [];
  private running = false;

  constructor(private readonly operatorStatusService: OperatorStatusService) {}

  onModuleInit(): void {
    // Kick the loop in case something enqueues during bootstrap.
    this.runLoop();
  }

  enqueue(
    tenantId: number,
    operatorId: number,
    status: OperatorAvailability = OperatorAvailability.OFFLINE,
  ): void {
    this.queue.push({ tenantId, operatorId, status, attempts: 0 });
    this.runLoop();
  }

  private runLoop(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    void this.processQueue().finally(() => {
      this.running = false;
      if (this.queue.length) {
        // New jobs arrived while processing; continue.
        this.runLoop();
      }
    });
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length) {
      const job = this.queue.shift()!;
      try {
        await this.handleJob(job);
      } catch (error) {
        this.logger.error(
          {
            tenantId: job.tenantId,
            operatorId: job.operatorId,
            attempts: job.attempts,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed processing operator status job',
        );

        if (job.attempts + 1 >= MAX_ATTEMPTS) {
          continue;
        }

        const retryJob: OperatorStatusJob = {
          ...job,
          attempts: job.attempts + 1,
        };
        const backoffMs = BASE_BACKOFF_MS * (retryJob.attempts + 1);
        setTimeout(() => {
          this.queue.push(retryJob);
          this.runLoop();
        }, backoffMs);
      }
    }
  }

  private async handleJob(job: OperatorStatusJob): Promise<OperatorStatus> {
    const status = job.status ?? OperatorAvailability.OFFLINE;
    this.logger.debug(
      {
        tenantId: job.tenantId,
        operatorId: job.operatorId,
        status,
        attempts: job.attempts,
      },
      'Processing operator status job',
    );

    return this.operatorStatusService.setStatus(
      job.tenantId,
      job.operatorId,
      status,
    );
  }
}
