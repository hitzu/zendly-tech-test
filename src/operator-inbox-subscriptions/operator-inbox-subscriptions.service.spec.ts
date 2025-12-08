/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { Repository } from 'typeorm';

import { OperatorInboxSubscriptionsService } from './operator-inbox-subscriptions.service';
import { OperatorInboxSubscription } from './entities/operator-inbox-subscription.entity';
import { OperatorFactory } from '@factories/operator/operator.factory';
import { InboxFactory } from '@factories/inbox/inbox.factory';
import { TenantFactory } from '@factories/tenant/tenant.factory';
import { AppDataSource } from '../config/database/data-source';
import { NotFoundException } from '@nestjs/common';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Operator } from '../operators/entities/operator.entity';
import { Inbox } from '../inboxes/entities/inbox.entity';

describe('OperatorInboxSubscriptionsService (unit)', () => {
  let service: OperatorInboxSubscriptionsService;
  let repo: Repository<OperatorInboxSubscription>;
  let operatorFactory: OperatorFactory;
  let inboxFactory: InboxFactory;
  let tenantFactory: TenantFactory;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    repo = AppDataSource.getRepository(OperatorInboxSubscription);
    service = new OperatorInboxSubscriptionsService(repo);
    operatorFactory = new OperatorFactory(AppDataSource);
    inboxFactory = new InboxFactory(AppDataSource);
    tenantFactory = new TenantFactory(AppDataSource);
  });

  describe('createSubscription', () => {
    it('creates a subscription with expected fields', async () => {
      // Arrange
      const tenant: Tenant = await tenantFactory.create();
      const operator: Operator = await operatorFactory.createForTenant(
        tenant.id,
      );
      const inbox: Inbox = await inboxFactory.createWithTenant(tenant);

      // Act
      const subscription = await service.createSubscription(tenant.id, {
        operatorId: operator.id,
        inboxId: inbox.id,
      });

      // Assert
      expect(subscription.id).toBeDefined();
      expect(subscription.tenantId).toBe(tenant.id);
      expect(subscription.operatorId).toBe(operator.id);
      expect(subscription.inboxId).toBe(inbox.id);
      expect(subscription.createdAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when operator does not exist', async () => {
      // Arrange
      const tenant: Tenant = await tenantFactory.create();
      const inbox: Inbox = await inboxFactory.createWithTenant(tenant);

      // Act + Assert
      await expect(
        service.createSubscription(tenant.id, {
          operatorId: 999_999,
          inboxId: inbox.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when inbox does not exist', async () => {
      // Arrange
      const tenant: Tenant = await tenantFactory.create();
      const operator: Operator = await operatorFactory.createForTenant(
        tenant.id,
      );

      // Act + Assert
      await expect(
        service.createSubscription(tenant.id, {
          operatorId: operator.id,
          inboxId: 999_999,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listByTenant', () => {
    let tenantAId: number;
    let tenantBId: number;
    let operatorAId: number;
    let operatorBId: number;
    let inboxA1Id: number;
    let inboxA2Id: number;
    let inboxA3Id: number;

    beforeEach(async () => {
      const tenantA: Tenant = await tenantFactory.create();
      const tenantB: Tenant = await tenantFactory.create();
      tenantAId = tenantA.id;
      tenantBId = tenantB.id;

      const operatorA: Operator =
        await operatorFactory.createForTenant(tenantAId);
      const operatorB: Operator =
        await operatorFactory.createForTenant(tenantAId);
      operatorAId = operatorA.id;
      operatorBId = operatorB.id;

      const inboxA1: Inbox = await inboxFactory.createWithTenant(tenantA);
      const inboxA2: Inbox = await inboxFactory.createWithTenant(tenantA);
      const inboxA3: Inbox = await inboxFactory.createWithTenant(tenantA);
      inboxA1Id = inboxA1.id;
      inboxA2Id = inboxA2.id;
      inboxA3Id = inboxA3.id;

      await service.createSubscription(tenantAId, {
        operatorId: operatorAId,
        inboxId: inboxA1Id,
      });
      await service.createSubscription(tenantAId, {
        operatorId: operatorBId,
        inboxId: inboxA2Id,
      });
      await service.createSubscription(tenantAId, {
        operatorId: operatorBId,
        inboxId: inboxA3Id,
      });
      await service.createSubscription(tenantBId, {
        operatorId: operatorAId,
        inboxId: inboxA1Id,
      });
    });

    it('returns only subscriptions for the tenant', async () => {
      const results = await service.listByTenant(tenantAId);
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.tenantId === tenantAId)).toBe(true);
    });

    it('filters by operatorId', async () => {
      const results = await service.listByTenant(tenantAId, {
        operatorId: operatorBId,
      });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.operatorId === operatorBId)).toBe(true);
    });

    it('filters by inboxId', async () => {
      const results = await service.listByTenant(tenantAId, {
        inboxId: inboxA1Id,
      });
      expect(results).toHaveLength(1);
      expect(results[0].inboxId).toBe(inboxA1Id);
    });
  });

  describe('removeSubscription', () => {
    it('removes subscription in matching tenant', async () => {
      const tenant: Tenant = await tenantFactory.create();
      const operator: Operator = await operatorFactory.createForTenant(
        tenant.id,
      );
      const inbox: Inbox = await inboxFactory.createWithTenant(tenant);
      const sub = await service.createSubscription(tenant.id, {
        operatorId: operator.id,
        inboxId: inbox.id,
      });

      await service.removeSubscription(tenant.id, sub.id);
      const remaining = await service.listByTenant(tenant.id);
      expect(remaining).toHaveLength(0);
    });

    it('does nothing when tenant does not match', async () => {
      const tenant: Tenant = await tenantFactory.create();
      const otherTenant: Tenant = await tenantFactory.create();
      const operator: Operator = await operatorFactory.createForTenant(
        tenant.id,
      );
      const inbox: Inbox = await inboxFactory.createWithTenant(tenant);
      const sub = await service.createSubscription(tenant.id, {
        operatorId: operator.id,
        inboxId: inbox.id,
      });

      await service.removeSubscription(otherTenant.id, sub.id);
      const remaining = await service.listByTenant(tenant.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(sub.id);
    });

    it('silently succeeds when subscription id does not exist', async () => {
      const tenant: Tenant = await tenantFactory.create();

      await expect(
        service.removeSubscription(tenant.id, 123_456),
      ).resolves.toBeUndefined();
    });
  });
});
