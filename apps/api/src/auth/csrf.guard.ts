import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

type SecureSession = {
  get(key: string): unknown;
};

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest() as {
      method?: unknown;
      headers?: Record<string, unknown>;
      session?: SecureSession;
    };

    const method = String(request.method ?? '').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const session = request.session;
    if (!session) {
      throw new UnauthorizedException('No session found');
    }

    const expected = session.get('csrfToken');
    if (typeof expected !== 'string' || !expected) {
      throw new UnauthorizedException('Missing CSRF token');
    }

    const headers = request.headers ?? {};
    const receivedRaw =
      headers['x-csrf-token'] ??
      headers['x-xsrf-token'] ??
      headers['x-csrftoken'];
    const received =
      typeof receivedRaw === 'string'
        ? receivedRaw
        : Array.isArray(receivedRaw) && typeof receivedRaw[0] === 'string'
          ? receivedRaw[0]
          : '';

    if (!received) {
      throw new UnauthorizedException('Missing CSRF token');
    }

    const expectedBuf = Buffer.from(expected, 'utf8');
    const receivedBuf = Buffer.from(received, 'utf8');
    if (
      expectedBuf.length !== receivedBuf.length ||
      !timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new UnauthorizedException('Invalid CSRF token');
    }

    return true;
  }
}

