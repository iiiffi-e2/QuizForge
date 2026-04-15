import { createHash } from "node:crypto";
import type { EmailProviderSendVerificationRequestParams } from "@auth/core/providers/email";

/**
 * Mirrors Auth.js Resend provider templates so magic-link emails match the default look.
 * @see node_modules/@auth/core/lib/utils/email.js
 */
export function magicLinkHtml(params: {
  url: string;
  host: string;
  theme: EmailProviderSendVerificationRequestParams["theme"];
}) {
  const { url, host, theme } = params;
  const escapedHost = host.replace(/\./g, "&#8203;.");
  const brandColor = theme?.brandColor || "#346df1";
  const buttonText = theme?.buttonText || "#fff";
  const color = {
    background: "#f9f9f9",
    text: "#444",
    mainBackground: "#fff",
    buttonBackground: brandColor,
    buttonBorder: brandColor,
    buttonText,
  };
  return `
<body style="background: ${color.background};">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        Sign in to <strong>${escapedHost}</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}"><a href="${url}"
                target="_blank"
                style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`;
}

export function magicLinkText(params: { url: string; host: string }) {
  const { url, host } = params;
  return `Sign in to ${host}\n${url}\n\n`;
}

/** When true, magic links are sent to Resend test inboxes (see AUTH_EMAIL_USE_RESEND_TEST). */
export function resendTestRecipientEnabled(): boolean {
  return process.env.AUTH_EMAIL_USE_RESEND_TEST === "true";
}

/**
 * delivered@resend.dev simulates successful delivery; labels differentiate runs.
 * @see https://resend.com/docs/dashboard/emails/send-test-emails
 */
export function resendTestDeliveredAddress(identifier: string): string {
  const tag = createHash("sha256").update(identifier, "utf8").digest("hex").slice(0, 16);
  return `delivered+${tag}@resend.dev`;
}

export async function sendResendMagicLink(
  params: EmailProviderSendVerificationRequestParams,
): Promise<void> {
  const { identifier, provider, url, theme } = params;
  const { host } = new URL(url);
  const test = resendTestRecipientEnabled();
  const to = test ? resendTestDeliveredAddress(identifier) : identifier;
  const subject = test
    ? `Sign in to ${host} (intended: ${identifier})`
    : `Sign in to ${host}`;
  const apiKey = provider.apiKey;
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("Resend: missing apiKey on provider");
  }
  const from = provider.from;
  if (!from || typeof from !== "string") {
    throw new Error("Resend: missing from on provider");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: magicLinkHtml({ url, host, theme }),
      text: magicLinkText({ url, host }),
    }),
  });
  if (!res.ok) throw new Error("Resend error: " + JSON.stringify(await res.json()));
}
