import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EXCEPTION_RESPONSE } from 'src/config/errors/exception-response.config';
import { LoginDto } from './dto/login.dto';
import { CreateOperatorDto } from '../operator/dto/create-operator.dto';
import { OperatorsService } from '../operator/operators.service';
import { DevLoginResponseDto } from './dto/dev-login-response.dto';
import type { DevTokenRole } from './guards/dev-token.guard';
import type { Operator } from '../operator/entities/operator.entity';
import { OPERATOR_ROLES } from '../common/types/operator-roles.type';
import { TokenService } from '../token/token.service';
import { TOKEN_TYPE } from '../common/types/token-type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Dev-only auth service. Do not use this implementation in production.
  constructor(
    private readonly operatorsService: OperatorsService,
    private readonly tokenService: TokenService,
  ) {}

  public async signup(
    createOperatorDto: CreateOperatorDto,
  ): Promise<DevLoginResponseDto> {
    const { tenantId } = createOperatorDto;
    this.logger.log({ tenantId }, 'Dev signup requested (test-only)');

    const operator =
      await this.operatorsService.createOperator(createOperatorDto);
    const response = this.buildDevLoginResponse(operator);
    await this.persistToken(response.token, operator.id);

    this.logger.log({ operatorId: operator.id }, 'Dev signup completed');
    return response;
  }

  public async login(loginDto: LoginDto): Promise<DevLoginResponseDto> {
    const { operatorId } = loginDto;
    this.logger.log({ operatorId }, 'Dev login requested (test-only)');

    const operator = operatorId
      ? await this.findOperatorById(operatorId)
      : await this.pickRandomOperator();

    const response = this.buildDevLoginResponse(operator);
    await this.persistToken(response.token, operator.id);

    this.logger.log(
      {
        requestedOperatorId: operatorId,
        chosenOperatorId: response.operatorId,
      },
      'Dev login completed',
    );

    return response;
  }

  private async findOperatorById(operatorId: string): Promise<Operator> {
    const operator = await this.operatorsService.findOperatorById(operatorId);
    if (!operator) {
      this.logger.error(
        { operatorId },
        'Operator not found for provided operatorId',
      );
      throw new NotFoundException(EXCEPTION_RESPONSE.OPERATOR_NOT_FOUND);
    }

    return operator;
  }

  private async pickRandomOperator(): Promise<Operator> {
    const operators = await this.operatorsService.findAllOperators();
    if (!operators.length) {
      this.logger.error('No operators available for dev login');
      throw new NotFoundException(EXCEPTION_RESPONSE.OPERATOR_NOT_FOUND);
    }

    const randomIndex = Math.floor(Math.random() * operators.length);
    return operators[randomIndex];
  }

  private buildDevLoginResponse(operator: Operator): DevLoginResponseDto {
    const role = this.mapOperatorRoleToDevRole(operator.role);
    const tenantId = this.buildTenantId(operator);
    const operatorId = String(operator.id);
    const timestamp = Math.floor(Date.now() / 1000);

    const token = `DEV.v1.${tenantId}.${operatorId}.${role}.${timestamp}`;

    return {
      token,
      operatorId,
      tenantId,
      role,
    };
  }

  private mapOperatorRoleToDevRole(operatorRole: OPERATOR_ROLES): DevTokenRole {
    if (operatorRole === OPERATOR_ROLES.ADMIN) {
      return 'ADMIN';
    }

    if (operatorRole === OPERATOR_ROLES.MANAGER) {
      return 'MANAGER';
    }

    return 'OPERATOR';
  }

  private buildTenantId(operator: Operator): string {
    return operator.tenantId;
  }

  private async persistToken(token: string, operatorId: string): Promise<void> {
    await this.tokenService.registerToken({
      token,
      type: TOKEN_TYPE.ACCESS,
      operatorId,
    });
  }
}
