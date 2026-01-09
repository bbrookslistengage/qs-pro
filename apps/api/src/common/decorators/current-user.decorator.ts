import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export interface UserSession {
  userId: string;
  tenantId: string;
  mid: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserSession => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as Partial<UserSession> | undefined;
    if (
      !user ||
      typeof user.userId !== 'string' ||
      typeof user.tenantId !== 'string' ||
      typeof user.mid !== 'string'
    ) {
      throw new UnauthorizedException('Not authenticated');
    }
    return { userId: user.userId, tenantId: user.tenantId, mid: user.mid };
  },
);
