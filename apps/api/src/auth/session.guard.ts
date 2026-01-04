import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = request.session;

    if (!session) {
      throw new UnauthorizedException('No session found');
    }

    const userId = session.get('userId');
    const tenantId = session.get('tenantId');

    if (!userId || !tenantId) {
      throw new UnauthorizedException('Not authenticated');
    }

    // Attach to request for use in controllers
    // We follow Passport convention by attaching to request.user
    request.user = { userId, tenantId };

    return true;
  }
}
