import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../theme/neon_theme.dart';

class SignalGauge extends StatelessWidget {
  const SignalGauge({
    super.key,
    required this.multiplier,
    required this.timestamp,
    required this.active,
    required this.label,
    required this.pulse,
    this.msToFly,
    this.revealed = true,
    this.size = 226,
    this.scale = 1,
  });

  /// Milliseconds until the round takes off, on the server's clock; null
  /// when there is no round to count to.
  final int? msToFly;

  /// false until the reveal lead: the dial counts down instead of showing
  /// the number.
  final bool revealed;

  final double multiplier;
  final DateTime timestamp;
  final bool active;
  final String label;
  final Animation<double> pulse;
  final double size;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: pulse,
      builder: (context, child) {
        final glow = Curves.easeInOut.transform(pulse.value);
        return Column(
          children: [
            SizedBox(
              width: size,
              height: size,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CustomPaint(
                    size: Size.square(size),
                    painter: _GaugePainter(
                      multiplier: revealed ? multiplier : 1,
                      glow: glow,
                      active: active,
                    ),
                  ),
                  if (!revealed)
                    _Waiting(
                      secondsToReveal: _secondsToReveal(msToFly),
                      size: size,
                      scale: scale,
                    )
                  else
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'NEXT SIGNAL',
                        style: TextStyle(
                          color: NeonPalette.muted,
                          fontSize: 10 * scale,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 8 * scale),
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          '${multiplier.toStringAsFixed(2)}x',
                          style: TextStyle(
                            color: NeonPalette.mint,
                            fontSize: size * 0.19,
                            fontWeight: FontWeight.w900,
                            shadows: const [
                              Shadow(color: NeonPalette.mint, blurRadius: 18),
                            ],
                          ),
                        ),
                      ),
                      SizedBox(height: 5 * scale),
                      if (msToFly != null)
                        _FlyCountdown(ms: msToFly!, scale: scale)
                      else
                        Text(
                          _fullClock(timestamp),
                          style: TextStyle(
                            color: NeonPalette.muted,
                            fontSize: 10 * scale,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            SizedBox(height: 3 * scale),
            _SignalBadge(active: active, label: label, scale: scale),
          ],
        );
      },
    );
  }
}

/// Before the reveal: a big count to the moment the number appears.
class _Waiting extends StatelessWidget {
  const _Waiting({
    required this.secondsToReveal,
    required this.size,
    required this.scale,
  });

  final int? secondsToReveal;
  final double size;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          'SIGNAL IN',
          style: TextStyle(
            color: NeonPalette.muted,
            fontSize: 10 * scale,
            fontWeight: FontWeight.w900,
          ),
        ),
        SizedBox(height: 6 * scale),
        Text(
          secondsToReveal == null ? '— —' : '${secondsToReveal}s',
          style: TextStyle(
            color: NeonPalette.cyan,
            fontSize: size * 0.2,
            fontWeight: FontWeight.w900,
            shadows: const [Shadow(color: NeonPalette.cyan, blurRadius: 18)],
          ),
        ),
        SizedBox(height: 4 * scale),
        Text(
          'সিগন্যাল আসছে…',
          style: TextStyle(
            color: NeonPalette.text.withValues(alpha: 0.75),
            fontSize: 11 * scale,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

/// After the reveal: the seconds left to bet, under the number.
class _FlyCountdown extends StatelessWidget {
  const _FlyCountdown({required this.ms, required this.scale});

  final int ms;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final flying = ms <= 0;
    // whole seconds, rounded up: "1" until the plane actually goes
    final secs = (ms / 1000).ceil();
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12 * scale, vertical: 4 * scale),
      decoration: BoxDecoration(
        color: NeonPalette.gold.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(12 * scale),
        border: Border.all(color: NeonPalette.gold.withValues(alpha: 0.5)),
      ),
      child: Text(
        flying ? 'উড়ছে এখনই' : 'উড়বে $secs সেকেন্ডে',
        style: TextStyle(
          color: NeonPalette.gold,
          fontSize: 13 * scale,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}

int? _secondsToReveal(int? msToFly) {
  if (msToFly == null) return null;
  final ms = msToFly - signalRevealLead.inMilliseconds;
  return ms <= 0 ? 0 : (ms / 1000).ceil();
}

class _SignalBadge extends StatelessWidget {
  const _SignalBadge({
    required this.active,
    required this.label,
    required this.scale,
  });

  final bool active;
  final String label;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final color = active ? NeonPalette.mint : NeonPalette.gold;
    return Container(
      padding:
          EdgeInsets.symmetric(horizontal: 17 * scale, vertical: 8 * scale),
      decoration: BoxDecoration(
        color: color.withOpacity(0.13),
        borderRadius: BorderRadius.circular(18 * scale),
        border: Border.all(color: color.withOpacity(0.45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6 * scale,
            height: 6 * scale,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color,
              boxShadow: [BoxShadow(color: color, blurRadius: 10 * scale)],
            ),
          ),
          SizedBox(width: 8 * scale),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10 * scale,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _GaugePainter extends CustomPainter {
  const _GaugePainter({
    required this.multiplier,
    required this.glow,
    required this.active,
  });

  final double multiplier;
  final double glow;
  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.width * 0.39;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final progress = (multiplier / 100).clamp(0.08, 1.0);
    final sweep = (math.pi * 2 * progress).toDouble();
    final glowColor = active ? NeonPalette.mint : NeonPalette.gold;

    final outerGlow = Paint()
      ..color = glowColor.withOpacity(0.12 + glow * 0.14)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 24);
    canvas.drawCircle(center, radius + 10 + glow * 7, outerGlow);

    final fill = Paint()
      ..shader = RadialGradient(
        colors: [
          glowColor.withOpacity(0.22),
          NeonPalette.cyan.withOpacity(0.05),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius + 30));
    canvas.drawCircle(center, radius + 28, fill);

    final track = Paint()
      ..color = NeonPalette.cyan.withOpacity(0.14)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7;
    canvas.drawCircle(center, radius, track);

    final arc = Paint()
      ..shader = SweepGradient(
        startAngle: -math.pi / 2,
        endAngle: math.pi * 1.5,
        colors: [
          NeonPalette.mint.withOpacity(0.25),
          NeonPalette.cyan,
          glowColor,
          NeonPalette.mint,
        ],
      ).createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 7.5;
    canvas.drawArc(rect, -math.pi / 2, sweep, false, arc);

    final tickPaint = Paint()
      ..color = NeonPalette.cyan.withOpacity(0.22)
      ..strokeWidth = 1.2
      ..strokeCap = StrokeCap.round;
    for (var i = 0; i < 44; i++) {
      final a = -math.pi / 2 + (math.pi * 2 * i / 44);
      final p1 = Offset(center.dx + math.cos(a) * (radius + 15),
          center.dy + math.sin(a) * (radius + 15));
      final p2 = Offset(center.dx + math.cos(a) * (radius + 21),
          center.dy + math.sin(a) * (radius + 21));
      canvas.drawLine(p1, p2, tickPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GaugePainter oldDelegate) {
    return oldDelegate.multiplier != multiplier ||
        oldDelegate.glow != glow ||
        oldDelegate.active != active;
  }
}

String _fullClock(DateTime value) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(value.hour)}:${two(value.minute)}:${two(value.second)}';
}
