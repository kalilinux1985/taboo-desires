// Supabase Auth "Send Email" hook. Supabase hands every account email to this
// function instead of sending it itself, and we send it through Resend from the
// address that matches what the email is about:
//
//   confirm a new account        -> verify.email@taboodesiers.com
//   change email address         -> change.email@taboodesiers.com
//   reset or change password     -> change.password@taboodesiers.com
//
// Email-link (magic link) sign-in is not offered on the site, so those emails
// are refused here, which also blocks anyone calling the sign-in API directly.
//
// Secrets: RESEND_API_KEY (already set) and SEND_EMAIL_HOOK_SECRET (generated in
// Authentication -> Hooks). Optional overrides: AUTH_FROM_VERIFY,
// AUTH_FROM_CHANGE_EMAIL, AUTH_FROM_CHANGE_PASSWORD. Deployed with JWT
// verification off: Supabase signs each call, and the signature is checked below.

import { Webhook } from "npm:standardwebhooks@1.0.0";

type User = {
  id: string;
  email: string;
  new_email?: string;
  user_metadata?: Record<string, unknown>;
};

type EmailData = {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new: string;
  token_hash_new: string;
  old_email?: string;
};

type Message = {
  from: string;
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  button?: { label: string; url: string };
  code?: string;
};

const named = (v: string | undefined, fallback: string) => {
  const t = v?.trim() || fallback;
  return t.includes("<") ? t : `Taboo Desires <${t}>`;
};

const FROM = {
  verify: () => named(Deno.env.get("AUTH_FROM_VERIFY"), "verify.email@taboodesiers.com"),
  changeEmail: () => named(Deno.env.get("AUTH_FROM_CHANGE_EMAIL"), "change.email@taboodesiers.com"),
  changePassword: () => named(Deno.env.get("AUTH_FROM_CHANGE_PASSWORD"), "change.password@taboodesiers.com"),
};

class HookError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The Supabase link that confirms the action and then sends the member back to the site. */
function verifyUrl(data: EmailData, tokenHash: string, type: string): string {
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
  const back = data.redirect_to || data.site_url;
  return `${base}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(back)}`;
}

