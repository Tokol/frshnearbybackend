import { Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { User } from "@frsh/database";
import { CurrentUser } from "./current-user.decorator";
import { FirebaseAuthGuard } from "./auth.guard";
import { SessionType } from "./auth.types";
import { AuthService } from "./auth.service";

@Resolver()
export class AuthResolver {
  constructor(private readonly auth: AuthService) {}
  @Query(() => SessionType)
  @UseGuards(FirebaseAuthGuard)
  async session(@CurrentUser() user: User): Promise<SessionType> {
    return { accessGranted: true, user: await this.auth.sessionUser(user.id) };
  }
}
