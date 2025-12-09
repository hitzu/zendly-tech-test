import { Repository } from 'typeorm';

import { AppDataSource } from '../config/database/data-source';
import { AllocationService } from './allocation.service';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { ConversationState } from '../conversations/conversation-state.enum';
import { ConversationsService } from '../conversations/conversations.service';
import { OperatorInboxSubscriptionsService } from '../operator-inbox-subscriptions/operator-inbox-subscriptions.service';
import { OperatorInboxSubscription } from '../operator-inbox-subscriptions/entities/operator-inbox-subscription.entity';
import { InboxesService } from '../inboxes/inboxes.service';
import { Inbox } from '../inboxes/entities/inbox.entity';
import { OperatorsService } from '../operators/operators.service';
import { Operator } from '../operators/entities/operator.entity';
import { ConversationRefFactory } from '../../test/factories/conversation/conversation-ref.factory';
import { InboxFactory } from '../../test/factories/inbox/inbox.factory';
import { OperatorFactory } from '../../test/factories/operator/operator.factory';
import { TenantFactory } from '../../test/factories/tenant/tenant.factory';
import type { DevTokenRole } from '../auth/guards/dev-token.guard';

describe('AllocationService', () => {
  let service: AllocationService;
  let conversationsService: ConversationsService;
  let operatorInboxSubscriptionsService: OperatorInboxSubscriptionsService;
  let inboxesService: InboxesService;
  let operatorsService: OperatorsService;
  let repo: Repository<ConversationRef>;
  let operatorInboxSubscriptionRepository: Repository<OperatorInboxSubscription>;

  let conversationFactory: ConversationRefFactory;
  let inboxFactory: InboxFactory;
  let tenantFactory: TenantFactory;
  let operatorFactory: OperatorFactory;

  type TestContext = {
    tenantId: number;
    operatorId: number;
    role: DevTokenRole;
  };

  const context = (overrides: Partial<TestContext> = {}): TestContext => ({
    tenantId: overrides.tenantId ?? 1,
    operatorId: overrides.operatorId ?? 100,
    role: overrides.role ?? 'OPERATOR',
  });

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    repo = AppDataSource.getRepository(ConversationRef);
    operatorInboxSubscriptionRepository = AppDataSource.getRepository(
      OperatorInboxSubscription,
    );

    conversationsService = new ConversationsService(repo);
    inboxesService = new InboxesService(AppDataSource.getRepository(Inbox));
    operatorsService = new OperatorsService(
      AppDataSource.getRepository(Operator),
    );
    operatorInboxSubscriptionsService = new OperatorInboxSubscriptionsService(
      operatorInboxSubscriptionRepository,
    );

    service = new AllocationService(
      repo,
      conversationsService,
      operatorInboxSubscriptionsService,
      inboxesService,
      operatorsService,
    );

    tenantFactory = new TenantFactory(AppDataSource);
    inboxFactory = new InboxFactory(AppDataSource);
    conversationFactory = new ConversationRefFactory(AppDataSource);
    operatorFactory = new OperatorFactory(AppDataSource);
  });

  describe('allocateNextForOperator', () => {
    it('returns null when operator has no inbox subscriptions', async () => {
      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const result = await service.allocateNextForOperator({
        tenantId: tenant.id,
        operatorId: operator.id,
        role: operator.role,
      });

      expect(result).toBeNull();
    });

    it('returns null when there are no queued conversations for subscribed inboxes', async () => {
      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const inbox = await inboxFactory.createWithTenant(tenant);
      await operatorInboxSubscriptionRepository.save(
        operatorInboxSubscriptionRepository.create({
          tenantId: tenant.id,
          operator,
          inbox,
        }),
      );

      const result = await service.allocateNextForOperator({
        tenantId: tenant.id,
        operatorId: operator.id,
        role: operator.role,
      });

      expect(result).toBeNull();
    });

    it('allocates highest priority and newest when tie', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      await operatorInboxSubscriptionRepository.save(
        operatorInboxSubscriptionRepository.create({
          tenantId: tenant.id,
          operator,
          inbox,
        }),
      );

      await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.QUEUED,
        priorityScore: 5,
        lastMessageAt: new Date('2023-01-01T00:00:00Z'),
      });
      await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.QUEUED,
        priorityScore: 7,
        lastMessageAt: new Date('2023-01-02T00:00:00Z'),
      });
      const tieNew = await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.QUEUED,
        priorityScore: 7,
        lastMessageAt: new Date('2023-01-03T00:00:00Z'),
      });

      const allocated = await service.allocateNextForOperator(
        context({ tenantId: tenant.id, operatorId: operator.id }),
      );

      expect(allocated?.id).toBe(tieNew.id);
      expect(allocated?.state).toBe(ConversationState.ALLOCATED);
      expect(allocated?.assignedOperatorId).toBe(operator.id);
    });

    it('returns null when refreshed candidate is not queued', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      await operatorInboxSubscriptionRepository.save(
        operatorInboxSubscriptionRepository.create({
          tenantId: tenant.id,
          operator,
          inbox,
        }),
      );

      const candidate = await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.QUEUED,
        priorityScore: 10,
      });

      // Simulate a race where the conversation is taken before this operator fetches it.
      await repo.save({
        ...candidate,
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });

      const result = await service.allocateNextForOperator(
        context({ tenantId: tenant.id, operatorId: operator.id }),
      );

      expect(result).toBeNull();
    });
  });

  describe('claimQueuedConversation', () => {
    it('throws when conversation not queued', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.ALLOCATED,
      });
      await expect(
        service.claimQueuedConversation(
          context({ tenantId: tenant.id }),
          conversation.id,
        ),
      ).rejects.toThrow('Conversation already taken');
    });

    it('throws when operator not subscribed to inbox', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.QUEUED,
      });
      await expect(
        service.claimQueuedConversation(
          context({ tenantId: tenant.id }),
          conversation.id,
        ),
      ).rejects.toThrow('Operator not subscribed to inbox');
    });

    it('claims queued conversation for operator', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.QUEUED,
      });
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      await operatorInboxSubscriptionRepository.save(
        operatorInboxSubscriptionRepository.create({
          tenantId: tenant.id,
          operator,
          inbox,
        }),
      );
      const updated = await service.claimQueuedConversation(
        context({ tenantId: tenant.id, operatorId: operator.id }),
        conversation.id,
      );

      expect(updated.state).toBe(ConversationState.ALLOCATED);
      expect(updated.assignedOperatorId).toBe(operator.id);
    });
  });

  describe('resolveConversation', () => {
    it('forbids resolve when different operator and not manager', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const conversation = await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: inbox.id,
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      await expect(
        service.resolveConversation(
          context({ tenantId: tenant.id, operatorId: 100, role: 'OPERATOR' }),
          conversation.id,
        ),
      ).rejects.toThrow('Not allowed to resolve this conversation');
    });

    it('resolves when assigned operator matches', async () => {
      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      const resolved = await service.resolveConversation(
        context({ tenantId: tenant.id, operatorId: operator.id }),
        conversation.id,
      );

      expect(resolved.state).toBe(ConversationState.RESOLVED);
    });

    it('allows manager to resolve even if different operator', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      const resolved = await service.resolveConversation(
        context({ tenantId: tenant.id, operatorId: 100, role: 'MANAGER' }),
        conversation.id,
      );

      expect(resolved.state).toBe(ConversationState.RESOLVED);
    });
  });

  describe('deallocateConversation', () => {
    it('clears assignment and returns to queue', async () => {
      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.createWithInbox(inbox, {
        tenantId: tenant.id,
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      const result = await service.deallocateConversation(
        context({ tenantId: tenant.id, operatorId: operator.id }),
        conversation.id,
      );

      expect(result.state).toBe(ConversationState.QUEUED);
      expect(result.assignedOperatorId).toBeNull();
    });
  });

  describe('reassignConversation', () => {
    it('forbids when role not manager or admin', async () => {
      await expect(
        service.reassignConversation(context({ role: 'OPERATOR' }), 1, 2),
      ).rejects.toThrow('Only managers or admins can reassign');
    });

    it('fails when new operator not found', async () => {
      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      await expect(
        service.reassignConversation(
          context({ tenantId: tenant.id, role: 'MANAGER' }),
          conversation.id,
          999,
        ),
      ).rejects.toThrow('New operator not found');
    });

    it('fails when new operator tenant differs', async () => {
      const tenant = await tenantFactory.create();
      const otherTenant = await tenantFactory.create();
      const assignedOperator = await operatorFactory.create({
        tenantId: tenant.id,
      });
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.ALLOCATED,
        assignedOperatorId: assignedOperator.id,
      });
      const otherTenantOperator = await operatorFactory.create({
        tenantId: otherTenant.id,
      });

      await expect(
        service.reassignConversation(
          context({ tenantId: tenant.id, role: 'MANAGER' }),
          conversation.id,
          otherTenantOperator.id,
        ),
      ).rejects.toThrow('Cannot reassign across tenants');
    });

    it('fails when new operator lacks inbox subscription', async () => {
      const tenant = await tenantFactory.create();
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const inbox = await inboxFactory.createWithTenant(tenant);
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      const newOperator = await operatorFactory.create({ tenantId: tenant.id });

      await expect(
        service.reassignConversation(
          context({ tenantId: tenant.id, role: 'MANAGER' }),
          conversation.id,
          newOperator.id,
        ),
      ).rejects.toThrow('Operator is not subscribed to the conversation inbox');
    });

    it('reassigns to new operator when allowed', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant);
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const conversation = await conversationFactory.createWithInbox(inbox, {
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      const newOperator = await operatorFactory.create({ tenantId: tenant.id });
      await operatorInboxSubscriptionRepository.save(
        operatorInboxSubscriptionRepository.create({
          tenantId: tenant.id,
          operator: newOperator,
          inbox,
        }),
      );

      const reassigned = await service.reassignConversation(
        context({ tenantId: tenant.id, role: 'MANAGER' }),
        conversation.id,
        newOperator.id,
      );

      expect(reassigned.assignedOperatorId).toBe(newOperator.id);
    });
  });

  describe('moveConversationInbox', () => {
    it('forbids when role not manager or admin', async () => {
      await expect(
        service.moveConversationInbox(context({ role: 'OPERATOR' }), 1, 2),
      ).rejects.toThrow('Only managers or admins can move a conversation');
    });

    it('moves conversation and resets allocation', async () => {
      const tenant = await tenantFactory.create();
      const oldInbox = await inboxFactory.createWithTenant(tenant);
      const newInbox = await inboxFactory.createWithTenant(tenant);
      const operator = await operatorFactory.create({ tenantId: tenant.id });
      const conversation = await conversationFactory.create({
        tenantId: tenant.id,
        inboxId: oldInbox.id,
        state: ConversationState.ALLOCATED,
        assignedOperatorId: operator.id,
      });
      const moved = await service.moveConversationInbox(
        context({ tenantId: tenant.id, role: 'MANAGER' }),
        conversation.id,
        newInbox.id,
      );

      expect(moved.inboxId).toBe(newInbox.id);
      expect(moved.state).toBe(ConversationState.QUEUED);
      expect(moved.assignedOperatorId).toBeNull();
    });
  });
});
