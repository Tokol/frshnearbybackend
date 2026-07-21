import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma.module';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const gql = GqlExecutionContext.create(context);
    const request = gql.getContext().req;
    request.user = await this.authService.authenticate(request.headers.authorization);
    const installationId = request.headers['x-frsh-installation-id'];
    if (typeof installationId === 'string' && installationId.length <= 128) {
      void this.prisma.pushInstallation.updateMany({
        where: { userId: request.user.id, installationId, enabled: true },
        data: { lastSeenAt: new Date() },
      }).catch(() => undefined);
    }
    return true;
  }
}
