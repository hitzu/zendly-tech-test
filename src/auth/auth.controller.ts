import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { DevLoginResponseDto } from './dto/dev-login-response.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { SignupDto } from '../user/dto/signup.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Dev-only signup helper to quickly seed users in testing environments.
  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Dev signup for testing (NOT production ready)' })
  @ApiCreatedResponse({
    description: 'User created with a dev token',
    type: DevLoginResponseDto,
  })
  async signup(@Body() signupDto: SignupDto): Promise<DevLoginResponseDto> {
    return this.authService.signup(signupDto);
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
