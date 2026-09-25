import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Database } from '../infra/database.js';
import { RedisService } from '../infra/redis.service.js';

type ProbeStatus = 'up' | 'down';

const PROBE_TIMEOUT_MS = 2000;

async function probe(check: () => Promise<unknown>): Promise<ProbeStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS);
  });
  try {
    await Promise.race([check(), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly db: Database,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    const [postgres, redis] = await Promise.all([
      probe(() => this.db.ping()),
      probe(() => this.redis.client.ping()),
    ]);

    if (postgres === 'down' || redis === 'down') {
      throw new ServiceUnavailableException({ status: 'error', postgres, redis });
    }
    return { status: 'ok', postgres, redis };
  }
}
