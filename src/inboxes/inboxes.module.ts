import { Module } from '@nestjs/common';

import { InboxesController } from './inboxes.controller';
import { InboxesService } from './inboxes.service';
import { Inbox } from './entities/inbox.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Inbox])],
  controllers: [InboxesController],
  providers: [InboxesService],
  exports: [InboxesService],
})
export class InboxesModule {}
