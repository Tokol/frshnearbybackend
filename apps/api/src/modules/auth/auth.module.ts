import { Global, Module } from '@nestjs/common';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './auth.guard';
import { FirebaseService } from './firebase.service';

@Global()
@Module({
  providers: [FirebaseService, AuthService, FirebaseAuthGuard, AuthResolver],
  exports: [FirebaseService, AuthService, FirebaseAuthGuard],
})
export class AuthModule {}
