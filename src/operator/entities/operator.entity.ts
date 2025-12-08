import { Column, Entity, OneToMany } from 'typeorm';

import { OPERATOR_ROLES } from '../../common/types/operator-roles.type';
import { Token } from '../../token/entities/token.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';

@Entity('operators')
export class Operator extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('text')
  name!: string;

  @Column({
    type: 'enum',
    enum: OPERATOR_ROLES,
    enumName: 'OPERATOR_ROLES',
  })
  role!: OPERATOR_ROLES;

  @OneToMany(() => Token, (token) => token.operator)
  tokens?: Token[];
}
