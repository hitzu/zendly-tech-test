import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { Inbox } from '../../inboxes/entities/inbox.entity';
import { Operator } from '../../operators/entities/operator.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';

@Entity('labels')
@Unique('label_tenant_inbox_name_unique', ['tenantId', 'inboxId', 'name'])
export class Label extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('integer', { name: 'inbox_id' })
  inboxId!: number;

  @Column('text')
  name!: string;

  @Column('text', { name: 'color', nullable: true })
  color?: string | null;

  @Column('integer', { name: 'created_by_operator_id' })
  createdByOperatorId!: number;

  @ManyToOne(() => Inbox, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inbox_id' })
  inbox?: Inbox;

  @ManyToOne(() => Operator, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_operator_id' })
  createdBy?: Operator | null;
}
