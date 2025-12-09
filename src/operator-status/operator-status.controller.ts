import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  Body,
  BadRequestException,
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
import { UpdateOperatorStatusDto } from './dto/update-operator-status.dto';
import { OperatorStatus } from './entities/operator-status.entity';
import { OperatorStatusService } from './operator-status.service';

type AuthedRequest = Request & { user?: DevTokenPayload };

@ApiTags('OperatorStatus')
@Controller('operator-status')
export class OperatorStatusController {
  constructor(
    private readonly operatorStatusService: OperatorStatusService,
    @InjectPinoLogger(OperatorStatusController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current operator status' })
  @ApiOkResponse({ type: OperatorStatus })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Status not found for operator',
  })
  async getMyStatus(@Req() req: AuthedRequest): Promise<OperatorStatus> {
    const user = this.requireUser(req);
    const status = await this.operatorStatusService.getStatus(
      user.tenantId,
      user.operatorId,
    );
    if (!status) {
      throw new NotFoundException('Operator status not found');
    }
    return status;
  }

  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set current operator status' })
  @ApiOkResponse({ type: OperatorStatus })
  async setMyStatus(
    @Req() req: AuthedRequest,
    @Body() body: UpdateOperatorStatusDto,
  ): Promise<OperatorStatus> {
    const user = this.requireUser(req);
    this.logger.info(
      { tenantId: user.tenantId, operatorId: user.operatorId, status: body },
      'Updating operator status',
    );
    return this.operatorStatusService.setStatus(
      user.tenantId,
      user.operatorId,
      body.status,
    );
  }

  @Get(':operatorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get status for another operator (manager/admin only)',
  })
  @ApiOkResponse({ type: OperatorStatus })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only managers or admins can view other operators',
  })
  async getOperatorStatus(
    @Param('operatorId') operatorIdRaw: string,
    @Req() req: AuthedRequest,
  ): Promise<OperatorStatus> {
    const user = this.requireUser(req);
    if (!this.isManagerOrAdmin(user)) {
      throw new ForbiddenException('Only managers or admins can view others');
    }
    const operatorId = this.parseId(operatorIdRaw, 'operator');
    const status = await this.operatorStatusService.getStatus(
      user.tenantId,
      operatorId,
    );
    if (!status) {
      throw new NotFoundException('Operator status not found');
    }
    return status;
  }

  private requireUser(req: AuthedRequest): DevTokenPayload {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

  private isManagerOrAdmin(user: DevTokenPayload): boolean {
    return user.role === 'MANAGER' || user.role === 'ADMIN';
  }

  private parseId(raw: string, label: string): number {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`Invalid ${label} id`);
    }
    return parsed;
  }
}
