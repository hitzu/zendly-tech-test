import { ApiProperty } from '@nestjs/swagger';

import { ConversationRef } from '../entities/conversation-ref.entity';

export class ConversationContactDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: [String] })
  tags!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;

  constructor(params: {
    id: string;
    name: string;
    email: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = params.id;
    this.name = params.name;
    this.email = params.email;
    this.tags = params.tags;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;
  }
}

export class ConversationContactResponseDto {
  @ApiProperty()
  conversationId!: number;

  @ApiProperty()
  customerPhoneNumber!: string;

  @ApiProperty({ type: ConversationContactDto })
  contact!: ConversationContactDto;

  constructor(conversation: ConversationRef) {
    this.conversationId = conversation.id;
    this.customerPhoneNumber = conversation.customerPhoneNumber;
    this.contact = new ConversationContactDto({
      id: conversation.externalConversationId,
      name: 'John Doe',
      email: 'john.doe@example.com',
      tags: ['vip', 'demo-customer'],
      createdAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-06-01T12:00:00Z',
    });
  }
}
