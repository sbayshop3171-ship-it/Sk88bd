import 'package:flutter/material.dart';

import '../theme/neon_theme.dart';

class AutoSignalBar extends StatelessWidget {
  const AutoSignalBar({
    super.key,
    required this.active,
    this.onTap,
    this.height = 50,
    this.scale = 1,
  });

  final bool active;
  final VoidCallback? onTap;
  final double height;
  final double scale;

  @override
  Widget build(BuildContext context) {
    final color = active ? NeonPalette.cyan : NeonPalette.gold;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8 * scale),
        child: Container(
          width: double.infinity,
          height: height,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.35),
            borderRadius: BorderRadius.circular(8 * scale),
            border: Border.all(color: color.withOpacity(0.58)),
            boxShadow: [
              BoxShadow(color: color.withOpacity(0.13), blurRadius: 20 * scale),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.bolt,
                color: active ? NeonPalette.gold : color,
                size: 17 * scale,
              ),
              SizedBox(width: 8 * scale),
              Text(
                active ? 'AUTO SIGNAL ACTIVE' : 'AUTO SIGNAL WAITING',
                style: TextStyle(
                  color: color,
                  fontSize: 12 * scale,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
