import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { OperatorInboxSubscriptionsService } from './operator-inbox-subscriptions.service';

describe('OperatorInboxSubscriptionsService (unit)', () => {
  let service: OperatorInboxSubscriptionsService;

  beforeEach(() => {
    service = new OperatorInboxSubscriptionsService();
  });

  describe('createSubscription', () => {
    it('creates a subscription with expected fields', async () => {
      const subscription = await service.createSubscription('tenant-1', {
        operatorId: 'op-1',
        inboxId: 'inbox-1',
      });

      expect(subscription.id).toBeDefined();
      expect(subscription.tenantId).toBe('tenant-1');
      expect(subscription.operatorId).toBe('op-1');
      expect(subscription.inboxId).toBe('inbox-1');
      expect(subscription.createdAt).toBeInstanceOf(Date);
    });

    it('prevents duplicate subscriptions for same tenant/operator/inbox', async () => {
      await service.createSubscription('tenant-1', {
        operatorId: 'op-1',
        inboxId: 'inbox-1',
      });

      await expect(
        service.createSubscription('tenant-1', {
          operatorId: 'op-1',
          inboxId: 'inbox-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows same operator/inbox combination in different tenants', async () => {
      const first = await service.createSubscription('tenant-1', {
        operatorId: 'op-1',
        inboxId: 'inbox-1',
      });
      const second = await service.createSubscription('tenant-2', {
        operatorId: 'op-1',
        inboxId: 'inbox-1',
      });

      expect(first.tenantId).toBe('tenant-1');
      expect(second.tenantId).toBe('tenant-2');
    });
  });

  describe('listByTenant', () => {
    beforeEach(async () => {
      await service.createSubscription('tenant-1', {
        operatorId: 'op-1',
        inboxId: 'inbox-1',
      });
      await service.createSubscription('tenant-1', {
        operatorId: 'op-2',
        inboxId: 'inbox-2',
      });
      await service.createSubscription('tenant-1', {
        operatorId: 'op-2',
        inboxId: 'inbox-3',
      });
      await service.createSubscription('tenant-2', {
        operatorId: 'op-1',
        inboxId: 'inbox-9',
      });
    });

    it('returns only subscriptions for the tenant', async () => {
      const results = await service.listByTenant('tenant-1');
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.tenantId === 'tenant-1')).toBe(true);
    });

    it('filters by operatorId', async () => {
      const results = await service.listByTenant('tenant-1', {
        operatorId: 'op-2',
      });
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.operatorId === 'op-2')).toBe(true);
    });

    it('filters by inboxId', async () => {
      const results = await service.listByTenant('tenant-1', {
        inboxId: 'inbox-1',
      });
      expect(results).toHaveLength(1);
      expect(results[0].inboxId).toBe('inbox-1');
    });
  });

  describe('removeSubscription', () => {
    it('removes subscription in matching tenant', async () => {
      const sub = await service.createSubscription('tenant-1', {
        operatorId: 'op-1',
        inboxId: 'inbox-1',
      });

      await service.removeSubscription('tenant-1', sub.id);
      const remaining = await service.listByTenant('tenant-1');
      expect(remaining).toHaveLength(0);
    });

    it('throws NotFoundException when subscription not found for tenant', async () => {
      await expect(
        service.removeSubscription('tenant-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

