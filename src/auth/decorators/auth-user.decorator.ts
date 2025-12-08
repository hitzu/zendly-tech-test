import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DecodedTokenDto } from '../../tokens/dto/decode-token.dto';

interface AuthenticatedRequest extends Request {
  user: DecodedTokenDto;
}

/**
 * Decorator to extract the authenticated user from the request.
 *
 * @param property - Optional property name to extract from the user object
 * @returns The full DecodedTokenDto or a specific property value
 *
 * @example
 * // Get the full user object
 * findAll(@User() user: DecodedTokenDto) { ... }
 *
 * @example
 * // Get a specific property
 * findAll(@User('id') userId: number) { ... }
 *
 * @example
 * // Get email
 * findAll(@User('email') email: string) { ... }
 */
export const AuthUser = createParamDecorator(
  <K extends keyof DecodedTokenDto>(
    data: K | undefined,
    context: ExecutionContext,
  ): DecodedTokenDto | DecodedTokenDto[K] => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return undefined as unknown as DecodedTokenDto | DecodedTokenDto[K];
    }

    return data ? user[data] : user;
  },
);
