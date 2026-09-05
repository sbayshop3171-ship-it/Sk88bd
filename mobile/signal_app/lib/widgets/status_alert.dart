import 'package:flutter/material.dart';

import '../theme/neon_theme.dart';

class StatusAlert extends StatelessWidget {
  const StatusAlert({
    super.key,
    required this.text,
    this.scale = 1,
  });

  final String text;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding:
          EdgeInsets.symmetric(horizontal: 15 * scale, vertical: 13 * scale),
      decoration: BoxDecoration(
        color: NeonPalette.green.withOpacity(0.62),
        borderRadius: BorderRadius.circular(8 * scale),
        border: Border.all(color: NeonPalette.mint.withOpacity(0.42)),
        boxShadow: [
          BoxShadow(
            color: NeonPalette.green.withOpacity(0.18),
            blurRadius: 18 * scale,
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 20 * scale,
            height: 20 * scale,
            decoration: const BoxDecoration(
              color: NeonPalette.text,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.check,
              color: const Color(0xFF087B67),
              size: 14 * scale,
            ),
          ),
          SizedBox(width: 10 * scale),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: NeonPalette.text,
                fontSize: 12 * scale,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
