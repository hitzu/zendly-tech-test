import { Column, Entity, OneToMany } from 'typeorm';

import { BaseTimeEntity } from '../../common/entities/base-time.entity';
import { Operator } from '../../operators/entities/operator.entity';

@Entity('tenants')
export class Tenant extends BaseTimeEntity {
  @Column('text')
  name!: string;

  @OneToMany(() => Operator, (operator) => operator.tenant)
  operators?: Operator[];
}
