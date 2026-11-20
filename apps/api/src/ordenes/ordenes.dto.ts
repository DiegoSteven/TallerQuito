import { OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EstadoOrden, TipoItem } from '@prisma/client';
import { CARROCERIAS, COMBUSTIBLE_MAX, type ChecklistRecepcion, type MarcaDanio } from '@taller/shared';
import { BusquedaDto } from '../common/paginacion.dto';

export class ItemOrdenDto {
  /** Tipo de servicio del catálogo. Es lo que permite buscar y calcular recordatorios. */
  @IsOptional() @IsInt() tipoServicioId?: number;
  @IsEnum(TipoItem) tipo: TipoItem;
  @IsString() @MinLength(1) descripcion: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) cantidad: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) precioUnitario: number;
}

export class CrearOrdenDto {
  @IsInt() vehiculoId: number;
  /** Día de la orden. Si no se envía, se toma el de la llegada o el de hoy. */
  @IsOptional() @IsDateString() fecha?: string;
  @IsInt() @Min(0) kilometraje: number;
  @IsOptional() @IsInt() mecanicoId?: number;
  /** Lo que pide el cliente ("suena el motor", "mantenimiento 100 mil"). */
  @IsOptional() @IsString() motivo?: string;
  @IsOptional() @IsString() observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenDto)
  items?: ItemOrdenDto[];

  // Hitos (fecha y hora)
  @IsOptional() @IsDateString() fechaLlegada?: string;
  @IsOptional() @IsDateString() fechaPedidoRepuestos?: string;
  @IsOptional() @IsDateString() fechaLlegadaRepuestos?: string;
  @IsOptional() @IsDateString() fechaEntrega?: string;

  // Recepción
  @IsOptional()
  @IsInt({ message: 'El combustible va en octavos: de 0 (vacío) a 8 (lleno)' })
  @Min(0, { message: 'El combustible va en octavos: de 0 (vacío) a 8 (lleno)' })
  @Max(COMBUSTIBLE_MAX, { message: 'El combustible va en octavos: de 0 (vacío) a 8 (lleno)' })
  combustible?: number;
  /** Checklist SÍ/NO. Claves en @taller/shared → CHECKLIST_RECEPCION. */
  @IsOptional() @IsObject() recepcion?: ChecklistRecepcion;
  @IsOptional() @IsIn(CARROCERIAS.map((c) => c.clave)) carroceria?: string;
  /** Marcas de golpes sobre el dibujo. */
  @IsOptional() @IsArray() danios?: MarcaDanio[];

  /**
   * true = se registra un trabajo ya terminado (p. ej. pasar órdenes viejas de papel): entra CERRADA.
   * false/omitido = recepción de un carro que se queda en el taller: entra ABIERTA.
   */
  @IsOptional() @IsBoolean() entregada?: boolean;

  /** Permite guardar un km menor al último registrado (p. ej. cambio de odómetro). */
  @IsOptional() @IsBoolean() forzarKm?: boolean;
}

export class ActualizarOrdenDto extends PartialType(OmitType(CrearOrdenDto, ['vehiculoId', 'entregada'] as const)) {}

export class ListarOrdenesDto extends BusquedaDto {
  @IsOptional() @IsEnum(EstadoOrden) estado?: EstadoOrden;
  @IsOptional() @Type(() => Number) @IsInt() vehiculoId?: number;
}
