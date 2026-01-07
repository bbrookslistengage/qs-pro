import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: { method: string; url: string }, res: unknown, next: () => void) {
    const method = String(req?.method ?? '');
    const rawUrl = String(req?.url ?? '');
    const pathname = rawUrl.split('?')[0] || rawUrl;
    this.logger.log(`${method} ${pathname} - Incoming Request`);
    next();
  }
}
