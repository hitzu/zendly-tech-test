import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { OperatorsModule } from '../operators/operators.module';
import { GracePeriodController } from './grace-period.controller';
import { GracePeriodService } from './grace-period.service';
import { GracePeriodAssignment } from './entities/grace-period-assignment.entity';
import { OperatorStatus } from './entities/operator-status.entity';
import { OperatorStatusController } from './operator-status.controller';
import { OperatorStatusService } from './operator-status.service';
import { ScheduleModule } from '@nestjs/schedule';
import { Operator } from '../operators/entities/operator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OperatorStatus,
      GracePeriodAssignment,
      ConversationRef,
      Operator,
    ]),
    ScheduleModule.forRoot(),
    OperatorsModule,
  ],
  controllers: [OperatorStatusController, GracePeriodController],
  providers: [OperatorStatusService, GracePeriodService],
  exports: [OperatorStatusService, GracePeriodService],
})
export class OperatorStatusModule {}
