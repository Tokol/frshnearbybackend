import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '@frsh/database';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = GqlExecutionContext.create(context).getContext().req.user as User;
    if (!user?.roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN')) throw new ForbiddenException('Administrator access required');
    return true;
  }
}
