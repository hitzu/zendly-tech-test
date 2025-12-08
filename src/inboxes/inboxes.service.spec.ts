import { Repository } from 'typeorm';

import { InboxesService } from './inboxes.service';
import { Inbox } from './entities/inbox.entity';
import { AppDataSource } from '../config/database/data-source';
import { TenantFactory } from '@factories/tenant/tenant.factory';
import { InboxFactory } from '@factories/inbox/inbox.factory';

describe('InboxesService (unit)', () => {
  let service: InboxesService;
  let repo: Repository<Inbox>;
  let tenantFactory: TenantFactory;
  let inboxFactory: InboxFactory;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    repo = AppDataSource.getRepository(Inbox);
    service = new InboxesService(repo);
    tenantFactory = new TenantFactory(AppDataSource);
    inboxFactory = new InboxFactory(AppDataSource);
  });

  describe('createInbox', () => {
    it('creates and persists an inbox for the tenant', async () => {
      const tenant = await tenantFactory.create();

      const created = await service.createInbox(tenant.id, {
        phoneNumber: '+15550000001',
        displayName: 'Support',
      });

      expect(created.id).toBeDefined();
      expect(created.tenantId).toBe(tenant.id);
      expect(created.phoneNumber).toBe('+15550000001');
      expect(created.displayName).toBe('Support');
      expect(created.active).toBe(true);

      const persisted = await repo.findOne({ where: { id: created.id } });
      expect(persisted).not.toBeNull();
      expect(persisted?.tenantId).toBe(tenant.id);
    });
  });

  describe('listByTenant', () => {
    it('returns only active inboxes for the tenant', async () => {
      const tenant = await tenantFactory.create();
      const otherTenant = await tenantFactory.create();

      await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000002',
        displayName: 'Sales',
      });
      const toDeactivate = await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000003',
        displayName: 'Old',
      });
      await inboxFactory.createWithTenant(otherTenant, {
        phoneNumber: '+15550000004',
        displayName: 'Other Tenant',
      });

      await repo.update({ id: toDeactivate.id }, { active: false });

      const results = await service.listByTenant(tenant.id);
      expect(results).toHaveLength(1);
      expect(results[0].tenantId).toBe(tenant.id);
      expect(results[0].active).toBe(true);
      expect(results[0].displayName).toBe('Sales');
    });
  });

  describe('listByIds', () => {
    it('returns inboxes matching ids within the tenant', async () => {
      const tenant = await tenantFactory.create();
      const inboxA = await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000005',
      });
      const inboxB = await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000006',
      });
      await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000007',
      });

      const results = await service.listByIds(tenant.id, [
        inboxA.id,
        inboxB.id,
      ]);

      expect(results.map((r) => r.id).sort()).toEqual(
        [inboxA.id, inboxB.id].sort(),
      );
    });
  });

  describe('findById', () => {
    it('returns the inbox for the tenant', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000008',
        displayName: 'Billing',
      });

      const found = await service.findById(tenant.id, inbox.id);

      expect(found?.id).toBe(inbox.id);
      expect(found?.tenantId).toBe(tenant.id);
    });
  });

  describe('updateInbox', () => {
    it('updates displayName and phoneNumber and persists changes', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000009',
        displayName: 'Ops',
      });

      const updated = await service.updateInbox(tenant.id, inbox.id, {
        phoneNumber: '+15550000010',
        displayName: 'Operations',
      });

      expect(updated.displayName).toBe('Operations');
      expect(updated.phoneNumber).toBe('+15550000010');

      const persisted = await repo.findOne({ where: { id: inbox.id } });
      expect(persisted?.displayName).toBe('Operations');
      expect(persisted?.phoneNumber).toBe('+15550000010');
    });
  });

  describe('removeInbox', () => {
    it('soft deletes the inbox for the tenant', async () => {
      const tenant = await tenantFactory.create();
      const inbox = await inboxFactory.createWithTenant(tenant, {
        phoneNumber: '+15550000011',
        displayName: 'Temp',
      });

      await service.removeInbox(tenant.id, inbox.id);

      const found = await repo.findOne({ where: { id: inbox.id } });
      expect(found).toBeNull();

      const deleted = await repo.findOne({
        where: { id: inbox.id },
        withDeleted: true,
      });
      expect(deleted?.deletedAt).toBeInstanceOf(Date);
    });
  });
});
