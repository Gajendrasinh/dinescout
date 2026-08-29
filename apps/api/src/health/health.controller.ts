import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  /** Liveness+readiness combined view for humans/dashboards. */
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.check('database'), () => this.redis.check('redis')]);
  }

  /** Liveness: is the process up at all? No dependency checks — used by
   *  the container orchestrator to decide whether to restart the pod. */
  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  /** Readiness: can this instance actually serve traffic right now? */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.check('database'), () => this.redis.check('redis')]);
  }
}
