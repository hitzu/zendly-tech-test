import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { GracePeriodController } from './grace-period.controller';
import { GracePeriodService } from './grace-period.service';
import { GracePeriodAssignment } from './entities/grace-period-assignment.entity';
import { OperatorStatus } from './entities/operator-status.entity';
import { OperatorStatusController } from './operator-status.controller';
import { OperatorStatusService } from './operator-status.service';
import { ScheduleModule } from '@nestjs/schedule';
import { Operator } from '../operators/entities/operator.entity';
import { GracePeriodScheduler } from './grace-period.scheduler';
import { OperatorStatusQueue } from './operator-status.queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperatorStatus,
      GracePeriodAssignment,
      ConversationRef,
      Operator,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [OperatorStatusController, GracePeriodController],
  providers: [
    OperatorStatusService,
    GracePeriodService,
    GracePeriodScheduler,
    OperatorStatusQueue,
  ],
  exports: [OperatorStatusService, GracePeriodService, OperatorStatusQueue],
})
export class OperatorStatusModule {}
