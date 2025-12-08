import { Module } from '@nestjs/common';

import { OperatorsModule } from '../operators/operators.module';
import { TokenModule } from '../tokens/token.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [OperatorsModule, TokenModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
