import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface VerifyBody {
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request) {
  let body: VerifyBody;
  try {
    body = (await request.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ valid: false });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ valid: false });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password) {
    return NextResponse.json({ valid: false });
  }

  const ok = await bcrypt.compare(password, user.password);
  return NextResponse.json({ valid: ok });
}
