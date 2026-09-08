import NoAccess from '@/components/admin/NoAccess';
import CashierConfigControl from '@/components/admin/CashierConfigControl';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { can } from '@/lib/admin-roles';
import { getCashierConfig } from '@/lib/cashier-config-store';
import { DEPOSIT_CHANNELS } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The cashier the players see: deposit methods with their bonus, the amount
    chips, every line of copy, and the withdraw rules. */
export default async function AdminCashier() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  if (!can(session.role, 'cashier.config')) return <NoAccess role={session.role} what="ক্যাশিয়ার সেটআপ" />;

  return (
    <>
      <h1 className="adm__h1">ক্যাশিয়ার</h1>
      <p className="adm__sub">
        ডিপোজিট ও উইথড্র পেজে প্লেয়ার যা দেখে — মেথড, বোনাস লেবেল, অংকের চিপ,
        নির্দেশনা, সতর্কতা, সফল বার্তা — সব এখান থেকে। সেভ করলেই সাইটে বদলে যায়।
        রিসিভিং নাম্বারগুলো “পেমেন্ট” ট্যাবে; প্রতিটি মেথড সেখানকার একটি চ্যানেলের
        নাম্বার ব্যবহার করে।
      </p>
      <CashierConfigControl
        initial={await getCashierConfig()}
        channels={DEPOSIT_CHANNELS.map(({ id, name }) => ({ id, name }))}
      />
    </>
  );
}
