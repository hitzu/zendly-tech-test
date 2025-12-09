import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';

import { Inbox } from '../../inboxes/entities/inbox.entity';
import { Operator } from '../../operators/entities/operator.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { ConversationState } from '../conversation-state.enum';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';
import { ConversationLabel } from '../../labels/entities/conversation-label.entity';

@Entity('conversation_refs')
@Unique('conversation_ref_tenant_external_unique', [
  'tenantId',
  'externalConversationId',
])
export class ConversationRef extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('integer', { name: 'inbox_id' })
  inboxId!: number;

  @Column('text', { name: 'external_conversation_id' })
  externalConversationId!: string;

  @Column('text', { name: 'customer_phone_number' })
  customerPhoneNumber!: string;

  @Column({
    type: 'enum',
    enum: ConversationState,
    enumName: 'CONVERSATION_STATE',
    default: ConversationState.QUEUED,
  })
  state!: ConversationState;

  @Column('integer', { name: 'assigned_operator_id', nullable: true })
  assignedOperatorId?: number | null;

  @Column('timestamptz', { name: 'last_message_at', nullable: true })
  lastMessageAt?: Date | null;

  @Column('integer', { name: 'message_count', default: 0 })
  messageCount!: number;

  @Column('double precision', { name: 'priority_score', default: 0 })
  priorityScore!: number;

  @Column('timestamptz', { name: 'resolved_at', nullable: true })
  resolvedAt?: Date | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @ManyToOne(() => Inbox, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inbox_id' })
  inbox?: Inbox;

  @ManyToOne(() => Operator, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_operator_id' })
  assignedOperator?: Operator | null;

  @OneToMany(
    () => ConversationLabel,
    (conversationLabel) => conversationLabel.conversation,
  )
  conversationLabels?: ConversationLabel[];
}
