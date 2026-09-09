import CashierHistory from '@/components/CashierHistory';
import PageHeader from '@/components/PageHeader';

export default function WithdrawHistoryPage() {
  return (
    <>
      <PageHeader title="Withdraw History" />
      <CashierHistory table="withdrawals" glyph="🏧" emptyText="No withdrawal records yet." />
    </>
  );
}
