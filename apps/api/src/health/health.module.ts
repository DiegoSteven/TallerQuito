import { Controller, Get, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Publico } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('salud')
@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Lo usan Docker (healthcheck) y UptimeRobot. */
  @Publico()
  @SkipThrottle()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { estado: 'ok', hora: new Date().toISOString() };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
