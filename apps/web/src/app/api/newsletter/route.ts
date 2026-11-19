import { createHash } from "node:crypto";
import { env } from "@workspace/env/server";
import { client } from "@workspace/sanity/client";
import { type NextRequest, NextResponse } from "next/server";

//Rate Limiting
const REQUESTS_PER_MINUTE = 5;
const WINDOW_MS = 60000;
const recentRequests = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = recentRequests.get(ip) ?? [];
  const validRequests = timestamps.filter((time) => now - time < WINDOW_MS);

  if (validRequests.length >= REQUESTS_PER_MINUTE) {
    return true;
  }

  validRequests.push(now);
  recentRequests.set(ip, validRequests);
  return false; 
}

// validation and parsing
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function extractEmail(req: NextRequest): Promise<string | null> {
  const contentType = req.headers.get("content-type") || "";

  // for (curl / Postman / fetch)
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { email?: unknown };
    return typeof body?.email === "string" ? body.email : null;
  }

  // for (browser website submission)
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await req.formData();
    const email = formData.get("email");
    return typeof email === "string" ? email : null;
  }

  return null;
}

function isValidEmail(email: string | null): email is string {
  if (!email) return false;
  const trimmed = email.trim();
  return (
    trimmed.length > 0 && trimmed.length <= 320 && EMAIL_REGEX.test(trimmed)
  );
}

export async function POST(req: NextRequest) {
  // Rate Limit Check
  const ip =
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }, // 429 Too Many Requests
    );
  }

  // Validate Email
  const rawEmail = await extractEmail(req);
  if (!isValidEmail(rawEmail)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }, // 400 Bad Request
    );
  }

  const email = rawEmail.trim().toLowerCase();

  //t  Step C: Connecto Sanity with write permissions
  const writeClient = client.withConfig({
    token: env.SANITY_API_WRITE_TOKEN,
    useCdn: false,
  });

  // prevent duplicate records
  const emailHash = createHash("sha256")
    .update(email)
    .digest("hex")
    .slice(0, 32);
  const docId = `subscriber-${emailHash}`;

  try {
    // idempotency
    await writeClient.createIfNotExists({
      _id: docId,
      _type: "subscriber",
      email: email,
      subscribedAt: new Date().toISOString(),
      status: "active",
    });

    // If a standard browser HTML form submitted this, redirect back to referer
    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("text/html")) {
      const referer = req.headers.get("referer");
      const redirectUrl = referer ? new URL(referer) : new URL("/", req.url);
      redirectUrl.searchParams.set("newsletter", "success");
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    // return JSON in main screen as well
    return NextResponse.json(
      { success: true, message: "Subscribed successfully!" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save subscriber. Please try again later." },
      { status: 500 },
    );
  }
}
