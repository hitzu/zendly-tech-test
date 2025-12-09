import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { faker } from '@faker-js/faker';
import { Factory } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';

import { Label } from '../../../src/labels/entities/label.entity';
import type { Inbox } from '../../../src/inboxes/entities/inbox.entity';
import type { Operator } from '../../../src/operators/entities/operator.entity';

export class LabelFactory extends Factory<Label> {
  protected entity = Label;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<Label> {
    return {
      tenantId: faker.number.int({ min: 1, max: 10_000 }),
      inboxId: faker.number.int({ min: 1, max: 10_000 }),
      name: faker.word.adjective() + ' ' + faker.word.noun(),
      color: faker.helpers.maybe(() => faker.internet.color(), {
        probability: 0.7,
      }),
      createdByOperatorId: faker.number.int({ min: 1, max: 10_000 }),
    };
  }

  async createWithInboxAndOperator(
    inbox: Inbox,
    operator: Operator,
    overrides?: Partial<FactorizedAttrs<Label>>,
  ): Promise<Label> {
    return this.create({
      tenantId: inbox.tenantId,
      inboxId: inbox.id,
      createdByOperatorId: operator.id,
      ...overrides,
    });
  }
}
