import { Column, Entity, OneToMany } from 'typeorm';

import { OperatorInboxSubscription } from '../../operator-inbox-subscriptions/entities/operator-inbox-subscription.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';

@Entity('inboxes')
export class Inbox extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('text', { name: 'phone_number' })
  phoneNumber!: string;

  @Column('text', { name: 'display_name' })
  displayName!: string;

  @Column('boolean', { name: 'active', default: true })
  active!: boolean;

  @OneToMany(
    () => OperatorInboxSubscription,
    (subscription) => subscription.inbox,
  )
  operatorSubscriptions?: OperatorInboxSubscription[];
}
