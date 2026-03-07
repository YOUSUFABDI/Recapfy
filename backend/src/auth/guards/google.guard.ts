import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const state = req.query.state as string | undefined;

    const options: any = {};
    if (state) {
      options.state = state; // this gets sent to Google as the OAuth "state"
    }

    return options;
  }
}
