import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';

export default function WithdrawHistoryPage() {
  return (
    <>
      <PageHeader title="উইথড্র হিস্টোরি" />
      <Empty glyph="💸" text="এখনো কোনো উইথড্র রেকর্ড নেই।" />
    </>
  );
}
