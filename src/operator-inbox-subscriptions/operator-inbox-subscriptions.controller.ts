import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CreateOperatorInboxSubscriptionDto } from './dto/create-operator-inbox-subscription.dto';
import { ListOperatorInboxSubscriptionsQueryDto } from './dto/list-operator-inbox-subscriptions-query.dto';
import { OperatorInboxSubscriptionResponseDto } from './dto/operator-inbox-subscription-response.dto';
import { OperatorInboxSubscriptionsService } from './operator-inbox-subscriptions.service';

type AuthedRequest = Request & { user?: DevTokenPayload };

@ApiTags('OperatorInboxSubscriptions')
@Controller('operator-inbox-subscriptions')
export class OperatorInboxSubscriptionsController {
  constructor(
    private readonly operatorInboxSubscriptionsService: OperatorInboxSubscriptionsService,
    @InjectPinoLogger(OperatorInboxSubscriptionsController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List operator-inbox subscriptions for the current tenant',
  })
  @ApiOkResponse({ type: [OperatorInboxSubscriptionResponseDto] })
  async list(
    @Req() req: AuthedRequest,
    @Query() query: ListOperatorInboxSubscriptionsQueryDto,
  ): Promise<OperatorInboxSubscriptionResponseDto[]> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        filterOperatorId: query.operatorId,
        filterInboxId: query.inboxId,
      },
      'Listing operator inbox subscriptions',
    );

    const subscriptions =
      await this.operatorInboxSubscriptionsService.listByTenant(user.tenantId, {
        operatorId: query.operatorId,
        inboxId: query.inboxId,
      });
    return subscriptions.map(
      (subscription) => new OperatorInboxSubscriptionResponseDto(subscription),
    );
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List operator inbox subscriptions for an operator',
  })
  @ApiOkResponse({ type: [OperatorInboxSubscriptionResponseDto] })
  async listByOperatorId(
    @Req() req: AuthedRequest,
  ): Promise<OperatorInboxSubscriptionResponseDto[]> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const operatorId = user.operatorId;

    const subscriptions =
      await this.operatorInboxSubscriptionsService.findByOperatorId(operatorId);
    return subscriptions.map(
      (subscription) => new OperatorInboxSubscriptionResponseDto(subscription),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Create a subscription between an operator and an inbox (same tenant only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: OperatorInboxSubscriptionResponseDto,
  })
  async create(
    @Req() req: AuthedRequest,
    @Body()
    createOperatorInboxSubscriptionDto: CreateOperatorInboxSubscriptionDto,
  ): Promise<OperatorInboxSubscriptionResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        targetOperatorId: createOperatorInboxSubscriptionDto.operatorId,
        inboxId: createOperatorInboxSubscriptionDto.inboxId,
      },
      'Creating operator inbox subscription',
    );

    try {
      const subscription =
        await this.operatorInboxSubscriptionsService.createSubscription(
          user.tenantId,
          createOperatorInboxSubscriptionDto,
        );
      return new OperatorInboxSubscriptionResponseDto(subscription);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          inboxId: createOperatorInboxSubscriptionDto.inboxId,
          targetOperatorId: createOperatorInboxSubscriptionDto.operatorId,
        },
        `Failed to create operator inbox subscription, error: ${error}`,
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete operator inbox subscription' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @Param('id') id: number,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    this.logger.info(
      {
        tenantId: user.tenantId,
        operatorId: user.operatorId,
        subscriptionId: id,
      },
      'Removing operator inbox subscription',
    );
    try {
      await this.operatorInboxSubscriptionsService.removeSubscription(
        user.tenantId,
        id,
      );
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          subscriptionId: id,
        },
        `Failed to remove operator inbox subscription, error: ${error}`,
      );
      throw error;
    }
  }
}
