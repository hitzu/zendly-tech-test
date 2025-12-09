import type { FactorizedAttrs } from '@jorgebodega/typeorm-factory';
import { Factory } from '@jorgebodega/typeorm-factory';
import { DataSource } from 'typeorm';

import { ConversationLabel } from '../../../src/labels/entities/conversation-label.entity';
import type { ConversationRef } from '../../../src/conversations/entities/conversation-ref.entity';
import type { Label } from '../../../src/labels/entities/label.entity';

export class ConversationLabelFactory extends Factory<ConversationLabel> {
  protected entity = ConversationLabel;
  protected dataSource: DataSource;

  constructor(dataSource: DataSource) {
    super();
    this.dataSource = dataSource;
  }

  protected attrs(): FactorizedAttrs<ConversationLabel> {
    return {
      conversationId: 0, // Should be provided via createWithConversationAndLabel
      labelId: 0, // Should be provided via createWithConversationAndLabel
    };
  }

  async createWithConversationAndLabel(
    conversation: ConversationRef,
    label: Label,
    overrides?: Partial<FactorizedAttrs<ConversationLabel>>,
  ): Promise<ConversationLabel> {
    return this.create({
      conversationId: conversation.id,
      labelId: label.id,
      ...overrides,
    });
  }
}
