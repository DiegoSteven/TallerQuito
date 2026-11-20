import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Rol } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioSesion } from '../common/decorators';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: number; usuario: string; rol: Rol }): UsuarioSesion {
    return { id: payload.sub, usuario: payload.usuario, rol: payload.rol };
  }
}
