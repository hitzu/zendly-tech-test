import { BadRequestException, NotFoundException } from '@nestjs/common';

import { InboxesService } from './inboxes.service';

describe('InboxesService (unit)', () => {
  let service: InboxesService;

  beforeEach(() => {
    service = new InboxesService();
  });

  describe('createInbox', () => {
    it('creates an inbox with required fields', async () => {
      const inbox = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'Support',
      });

      expect(inbox.id).toBeDefined();
      expect(inbox.tenantId).toBe('tenant-1');
      expect(inbox.phoneNumber).toBe('+10000000001');
      expect(inbox.displayName).toBe('Support');
      expect(inbox.active).toBe(true);
      expect(inbox.createdAt).toBeInstanceOf(Date);
      expect(inbox.updatedAt).toBeInstanceOf(Date);
    });

    it('rejects duplicate phone numbers within the same tenant', async () => {
      await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'Support',
      });

      await expect(
        service.createInbox('tenant-1', {
          phoneNumber: '+10000000001',
          displayName: 'Sales',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows same phone number in different tenants', async () => {
      const first = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'Support',
      });
      const second = await service.createInbox('tenant-2', {
        phoneNumber: '+10000000001',
        displayName: 'Support 2',
      });

      expect(first.tenantId).toBe('tenant-1');
      expect(second.tenantId).toBe('tenant-2');
    });
  });

  describe('list and find', () => {
    it('lists active inboxes by tenant', async () => {
      await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'A',
      });
      await service.createInbox('tenant-1', {
        phoneNumber: '+10000000002',
        displayName: 'B',
      });
      const inactive = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000003',
        displayName: 'C',
      });
      await service.removeInbox('tenant-1', inactive.id);

      const results = await service.listByTenant('tenant-1');
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.phoneNumber)).toEqual([
        '+10000000001',
        '+10000000002',
      ]);
    });

    it('listByIds returns only requested ids within tenant', async () => {
      const a = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'A',
      });
      await service.createInbox('tenant-1', {
        phoneNumber: '+10000000002',
        displayName: 'B',
      });

      const results = await service.listByIds('tenant-1', [a.id, 'missing']);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(a.id);
    });

    it('findById respects tenant scoping', async () => {
      const inbox = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'A',
      });

      const found = await service.findById('tenant-1', inbox.id);
      const notFound = await service.findById('tenant-2', inbox.id);

      expect(found?.id).toBe(inbox.id);
      expect(notFound).toBeNull();
    });
  });

  describe('updateInbox', () => {
    it('updates displayName and phoneNumber, refreshing updatedAt', async () => {
      const inbox = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'Old',
      });
      const previousUpdatedAt = inbox.updatedAt;

      const updated = await service.updateInbox('tenant-1', inbox.id, {
        phoneNumber: '+10000000009',
        displayName: 'New',
      });

      expect(updated.displayName).toBe('New');
      expect(updated.phoneNumber).toBe('+10000000009');
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    it('rejects duplicate phone number on update within tenant', async () => {
      const a = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'A',
      });
      const b = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000002',
        displayName: 'B',
      });

      await expect(
        service.updateInbox('tenant-1', b.id, {
          phoneNumber: a.phoneNumber,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException for missing inbox', async () => {
      await expect(
        service.updateInbox('tenant-1', 'missing', { displayName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeInbox', () => {
    it('soft deletes by marking inactive and updating timestamp', async () => {
      const inbox = await service.createInbox('tenant-1', {
        phoneNumber: '+10000000001',
        displayName: 'A',
      });

      await service.removeInbox('tenant-1', inbox.id);
      const found = await service.findById('tenant-1', inbox.id);

      expect(found).toBeNull();
    });

    it('throws NotFoundException when inbox missing', async () => {
      await expect(
        service.removeInbox('tenant-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
