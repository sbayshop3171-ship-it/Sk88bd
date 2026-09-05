import CashierHistory from '@/components/CashierHistory';
import PageHeader from '@/components/PageHeader';

export default function WithdrawHistoryPage() {
  return (
    <>
      <PageHeader title="উইথড্র হিস্টোরি" />
      <CashierHistory table="withdrawals" glyph="🏧" emptyText="এখনো কোনো উইথড্র রেকর্ড নেই।" />
    </>
  );
}
