import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { ConversationRef } from '../../conversations/entities/conversation-ref.entity';
import { Label } from './label.entity';
import { BaseTimeEntity } from '../../common/entities/base-time.entity';

@Entity('conversation_labels')
@Unique('conversation_label_unique', ['conversationId', 'labelId'])
export class ConversationLabel extends BaseTimeEntity {
  @Column('integer', { name: 'conversation_id' })
  conversationId!: number;

  @Column('integer', { name: 'label_id' })
  labelId!: number;

  @ManyToOne(() => ConversationRef, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: ConversationRef;

  @ManyToOne(() => Label, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'label_id' })
  label?: Label;
}
