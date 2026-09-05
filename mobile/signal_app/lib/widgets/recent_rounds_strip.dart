import 'package:flutter/material.dart';

import '../models/signal_snapshot.dart';
import '../theme/neon_theme.dart';

class RecentRoundsStrip extends StatelessWidget {
  const RecentRoundsStrip({
    super.key,
    required this.rounds,
    this.scale = 1,
  });

  final List<SignalRound> rounds;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.only(left: 3 * scale, bottom: 8 * scale),
            child: Text(
              'RECENT ROUNDS',
              style: TextStyle(
                color: NeonPalette.muted,
                fontSize: 10 * scale,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          SizedBox(
            height: 34 * scale,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              itemCount: rounds.length,
              separatorBuilder: (_, __) => SizedBox(width: 7 * scale),
              itemBuilder: (context, index) {
                final round = rounds[index];
                return _RoundChip(
                  multiplier: round.multiplier,
                  scale: scale,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RoundChip extends StatelessWidget {
  const _RoundChip({
    required this.multiplier,
    required this.scale,
  });

  final double multiplier;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final color = _colorFor(multiplier);
    return Container(
      constraints: BoxConstraints(minWidth: 57 * scale),
      alignment: Alignment.center,
      padding: EdgeInsets.symmetric(horizontal: 11 * scale),
      decoration: BoxDecoration(
        color: color.withOpacity(0.22),
        borderRadius: BorderRadius.circular(8 * scale),
        border: Border.all(color: color.withOpacity(0.45)),
      ),
      child: Text(
        '${multiplier.toStringAsFixed(2)}x',
        style: TextStyle(
          color: color,
          fontSize: 11 * scale,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

Color _colorFor(double value) {
  if (value < 2) return NeonPalette.red;
  if (value < 3) return NeonPalette.cyan;
  if (value < 10) return NeonPalette.mint;
  return NeonPalette.gold;
}
