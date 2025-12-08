import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { Factory } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import { Inbox } from '../../../src/inboxes/entities/inbox.entity';
import type { Tenant } from '../../../src/tenants/entities/tenant.entity';

export class InboxFactory extends Factory<Inbox> {
  protected entity = Inbox;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<Inbox> {
    return {
      tenantId: faker.number.int({ min: 1, max: 10_000 }),
      phoneNumber: faker.phone.number({ style: 'international' }),
      displayName: faker.company.name(),
      active: true,
    };
  }

  async createWithTenant(
    tenant: Tenant,
    overrides?: Partial<FactorizedAttrs<Inbox>>,
  ): Promise<Inbox> {
    return this.create({
      tenantId: tenant.id,
      ...overrides,
    });
  }
}
