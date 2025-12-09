import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database/data-source';
import { ConversationState } from '../conversations/conversation-state.enum';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { GracePeriodService } from './grace-period.service';
import {
  GracePeriodAssignment,
  GracePeriodReason,
} from './entities/grace-period-assignment.entity';
import { ConversationRefFactory } from '@factories/conversation/conversation-ref.factory';
import { GracePeriodAssignmentFactory } from '@factories/grace-period/grace-period-assignment.factory';
import { InboxFactory } from '@factories/inbox/inbox.factory';
import { OperatorFactory } from '@factories/operator/operator.factory';
import { TenantFactory } from '@factories/tenant/tenant.factory';

describe('GracePeriodService (unit)', () => {
  let service: GracePeriodService;
  let graceRepo: Repository<GracePeriodAssignment>;
  let conversationRepo: Repository<ConversationRef>;

  let tenantFactory: TenantFactory;
  let inboxFactory: InboxFactory;
  let operatorFactory: OperatorFactory;
  let conversationFactory: ConversationRefFactory;
  let graceFactory: GracePeriodAssignmentFactory;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    graceRepo = AppDataSource.getRepository(GracePeriodAssignment);
    conversationRepo = AppDataSource.getRepository(ConversationRef);

    tenantFactory = new TenantFactory(AppDataSource);
    inboxFactory = new InboxFactory(AppDataSource);
    operatorFactory = new OperatorFactory(AppDataSource);
    conversationFactory = new ConversationRefFactory(AppDataSource);
    graceFactory = new GracePeriodAssignmentFactory(AppDataSource);

    service = new GracePeriodService(graceRepo, conversationRepo);
  });

  const createTenantInboxOperator = async () => {
    const tenant = await tenantFactory.create();
    const inbox = await inboxFactory.createWithTenant(tenant);
    const operator = await operatorFactory.createForTenant(tenant.id);
    return { tenant, inbox, operator };
  };

  describe('processExpiredGracePeriods', () => {
    it('requeues allocated conversations assigned to the operator and deletes the assignment', async () => {
      const now = new Date('2024-02-01T00:00:00Z');
      const { operator, tenant, inbox } = await createTenantInboxOperator();
      const conversation = await conversationFactory.create({
        tenantId: tenant.id,
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
        inboxId: inbox.id,
      });
      await graceFactory.createExpiredForConversation(conversation, operator, {
        expiresAt: new Date(now.getTime() - 1000),
      });

      const result = await service.processExpiredGracePeriods(now);
      const updated = await conversationRepo.findOneBy({ id: conversation.id });

      expect(result.processed).toBe(1);
      expect(updated?.state).toBe(ConversationState.QUEUED);
      expect(updated?.assignedOperatorId).toBeNull();
      expect(updated?.updatedAt.getTime()).toBe(now.getTime());
      expect(await graceRepo.count()).toBe(0);
    });

    it('keeps conversation unchanged when it is not allocated but still deletes the assignment', async () => {
      const now = new Date('2024-02-02T00:00:00Z');
      const { inbox, operator } = await createTenantInboxOperator();
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.QUEUED,
        assignedOperatorId: operator.id,
      });
      await graceFactory.createExpiredForConversation(conversation, operator, {
        expiresAt: new Date(now.getTime() - 1000),
      });

      const result = await service.processExpiredGracePeriods(now);
      const updated = await conversationRepo.findOneBy({ id: conversation.id });

      expect(result.processed).toBe(1);
      expect(updated?.state).toBe(ConversationState.QUEUED);
      expect(updated?.assignedOperatorId).toBe(operator.id);
      expect(await graceRepo.count()).toBe(0);
    });

    it('deletes expired assignments even when the conversation no longer exists', async () => {
      const now = new Date('2024-02-03T00:00:00Z');
      const { tenant, operator, inbox } = await createTenantInboxOperator();
      const conversation = await conversationFactory.create({
        tenantId: tenant.id,
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
        inboxId: inbox.id,
      });
      await graceFactory.create({
        tenantId: tenant.id,
        conversationId: conversation.id,
        operatorId: operator.id,
        expiresAt: new Date(now.getTime() - 1000),
        reason: GracePeriodReason.OFFLINE,
      });

      const result = await service.processExpiredGracePeriods(now);

      expect(result.processed).toBe(1);
      expect(await graceRepo.count()).toBe(0);
    });
  });
});
