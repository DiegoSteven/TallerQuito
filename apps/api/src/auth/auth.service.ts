import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(usuario: string, password: string) {
    const u = await this.prisma.usuario.findUnique({ where: { usuario: usuario.trim().toLowerCase() } });
    const ok = u?.activo && (await bcrypt.compare(password, u.passwordHash));
    if (!u || !ok) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    const token = await this.jwt.signAsync({ sub: u.id, usuario: u.usuario, rol: u.rol });
    return { token, usuario: { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol } };
  }
}
