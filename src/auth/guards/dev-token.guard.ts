import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../../token/token.service';

// Lightweight dev-only guard: parses a simple dev token and attaches it to the request.
export type DevTokenRole = 'OPERATOR' | 'MANAGER' | 'ADMIN';

export interface DevTokenPayload {
  tenantId: string;
  operatorId: string;
  role: DevTokenRole;
  issuedAt: number;
}

const DEV_TOKEN_PREFIX = 'DEV';
const DEV_TOKEN_VERSION = 'v1';
const DEV_TOKEN_ROLES: DevTokenRole[] = ['OPERATOR', 'MANAGER', 'ADMIN'];

@Injectable()
export class DevTokenGuard implements CanActivate {
  private readonly logger = new Logger(DevTokenGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: DevTokenPayload }>();

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      this.logger.warn('Missing Authorization header');
      throw new UnauthorizedException('Authorization header missing');
    }

    const [scheme, rawToken] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !rawToken) {
      this.logger.warn('Invalid Authorization scheme');
      throw new UnauthorizedException('Bearer token required');
    }

    const parts = rawToken.split('.');
    if (parts.length !== 6) {
      this.logger.warn('Dev token has invalid segment count');
      throw new UnauthorizedException('Invalid dev token format');
    }

    const [prefix, version, tenantId, operatorId, role, timestamp] = parts;

    if (prefix !== DEV_TOKEN_PREFIX || version !== DEV_TOKEN_VERSION) {
      this.logger.warn('Dev token prefix/version invalid');
      throw new UnauthorizedException('Invalid dev token prefix or version');
    }

    if (!DEV_TOKEN_ROLES.includes(role as DevTokenRole)) {
      this.logger.warn('Dev token role not allowed');
      throw new UnauthorizedException('Invalid dev token role');
    }

    const issuedAt = Number(timestamp);
    if (Number.isNaN(issuedAt)) {
      this.logger.warn('Dev token timestamp is not a number');
      throw new UnauthorizedException('Invalid dev token timestamp');
    }

    const payload: DevTokenPayload = {
      tenantId,
      operatorId,
      role: role as DevTokenRole,
      issuedAt,
    };

    const tokenRecord = await this.tokenService.findActiveToken(rawToken);
    if (!tokenRecord) {
      this.logger.warn('Token not registered in store');
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (tokenRecord.operator && tokenRecord.operator.id !== operatorId) {
      this.logger.warn('Token does not belong to provided operator');
      throw new UnauthorizedException('Token operator mismatch');
    }

    request.user = payload;
    this.logger.debug(
      `Accepted dev token for operator ${payload.operatorId} in tenant ${payload.tenantId}`,
    );

    return true;
  }
}
