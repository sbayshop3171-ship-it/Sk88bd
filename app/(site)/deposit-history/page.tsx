import CashierHistory from '@/components/CashierHistory';
import PageHeader from '@/components/PageHeader';

export default function DepositHistoryPage() {
  return (
    <>
      <PageHeader title="Deposit Record" />
      <CashierHistory table="deposits" glyph="💰" emptyText="No deposit records yet." />
    </>
  );
}
