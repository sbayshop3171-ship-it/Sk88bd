import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';

export default function TurnoverPage() {
  return (
    <>
      <PageHeader title="টার্নওভার" />
      <div className="note" style={{ margin: 12 }}>
        বোনাস নেওয়ার পর নির্দিষ্ট টার্নওভার সম্পূর্ণ করলে ব্যালেন্স উইথড্র করা যাবে।
      </div>
      <Empty glyph="🔄" text="এখনো কোনো চলমান টার্নওভার নেই।" />
    </>
  );
}
