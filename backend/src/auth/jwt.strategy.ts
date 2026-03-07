import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// You can define this interface or import it if it's in a separate file.
export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // This extractor array tells Passport to try these methods in order.
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. First, it checks for a standard 'Bearer <token>' in the Authorization header.
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. If not found, it checks for a 'token' parameter in the URL query string.
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  /**
   * This method is called by Passport after it successfully verifies the JWT's signature.
   * The 'payload' is the decoded JSON from the token.
   * Whatever is returned from here will be attached to the Request object as `req.user`.
   */
  async validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };
  }
}
