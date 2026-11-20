import { Body, ConflictException, Controller, Get, Module, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class CrearUsuarioDto {
  @IsString()
  nombre: string;

  @Matches(/^[a-z0-9._-]{3,30}$/, { message: 'usuario: solo minúsculas, números, punto o guion (3–30)' })
  usuario: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Rol)
  rol: Rol;
}

class ActualizarUsuarioDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() @MinLength(8) password?: string;
  @IsOptional() @IsEnum(Rol) rol?: Rol;
  @IsOptional() @IsBoolean() activo?: boolean;
}

const SIN_HASH = { id: true, nombre: true, usuario: true, rol: true, activo: true, creadoEn: true } as const;

@ApiTags('usuarios')
@ApiBearerAuth()
@Roles('DUENO')
@Controller('usuarios')
class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.usuario.findMany({ select: SIN_HASH, orderBy: { nombre: 'asc' } });
  }

  @Post()
  async crear(@Body() dto: CrearUsuarioDto) {
    const existe = await this.prisma.usuario.findUnique({ where: { usuario: dto.usuario } });
    if (existe) throw new ConflictException('Ese usuario ya existe');
    return this.prisma.usuario.create({
      data: { nombre: dto.nombre, usuario: dto.usuario, rol: dto.rol, passwordHash: await bcrypt.hash(dto.password, 12) },
      select: SIN_HASH,
    });
  }

  @Patch(':id')
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    const { password, ...resto } = dto;
    return this.prisma.usuario.update({
      where: { id },
      data: { ...resto, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
      select: SIN_HASH,
    });
  }
}

@Module({ controllers: [UsuariosController] })
export class UsuariosModule {}
