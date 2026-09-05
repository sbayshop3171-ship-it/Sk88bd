import { getCurrentAdminSession } from '@/lib/admin-auth-next';
import { money } from '@/lib/brand';

const TILES: [string, string][] = [
  ['আজকের ডিপোজিট', money(0)],
  ['আজকের উইথড্র', money(0)],
  ['পেন্ডিং ডিপোজিট', '0'],
  ['পেন্ডিং উইথড্র', '0'],
  ['মোট ইউজার', '0'],
  ['আজ সক্রিয়', '0'],
  ['আজকের GGR', money(0)],
  ['Aviator রাউন্ড', '0'],
];

export default async function AdminDashboard() {
  if (!(await getCurrentAdminSession())) return null;

  return (
    <>
      <h1 className="adm__h1">ড্যাশবোর্ড</h1>
      <div className="adm__tiles">
        {TILES.map(([label, value]) => (
          <div className="adm__tile" key={label}>
            <b>{value}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </>
  );
}
