import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { LessThanOrEqual, Repository } from 'typeorm';

import { ConversationState } from '../conversations/conversation-state.enum';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { GracePeriodAssignment } from './entities/grace-period-assignment.entity';

@Injectable()
export class GracePeriodService {
  constructor(
    @InjectRepository(GracePeriodAssignment)
    private readonly gracePeriodRepository: Repository<GracePeriodAssignment>,
    @InjectRepository(ConversationRef)
    private readonly conversationRepository: Repository<ConversationRef>,
    @InjectPinoLogger(GracePeriodService.name)
    private readonly logger: PinoLogger,
  ) {}

  async processExpiredGracePeriods(
    now: Date = new Date(),
  ): Promise<{ processed: number }> {
    const expired = await this.gracePeriodRepository.find({
      where: { expiresAt: LessThanOrEqual(now) },
    });

    let processed = 0;

    for (const assignment of expired) {
      const conversation = await this.conversationRepository.findOne({
        where: {
          id: assignment.conversationId,
          tenantId: assignment.tenantId,
        },
      });

      if (
        conversation &&
        conversation.state === ConversationState.ALLOCATED &&
        conversation.assignedOperatorId === assignment.operatorId
      ) {
        conversation.state = ConversationState.QUEUED;
        conversation.assignedOperatorId = null;
        conversation.updatedAt = now;
        await this.conversationRepository.save(conversation);
      }

      await this.gracePeriodRepository.delete({ id: assignment.id });
      processed += 1;
    }

    this.logger.info(
      { processed },
      'Processed expired grace period assignments',
    );

    return { processed };
  }
}
