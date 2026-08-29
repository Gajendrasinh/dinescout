import { Injectable, Logger } from '@nestjs/common';

/**
 * Outbound transactional email (password reset, review notifications).
 * No email vendor credentials (SES/SendGrid/etc.) are available in this
 * environment, so `ConsoleEmailProvider` is the only implementation wired
 * up — it logs the message server-side instead of sending it. Swap in a
 * real implementation behind this same interface once credentials exist;
 * nothing else in the app needs to change.
 */
export interface EmailProvider {
  send(message: { to: string; subject: string; body: string }): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger('ConsoleEmailProvider');

  async send(message: { to: string; subject: string; body: string }): Promise<void> {
    this.logger.warn(
      `[EMAIL PROVIDER NOT CONFIGURED] Would send "${message.subject}" to ${message.to}`,
    );
    // Intentionally not logging `body` — it may contain a reset token/link.
  }
}
