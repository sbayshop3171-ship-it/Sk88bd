import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';

export default function BetsHistoryPage() {
  return (
    <>
      <PageHeader title="বেটিং রেকর্ড" />
      <Empty glyph="📋" text="এখনো কোনো বেট রেকর্ড নেই।" />
    </>
  );
}
