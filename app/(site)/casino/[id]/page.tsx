import { notFound, redirect } from 'next/navigation';
import { findGame } from '@/lib/catalogue';

/**
 * A game's old detail page: art in a card, a boxed preview, deposit buttons,
 * the site chrome all around it. On a phone that reads as "the game is
 * small". Tapping a tile has gone straight to the fullscreen player for a
 * while; this route now does the same, so a shared or bookmarked
 * /casino/<id> link lands in the same place as a tap.
 */
export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!findGame(id)) notFound();
  redirect(`/play/${id}`);
}
