import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Usuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export const RONDAS_BCRYPT = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async sesion(u: Usuario) {
    const token = await this.jwt.signAsync({ sub: u.id, usuario: u.usuario, rol: u.rol });
    return { token, usuario: { id: u.id, nombre: u.nombre, usuario: u.usuario, rol: u.rol } };
  }

  async login(usuario: string, password: string) {
    const u = await this.prisma.usuario.findUnique({ where: { usuario: usuario.trim().toLowerCase() } });
    const ok = u?.activo && (await bcrypt.compare(password, u.passwordHash));
    if (!u || !ok) throw new UnauthorizedException('Usuario o contraseña incorrectos');
    return this.sesion(u);
  }

  async cambiarPassword(id: number, actual: string, nueva: string) {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || !(await bcrypt.compare(actual, u.passwordHash))) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }
    if (actual === nueva) throw new BadRequestException('La contraseña nueva debe ser distinta de la actual');
    await this.prisma.usuario.update({ where: { id }, data: { passwordHash: await bcrypt.hash(nueva, RONDAS_BCRYPT) } });
  }
}
