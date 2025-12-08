import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationRef } from './entities/conversation-ref.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationRef])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
