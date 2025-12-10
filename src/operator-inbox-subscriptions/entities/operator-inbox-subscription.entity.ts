import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Inbox } from '../../inboxes/entities/inbox.entity';
import { Operator } from '../../operators/entities/operator.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';

@Entity('operator-inbox-subscriptions')
export class OperatorInboxSubscription extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('integer', { name: 'operator_id' })
  operatorId!: number;

  @Column('integer', { name: 'inbox_id' })
  inboxId!: number;

  @ManyToOne(() => Operator, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'operator_id' })
  operator!: Operator;

  @ManyToOne(() => Inbox, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'inbox_id' })
  inbox!: Inbox;
}
