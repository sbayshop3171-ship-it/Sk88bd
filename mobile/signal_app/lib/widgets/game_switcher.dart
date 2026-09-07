import 'package:flutter/material.dart';

import '../models/signal_snapshot.dart';
import '../theme/neon_theme.dart';

class GameSwitcher extends StatelessWidget {
  const GameSwitcher({
    super.key,
    required this.selected,
    required this.onChanged,
    this.height = 38,
    this.scale = 1,
  });

  final SignalGame selected;
  final ValueChanged<SignalGame> onChanged;
  final double height;
  final double scale;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: height,
      padding: EdgeInsets.all(4 * scale),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.28),
        borderRadius: BorderRadius.circular(8 * scale),
        border: Border.all(color: NeonPalette.cyan.withOpacity(0.2)),
      ),
      child: Row(
        children: SignalGame.values.map((game) {
          final active = game == selected;
          return Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 3 * scale),
              child: _SwitcherButton(
                label: '[ ${game.label} ]',
                active: active,
                locked: game.locked,
                scale: scale,
                onTap: game.locked
                    ? () => _sayLocked(context, game)
                    : () => onChanged(game),
              ),
            ),
          );
        }).toList(growable: false),
      ),
    );
  }
}

/// A locked tab still answers the tap — silently ignoring it reads as a bug.
void _sayLocked(BuildContext context, SignalGame game) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        backgroundColor: NeonPalette.panelSoft,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
        content: Text(
          '${game.label} সিগন্যাল এখনো চালু হয়নি — শীঘ্রই আসছে',
          style: const TextStyle(
            color: NeonPalette.text,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
}

class _SwitcherButton extends StatelessWidget {
  const _SwitcherButton({
    required this.label,
    required this.active,
    required this.locked,
    required this.scale,
    required this.onTap,
  });

  final String label;
  final bool active;
  final bool locked;
  final double scale;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(6 * scale),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active
                ? NeonPalette.cyan.withOpacity(0.13)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(6 * scale),
            border: Border.all(
              color: locked
                  ? NeonPalette.muted.withOpacity(0.22)
                  : active
                      ? NeonPalette.cyan.withOpacity(0.85)
                      : NeonPalette.cyan.withOpacity(0.13),
            ),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: NeonPalette.cyan.withOpacity(0.28),
                      blurRadius: 18 * scale,
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (locked) ...[
                Icon(
                  Icons.lock_outline,
                  size: 12 * scale,
                  color: NeonPalette.muted.withOpacity(0.75),
                ),
                SizedBox(width: 5 * scale),
              ],
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: locked
                        ? NeonPalette.muted.withOpacity(0.6)
                        : active
                            ? NeonPalette.text
                            : NeonPalette.muted,
                    fontSize: 11 * scale,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
