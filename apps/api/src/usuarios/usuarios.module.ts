import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_MIN } from '../auth/auth.controller';
import { RONDAS_BCRYPT } from '../auth/auth.service';
import { Roles, UsuarioActual, UsuarioSesion } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class CrearUsuarioDto {
  @IsString() @MinLength(2) @MaxLength(80) nombre: string;

  @Matches(/^[a-z0-9._-]{3,30}$/, { message: 'Usuario: solo minúsculas, números, punto o guion (3 a 30)' })
  usuario: string;

  @IsString() @MinLength(PASSWORD_MIN, { message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` })
  password: string;

  @IsEnum(Rol) rol: Rol;
}

class ActualizarUsuarioDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) nombre?: string;
  /** El dueño restablece la contraseña de otro usuario (p. ej. si la olvidó). */
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN, { message: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres` })
  password?: string;
  @IsOptional() @IsEnum(Rol) rol?: Rol;
  @IsOptional() @IsBoolean() activo?: boolean;
}

const SIN_HASH = { id: true, nombre: true, usuario: true, rol: true, activo: true, creadoEn: true } as const;

/** Usuarios del taller. Solo el dueño los administra. Nunca se borran: se desactivan (quedan en el historial de órdenes). */
@ApiTags('usuarios')
@ApiBearerAuth()
@Roles('DUENO')
@Controller('usuarios')
class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.usuario.findMany({ select: SIN_HASH, orderBy: [{ activo: 'desc' }, { nombre: 'asc' }] });
  }

  @Post()
  async crear(@Body() dto: CrearUsuarioDto) {
    const usuario = dto.usuario.trim().toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { usuario } })) {
      throw new ConflictException(`El usuario "${usuario}" ya existe`);
    }
    return this.prisma.usuario.create({
      data: {
        nombre: dto.nombre.trim(),
        usuario,
        rol: dto.rol,
        passwordHash: await bcrypt.hash(dto.password, RONDAS_BCRYPT),
      },
      select: SIN_HASH,
    });
  }

  @Patch(':id')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarUsuarioDto,
    @UsuarioActual() yo: UsuarioSesion,
  ) {
    const actual = await this.prisma.usuario.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException('Usuario no encontrado');

    if (id === yo.id && dto.activo === false) throw new BadRequestException('No puede desactivar su propio usuario');
    if (id === yo.id && dto.rol && dto.rol !== 'DUENO') {
      throw new BadRequestException('No puede quitarse a sí mismo el rol de dueño');
    }

    // Siempre debe quedar al menos un dueño activo, o nadie podría administrar el sistema.
    const dejaDeSerDuenoActivo =
      actual.rol === 'DUENO' && actual.activo && (dto.activo === false || (dto.rol && dto.rol !== 'DUENO'));
    if (dejaDeSerDuenoActivo) {
      const otros = await this.prisma.usuario.count({ where: { rol: 'DUENO', activo: true, id: { not: id } } });
      if (otros === 0) throw new BadRequestException('Debe quedar al menos un dueño activo');
    }

    const { password, ...resto } = dto;
    return this.prisma.usuario.update({
      where: { id },
      data: {
        ...resto,
        ...(resto.nombre ? { nombre: resto.nombre.trim() } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, RONDAS_BCRYPT) } : {}),
      },
      select: SIN_HASH,
    });
  }
}

@Module({ controllers: [UsuariosController] })
export class UsuariosModule {}
