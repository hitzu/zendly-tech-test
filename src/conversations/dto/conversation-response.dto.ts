import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationState } from '../conversation-state.enum';
import { ConversationRef } from '../entities/conversation-ref.entity';

export class ConversationResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  tenantId!: number;

  @ApiProperty()
  inboxId!: number;

  @ApiProperty()
  externalConversationId!: string;

  @ApiProperty()
  customerPhoneNumber!: string;

  @ApiProperty({ enum: ConversationState })
  state!: ConversationState;

  @ApiPropertyOptional()
  assignedOperatorId?: number | null;

  @ApiPropertyOptional()
  lastMessageAt?: Date | null;

  @ApiProperty()
  messageCount!: number;

  @ApiProperty()
  priorityScore!: number;

  @ApiPropertyOptional()
  resolvedAt?: Date | null;

  constructor(conversation: ConversationRef) {
    this.id = conversation.id;
    this.tenantId = conversation.tenantId;
    this.inboxId = conversation.inboxId;
    this.externalConversationId = conversation.externalConversationId;
    this.customerPhoneNumber = conversation.customerPhoneNumber;
    this.state = conversation.state;
    this.assignedOperatorId = conversation.assignedOperatorId;
    this.lastMessageAt = conversation.lastMessageAt ?? null;
    this.messageCount = conversation.messageCount;
    this.priorityScore = conversation.priorityScore;
    this.resolvedAt = conversation.resolvedAt ?? null;
  }
}
