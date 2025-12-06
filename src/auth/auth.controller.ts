import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateOperatorDto } from '../operator/dto/create-operator.dto';
import { AuthService } from './auth.service';
import { DevLoginResponseDto } from './dto/dev-login-response.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Dev-only signup helper to quickly seed operators in testing environments.
  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Dev signup for testing (NOT production ready)' })
  @ApiCreatedResponse({
    description: 'Operator created with a dev token',
    type: DevLoginResponseDto,
  })
  async signup(
    @Body() createOperatorDto: CreateOperatorDto,
  ): Promise<DevLoginResponseDto> {
    return this.authService.signup(createOperatorDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dev login for testing (NOT real auth)' })
  @ApiOkResponse({
    description: 'Returns a dev token and operator info',
    type: DevLoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request',
  })
  @ApiNotFoundResponse({
    description: 'Operator not found or no operators available',
  })
  async login(@Body() loginDto: LoginDto): Promise<DevLoginResponseDto> {
    return this.authService.login(loginDto);
  }
}
