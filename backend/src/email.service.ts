import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type BrandConfig = {
  companyName: string;
  logoUrl: string; // Hosted https URL or CID (if you attach images)
  primaryColor: string; // Hex
  supportEmail?: string;
  websiteUrl?: string;
  //   addressLine?: string; // Shown in footer
};

@Injectable()
export class EmailService {
  private transporter;
  private brand: BrandConfig;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: this.configService.get<string>('GMAIL_USER'),
        pass: this.configService.get<string>('GMAIL_PASS'),
      },
    });

    // Centralized branding (can also come from env/config)
    this.brand = {
      companyName: 'Recapfy',
      logoUrl: 'https://recapfy-store.s3.us-east-1.amazonaws.com/logo-icon.png',
      primaryColor: '#7C87FF',
      supportEmail: 'recapfyy@gmail.com',
      websiteUrl: 'https://recapfy.com',
      //   addressLine: 'Taleex, Mogadishu, SO',
    };
  }

  /** -------------------------
   *  Public API
   *  ------------------------- */
  async sendEmail(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: `${this.brand.companyName} <${this.configService.get<string>('GMAIL_USER')}>`,
      to,
      subject,
      html,
    });
  }

  /** Generic: pass any content; we’ll wrap it in the branded template */
  async sendBrandedEmail(opts: {
    to: string;
    subject: string;
    heading?: string;
    preheader?: string;
    contentHtml: string; // inner body content (safe HTML)
    cta?: { label: string; href: string };
  }) {
    const html = this.renderBrandTemplate({
      heading: opts.heading ?? opts.subject,
      preheader: opts.preheader,
      contentHtml: opts.contentHtml,
      cta: opts.cta,
    });
    await this.sendEmail(opts.to, opts.subject, html);
  }

  /** Specific examples using the same wrapper */

  async sendOTPEmail(to: string, otp: number) {
    const content = `
      <p>Your one-time code is:</p>
      <div style="font-size:28px; font-weight:700; letter-spacing:3px; margin:12px 0;">${otp}</div>
      <p>This code expires in 10 minutes. If you didn’t request it, you can ignore this message.</p>
    `;
    await this.sendBrandedEmail({
      to,
      subject: 'Your OTP code',
      heading: 'Verify it!',
      preheader: 'Use this code to continue',
      contentHtml: content,
    });
  }

  /** -------------------------
   *  Template (single source of truth)
   *  ------------------------- */
  private renderBrandTemplate(opts: {
    heading: string;
    contentHtml: string;
    preheader?: string;
    cta?: { label: string; href: string };
  }) {
    const {
      companyName,
      logoUrl,
      primaryColor,
      supportEmail,
      websiteUrl,
      //   addressLine,
    } = this.brand;
    const preheader = (opts.preheader ?? '').replace(/\s+/g, ' ').trim();

    return `
<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charSet="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${this.escape(companyName)} - ${this.escape(opts.heading)}</title>
  ${preheader ? `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${this.escape(preheader)}</span>` : ''}
  <style>
    /* Mobile tweaks */
    @media (max-width:600px) {
      .container { width:100% !important; padding:16px !important; }
      .card { padding:16px !important; }
      .h1 { font-size:20px !important; }
    }
    /* Dark mode hint */
    @media (prefers-color-scheme: dark) {
      body, .card { background:#0b1220 !important; color:#e5e7eb !important; }
      .muted { color:#94a3b8 !important; }
    }
    /* Buttons that work across most clients */
    .btn {
      display:inline-block; text-decoration:none;
      padding:12px 18px; border-radius:8px; font-weight:600;
      background:${primaryColor}; color:#ffffff !important;
    }
    .muted { color:#6b7280; }
    a { color:${primaryColor}; }
  </style>
</head>
<body style="margin:0; padding:0; background:#f3f4f6;">
  <table role="presentation" width="100%" style="background:#f3f4f6; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="600" style="width:600px; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="padding:20px 24px; background:#ffffff; border-bottom:1px solid #e5e7eb;">
              <table role="presentation" width="100%">
                <tr>
                  <td align="left" style="vertical-align:middle;">
                    <img src="${logoUrl}" alt="${this.escape(companyName)}" height="80" style="display:block; border:0; outline:none; text-decoration:none; border-radius: 6px">
                  </td>
                  <td align="right" style="font-size:12px;" class="muted">
                    ${websiteUrl ? `<a href="${websiteUrl}" style="text-decoration:none; color:inherit;">${this.escape(companyName)}</a>` : this.escape(companyName)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="card" style="padding:24px;">
              <h1 class="h1" style="margin:0 0 10px; font-size:22px; line-height:1.3;">${this.escape(opts.heading)}</h1>
              <div style="font-size:15px; line-height:1.6;">
                ${opts.contentHtml}
              </div>
              ${
                opts.cta
                  ? `
                <div style="margin-top:20px;">
                  <p class="">${this.escape(opts.cta.label)}</p>
                </div>`
                  : ''
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px; border-top:1px solid #e5e7eb; font-size:12px;" class="muted">
              <div>${this.escape(companyName)}</div>
              ${supportEmail ? `<div>Need help? <a href="mailto:${supportEmail}">${supportEmail}</a></div>` : ''}
              ${websiteUrl ? `<div><a href="${websiteUrl}">${websiteUrl}</a></div>` : ''}
            </td>
          </tr>
        </table>

        <!-- Legal line -->
        <div style="font-size:11px; margin-top:12px;" class="muted">
          You’re receiving this email because you have an account with ${this.escape(companyName)}.
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /** Minimal HTML escaper for dynamic text nodes */
  private escape(s: string) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
