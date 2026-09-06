'use client';

import { SpeakerIcon } from '@/components/Icons';
import { useSiteSettings } from '@/components/useSiteSettings';
import { t } from '@/lib/strings';

/** The running line under the header. Ships with the welcome text so the
    static page is unchanged; the admin's notice replaces it once loaded. */
export default function NoticeBar() {
  const { notice } = useSiteSettings();
  return (
    <div className="notice">
      <i className="notice__ico"><SpeakerIcon /></i>
      <div className="notice__track"><span>{notice || t.welcome}</span></div>
    </div>
  );
}
