import { BaseTimeEntity } from '../../common/entities/base-time.entity';
import { Column, Entity } from 'typeorm';

@Entity('operator-inbox-subscriptions')
export class OperatorInboxSubscription extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('integer', { name: 'operator_id' })
  operatorId!: number;

  @Column('integer', { name: 'inbox_id' })
  inboxId!: number;
}
