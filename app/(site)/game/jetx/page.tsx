'use client';

import GameGate from '@/components/GameGate';
import FlightBoard from '@/components/mini/FlightBoard';

export default function JetXPage() {
  return <GameGate><FlightBoard game="jetx" /></GameGate>;
}
