import { Injectable, Logger, NestMiddleware } from '@nestjs/common';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: { method: string; url: string }, _res: unknown, next: () => void) {
    const method = String(req?.method ?? '');
    const rawUrl = String(req?.url ?? '');
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Empty pathname (e.g. "?foo") should use full rawUrl
    const pathname = rawUrl.split('?')[0] || rawUrl;
    this.logger.log(`${method} ${pathname} - Incoming Request`);
    next();
  }
}
