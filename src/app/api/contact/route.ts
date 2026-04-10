import { NextResponse } from "next/server";

type ContactPayload = {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  subject?: unknown;
  message?: unknown;
};

type ValidatedContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const MAX_FIELD_LENGTH = 1000;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validate(payload: ContactPayload): ValidatedContact | string {
  const firstName = asString(payload.firstName);
  const lastName = asString(payload.lastName);
  const email = asString(payload.email);
  const phone = asString(payload.phone);
  const subject = asString(payload.subject);
  const message = asString(payload.message);

  if (!firstName || !lastName) return "First and last name are required.";
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email is invalid.";
  if (!message) return "Message is required.";

  const fields = { firstName, lastName, email, phone, subject, message };
  for (const [key, value] of Object.entries(fields)) {
    if (value.length > MAX_FIELD_LENGTH) {
      return `Field ${key} exceeds maximum length.`;
    }
  }

  return fields;
}

async function sendEmail(
  contact: ValidatedContact,
  to: string,
): Promise<{ delivered: boolean; reason?: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    return {
      delivered: false,
      reason: "SMTP not configured — message logged to server only.",
    };
  }

  try {
    // Dynamic import so the build doesn't require nodemailer unless SMTP is configured.
    const nodemailer = (await import("nodemailer")).default;
    const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      replyTo: contact.email,
      subject:
        contact.subject ||
        `Zanesville Store contact from ${contact.firstName} ${contact.lastName}`,
      text: [
        `Name: ${contact.firstName} ${contact.lastName}`,
        `Email: ${contact.email}`,
        `Phone: ${contact.phone || "(not provided)"}`,
        `Subject: ${contact.subject || "(none)"}`,
        "",
        contact.message,
      ].join("\n"),
    });

    return { delivered: true };
  } catch (error: unknown) {
    const reason =
      error instanceof Error ? error.message : "Unknown SMTP error";
    return { delivered: false, reason };
  }
}

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const validated = validate(body);
  if (typeof validated === "string") {
    return NextResponse.json(
      { success: false, error: validated },
      { status: 400 },
    );
  }

  const to = process.env.CONTACT_TO_EMAIL || "jordan@Jlang.dev";

  const result = await sendEmail(validated, to);

  // Always log the contact attempt on the server so nothing is lost.
  // eslint-disable-next-line no-console
  console.log(
    `[contact] ${validated.firstName} ${validated.lastName} <${validated.email}> → ${to}` +
      (result.delivered ? " (delivered)" : ` (not delivered: ${result.reason})`),
  );

  return NextResponse.json({
    success: true,
    delivered: result.delivered,
    note: result.delivered
      ? undefined
      : "Your message was received. Email relay is not yet configured, so Jordan will see it in the server logs.",
  });
}
