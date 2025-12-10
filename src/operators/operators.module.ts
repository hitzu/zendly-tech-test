import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Operator } from './entities/operator.entity';
import { OperatorsController } from './operators.controller';
import { OperatorsService } from './operators.service';
import { OperatorStatusModule } from '../operator-status/operator-status.module';

@Module({
  imports: [TypeOrmModule.forFeature([Operator]), OperatorStatusModule],
  controllers: [OperatorsController],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
