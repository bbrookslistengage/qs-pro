import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: any, res: any, next: () => void) {
    const method = String(req?.method ?? '');
    const rawUrl = String(req?.url ?? '');
    const pathname = rawUrl.split('?')[0] || rawUrl;
    this.logger.log(`${method} ${pathname} - Incoming Request`);
    next();
  }
}
