import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Inbox } from '../inboxes/entities/inbox.entity';
import { ConversationRef } from '../conversations/entities/conversation-ref.entity';
import { ConversationLabel } from './entities/conversation-label.entity';
import { Label } from './entities/label.entity';
import { LabelsController } from './labels.controller';
import { LabelsService } from './labels.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Label,
      ConversationLabel,
      Inbox,
      ConversationRef,
    ]),
  ],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
