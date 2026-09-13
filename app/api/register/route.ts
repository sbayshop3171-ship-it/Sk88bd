import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/mysql-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    if (!phone || password.length < 6) {
      return NextResponse.json({ message: 'Invalid phone or password' }, { status: 400 });
    }

    const user = await registerUser({
      phone,
      password,
      referralCode: body.referralCode || null,
      agentCode: body.agentCode || null,
    });

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Registration failed' }, { status: 400 });
  }
}
