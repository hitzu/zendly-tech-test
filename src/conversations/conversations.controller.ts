import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request } from 'express';

import { DevTokenPayload } from '../auth/guards/dev-token.guard';
import { ConversationsService } from './conversations.service';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { QueryConversationsDto } from './dto/query-conversations.dto';

type AuthedRequest = Request & { user?: DevTokenPayload };

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    @InjectPinoLogger(ConversationsController.name)
    private readonly logger: PinoLogger,
  ) {}

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
    this.logger.info(
      {
        tenantId,
        inboxId: query.inboxId,
        state: query.state,
        assignedOperatorId: query.assignedOperatorId,
        sort: query.sort ?? 'newest',
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
    @Param('id') id: number,
    @Req() req: AuthedRequest,
  ): Promise<ConversationResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = user.tenantId;
    this.logger.info({ tenantId, conversationId: id }, 'Fetching conversation');
    const conversation = await this.conversationsService.findById(tenantId, id);
    if (!conversation) {
      this.logger.error(
        { tenantId, conversationId: id },
        'Conversation not found',
      );
      throw new NotFoundException('Conversation not found');
    }
    return new ConversationResponseDto(conversation);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or upsert a conversation (metadata only)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ConversationResponseDto })
  async create(
    @Req() req: AuthedRequest,
    @Body() createConversationDto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const tenantId = user.tenantId;
    this.logger.info(
      {
        tenantId,
        inboxId: createConversationDto.inboxId,
        externalConversationId: createConversationDto.externalConversationId,
      },
      'Upserting conversation',
    );
    const conversation = await this.conversationsService.upsert(
      tenantId,
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
    this.logger.info(
      { tenantId, conversationId: id },
      'Updating conversation metadata',
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
