import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { Factory } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';

import { OPERATOR_ROLES } from '../../../src/common/types/operator-roles.type';
import { Operator } from '../../../src/operators/entities/operator.entity';

export class OperatorFactory extends Factory<Operator> {
  protected entity = Operator;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<Operator> {
    return {
      tenantId: faker.number.int({ min: 1, max: 10_000 }),
      name: faker.person.fullName(),
      role: faker.helpers.arrayElement<OPERATOR_ROLES>(
        Object.values(OPERATOR_ROLES),
      ),
    };
  }

  async createForTenant(
    tenantId: number,
    overrides?: Partial<FactorizedAttrs<Operator>>,
  ): Promise<Operator> {
    return this.create({
      tenantId,
      ...overrides,
    });
  }
}
