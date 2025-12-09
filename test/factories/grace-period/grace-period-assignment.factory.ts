import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { Factory } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import {
  GracePeriodAssignment,
  GracePeriodReason,
} from '../../../src/operator-status/entities/grace-period-assignment.entity';
import type { ConversationRef } from '../../../src/conversations/entities/conversation-ref.entity';
import type { Operator } from '../../../src/operators/entities/operator.entity';

export class GracePeriodAssignmentFactory extends Factory<GracePeriodAssignment> {
  protected entity = GracePeriodAssignment;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<GracePeriodAssignment> {
    return {
      tenantId: faker.number.int({ min: 1, max: 10_000 }),
      conversationId: faker.number.int({ min: 1, max: 10_000 }),
      operatorId: faker.number.int({ min: 1, max: 10_000 }),
      expiresAt: faker.date.future(),
      reason: GracePeriodReason.OFFLINE,
    };
  }

  async createForConversation(
    conversation: ConversationRef,
    operator: Operator,
    overrides?: Partial<FactorizedAttrs<GracePeriodAssignment>>,
  ): Promise<GracePeriodAssignment> {
    return this.create({
      tenantId: conversation.tenantId,
      conversationId: conversation.id,
      operatorId: operator.id,
      ...overrides,
    });
  }

  async createExpiredForConversation(
    conversation: ConversationRef,
    operator: Operator,
    overrides?: Partial<FactorizedAttrs<GracePeriodAssignment>>,
  ): Promise<GracePeriodAssignment> {
    const expiredAt = overrides?.expiresAt ?? new Date(Date.now() - 60 * 1000);

    return this.createForConversation(conversation, operator, {
      expiresAt: expiredAt,
      reason: GracePeriodReason.OFFLINE,
      ...overrides,
    });
  }
}
