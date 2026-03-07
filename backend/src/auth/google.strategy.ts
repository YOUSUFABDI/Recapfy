import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';

export type GoogleProfile = {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['profile', 'email'],
      passReqToCallback: false,
    });

    if (
      !config.get('GOOGLE_CLIENT_ID') ||
      !config.get('GOOGLE_CLIENT_SECRET') ||
      !config.get('GOOGLE_CALLBACK_URL')
    ) {
      throw new InternalServerErrorException(
        'Google OAuth environment variables are missing',
      );
    }
  }

  /**
   * Map Google profile -> a light object we can use downstream
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<GoogleProfile> {
    const email =
      profile.emails && profile.emails.length ? profile.emails[0].value : null;

    return {
      id: profile.id,
      email,
      name: profile.displayName ?? null,
      avatar:
        (profile.photos && profile.photos.length && profile.photos[0].value) ||
        null,
    };
  }
}
