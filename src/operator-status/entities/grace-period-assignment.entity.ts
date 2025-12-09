import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { ConversationRef } from '../../conversations/entities/conversation-ref.entity';
import { Operator } from '../../operators/entities/operator.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';

export enum GracePeriodReason {
  OFFLINE = 'OFFLINE',
  MANUAL = 'MANUAL',
}

@Entity('grace_period_assignments')
@Unique('grace_period_conversation_operator_unique', [
  'conversationId',
  'operatorId',
])
export class GracePeriodAssignment extends BaseTimeEntity {
  @Column('integer', { name: 'tenant_id' })
  tenantId!: number;

  @Column('integer', { name: 'conversation_id' })
  conversationId!: number;

  @Column('integer', { name: 'operator_id' })
  operatorId!: number;

  @Index('grace_period_expires_at_idx')
  @Column('timestamptz', { name: 'expires_at' })
  expiresAt!: Date;

  @Column({
    type: 'enum',
    enum: GracePeriodReason,
    enumName: 'GRACE_PERIOD_REASON',
  })
  reason!: GracePeriodReason;

  @ManyToOne(() => ConversationRef, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: ConversationRef;

  @ManyToOne(() => Operator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operator_id' })
  operator?: Operator;
}
