import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Request } from 'express';

import { AllocationService } from './allocation.service';
import { ConversationResponseDto } from '../conversations/dto/conversation-response.dto';
import { ClaimDto } from './dto/claim.dto';
import { ResolveDto } from './dto/resolve.dto';
import { DeallocateDto } from './dto/deallocate.dto';
import { ReassignDto } from './dto/reassign.dto';
import { MoveInboxDto } from './dto/move-inbox.dto';
import { DevTokenPayload } from '../auth/guards/dev-token.guard';
import { EXCEPTION_RESPONSE } from '../config/errors/exception-response.config';

type AuthedRequest = Request & { user?: DevTokenPayload };

@ApiTags('allocation')
@Controller('allocation')
export class AllocationController {
  constructor(
    private readonly allocationService: AllocationService,
    @InjectPinoLogger(AllocationController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post('allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auto-allocate the next conversation for the current operator',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'No available conversations for this operator',
  })
  async allocateNext(
    @Req() req: AuthedRequest,
  ): Promise<ConversationResponseDto> {
    const user = this.requireUser(req);
    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        action: 'allocate',
      },
      'Allocating next conversation',
    );
    try {
      const conversation =
        await this.allocationService.allocateNextForOperator(user);
      if (!conversation) {
        this.logger.info(
          {
            tenantId: user.tenantId,
            operatorId: user.operatorId,
            action: 'allocate',
          },
          'No queued conversations available',
        );
        throw new NotFoundException(
          EXCEPTION_RESPONSE.NO_AVAILABLE_CONVERSATIONS,
        );
      }
      return new ConversationResponseDto(conversation);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          action: 'allocate',
          error: (error as Error).message,
        },
        'Failed to auto allocate conversation',
      );
      throw error;
    }
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually claim a queued conversation' })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  async claim(
    @Req() req: AuthedRequest,
    @Body() claimDto: ClaimDto,
  ): Promise<ConversationResponseDto> {
    const user = this.requireUser(req);
    const conversationId = this.parseId(
      claimDto.conversationId,
      'conversation',
    );
    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        conversationId,
        action: 'claim',
      },
      'Claiming conversation',
    );
    try {
      const conversation = await this.allocationService.claimQueuedConversation(
        user,
        conversationId,
      );
      return new ConversationResponseDto(conversation);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          conversationId,
          action: 'claim',
          error: (error as Error).message,
        },
        'Failed to claim conversation',
      );
      throw error;
    }
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an allocated conversation' })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  async resolve(
    @Req() req: AuthedRequest,
    @Body() resolveDto: ResolveDto,
  ): Promise<ConversationResponseDto> {
    const user = this.requireUser(req);
    const conversationId = this.parseId(
      resolveDto.conversationId,
      'conversation',
    );
    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        conversationId,
        action: 'resolve',
      },
      'Resolving conversation',
    );
    try {
      const conversation = await this.allocationService.resolveConversation(
        user,
        conversationId,
      );
      return new ConversationResponseDto(conversation);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          conversationId,
          action: 'resolve',
          error: (error as Error).message,
        },
        'Failed to resolve conversation',
      );
      throw error;
    }
  }

  @Post('deallocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return an allocated conversation to the queue' })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  async deallocate(
    @Req() req: AuthedRequest,
    @Body() deallocateDto: DeallocateDto,
  ): Promise<ConversationResponseDto> {
    const user = this.requireUser(req);
    const conversationId = this.parseId(
      deallocateDto.conversationId,
      'conversation',
    );
    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        conversationId,
        action: 'deallocate',
      },
      'Deallocating conversation',
    );

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException(
        EXCEPTION_RESPONSE.ONLY_ADMIN_OR_MANAGER_CAN_TRIGGER_THIS_ACTION,
      );
    }

    try {
      const conversation = await this.allocationService.deallocateConversation(
        user,
        conversationId,
      );
      return new ConversationResponseDto(conversation);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          conversationId,
          action: 'deallocate',
          error: (error as Error).message,
        },
        'Failed to deallocate conversation',
      );
      throw error;
    }
  }

  @Post('reassign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reassign an allocated conversation to another operator',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  async reassign(
    @Req() req: AuthedRequest,
    @Body() reassignDto: ReassignDto,
  ): Promise<ConversationResponseDto> {
    const user = this.requireUser(req);
    const conversationId = this.parseId(
      reassignDto.conversationId,
      'conversation',
    );
    const newOperatorId = this.parseId(reassignDto.newOperatorId, 'operator');
    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        conversationId,
        newOperatorId,
        action: 'reassign',
      },
      'Reassigning conversation',
    );

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new ForbiddenException(
        EXCEPTION_RESPONSE.ONLY_ADMIN_OR_MANAGER_CAN_TRIGGER_THIS_ACTION,
      );
    }

    try {
      const conversation = await this.allocationService.reassignConversation(
        user,
        conversationId,
        newOperatorId,
      );
      return new ConversationResponseDto(conversation);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          conversationId,
          newOperatorId,
          action: 'reassign',
          error: (error as Error).message,
        },
        'Failed to reassign conversation',
      );
      throw error;
    }
  }

  @Post('move-inbox')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Move a conversation to another inbox within the same tenant',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ConversationResponseDto })
  async moveInbox(
    @Req() req: AuthedRequest,
    @Body() moveInboxDto: MoveInboxDto,
  ): Promise<ConversationResponseDto> {
    const user = this.requireUser(req);
    const conversationId = this.parseId(
      moveInboxDto.conversationId,
      'conversation',
    );
    const newInboxId = this.parseId(moveInboxDto.newInboxId, 'inbox');
    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        conversationId,
        newInboxId,
        action: 'move-inbox',
      },
      'Moving conversation inbox',
    );
    try {
      const conversation = await this.allocationService.moveConversationInbox(
        user,
        conversationId,
        newInboxId,
      );
      return new ConversationResponseDto(conversation);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          conversationId,
          newInboxId,
          action: 'move-inbox',
          error: (error as Error).message,
        },
        'Failed to move conversation inbox',
      );
      throw error;
    }
  }

  private requireUser(req: AuthedRequest): DevTokenPayload {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private parseId(raw: string, label: string): number {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`Invalid ${label} id`);
    }
    return parsed;
  }
}
