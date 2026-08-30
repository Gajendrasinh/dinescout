import * as nodemailer from 'nodemailer';
import { AppConfigService } from '../../config/app-config.service';
import { SmtpEmailProvider } from './smtp-email.provider';

jest.mock('nodemailer');

describe('SmtpEmailProvider', () => {
  const sendMail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });
  });

  function configWith(smtp: AppConfigService['smtp']): AppConfigService {
    return {
      smtp,
      emailFrom: 'DineScout <no-reply@dinescout.app>',
    } as AppConfigService;
  }

  it('sends through a transporter built from AppConfigService.smtp', async () => {
    const config = configWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: 'secret' },
    });
    const provider = new SmtpEmailProvider(config);

    await provider.send({ to: 'diner@example.com', subject: 'Hi', body: 'Body text' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: 'secret' },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'DineScout <no-reply@dinescout.app>',
      to: 'diner@example.com',
      subject: 'Hi',
      text: 'Body text',
    });
  });

  it('builds the transporter once and reuses it across sends', async () => {
    const provider = new SmtpEmailProvider(
      configWith({ host: 'smtp.example.com', port: 587, secure: false }),
    );

    await provider.send({ to: 'a@example.com', subject: 'One', body: 'x' });
    await provider.send({ to: 'b@example.com', subject: 'Two', body: 'y' });

    expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('propagates a send failure to the caller (so AuthService can decide how to handle it)', async () => {
    sendMail.mockRejectedValueOnce(new Error('relay unreachable'));
    const provider = new SmtpEmailProvider(
      configWith({ host: 'smtp.example.com', port: 587, secure: false }),
    );

    await expect(
      provider.send({ to: 'diner@example.com', subject: 'Hi', body: 'secret-token-content' }),
    ).rejects.toThrow('relay unreachable');
  });

  it('throws if send() is called with no SMTP host configured, instead of silently no-op-ing', async () => {
    const provider = new SmtpEmailProvider(configWith(undefined));

    await expect(
      provider.send({ to: 'diner@example.com', subject: 'Hi', body: 'x' }),
    ).rejects.toThrow(/SMTP_HOST/);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});
