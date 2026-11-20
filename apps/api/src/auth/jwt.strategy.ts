import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioSesion } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Se consulta la base en cada petición: si el dueño desactiva a alguien o le cambia el rol,
   * el cambio aplica de inmediato y no cuando venza el token (hasta 12 h después).
   */
  async validate(payload: { sub: number }): Promise<UsuarioSesion> {
    const u = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, usuario: true, rol: true, activo: true },
    });
    if (!u?.activo) throw new UnauthorizedException('Su usuario fue desactivado o ya no existe');
    return { id: u.id, usuario: u.usuario, rol: u.rol };
  }
}
