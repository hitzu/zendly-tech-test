import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EXCEPTION_RESPONSE } from 'src/config/errors/exception-response.config';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from '../user/dto/signup.dto';
import { UserService } from '../user/user.service';
import { DevLoginResponseDto } from './dto/dev-login-response.dto';
import type { DevTokenRole } from './guards/dev-token.guard';
import type { User } from '../user/entities/user.entity';
import { USER_ROLES } from '../common/types/user-roles.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Dev-only auth service. Do not use this implementation in production.
  constructor(private readonly userService: UserService) {}

  public async signup(signupDto: SignupDto): Promise<DevLoginResponseDto> {
    const { email } = signupDto;
    this.logger.log({ email }, 'Dev signup requested (test-only)');

    const existingUser = await this.userService.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException(EXCEPTION_RESPONSE.SIGNUP_EMAIL_IN_USE);
    }

    const user = await this.userService.createNewUser(signupDto);
    const response = this.buildDevLoginResponse(user);

    this.logger.log({ userId: user.id }, 'Dev signup completed');
    return response;
  }

  public async login(loginDto: LoginDto): Promise<DevLoginResponseDto> {
    const { operatorId } = loginDto;
    this.logger.log({ operatorId }, 'Dev login requested (test-only)');

    const operator = operatorId
      ? await this.findOperatorById(operatorId)
      : await this.pickRandomOperator();

    const response = this.buildDevLoginResponse(operator);

    this.logger.log(
      {
        requestedOperatorId: operatorId,
        chosenOperatorId: response.operatorId,
      },
      'Dev login completed',
    );

    return response;
  }

  private async findOperatorById(operatorId: string): Promise<User> {
    const parsedId = Number(operatorId);
    if (Number.isNaN(parsedId)) {
      this.logger.error(
        { operatorId },
        'Operator id must be a numeric string for dev login',
      );
      throw new NotFoundException(EXCEPTION_RESPONSE.USER_NOT_FOUND);
    }

    const operator = await this.userService.findUserById(parsedId);
    if (!operator) {
      this.logger.error(
        { operatorId },
        'Operator not found for provided operatorId',
      );
      throw new NotFoundException(EXCEPTION_RESPONSE.USER_NOT_FOUND);
    }

    return operator;
  }

  private async pickRandomOperator(): Promise<User> {
    const operators = await this.userService.findAllUsers();
    if (!operators.length) {
      this.logger.error('No operators available for dev login');
      throw new NotFoundException(EXCEPTION_RESPONSE.USER_NOT_FOUND);
    }

    const randomIndex = Math.floor(Math.random() * operators.length);
    return operators[randomIndex];
  }

  private buildDevLoginResponse(user: User): DevLoginResponseDto {
    const role = this.mapUserRoleToDevRole(user.role);
    const tenantId = this.buildTenantId(user);
    const operatorId = String(user.id);
    const timestamp = Math.floor(Date.now() / 1000);

    const token = `DEV.v1.${tenantId}.${operatorId}.${role}.${timestamp}`;

    return {
      token,
      operatorId,
      tenantId,
      role,
    };
  }

  private mapUserRoleToDevRole(userRole: USER_ROLES): DevTokenRole {
    if (userRole === USER_ROLES.ADMIN) {
      return 'ADMIN';
    }

    if (userRole === USER_ROLES.VIEWER) {
      return 'MANAGER';
    }

    return 'OPERATOR';
  }

  private buildTenantId(user: User): string {
    // No tenant concept exists yet, so derive a stable dev-only tenant id from the user.
    return `tenant-${user.id}`;
  }
}
