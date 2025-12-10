import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { DevTokenPayload } from '../auth/guards/dev-token.guard';
import { ConversationsService } from './conversations.service';
import { ConversationContactResponseDto } from './dto/conversation-contact-response.dto';
import { ConversationHistoryResponseDto } from './dto/conversation-history-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';
import { Public } from '../auth/decorators/public.decorator';

type AuthedRequest = Request & { user?: DevTokenPayload };

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  private readonly logger = new Logger(ConversationsController.name);

  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List conversations for the current tenant with filters',
  })
  @ApiOkResponse({ type: [ConversationResponseDto] })
  async list(
    @Req() req: AuthedRequest,
    @Query() query: QueryConversationsDto,
  ): Promise<ConversationResponseDto[]> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = user.tenantId;
    this.logger.log(
      {
        tenantId,
        inboxId: query.inboxId,
        state: query.state,
        assignedOperatorId: query.assignedOperatorId,
        customerPhoneNumber: query.customerPhoneNumber,
        labelId: query.labelId,
        sort: query.sort ?? 'newest',
        limit: query.limit,
        offset: query.offset,
        page: query.page,
      },
      'Listing conversations for tenant',
    );
    const conversations = await this.conversationsService.list(tenantId, query);
    return conversations.map(
      (conversation) => new ConversationResponseDto(conversation),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a conversation by id for the current tenant' })
  @ApiOkResponse({ type: ConversationResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
  ): Promise<ConversationResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = user.tenantId;
    this.logger.log(
      `Fetching conversation for tenant ${tenantId} and id ${id}`,
    );
    const conversation = await this.conversationsService.findById(id);
    if (!conversation) {
      this.logger.error(
        { tenantId, conversationId: id },
        'Conversation not found',
      );
      throw new NotFoundException('Conversation not found');
    }
    return new ConversationResponseDto(conversation);
  }

  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a conversation history snapshot (mocked) by id for tenant',
  })
  @ApiOkResponse({ type: ConversationHistoryResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  async history(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
  ): Promise<ConversationHistoryResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = user.tenantId;
    const history = await this.conversationsService.getHistoryForConversation(
      tenantId,
      id,
    );
    if (!history) {
      this.logger.error(
        { tenantId, conversationId: id },
        'Conversation not found for history',
      );
      throw new NotFoundException('Conversation not found');
    }
    this.logger.log(
      {
        tenantId,
        conversationId: id,
        externalConversationId: history.id,
      },
      'Returning mocked conversation history',
    );
    return history;
  }

  @Get(':id/contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a conversation contact snapshot (mocked) by id for tenant',
  })
  @ApiOkResponse({ type: ConversationContactResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  async contact(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
  ): Promise<ConversationContactResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = user.tenantId;
    const contactSnapshot =
      await this.conversationsService.getContactForConversation(tenantId, id);
    if (!contactSnapshot) {
      this.logger.error(
        { tenantId, conversationId: id },
        'Conversation not found for contact snapshot',
      );
      throw new NotFoundException('Conversation not found');
    }
    this.logger.log(
      {
        tenantId,
        conversationId: id,
        externalConversationId: contactSnapshot.contact.id,
      },
      'Returning mocked conversation contact snapshot',
    );
    return contactSnapshot;
  }

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or upsert a conversation (metadata only)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ConversationResponseDto })
  async create(
    @Body() createConversationDto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    this.logger.log(
      {
        inboxId: createConversationDto.inboxId,
        externalConversationId: createConversationDto.externalConversationId,
      },
      'Upserting conversation',
    );
    const conversation = await this.conversationsService.upsert(
      createConversationDto,
    );
    return new ConversationResponseDto(conversation);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update conversation metadata (no state changes here)',
  })
  @ApiOkResponse({ type: ConversationResponseDto })
  async update(
    @Param('id') id: number,
    @Req() req: AuthedRequest,
    @Body() updateConversationDto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = user.tenantId;
    this.logger.log(
      `Updating conversation metadata for tenant ${tenantId} and id ${id}`,
    );
    const conversation = await this.conversationsService.updateMetadata(
      tenantId,
      id,
      updateConversationDto,
    );
    if (!conversation) {
      this.logger.error(
        { tenantId, conversationId: id },
        'Conversation not found',
      );
      throw new NotFoundException('Conversation not found');
    }
    return new ConversationResponseDto(conversation);
  }
}
