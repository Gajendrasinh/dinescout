import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service';
import { EmailProvider } from './email.provider';

/**
 * Real outbound email over SMTP — works with any SMTP-speaking vendor
 * (Amazon SES, SendGrid, Mailgun, Postmark, an internal relay, ...), so
 * this isn't tied to one provider's SDK. This class is always instantiated
 * (NestJS builds every provider in a module eagerly), but is only ever
 * *used* — bound to `EMAIL_PROVIDER` — when `AppConfigService.smtp` is set
 * (`SMTP_HOST` configured); see `../auth.module.ts` for the factory that
 * selects between this and `ConsoleEmailProvider`.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  // Built lazily, not in the constructor: NestJS instantiates every
  // provider listed in a module's `providers` array eagerly, regardless of
  // whether auth.module.ts's EMAIL_PROVIDER factory ends up selecting this
  // class or ConsoleEmailProvider — so this constructor runs even when
  // SMTP_HOST is unset, and must not throw or touch nodemailer in that case.
  private transporter?: nodemailer.Transporter;

  constructor(private readonly config: AppConfigService) {}

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      const smtp = this.config.smtp;
      if (!smtp) {
        // Only reachable if something bypasses auth.module.ts's factory
        // and injects this class directly while SMTP_HOST is unset.
        throw new Error('SmtpEmailProvider.send() called without SMTP_HOST configured');
      }
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.auth,
      });
    }
    return this.transporter;
  }

  async send(message: { to: string; subject: string; body: string }): Promise<void> {
    try {
      await this.getTransporter().sendMail({
        from: this.config.emailFrom,
        to: message.to,
        subject: message.subject,
        text: message.body,
      });
    } catch (error) {
      // Never let a downed mail relay surface the reset token/link (or any
      // other email content) in a log or error response — log only that
      // sending failed. Callers (e.g. AuthService.forgotPassword) already
      // don't let this failure change what the API tells the requester,
      // since that response must stay identical whether or not the email
      // address exists (see the user-enumeration note there).
      this.logger.error(`Failed to send "${message.subject}" to ${message.to}: ${(error as Error).message}`);
      throw error;
    }
  }
}
