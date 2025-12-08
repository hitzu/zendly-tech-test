import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { Factory } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';

import { Tenant } from '../../../src/tenants/entities/tenant.entity';

export class TenantFactory extends Factory<Tenant> {
  protected entity = Tenant;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<Tenant> {
    return {
      name: faker.company.name(),
    };
  }
}
