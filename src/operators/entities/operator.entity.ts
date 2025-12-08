import { Column, Entity, OneToMany, JoinColumn, ManyToOne } from 'typeorm';

import { OPERATOR_ROLES } from '../../common/types/operator-roles.type';
import { Token } from '../../tokens/entities/token.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';
import { OperatorInboxSubscription } from '../../operator-inbox-subscriptions/entities/operator-inbox-subscription.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

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

  @OneToMany(
    () => OperatorInboxSubscription,
    (subscription) => subscription.operator,
  )
  inboxSubscriptions?: OperatorInboxSubscription[];

  @ManyToOne(() => Tenant, (tenant) => tenant.operators, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;
}
