import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { Factory } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';

import { OPERATOR_ROLES } from '../../../src/common/types/operator-roles.type';
import { Operator } from '../../../src/operator/entities/operator.entity';

export class OperatorFactory extends Factory<Operator> {
  protected entity = Operator;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<Operator> {
    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      tenantId: faker.string.alphanumeric(10),
      role: faker.helpers.arrayElement<OPERATOR_ROLES>(
        Object.values(OPERATOR_ROLES),
      ),
    };
  }
}
