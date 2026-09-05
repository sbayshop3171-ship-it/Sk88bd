import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';

export default function DepositHistoryPage() {
  return (
    <>
      <PageHeader title="ডিপোজিট হিস্টোরি" />
      <Empty glyph="💰" text="এখনো কোনো ডিপোজিট রেকর্ড নেই।" />
    </>
  );
}
