import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CrearVehiculoDto {
  /** Se normaliza: "pba1234" → "PBA-1234". */
  @IsString() @MinLength(5) placa: string;
  @IsInt() clienteId: number;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsString() modelo?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) anio?: number;
  @IsOptional() @IsString() motor?: string;
  @IsOptional() @IsString() cilindraje?: string;
  /** Chasis */
  @IsOptional() @IsString() vin?: string;
  @IsOptional() @IsString() color?: string;
}

export class ActualizarVehiculoDto extends PartialType(CrearVehiculoDto) {}
