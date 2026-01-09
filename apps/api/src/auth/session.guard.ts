import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session) {
      throw new UnauthorizedException('No session found');
    }

    const userId = session.get('userId');
    const tenantId = session.get('tenantId');
    const mid = session.get('mid');

    if (
      typeof userId !== 'string' ||
      typeof tenantId !== 'string' ||
      typeof mid !== 'string' ||
      !userId ||
      !tenantId ||
      !mid
    ) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Attach to request for use in controllers.
    request.user = { userId, tenantId, mid };

    return true;
  }
}
