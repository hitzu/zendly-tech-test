import { Repository } from 'typeorm';

import { ConversationsService } from './conversations.service';
import { ConversationRef } from './entities/conversation-ref.entity';
import type { Inbox } from '../inboxes/entities/inbox.entity';
import type { Tenant } from '../tenants/entities/tenant.entity';
import type { Operator } from '../operators/entities/operator.entity';
import { ConversationState } from './conversation-state.enum';
import { AppDataSource } from '../config/database/data-source';
import { TenantFactory } from '@factories/tenant/tenant.factory';
import { InboxFactory } from '@factories/inbox/inbox.factory';
import { ConversationRefFactory } from '@factories/conversation/conversation-ref.factory';
import { OperatorFactory } from '@factories/operator/operator.factory';

describe('ConversationsService (unit)', () => {
  let service: ConversationsService;
  let repo: Repository<ConversationRef>;
  let tenantFactory: TenantFactory;
  let inboxFactory: InboxFactory;
  let conversationFactory: ConversationRefFactory;
  let operatorFactory: OperatorFactory;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    repo = AppDataSource.getRepository(ConversationRef);
    service = new ConversationsService(repo);
    tenantFactory = new TenantFactory(AppDataSource);
    inboxFactory = new InboxFactory(AppDataSource);
    conversationFactory = new ConversationRefFactory(AppDataSource);
    operatorFactory = new OperatorFactory(AppDataSource);
  });

  const createTenantAndInbox = async (): Promise<{
    tenant: Tenant;
    inbox: Inbox;
  }> => {
    const tenant = await tenantFactory.create();
    const inbox = await inboxFactory.createWithTenant(tenant);
    return { tenant, inbox };
  };

  describe('list', () => {
    it('applies inbox, state, and operator filters', async () => {
      const { tenant, inbox } = await createTenantAndInbox();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const operator = (await operatorFactory.createForTenant(
        tenant.id,
      )) as Operator;

      await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.RESOLVED,
        assignedOperatorId: operator.id,
      });

      const otherInbox = await inboxFactory.createWithTenant(tenant);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const otherOperator = (await operatorFactory.createForTenant(
        tenant.id,
      )) as Operator;
      await conversationFactory.createWithInbox(otherInbox, {
        state: ConversationState.QUEUED,
        assignedOperatorId: otherOperator.id,
      });

      const results = await service.list(tenant.id, {
        inboxId: inbox.id,
        state: ConversationState.RESOLVED,
        assignedOperatorId: operator.id,
      });

      expect(results).toHaveLength(1);
      expect(results[0].inboxId).toBe(inbox.id);
      expect(results[0].state).toBe(ConversationState.RESOLVED);
      expect(results[0].assignedOperatorId).toBe(operator.id);
    });

    it('sorts by priority then lastMessageAt when requested', async () => {
      const { tenant, inbox } = await createTenantAndInbox();

      const highRecent = await conversationFactory.createWithInbox(inbox, {
        priorityScore: 10,
        lastMessageAt: new Date('2024-01-02T12:00:00Z'),
      });
      const highOlder = await conversationFactory.createWithInbox(inbox, {
        priorityScore: 10,
        lastMessageAt: new Date('2024-01-01T12:00:00Z'),
      });
      const lower = await conversationFactory.createWithInbox(inbox, {
        priorityScore: 5,
        lastMessageAt: new Date('2024-01-03T12:00:00Z'),
      });

      const results = await service.list(tenant.id, { sort: 'priority' });
      expect(results.map((r) => r.id)).toEqual([
        highRecent.id,
        highOlder.id,
        lower.id,
      ]);
    });
  });

  describe('findById', () => {
    it('returns conversation by tenant and id or null when missing', async () => {
      const { inbox } = await createTenantAndInbox();
      const conversation = await conversationFactory.createWithInbox(inbox);

      const found = await service.findById(conversation.id);
      expect(found?.id).toBe(conversation.id);

      const missing = await service.findById(99999);
      expect(missing).toBeNull();
    });
  });

  describe('updateMetadata', () => {
    it('returns undefined when conversation is not found', async () => {
      const { tenant } = await createTenantAndInbox();
      const result = await service.updateMetadata(tenant.id, 99999, {
        lastMessageAt: new Date(),
      });
      expect(result).toBeUndefined();
    });
  });
});
