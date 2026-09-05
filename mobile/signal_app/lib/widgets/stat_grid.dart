import 'package:flutter/material.dart';

import '../models/signal_snapshot.dart';
import '../theme/neon_theme.dart';

class StatGrid extends StatelessWidget {
  const StatGrid({
    super.key,
    required this.stats,
    this.cardHeight = 70,
    this.gap = 8,
    this.scale = 1,
  });

  final List<StatIndicator> stats;
  final double cardHeight;
  final double gap;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final children = <Widget>[];
    for (var i = 0; i < stats.length; i++) {
      if (i > 0) children.add(SizedBox(width: gap));
      children.add(
        Expanded(
          child: _StatCard(
            stat: stats[i],
            height: cardHeight,
            scale: scale,
          ),
        ),
      );
    }

    return Row(
      children: children,
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.stat,
    required this.height,
    required this.scale,
  });

  final StatIndicator stat;
  final double height;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final highlight =
        stat.label == 'MODE' ? NeonPalette.cyan : NeonPalette.gold;
    return Container(
      height: height,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: NeonPalette.panelSoft.withOpacity(0.72),
        borderRadius: BorderRadius.circular(8 * scale),
        border: Border.all(color: NeonPalette.cyan.withOpacity(0.42)),
        boxShadow: [
          BoxShadow(
            color: NeonPalette.cyan.withOpacity(0.08),
            blurRadius: 16 * scale,
          ),
        ],
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              stat.value,
              style: TextStyle(
                color: highlight,
                fontSize: 16 * scale,
                fontWeight: FontWeight.w900,
              ),
            ),
            SizedBox(height: 3 * scale),
            Text(
              stat.label,
              style: TextStyle(
                color: NeonPalette.muted,
                fontSize: 9 * scale,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
