import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { GracePeriodService } from './grace-period.service';

@Injectable()
export class GracePeriodCron {
  constructor(private readonly gracePeriodService: GracePeriodService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDaily() {
    await this.gracePeriodService.processExpiredGracePeriods();
  }
}
