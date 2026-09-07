import 'package:flutter/material.dart';

import '../models/signal_snapshot.dart';
import '../theme/neon_theme.dart';

/// The queue: the next few rounds, in the order they will fly.
///
/// The first row is the one being played for, so it is drawn large and lit;
/// the rest sit behind it as a ladder. A round whose number is not revealed
/// yet still shows — the player can see something is queued without being
/// told what it pays.
class NextSignalsList extends StatelessWidget {
  const NextSignalsList({
    super.key,
    required this.signals,
    required this.now,
    this.scale = 1,
  });

  final List<UpcomingSignal> signals;
  final DateTime now;
  final double scale;

  @override
  Widget build(BuildContext context) {
    if (signals.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.only(left: 3 * scale, bottom: 8 * scale),
          child: Row(
            children: [
              Text(
                'NEXT ${signals.length} SIGNALS',
                style: TextStyle(
                  color: NeonPalette.muted,
                  fontSize: 10 * scale,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                ),
              ),
              const Spacer(),
              Text(
                'IN ORDER',
                style: TextStyle(
                  color: NeonPalette.cyanSoft,
                  fontSize: 9 * scale,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
        for (var i = 0; i < signals.length; i++) ...[
          if (i > 0) SizedBox(height: 6 * scale),
          _SignalRow(
            signal: signals[i],
            lead: i == 0,
            now: now,
            scale: scale,
          ),
        ],
      ],
    );
  }
}

class _SignalRow extends StatelessWidget {
  const _SignalRow({
    required this.signal,
    required this.lead,
    required this.now,
    required this.scale,
  });

  final UpcomingSignal signal;
  final bool lead;
  final DateTime now;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final target = signal.targetX;
    final colour = target == null ? NeonPalette.cyanSoft : _colourFor(target);
    // the row fades back down the queue, so the eye lands on the next one
    final depth = lead ? 1.0 : (1 - (signal.position - 1) * 0.13).clamp(0.5, 1.0);

    return Opacity(
      opacity: depth,
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: 12 * scale,
          vertical: (lead ? 13 : 10) * scale,
        ),
        decoration: BoxDecoration(
          color: colour.withValues(alpha: lead ? 0.14 : 0.07),
          borderRadius: BorderRadius.circular(10 * scale),
          border: Border.all(
            color: colour.withValues(alpha: lead ? 0.6 : 0.28),
            width: lead ? 1.4 : 1,
          ),
          boxShadow: lead
              ? [
                  BoxShadow(
                    color: colour.withValues(alpha: 0.25),
                    blurRadius: 16 * scale,
                  ),
                ]
              : null,
        ),
        child: Row(
          children: [
            _Position(position: signal.position, colour: colour, scale: scale),
            SizedBox(width: 11 * scale),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    lead ? 'NEXT ROUND' : 'ROUND #${signal.roundId}',
                    style: TextStyle(
                      color: NeonPalette.muted,
                      fontSize: 9 * scale,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                    ),
                  ),
                  SizedBox(height: 3 * scale),
                  Text(
                    _countdown(signal, now),
                    style: TextStyle(
                      color: NeonPalette.text.withValues(alpha: 0.8),
                      fontSize: 11 * scale,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              target == null ? '— —' : '${target.toStringAsFixed(2)}x',
              style: TextStyle(
                color: colour,
                fontSize: (lead ? 26 : 19) * scale,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Position extends StatelessWidget {
  const _Position({
    required this.position,
    required this.colour,
    required this.scale,
  });

  final int position;
  final Color colour;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final size = 26 * scale;
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: colour.withValues(alpha: 0.18),
        shape: BoxShape.circle,
        border: Border.all(color: colour.withValues(alpha: 0.5)),
      ),
      child: Text(
        '$position',
        style: TextStyle(
          color: colour,
          fontSize: 12 * scale,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

/// Time to take-off, counted down from the flyAt the server sent. Falls back
/// to the offset it shipped with when the device clock and ours disagree.
String _countdown(UpcomingSignal signal, DateTime now) {
  final flyAt = signal.flyAt;
  final ms = flyAt != null
      ? flyAt.difference(now).inMilliseconds
      : signal.flyInMs;
  if (ms <= 0) return 'উড়ছে এখনই';

  final total = ms ~/ 1000;
  final minutes = total ~/ 60;
  final seconds = total % 60;
  if (minutes > 0) return '$minutes মিঃ ${seconds.toString().padLeft(2, '0')} সেঃ পরে';
  return '$seconds সেকেন্ড পরে';
}

Color _colourFor(double value) {
  if (value < 2) return NeonPalette.red;
  if (value < 3) return NeonPalette.cyan;
  if (value < 10) return NeonPalette.mint;
  return NeonPalette.gold;
}
