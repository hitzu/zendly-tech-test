import { Repository } from 'typeorm';

import { LabelsService } from './labels.service';
import { Label } from './entities/label.entity';
import { ConversationLabel } from './entities/conversation-label.entity';
import { Inbox } from '../inboxes/entities/inbox.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Operator } from '../operators/entities/operator.entity';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { AppDataSource } from '../config/database/data-source';
import { TenantFactory } from '@factories/tenant/tenant.factory';
import { InboxFactory } from '@factories/inbox/inbox.factory';
import { OperatorFactory } from '@factories/operator/operator.factory';
import { LabelFactory } from '@factories/label/label.factory';
import { ConversationRefFactory } from '@factories/conversation/conversation-ref.factory';
import { ConversationLabelFactory } from '@factories/label/conversation-label.factory';

describe('LabelsService (unit)', () => {
  let service: LabelsService;
  let labelRepo: Repository<Label>;
  let conversationLabelRepo: Repository<ConversationLabel>;
  let inboxRepo: Repository<Inbox>;
  let conversationRepo: Repository<ConversationRef>;
  let tenantFactory: TenantFactory;
  let inboxFactory: InboxFactory;
  let operatorFactory: OperatorFactory;
  let labelFactory: LabelFactory;
  let conversationFactory: ConversationRefFactory;
  let conversationLabelFactory: ConversationLabelFactory;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    labelRepo = AppDataSource.getRepository(Label);
    conversationLabelRepo = AppDataSource.getRepository(ConversationLabel);
    inboxRepo = AppDataSource.getRepository(Inbox);
    conversationRepo = AppDataSource.getRepository(ConversationRef);
    service = new LabelsService(
      labelRepo,
      conversationLabelRepo,
      inboxRepo,
      conversationRepo,
    );
    tenantFactory = new TenantFactory(AppDataSource);
    inboxFactory = new InboxFactory(AppDataSource);
    operatorFactory = new OperatorFactory(AppDataSource);
    labelFactory = new LabelFactory(AppDataSource);
    conversationFactory = new ConversationRefFactory(AppDataSource);
    conversationLabelFactory = new ConversationLabelFactory(AppDataSource);
  });

  const createTenantInboxAndOperator = async (): Promise<{
    tenant: Tenant;
    inbox: Inbox;
    operator: Operator;
  }> => {
    const tenant = await tenantFactory.create();
    const inbox = await inboxFactory.createWithTenant(tenant);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const operator = (await operatorFactory.createForTenant(
      tenant.id,
    )) as Operator;
    return { tenant, inbox, operator };
  };

  describe('createLabel', () => {
    it('creates a label successfully', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const dto = {
        inboxId: inbox.id,
        name: 'VIP Customer',
        color: '#FF5733',
      };

      const result = await service.createLabel(tenant.id, operator.id, dto);

      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
      expect(result.color).toBe(dto.color);
      expect(result.tenantId).toBe(tenant.id);
      expect(result.inboxId).toBe(inbox.id);
      expect(result.createdByOperatorId).toBe(operator.id);
    });

    it('creates a label with empty color string converts to null', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const dto = {
        inboxId: inbox.id,
        name: 'No Color Label',
        color: '',
      };

      const result = await service.createLabel(tenant.id, operator.id, dto);

      expect(result.color).toBeNull();
    });

    it('creates a label with null color', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const dto = {
        inboxId: inbox.id,
        name: 'Null Color Label',
        color: null,
      };

      const result = await service.createLabel(tenant.id, operator.id, dto);

      expect(result.color).toBeNull();
    });

    it('throws NotFoundException when inbox does not exist', async () => {
      const { tenant, operator } = await createTenantInboxAndOperator();

      const dto = {
        inboxId: 99999,
        name: 'Test Label',
      };

      await expect(
        service.createLabel(tenant.id, operator.id, dto),
      ).rejects.toThrow('Inbox not found for tenant');
    });

    it('throws NotFoundException when inbox belongs to different tenant', async () => {
      const { operator } = await createTenantInboxAndOperator();
      const otherTenant = await tenantFactory.create();
      const otherInbox = await inboxFactory.createWithTenant(otherTenant);

      const dto = {
        inboxId: otherInbox.id,
        name: 'Test Label',
      };

      await expect(
        service.createLabel(otherTenant.id + 1, operator.id, dto),
      ).rejects.toThrow('Inbox not found for tenant');
    });

    it('throws ConflictException when label name already exists for inbox', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const dto = {
        inboxId: inbox.id,
        name: 'Duplicate Label',
      };

      await service.createLabel(tenant.id, operator.id, dto);

      await expect(
        service.createLabel(tenant.id, operator.id, dto),
      ).rejects.toThrow('Label with this name already exists for the inbox');
    });

    it('allows same label name in different inboxes', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();
      const otherInbox = await inboxFactory.createWithTenant(tenant);

      const dto = {
        inboxId: inbox.id,
        name: 'Same Name',
      };

      await service.createLabel(tenant.id, operator.id, dto);

      const dtoOther = {
        inboxId: otherInbox.id,
        name: 'Same Name',
      };

      const result = await service.createLabel(
        tenant.id,
        operator.id,
        dtoOther,
      );
      expect(result.name).toBe('Same Name');
      expect(result.inboxId).toBe(otherInbox.id);
    });
  });

  describe('listLabels', () => {
    it('returns all labels for tenant when inboxId is not provided', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();
      const otherInbox = await inboxFactory.createWithTenant(tenant);

      await labelFactory.createWithInboxAndOperator(inbox, operator);
      await labelFactory.createWithInboxAndOperator(otherInbox, operator);

      const results = await service.listLabels(tenant.id);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((r) => r.tenantId === tenant.id)).toBe(true);
    });

    it('returns labels filtered by inboxId when provided', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();
      const otherInbox = await inboxFactory.createWithTenant(tenant);

      const label1 = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      await labelFactory.createWithInboxAndOperator(otherInbox, operator);

      const results = await service.listLabels(tenant.id, inbox.id);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.every((r) => r.inboxId === inbox.id)).toBe(true);
      expect(results.some((r) => r.id === label1.id)).toBe(true);
    });

    it('returns empty array when tenant has no labels', async () => {
      const tenant = await tenantFactory.create();

      const results = await service.listLabels(tenant.id);

      expect(results).toEqual([]);
    });

    it('returns labels ordered by createdAt DESC', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label1 = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));
      const label2 = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );

      const results = await service.listLabels(tenant.id, inbox.id);

      expect(results.length).toBeGreaterThanOrEqual(2);
      const label1Index = results.findIndex((r) => r.id === label1.id);
      const label2Index = results.findIndex((r) => r.id === label2.id);
      expect(label2Index).toBeLessThan(label1Index);
    });
  });

  describe('getLabel', () => {
    it('returns label by tenant and id', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );

      const result = await service.getLabel(tenant.id, label.id);

      expect(result.id).toBe(label.id);
      expect(result.name).toBe(label.name);
      expect(result.tenantId).toBe(tenant.id);
    });

    it('throws NotFoundException when label does not exist', async () => {
      const tenant = await tenantFactory.create();

      await expect(service.getLabel(tenant.id, 99999)).rejects.toThrow(
        'Label not found',
      );
    });

    it('throws NotFoundException when label belongs to different tenant', async () => {
      const { inbox, operator } = await createTenantInboxAndOperator();
      const otherTenant = await tenantFactory.create();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );

      await expect(service.getLabel(otherTenant.id, label.id)).rejects.toThrow(
        'Label not found',
      );
    });
  });

  describe('updateLabel', () => {
    it('updates label name successfully', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
        { name: 'Old Name' },
      );

      const dto = { name: 'New Name' };
      const result = await service.updateLabel(tenant.id, label.id, dto);

      expect(result.name).toBe('New Name');
      expect(result.id).toBe(label.id);
    });

    it('updates label color successfully', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
        { color: '#FF0000' },
      );

      const dto = { color: '#00FF00' };
      const result = await service.updateLabel(tenant.id, label.id, dto);

      expect(result.color).toBe('#00FF00');
    });

    it('converts empty color string to null', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
        { color: '#FF0000' },
      );

      const dto = { color: '' };
      const result = await service.updateLabel(tenant.id, label.id, dto);

      expect(result.color).toBeNull();
    });

    it('updates both name and color', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
        { name: 'Old Name', color: '#FF0000' },
      );

      const dto = { name: 'New Name', color: '#00FF00' };
      const result = await service.updateLabel(tenant.id, label.id, dto);

      expect(result.name).toBe('New Name');
      expect(result.color).toBe('#00FF00');
    });

    it('does not update when name is unchanged', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
        { name: 'Same Name' },
      );

      const dto = { name: 'Same Name' };
      const result = await service.updateLabel(tenant.id, label.id, dto);

      expect(result.name).toBe('Same Name');
    });

    it('throws ConflictException when new name conflicts with existing label', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      await labelFactory.createWithInboxAndOperator(inbox, operator, {
        name: 'Existing Label',
      });
      const labelToUpdate = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
        { name: 'Other Label' },
      );

      const dto = { name: 'Existing Label' };

      await expect(
        service.updateLabel(tenant.id, labelToUpdate.id, dto),
      ).rejects.toThrow('Label with this name already exists for the inbox');
    });

    it('throws NotFoundException when label does not exist', async () => {
      const tenant = await tenantFactory.create();

      const dto = { name: 'New Name' };

      await expect(service.updateLabel(tenant.id, 99999, dto)).rejects.toThrow(
        'Label not found',
      );
    });
  });

  describe('deleteLabel', () => {
    it('soft deletes label successfully', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );

      await service.deleteLabel(tenant.id, label.id);

      const deleted = await labelRepo.findOne({
        where: { id: label.id },
        withDeleted: true,
      });
      expect(deleted).toBeDefined();
      expect(deleted?.deletedAt).toBeDefined();
    });

    it('throws NotFoundException when label does not exist', async () => {
      const tenant = await tenantFactory.create();

      await expect(service.deleteLabel(tenant.id, 99999)).rejects.toThrow(
        'Label not found',
      );
    });

    it('throws NotFoundException when label belongs to different tenant', async () => {
      const { inbox, operator } = await createTenantInboxAndOperator();
      const otherTenant = await tenantFactory.create();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );

      await expect(
        service.deleteLabel(otherTenant.id, label.id),
      ).rejects.toThrow('Label not found');
    });
  });

  describe('attachLabelToConversation', () => {
    it('attaches label to conversation successfully', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      const conversation = await conversationFactory.createWithInbox(inbox);

      const result = await service.attachLabelToConversation(
        tenant.id,
        conversation.id,
        label.id,
      );

      expect(result.conversationId).toBe(conversation.id);
      expect(result.labelId).toBe(label.id);
    });

    it('returns existing link when label is already attached', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      const conversation = await conversationFactory.createWithInbox(inbox);

      const first = await service.attachLabelToConversation(
        tenant.id,
        conversation.id,
        label.id,
      );

      const second = await service.attachLabelToConversation(
        tenant.id,
        conversation.id,
        label.id,
      );

      expect(first.id).toBe(second.id);
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );

      await expect(
        service.attachLabelToConversation(tenant.id, 99999, label.id),
      ).rejects.toThrow('Conversation not found for tenant');
    });

    it('throws NotFoundException when label does not exist', async () => {
      const { tenant, inbox } = await createTenantInboxAndOperator();

      const conversation = await conversationFactory.createWithInbox(inbox);

      await expect(
        service.attachLabelToConversation(tenant.id, conversation.id, 99999),
      ).rejects.toThrow('Label not found for tenant');
    });

    it('throws BadRequestException when label inbox does not match conversation inbox', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();
      const otherInbox = await inboxFactory.createWithTenant(tenant);

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      const conversation =
        await conversationFactory.createWithInbox(otherInbox);

      await expect(
        service.attachLabelToConversation(tenant.id, conversation.id, label.id),
      ).rejects.toThrow('Label inbox does not match conversation inbox');
    });

    it('throws NotFoundException when conversation belongs to different tenant', async () => {
      const { inbox, operator } = await createTenantInboxAndOperator();
      const otherTenant = await tenantFactory.create();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      const conversation = await conversationFactory.createWithInbox(inbox);

      await expect(
        service.attachLabelToConversation(
          otherTenant.id,
          conversation.id,
          label.id,
        ),
      ).rejects.toThrow('Conversation not found for tenant');
    });
  });

  describe('detachLabelFromConversation', () => {
    it('detaches label from conversation successfully', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      const conversation = await conversationFactory.createWithInbox(inbox);

      await conversationLabelFactory.createWithConversationAndLabel(
        conversation,
        label,
      );

      await service.detachLabelFromConversation(
        tenant.id,
        conversation.id,
        label.id,
      );

      const link = await conversationLabelRepo.findOne({
        where: { conversationId: conversation.id, labelId: label.id },
      });
      expect(link).toBeNull();
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );

      await expect(
        service.detachLabelFromConversation(tenant.id, 99999, label.id),
      ).rejects.toThrow('Conversation not found for tenant');
    });

    it('throws NotFoundException when label does not exist', async () => {
      const { tenant, inbox } = await createTenantInboxAndOperator();

      const conversation = await conversationFactory.createWithInbox(inbox);

      await expect(
        service.detachLabelFromConversation(tenant.id, conversation.id, 99999),
      ).rejects.toThrow('Label not found for tenant');
    });

    it('throws NotFoundException when label is not attached to conversation', async () => {
      const { tenant, inbox, operator } = await createTenantInboxAndOperator();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      const conversation = await conversationFactory.createWithInbox(inbox);

      await expect(
        service.detachLabelFromConversation(
          tenant.id,
          conversation.id,
          label.id,
        ),
      ).rejects.toThrow('Label not attached to conversation');
    });

    it('throws NotFoundException when conversation belongs to different tenant', async () => {
      const { inbox, operator } = await createTenantInboxAndOperator();
      const otherTenant = await tenantFactory.create();

      const label = await labelFactory.createWithInboxAndOperator(
        inbox,
        operator,
      );
      const conversation = await conversationFactory.createWithInbox(inbox);

      await expect(
        service.detachLabelFromConversation(
          otherTenant.id,
          conversation.id,
          label.id,
        ),
      ).rejects.toThrow('Conversation not found for tenant');
    });
  });
});
