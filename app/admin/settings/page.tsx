import { BRAND } from '@/lib/brand';
import { DEPOSIT_CHANNELS } from '@/lib/payments';
import AdminPasswordPanel from '@/components/admin/AdminPasswordPanel';
import DataTable from '@/components/admin/DataTable';
import { getCurrentAdminSession } from '@/lib/admin-auth-next';

export default async function AdminSettings() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">সেটিংস</h1>

      <AdminPasswordPanel />

      <h2 className="adm__h2">সাইট</h2>
      <DataTable
        columns={['কী', 'মান']}
        rows={[
          ['সাইটের নাম', BRAND.name],
          ['ডোমেইন', BRAND.domain],
          ['কারেন্সি', `${BRAND.currency} BDT`],
          ['সাপোর্ট ইমেইল', BRAND.email],
          ['WhatsApp', BRAND.social.whatsapp],
          ['Telegram', BRAND.social.telegram],
        ]}
      />

      <h2 className="adm__h2">পেমেন্ট চ্যানেল</h2>
      <p className="adm__sub">
        অপারেটরের রিসিভিং অ্যাকাউন্ট নাম্বার কখনো ফ্রন্ট-এন্ড কোডে রাখা হয় না —
        সেগুলো ডেটাবেসে থাকবে এবং শুধু এই স্ক্রিন থেকে সেট হবে।
      </p>
      <DataTable
        columns={['চ্যানেল', 'সর্বনিম্ন', 'সর্বোচ্চ', 'অ্যাকাউন্ট নাম্বার', 'সক্রিয়']}
        rows={DEPOSIT_CHANNELS.map((c) => [
          c.name,
          `${BRAND.currency}${c.min.toLocaleString('en-IN')}`,
          `${BRAND.currency}${c.max.toLocaleString('en-IN')}`,
          <span className="adm__miss" key={c.id}>সেট করা হয়নি</span>,
          <span className="adm__ok" key={`${c.id}-a`}>হ্যাঁ</span>,
        ])}
      />
    </>
  );
}
