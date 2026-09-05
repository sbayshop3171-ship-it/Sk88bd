import 'package:flutter/material.dart';

import '../theme/neon_theme.dart';

class NeonBackground extends StatelessWidget {
  const NeonBackground({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF021615),
            NeonPalette.bg,
            NeonPalette.bgDeep,
          ],
        ),
      ),
      child: CustomPaint(
        painter: _CircuitPainter(),
        child: SizedBox.expand(child: child),
      ),
    );
  }
}

class _CircuitPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          NeonPalette.cyan.withOpacity(0.22),
          NeonPalette.green.withOpacity(0.08),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(
          center: Offset(size.width / 2, size.height * 0.46),
          radius: size.width * 0.72,
        ),
      );
    canvas.drawRect(Offset.zero & size, glow);

    final gridPaint = Paint()
      ..color = NeonPalette.cyan.withOpacity(0.035)
      ..strokeWidth = 1;

    for (double y = 36; y < size.height; y += 34) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
    for (double x = 20; x < size.width; x += 34) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }

    final beamPaint = Paint()
      ..color = NeonPalette.cyan.withOpacity(0.08)
      ..strokeWidth = 1.4;
    canvas.drawLine(
      Offset(size.width * 0.12, 0),
      Offset(size.width * 0.46, size.height),
      beamPaint,
    );
    canvas.drawLine(
      Offset(size.width * 0.88, 0),
      Offset(size.width * 0.55, size.height),
      beamPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
