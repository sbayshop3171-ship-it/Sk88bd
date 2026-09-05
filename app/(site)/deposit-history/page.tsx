import CashierHistory from '@/components/CashierHistory';
import PageHeader from '@/components/PageHeader';

export default function DepositHistoryPage() {
  return (
    <>
      <PageHeader title="ডিপোজিট হিস্টোরি" />
      <CashierHistory table="deposits" glyph="💰" emptyText="এখনো কোনো ডিপোজিট রেকর্ড নেই।" />
    </>
  );
}