/** Same plain look as the site's other emails. */
function render(m: Message) {
  const footer = "You got this email because this address was used on Taboo Desires. If that wasn't you, you can ignore it.";
  const html = `<!doctype html><html><body style="margin:0;background:#0C0F15;padding:24px;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#202227;border-radius:5px;padding:28px;">
<tr><td style="color:#ffffff;font-size:20px;font-weight:bold;padding-bottom:12px;">${esc(m.heading)}</td></tr>
${m.lines.map((l) => `<tr><td style="color:#ffffff;font-size:14px;line-height:1.6;padding-bottom:10px;">${esc(l)}</td></tr>`).join("")}
${m.code ? `<tr><td style="color:#ffffff;font-size:28px;font-weight:bold;letter-spacing:6px;padding:8px 0 14px;">${esc(m.code)}</td></tr>` : ""}
${m.button ? `<tr><td style="padding:12px 0;"><a href="${esc(m.button.url)}" style="background:#7C3AED;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:5px;font-size:14px;display:inline-block;">${esc(m.button.label)}</a></td></tr>` : ""}
<tr><td style="color:#ffffff;font-size:12px;padding-top:14px;opacity:.7;">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    m.heading,
    "",
    ...m.lines,
    ...(m.code ? ["", m.code] : []),
    ...(m.button ? ["", `${m.button.label}: ${m.button.url}`] : []),
    "",
    footer,
  ].join("\n");
  return { html, text };
}

/** Which email(s) to send for this Supabase Auth event. */
function messagesFor(user: User, data: EmailData): Message[] {
  switch (data.email_action_type) {
    case "signup": {
      // The site's sign-up form always saves the account type; an account
      // without one was made some other way (such as an email sign-in link).
      if (!user.user_metadata?.accountType) throw new HookError(403, "Please create your account on the sign-up page.");
      return [{
        from: FROM.verify(),
        to: user.email,
        subject: "Confirm your email for Taboo Desires",
        heading: "Confirm your email",
        lines: ["Tap the button below to confirm your email address and finish creating your Taboo Desires account."],
        button: { label: "Confirm email", url: verifyUrl(data, data.token_hash, "signup") },
      }];
    }
    case "invite":
      return [{
        from: FROM.verify(),
        to: user.email,
        subject: "You're invited to Taboo Desires",
        heading: "You're invited",
        lines: ["Tap the button below to accept your invitation and set up your account."],
        button: { label: "Accept invitation", url: verifyUrl(data, data.token_hash, "invite") },
      }];
    case "magiclink":
    case "email":
      throw new HookError(403, "Email-link sign-in isn't available. Sign in with your email and password.");
    case "recovery":
      return [{
        from: FROM.changePassword(),
        to: user.email,
        subject: "Reset your Taboo Desires password",
        heading: "Reset your password",
        lines: ["Someone asked to reset the password for your Taboo Desires account. Tap the button below to choose a new one.", "If you didn't ask for this, you can ignore this email and your password stays the same."],
        button: { label: "Choose a new password", url: verifyUrl(data, data.token_hash, "recovery") },
      }];
    case "reauthentication":
      return [{
        from: FROM.changePassword(),
        to: user.email,
        subject: "Your Taboo Desires verification code",
        heading: "Confirm it's you",
        lines: ["Enter this code on Taboo Desires to finish changing your password:"],
        code: data.token,
      }];
    case "password_changed_notification":
      return [{
        from: FROM.changePassword(),
        to: user.email,
        subject: "Your Taboo Desires password was changed",
        heading: "Your password was changed",
        lines: ["The password for your Taboo Desires account was just changed.", "If you didn't do this, reset your password right away from the sign-in page."],
      }];
    case "email_change": {
      const newEmail = user.new_email;
      if (!newEmail) throw new HookError(400, "No new email address on this request.");
      const confirmNew: Message = {
        from: FROM.changeEmail(),
        to: newEmail,
        subject: "Confirm your new email for Taboo Desires",
        heading: "Confirm your new email",
        lines: [`Tap the button below to make ${newEmail} the email for your Taboo Desires account.`],
        // Supabase's field names are reversed: token_hash belongs to the new address
        button: { label: "Confirm new email", url: verifyUrl(data, data.token_hash, "email_change") },
      };
      // With Secure Email Change on, the current address has to confirm too
      if (!data.token_hash_new) return [confirmNew];
      return [
        {
          from: FROM.changeEmail(),
          to: user.email,
          subject: "Confirm your Taboo Desires email change",
          heading: "Confirm your email change",
          lines: [`Someone asked to change your Taboo Desires email from ${user.email} to ${newEmail}. Tap the button below to approve it.`, "If you didn't ask for this, ignore this email and change your password."],
          button: { label: "Approve change", url: verifyUrl(data, data.token_hash_new, "email_change") },
        },
        confirmNew,
      ];
    }
    case "email_changed_notification":
      return [{
        from: FROM.changeEmail(),
        to: data.old_email || user.email,
        subject: "Your Taboo Desires email was changed",
        heading: "Your email was changed",
        lines: [`The email for your Taboo Desires account is now ${user.email}.`, "If you didn't do this, contact us right away."],
      }];
    default:
      // Phone, sign-in method and two-step notices aren't used on this site
      return [];
  }
}

async function send(m: Message, apiKey: string): Promise<void> {
  const { html, text } = render(m);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: m.from, to: [m.to], subject: m.subject, html, text }),
  });
  if (!res.ok) {
    console.error("Resend refused the email", res.status, (await res.text()).slice(0, 500));
    throw new HookError(502, "We couldn't send the email right now. Please try again in a minute.");
  }
}

const reply = (status: number, message?: string) =>
  new Response(JSON.stringify(message ? { error: { http_code: status, message } } : {}), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, "Not allowed");
  const secret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.trim();
  const apiKey = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!secret || !apiKey) {
    console.error("SEND_EMAIL_HOOK_SECRET or RESEND_API_KEY is not set");
    return reply(500, "Email sending isn't set up yet.");
  }

  let user: User;
  let data: EmailData;
  try {
    const payload = await req.text();
    const verified = new Webhook(secret.replace(/^v1,whsec_/, "")).verify(payload, Object.fromEntries(req.headers)) as {
      user: User;
      email_data: EmailData;
    };
    user = verified.user;
    data = verified.email_data;
  } catch {
    return reply(401, "Invalid signature");
  }

  try {
    for (const m of messagesFor(user, data)) await send(m, apiKey);
    return reply(200);
  } catch (e) {
    if (e instanceof HookError) return reply(e.status, e.message);
    console.error(e);
    return reply(500, "Something went wrong sending the email.");
  }
});
