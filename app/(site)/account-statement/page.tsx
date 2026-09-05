import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';

export default function AccountStatementPage() {
  return (
    <>
      <PageHeader title="অ্যাকাউন্ট স্টেটমেন্ট" />
      <Empty glyph="🧾" text="এই সময়ের জন্য কোনো লেনদেন নেই।" />
    </>
  );
}
