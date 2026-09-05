import 'package:flutter/material.dart';

class NeonPalette {
  const NeonPalette._();

  static const bg = Color(0xFF02100F);
  static const bgDeep = Color(0xFF000606);
  static const panel = Color(0xFF031B1B);
  static const panelSoft = Color(0xFF062827);
  static const cyan = Color(0xFF16F6FF);
  static const cyanSoft = Color(0xFF0B7C86);
  static const mint = Color(0xFF35FFC6);
  static const green = Color(0xFF0EDB8E);
  static const gold = Color(0xFFFFDA63);
  static const red = Color(0xFFFF5C70);
  static const text = Color(0xFFE9FFFB);
  static const muted = Color(0xFF79A6A4);
}

ThemeData buildNeonTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: NeonPalette.cyan,
    brightness: Brightness.dark,
  ).copyWith(
    surface: NeonPalette.panel,
    primary: NeonPalette.cyan,
    secondary: NeonPalette.mint,
  );

  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorScheme: scheme,
    scaffoldBackgroundColor: NeonPalette.bg,
    fontFamily: 'RobotoMono',
    textTheme: const TextTheme(
      bodyMedium: TextStyle(color: NeonPalette.text),
      bodySmall: TextStyle(color: NeonPalette.muted),
    ),
  );
}
