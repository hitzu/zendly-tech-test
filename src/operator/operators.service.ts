import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { Operator } from './entities/operator.entity';

@Injectable()
export class OperatorsService {
  private readonly logger = new Logger(OperatorsService.name);

  constructor(
    @InjectRepository(Operator)
    private readonly operatorRepository: Repository<Operator>,
  ) {}

  async createOperator(createOperatorDto: CreateOperatorDto): Promise<Operator> {
    this.logger.log({ tenantId: createOperatorDto.tenantId }, 'Creating operator');

    const operator = this.operatorRepository.create({
      ...createOperatorDto,
      id: randomUUID(),
    });

    return this.operatorRepository.save(operator);
  }

  async findOperatorById(id: string): Promise<Operator | null> {
    this.logger.log({ operatorId: id }, 'Fetching operator by id');
    return this.operatorRepository.findOne({ where: { id } });
  }

  async findAllOperators(): Promise<Operator[]> {
    this.logger.log('Listing all operators');
    return this.operatorRepository.find();
  }

  async updateOperator(
    id: string,
    updateOperatorDto: UpdateOperatorDto,
  ): Promise<Operator> {
    this.logger.log({ operatorId: id }, 'Updating operator');

    const operator = await this.findOperatorById(id);
    if (!operator) {
      this.logger.error({ operatorId: id }, 'Operator not found for update');
      throw new NotFoundException('Operator not found');
    }

    Object.assign(operator, updateOperatorDto);
    return this.operatorRepository.save(operator);
  }

  async removeOperator(id: string): Promise<void> {
    this.logger.log({ operatorId: id }, 'Removing operator');
    const result = await this.operatorRepository.softDelete(id);

    if (!result.affected) {
      this.logger.error({ operatorId: id }, 'Operator not found for removal');
      throw new NotFoundException('Operator not found');
    }
  }
}
