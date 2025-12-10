import { ApiProperty } from '@nestjs/swagger';

import { ConversationRef } from '../entities/conversation-ref.entity';

export class ConversationHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['INBOUND', 'OUTBOUND'] })
  direction!: 'INBOUND' | 'OUTBOUND';

  @ApiProperty({ type: String, format: 'date-time' })
  timestamp!: string;

  @ApiProperty()
  channel!: string;

  @ApiProperty()
  body!: string;

  constructor(params: {
    id: string;
    direction: 'INBOUND' | 'OUTBOUND';
    timestamp: string;
    channel: string;
    body: string;
  }) {
    this.id = params.id;
    this.direction = params.direction;
    this.timestamp = params.timestamp;
    this.channel = params.channel;
    this.body = params.body;
  }
}
export class ConversationHistoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty({ type: [ConversationHistoryItemDto] })
  items!: ConversationHistoryItemDto[];

  constructor(conversation: ConversationRef) {
    this.id = conversation.externalConversationId;
    this.conversationId = conversation.id;
    this.page = 1;
    this.pageSize = 3;
    this.hasNextPage = false;
    this.items = [
      new ConversationHistoryItemDto({
        id: 'msg-1',
        direction: 'INBOUND',
        timestamp: '2025-01-01T10:00:00Z',
        channel: 'whatsapp',
        body: 'Hello, I need help with my order.',
      }),
      new ConversationHistoryItemDto({
        id: 'msg-2',
        direction: 'OUTBOUND',
        timestamp: '2025-01-01T10:01:00Z',
        channel: 'whatsapp',
        body: 'Sure, I can help you with that.',
      }),
      new ConversationHistoryItemDto({
        id: 'msg-3',
        direction: 'INBOUND',
        timestamp: '2025-01-01T10:02:00Z',
        channel: 'whatsapp',
        body: 'Thank you!',
      }),
    ];
  }
}
