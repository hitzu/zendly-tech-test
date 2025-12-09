import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { Factory } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { DataSource } from 'typeorm';

import {
  OperatorAvailability,
  OperatorStatus,
} from '../../../src/operator-status/entities/operator-status.entity';
import type { Operator } from '../../../src/operators/entities/operator.entity';

export class OperatorStatusFactory extends Factory<OperatorStatus> {
  protected entity = OperatorStatus;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<OperatorStatus> {
    return {
      operatorId: faker.number.int({ min: 1, max: 10_000 }),
      tenantId: faker.number.int({ min: 1, max: 10_000 }),
      status: OperatorAvailability.OFFLINE,
      lastStatusChangeAt: faker.date.recent(),
    };
  }

  async createForOperator(
    operator: Operator,
    overrides?: Partial<FactorizedAttrs<OperatorStatus>>,
  ): Promise<OperatorStatus> {
    return this.create({
      operatorId: operator.id,
      tenantId: operator.tenantId,
      ...overrides,
    });
  }
}
