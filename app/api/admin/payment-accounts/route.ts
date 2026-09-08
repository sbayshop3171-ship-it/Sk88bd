import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import type { AccountMutationResult, PaymentAccountInput } from '@/lib/payment-accounts';
import {
  addAccount,
  listAccounts,
  removeAccount,
  updateAccount,
} from '@/lib/payment-accounts-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireAdmin('payments.read');
  if (!gate.ok) return gate.response;
  return json({ ok: true, accounts: await listAccounts() });
}

export async function POST(req: Request) {
  const gate = await requireAdmin('payments.write');
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  if (!body || typeof body !== 'object') return json({ ok: false, reason: 'invalid-action' }, 400);
  const record = body as Record<string, unknown>;

  let result: AccountMutationResult;
  switch (record.action) {
    case 'add':
      result = await addAccount(fields(record));
      break;
    case 'update':
      result = await updateAccount(String(record.id ?? ''), fields(record));
      break;
    case 'remove':
      result = await removeAccount(String(record.id ?? ''));
      break;
    default:
      return json({ ok: false, reason: 'invalid-action' }, 400);
  }

  return result.ok ? json(result) : json(result, 400);
}

/** The store validates; this only shapes the untrusted body into its input. */
function fields(record: Record<string, unknown>): PaymentAccountInput {
  return {
    channelId: String(record.channelId ?? ''),
    number: String(record.number ?? ''),
    holder: String(record.holder ?? ''),
    kind: record.kind as PaymentAccountInput['kind'],
    use: record.use as PaymentAccountInput['use'],
    note: String(record.note ?? ''),
    status: record.status as PaymentAccountInput['status'],
    weight: Number(record.weight ?? 1),
  };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
