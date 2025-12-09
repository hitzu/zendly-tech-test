import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { ConversationLabelResponseDto } from './dto/conversation-label-response.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { LabelResponseDto } from './dto/label-response.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelsService } from './labels.service';

type AuthedRequest = Request & { user?: DevTokenPayload };

@ApiTags('Labels')
@Controller()
export class LabelsController {
  constructor(
    private readonly labelsService: LabelsService,
    @InjectPinoLogger(LabelsController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get('labels')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List labels for the current tenant' })
  @ApiOkResponse({ type: [LabelResponseDto] })
  async list(
    @Req() req: AuthedRequest,
    @Query('inboxId', ParseIntPipe) inboxId?: number,
  ): Promise<LabelResponseDto[]> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const parsedInboxId = inboxId ? Number(inboxId) : undefined;
    this.logger.info(
      { tenantId: user.tenantId, inboxId: parsedInboxId },
      'Listing labels',
    );
    const labels = await this.labelsService.listLabels(
      user.tenantId,
      parsedInboxId,
    );
    return labels.map((label) => new LabelResponseDto(label));
  }

  @Get('labels/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a label by id for the current tenant' })
  @ApiOkResponse({ type: LabelResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Label not found' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
  ): Promise<LabelResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    this.logger.info(
      { tenantId: user.tenantId, labelId: id },
      'Fetching label by id',
    );
    const label = await this.labelsService.getLabel(user.tenantId, id);
    return new LabelResponseDto(label);
  }

  @Post('labels')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a label in the current tenant' })
  @ApiResponse({ status: HttpStatus.CREATED, type: LabelResponseDto })
  async create(
    @Req() req: AuthedRequest,
    @Body() dto: CreateLabelDto,
  ): Promise<LabelResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        inboxId: dto.inboxId,
      },
      'Creating label',
    );
    const label = await this.labelsService.createLabel(
      user.tenantId,
      user.operatorId,
      dto,
    );
    return new LabelResponseDto(label);
  }

  @Patch('labels/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a label for the current tenant' })
  @ApiOkResponse({ type: LabelResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateLabelDto,
  ): Promise<LabelResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    this.logger.info(
      { tenantId: user.tenantId, labelId: id },
      'Updating label',
    );
    const label = await this.labelsService.updateLabel(user.tenantId, id, dto);
    return new LabelResponseDto(label);
  }

  @Delete('labels/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a label for the current tenant' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    this.logger.info(
      { tenantId: user.tenantId, labelId: id },
      'Deleting label',
    );
    await this.labelsService.deleteLabel(user.tenantId, id);
  }

  @Post('conversations/:conversationId/labels/:labelId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach a label to a conversation' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: ConversationLabelResponseDto,
  })
  async attach(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('labelId', ParseIntPipe) labelId: number,
    @Req() req: AuthedRequest,
  ): Promise<ConversationLabelResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    this.logger.info(
      { tenantId: user.tenantId, conversationId, labelId },
      'Attaching label to conversation',
    );
    const conversationLabel =
      await this.labelsService.attachLabelToConversation(
        user.tenantId,
        conversationId,
        labelId,
      );
    return new ConversationLabelResponseDto(conversationLabel);
  }

  @Delete('conversations/:conversationId/labels/:labelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Detach a label from a conversation' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async detach(
    @Param('conversationId', ParseIntPipe) conversationId: number,
    @Param('labelId') labelId: number,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    this.logger.info(
      { tenantId: user.tenantId, conversationId, labelId },
      'Detaching label from conversation',
    );
    await this.labelsService.detachLabelFromConversation(
      user.tenantId,
      conversationId,
      labelId,
    );
  }
}
