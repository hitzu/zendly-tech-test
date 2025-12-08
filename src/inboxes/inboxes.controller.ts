import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { ListInboxesQueryDto } from './dto/list-inboxes-query.dto';
import { CreateInboxDto } from './dto/create-inbox.dto';
import { UpdateInboxDto } from './dto/update-inbox.dto';
import { InboxResponseDto } from './dto/inbox-response.dto';
import { InboxesService } from './inboxes.service';

type AuthedRequest = Request & { user?: DevTokenPayload };

@ApiTags('Inboxes')
@Controller('inboxes')
export class InboxesController {
  constructor(
    private readonly inboxesService: InboxesService,
    @InjectPinoLogger(InboxesController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List inboxes for the current user, behavior depends on role',
  })
  @ApiOkResponse({ type: [InboxResponseDto] })
  async list(
    @Req() req: AuthedRequest,
    @Query() query: ListInboxesQueryDto,
  ): Promise<InboxResponseDto[]> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const { tenantId, operatorId, role } = user;
    this.logger.info(
      { tenantId, operatorId, role },
      'Listing inboxes for current user',
    );

    const accessible =
      role === 'MANAGER' || role === 'ADMIN'
        ? await this.inboxesService.listByTenant(tenantId)
        : await this.inboxesService.listByIds(tenantId, []);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    const paged = accessible.slice(start, start + limit);

    return paged.map((inbox) => new InboxResponseDto(inbox));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get inbox by id for current tenant' })
  @ApiOkResponse({ type: InboxResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Inbox not found' })
  async findOne(
    @Param('id') id: number,
    @Req() req: AuthedRequest,
  ): Promise<InboxResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const { tenantId, operatorId } = user;
    this.logger.info({ tenantId, operatorId, inboxId: id }, 'Fetching inbox');

    const inbox = await this.inboxesService.findById(tenantId, id);
    if (!inbox) {
      this.logger.error(
        { tenantId, operatorId, inboxId: id },
        'Inbox not found',
      );
      throw new NotFoundException('Inbox not found');
    }

    return new InboxResponseDto(inbox);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create inbox' })
  @ApiResponse({ status: HttpStatus.CREATED, type: InboxResponseDto })
  async create(
    @Req() req: AuthedRequest,
    @Body() createInboxDto: CreateInboxDto,
  ): Promise<InboxResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      this.logger.error(
        { tenantId: user.tenantId, operatorId: user.operatorId },
        'Insufficient role to create inbox',
      );
      throw new ForbiddenException(
        'Only managers or admins can create inboxes',
      );
    }

    this.logger.info(
      { tenantId: user.tenantId, operatorId: user.operatorId },
      'Creating inbox',
    );
    try {
      const inbox = await this.inboxesService.createInbox(
        user.tenantId,
        createInboxDto,
      );
      return new InboxResponseDto(inbox);
    } catch (error) {
      this.logger.error(
        { tenantId: user.tenantId, operatorId: user.operatorId },
        `Failed to create inbox: ${error}`,
      );
      throw error;
    }
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update inbox' })
  @ApiOkResponse({ type: InboxResponseDto })
  async update(
    @Param('id') id: number,
    @Req() req: AuthedRequest,
    @Body() updateInboxDto: UpdateInboxDto,
  ): Promise<InboxResponseDto> {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    this.logger.info(
      { tenantId: user.tenantId, operatorId: user.operatorId, inboxId: id },
      'Updating inbox',
    );
    try {
      const inbox = await this.inboxesService.updateInbox(
        user.tenantId,
        id,
        updateInboxDto,
      );
      return new InboxResponseDto(inbox);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          inboxId: id,
        },
        `Failed to update inbox: ${error}`,
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete inbox (soft)' })
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
      { tenantId: user.tenantId, operatorId: user.operatorId, inboxId: id },
      'Removing inbox',
    );
    try {
      await this.inboxesService.removeInbox(user.tenantId, id);
    } catch (error) {
      this.logger.error(
        {
          tenantId: user.tenantId,
          operatorId: user.operatorId,
          inboxId: id,
        },
        `Failed to remove inbox: ${error}`,
      );
      throw error;
    }
  }
}
