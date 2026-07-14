import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '@frsh/database';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const user = GqlExecutionContext.create(context).getContext().req.user as User;
    if (!user?.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Super administrator access required');
    }
    return true;
  }
}
