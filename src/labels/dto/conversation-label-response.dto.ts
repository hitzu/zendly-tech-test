import { ApiProperty } from '@nestjs/swagger';

import { ConversationLabel } from '../entities/conversation-label.entity';

export class ConversationLabelResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  conversationId!: number;

  @ApiProperty()
  labelId!: string;

  constructor(conversationLabel: ConversationLabel) {
    this.id = conversationLabel.id;
    this.conversationId = conversationLabel.conversationId;
  }
}
