import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from './auth.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const gql = GqlExecutionContext.create(context);
    const request = gql.getContext().req;
    request.user = await this.authService.authenticate(request.headers.authorization);
    return true;
  }
}
