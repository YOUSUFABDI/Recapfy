import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { BillingService } from '../billing.service';

/**
 * Simple guard that ensures the authenticated user has an ACTIVE subscription.
 * It expects request.user.id to exist (standard when using AuthGuard + passport/jwt).
 * For local dev (if req.user not available) you can adapt to read Authorization header.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Prefer req.user.id (typical when using JwtAuthGuard). Fall back to Authorization header for dev.
    const userId =
      req.user?.id ??
      (req.headers?.authorization
        ? String(req.headers.authorization).replace('Bearer ', '')
        : null);

    if (!userId)
      throw new ForbiddenException('No user context for subscription check');

    const active = await this.billingService.getActivePlanForUser(
      String(userId),
    );
    if (!active) {
      throw new ForbiddenException(
        'Upgrade to a paid plan to access this feature.',
      );
    }

    // Optionally you can check plan code here, e.g. require PRO:
    // if (active.planCode !== 'PRO') throw new ForbiddenException('Pro required');

    return true;
  }
}
