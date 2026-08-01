import 'server-only';
import { Resend } from 'resend';

// Configure via env:
//   RESEND_API_KEY  — your Resend API key (required to actually send mail)
//   EMAIL_FROM      — verified sender, e.g. "AfterTaste <no-reply@yourdomain>".
//                     Defaults to Resend's shared test sender, which only
//                     delivers to the address that owns the Resend account.
const FROM = process.env.EMAIL_FROM || 'AfterTaste <onboarding@resend.dev>';
const apiKey = process.env.RESEND_API_KEY;

// Build the client lazily so a missing key never crashes at import time.
const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Send the "reset your password" email. When RESEND_API_KEY is not set (dev or
 * an unconfigured install) the link is logged to the server console instead of
 * emailed, so the flow is still testable. Throws on a real send failure.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const subject = 'Reset your AfterTaste password';
  const text = [
    'We received a request to reset your AfterTaste password.',
    '',
    `Reset it here: ${resetUrl}`,
    '',
    'This link expires in 1 hour. If you did not request this, you can ignore',
    'this email — your password will stay the same.',
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
      <h2 style="font-size:18px;margin:0 0 12px">Reset your AfterTaste password</h2>
      <p style="font-size:14px;line-height:1.5;margin:0 0 20px">
        We received a request to reset your password. Click the button below to
        choose a new one.
      </p>
      <p style="margin:0 0 20px">
        <a href="${resetUrl}"
           style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;
                  font-size:14px;font-weight:600;padding:10px 20px;border-radius:10px">
          Reset password
        </a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#6b7280;margin:0">
        This link expires in 1 hour. If you didn't request this, you can safely
        ignore this email.
      </p>
    </div>
  `;

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — password reset link for ${to}:\n${resetUrl}`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    text,
    html,
  });
  if (error) {
    console.error('[email] Resend send failed:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Send a household invitation email with a link to sign up (pre-filled with the
 * invited address). Falls back to logging the link when Resend is unconfigured.
 */
export async function sendHouseholdInviteEmail(opts: {
  to: string;
  inviteUrl: string;
  householdName: string;
  inviterName: string;
}): Promise<void> {
  const { to, inviteUrl, householdName, inviterName } = opts;
  const subject = `${inviterName} invited you to ${householdName} on AfterTaste`;
  const text = [
    `${inviterName} invited you to join "${householdName}" on AfterTaste — a`,
    'shared recipe box.',
    '',
    `Create your account here: ${inviteUrl}`,
    '',
    `Sign up with this email address (${to}) and you'll join the household`,
    'automatically.',
  ].join('\n');

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1f2937">
      <h2 style="font-size:18px;margin:0 0 12px">You're invited to ${householdName}</h2>
      <p style="font-size:14px;line-height:1.5;margin:0 0 20px">
        ${inviterName} invited you to join <strong>${householdName}</strong> on
        AfterTaste, a shared recipe box.
      </p>
      <p style="margin:0 0 20px">
        <a href="${inviteUrl}"
           style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;
                  font-size:14px;font-weight:600;padding:10px 20px;border-radius:10px">
          Create your account
        </a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#6b7280;margin:0">
        Sign up with <strong>${to}</strong> and you'll join the household
        automatically. If you weren't expecting this, you can ignore this email.
      </p>
    </div>
  `;

  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — household invite link for ${to}:\n${inviteUrl}`,
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    text,
    html,
  });
  if (error) {
    console.error('[email] Resend invite send failed:', error);
    throw new Error('Failed to send email');
  }
}
