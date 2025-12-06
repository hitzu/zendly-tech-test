import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  NotFoundException,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { CreateOperatorDto } from './dto/create-operator.dto';
import { OperatorResponseDto } from './dto/operator-response.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { OperatorsService } from './operators.service';

@ApiTags('Operators')
@Controller('operators')
export class OperatorsController {
  constructor(
    private readonly operatorsService: OperatorsService,
    @InjectPinoLogger(OperatorsController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List operators' })
  @ApiOkResponse({ type: [OperatorResponseDto] })
  async findAll(): Promise<OperatorResponseDto[]> {
    this.logger.info('Requesting operator list');
    const operators = await this.operatorsService.findAllOperators();
    return operators.map((operator) => new OperatorResponseDto(operator));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get operator by id' })
  @ApiOkResponse({ type: OperatorResponseDto })
  @ApiNotFoundResponse({ description: 'Operator not found' })
  async findOne(@Param('id') id: string): Promise<OperatorResponseDto> {
    this.logger.info({ operatorId: id }, 'Requesting operator by id');
    const operator = await this.operatorsService.findOperatorById(id);
    if (!operator) {
      this.logger.error({ operatorId: id }, 'Operator not found');
      throw new NotFoundException('Operator not found');
    }

    return new OperatorResponseDto(operator);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create operator' })
  @ApiCreatedResponse({ type: OperatorResponseDto })
  async create(
    @Body() createOperatorDto: CreateOperatorDto,
  ): Promise<OperatorResponseDto> {
    this.logger.info(
      { tenantId: createOperatorDto.tenantId },
      'Creating operator',
    );
    const operator =
      await this.operatorsService.createOperator(createOperatorDto);
    return new OperatorResponseDto(operator);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update operator' })
  @ApiOkResponse({ type: OperatorResponseDto })
  @ApiNotFoundResponse({ description: 'Operator not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOperatorDto: UpdateOperatorDto,
  ): Promise<OperatorResponseDto> {
    this.logger.info(
      { operatorId: id, update: updateOperatorDto },
      'Updating operator',
    );
    const operator = await this.operatorsService.updateOperator(
      id,
      updateOperatorDto,
    );
    return new OperatorResponseDto(operator);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete operator' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Operator not found' })
  async remove(@Param('id') id: string): Promise<void> {
    this.logger.info({ operatorId: id }, 'Deleting operator');
    await this.operatorsService.removeOperator(id);
  }
}
