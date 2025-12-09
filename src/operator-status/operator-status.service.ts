import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ConversationState } from '../conversations/conversation-state.enum';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import {
  GracePeriodAssignment,
  GracePeriodReason,
} from './entities/grace-period-assignment.entity';
import {
  OperatorAvailability,
  OperatorStatus,
} from './entities/operator-status.entity';
import { Operator } from '../operators/entities/operator.entity';

const DEFAULT_GRACE_WINDOW_MS = 5 * 60 * 1000; // TODO: make configurable per tenant.

@Injectable()
export class OperatorStatusService {
  private readonly logger = new Logger(OperatorStatusService.name);

  constructor(
    @InjectRepository(OperatorStatus)
    private readonly operatorStatusRepository: Repository<OperatorStatus>,
    @InjectRepository(GracePeriodAssignment)
    private readonly gracePeriodRepository: Repository<GracePeriodAssignment>,
    @InjectRepository(ConversationRef)
    private readonly conversationRepository: Repository<ConversationRef>,
    @InjectRepository(Operator)
    private readonly operatorsRepository: Repository<Operator>,
  ) {}

  async setStatus(
    tenantId: number,
    operatorId: number,
    status: OperatorAvailability,
  ): Promise<OperatorStatus> {
    const operator = await this.operatorsRepository.findOne({
      where: { id: operatorId },
    });
    if (!operator) {
      throw new NotFoundException('Operator not found');
    }
    if (operator.tenantId !== tenantId) {
      throw new ForbiddenException('Operator does not belong to tenant');
    }

    const now = new Date();
    let record = await this.operatorStatusRepository.findOne({
      where: { operatorId },
    });

    if (!record) {
      record = this.operatorStatusRepository.create({
        operatorId,
        tenantId,
        status,
        lastStatusChangeAt: now,
      });
    } else {
      record.status = status;
      record.lastStatusChangeAt = now;
      record.tenantId = tenantId;
    }

    await this.operatorStatusRepository.save(record);

    if (status === OperatorAvailability.OFFLINE) {
      await this.createGraceAssignments(tenantId, operatorId, now);
    } else {
      await this.gracePeriodRepository.delete({ tenantId, operatorId });
    }

    this.logger.log(
      `Updated operator status for tenant ${tenantId} and operator ${operatorId} to ${status}`,
    );

    return record;
  }

  async getStatus(
    tenantId: number,
    operatorId: number,
  ): Promise<OperatorStatus | null> {
    const record = await this.operatorStatusRepository.findOne({
      where: { operatorId },
    });
    if (!record) {
      return null;
    }
    if (record.tenantId !== tenantId) {
      throw new ForbiddenException('Operator status belongs to another tenant');
    }
    return record;
  }

  private async createGraceAssignments(
    tenantId: number,
    operatorId: number,
    now: Date,
  ): Promise<void> {
    const allocated = await this.conversationRepository.find({
      where: {
        tenantId,
        assignedOperatorId: operatorId,
        state: ConversationState.ALLOCATED,
      },
    });
    if (!allocated.length) {
      return;
    }

    const expiresAt = new Date(now.getTime() + DEFAULT_GRACE_WINDOW_MS);
    const payload = allocated.map((conversation) => ({
      tenantId,
      conversationId: conversation.id,
      operatorId,
      expiresAt,
      reason: GracePeriodReason.OFFLINE,
    }));

    await this.gracePeriodRepository.upsert(payload, [
      'conversationId',
      'operatorId',
    ]);
  }
}
