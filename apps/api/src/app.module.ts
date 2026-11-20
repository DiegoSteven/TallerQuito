import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validarEntorno } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './common/roles.guard';
import { HealthModule } from './health/health.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ClientesModule } from './clientes/clientes.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { TiposServicioModule } from './tipos-servicio/tipos-servicio.module';
import { OrdenesModule } from './ordenes/ordenes.module';
import { RecordatoriosModule } from './recordatorios/recordatorios.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { ReportesModule } from './reportes/reportes.module';
import { ImportacionesModule } from './importaciones/importaciones.module';
import { LandingModule } from './landing/landing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsuariosModule,
    ClientesModule,
    VehiculosModule,
    TiposServicioModule,
    OrdenesModule,
    RecordatoriosModule,
    EstadisticasModule,
    ReportesModule,
    ImportacionesModule,
    LandingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
