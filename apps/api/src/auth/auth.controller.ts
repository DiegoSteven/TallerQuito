import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, MinLength } from 'class-validator';
import { Publico, UsuarioActual, UsuarioSesion } from '../common/decorators';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  usuario: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Máximo 5 intentos por minuto para frenar ataques de fuerza bruta. */
  @Publico()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.usuario, dto.password);
  }

  @ApiBearerAuth()
  @Get('yo')
  yo(@UsuarioActual() user: UsuarioSesion) {
    return user;
  }
}
