import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { GracePeriodService } from './grace-period.service';

@Injectable()
export class GracePeriodScheduler {
  constructor(private readonly gracePeriodService: GracePeriodService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleExpiredGracePeriods(): Promise<void> {
    await this.gracePeriodService.processExpiredGracePeriods();
  }
}

