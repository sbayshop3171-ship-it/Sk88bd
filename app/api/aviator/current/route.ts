import { NextResponse } from 'next/server';
import { getAviatorSignalState, publicAviatorState } from '@/lib/aviator-signal-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const state = await getAviatorSignalState();

  return NextResponse.json(publicAviatorState(state), {
    headers: {
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}
