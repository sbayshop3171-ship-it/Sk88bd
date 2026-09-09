/** The server half of lib/panel-base.ts — see the note there. */

import { headers } from 'next/headers';
import { PANEL_BASE_HEADER, type PanelBase } from './panel-base';

export async function panelBase(): Promise<PanelBase> {
  const h = await headers();
  return h.get(PANEL_BASE_HEADER) === '/agent' ? '/agent' : '/admin';
}
