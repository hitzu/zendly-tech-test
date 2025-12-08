import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { Factory } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import { ConversationRef } from '../../../src/conversations/entities/conversation-ref.entity';
import { ConversationState } from '../../../src/conversations/conversation-state.enum';
import type { Inbox } from '../../../src/inboxes/entities/inbox.entity';

export class ConversationRefFactory extends Factory<ConversationRef> {
  protected entity = ConversationRef;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<ConversationRef> {
    return {
      tenantId: faker.number.int({ min: 1, max: 10_000 }),
      inboxId: faker.number.int({ min: 1, max: 10_000 }),
      externalConversationId: faker.string.uuid(),
      customerPhoneNumber: faker.phone.number('+1##########'),
      state: ConversationState.QUEUED,
      assignedOperatorId: null,
      lastMessageAt: null,
      messageCount: 0,
      priorityScore: 0,
      resolvedAt: null,
    };
  }

  async createWithInbox(
    inbox: Inbox,
    overrides?: Partial<FactorizedAttrs<ConversationRef>>,
  ): Promise<ConversationRef> {
    return this.create({
      tenantId: inbox.tenantId,
      inboxId: inbox.id,
      ...overrides,
    });
  }
}

