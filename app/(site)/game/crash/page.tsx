'use client';

import GameGate from '@/components/GameGate';
import FlightBoard from '@/components/mini/FlightBoard';

export default function CrashPage() {
  return <GameGate><FlightBoard game="crash" /></GameGate>;
}
