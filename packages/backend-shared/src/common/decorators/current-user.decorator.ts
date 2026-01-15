import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface UserSession {
  userId: string;
  tenantId: string;
  mid: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
