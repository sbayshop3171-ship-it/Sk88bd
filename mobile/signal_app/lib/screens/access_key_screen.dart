import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/neon_theme.dart';
import '../widgets/neon_background.dart';

class AccessKeyScreen extends StatefulWidget {
  const AccessKeyScreen({
    super.key,
    required this.onUnlock,
  });

  final Future<String?> Function(String key) onUnlock;

  @override
  State<AccessKeyScreen> createState() => _AccessKeyScreenState();
}

class _AccessKeyScreenState extends State<AccessKeyScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  bool _busy = false;
  String _error = '';

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _unlock() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = '';
    });

    final error = await widget.onUnlock(_controller.text);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = error ?? '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: NeonBackground(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final width = constraints.maxWidth;
              final scale = (width / 393).clamp(0.86, 1.12).toDouble();

              return Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(horizontal: 22 * scale),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: const Color(0xD7070B1E),
                      border: Border.all(
                        color: NeonPalette.cyan.withOpacity(0.46),
                        width: 1.2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: NeonPalette.cyan.withOpacity(0.2),
                          blurRadius: 28 * scale,
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(painter: _CornerPainter()),
                        ),
                        Padding(
                          padding: EdgeInsets.fromLTRB(
                            26 * scale,
                            30 * scale,
                            26 * scale,
                            28 * scale,
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _TopLine(scale: scale),
                              SizedBox(height: 34 * scale),
                              Icon(
                                Icons.lock_outline_rounded,
                                color: NeonPalette.cyan,
                                size: 64 * scale,
                                shadows: const [
                                  Shadow(
                                    color: NeonPalette.cyan,
                                    blurRadius: 18,
                                  ),
                                ],
                              ),
                              SizedBox(height: 22 * scale),
                              Text(
                                'PRIME VAI DEVX',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: NeonPalette.text,
                                  fontSize: 25 * scale,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 6,
                                ),
                              ),
                              SizedBox(height: 9 * scale),
                              Text(
                                'ENCRYPTED SIGNAL TERMINAL',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: NeonPalette.cyan.withOpacity(0.45),
                                  fontSize: 11 * scale,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 4,
                                ),
                              ),
                              SizedBox(height: 32 * scale),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  '> awaiting access key',
                                  style: TextStyle(
                                    color: NeonPalette.green,
                                    fontSize: 14 * scale,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              SizedBox(height: 12 * scale),
                              TextField(
                                controller: _controller,
                                focusNode: _focusNode,
                                textAlign: TextAlign.center,
                                textCapitalization:
                                    TextCapitalization.characters,
                                inputFormatters: [
                                  FilteringTextInputFormatter.allow(
                                    RegExp(r'[A-Za-z0-9-]'),
                                  ),
                                  LengthLimitingTextInputFormatter(16),
                                ],
                                onSubmitted: (_) => _unlock(),
                                onChanged: (value) {
                                  final upper = value.toUpperCase();
                                  if (upper == value) return;
                                  _controller.value = TextEditingValue(
                                    text: upper,
                                    selection: TextSelection.collapsed(
                                      offset: upper.length,
                                    ),
                                  );
                                },
                                decoration: InputDecoration(
                                  hintText: 'PK44-DW2K-5W5H',
                                  suffixIcon: const Icon(
                                    Icons.content_paste_go_rounded,
                                    color: NeonPalette.muted,
                                  ),
                                  filled: true,
                                  fillColor: Colors.black.withOpacity(0.28),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 14 * scale,
                                    vertical: 18 * scale,
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius:
                                        BorderRadius.circular(13 * scale),
                                    borderSide: BorderSide(
                                      color: NeonPalette.cyan.withOpacity(0.45),
                                      width: 1.2,
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius:
                                        BorderRadius.circular(13 * scale),
                                    borderSide: const BorderSide(
                                      color: NeonPalette.cyan,
                                      width: 1.5,
                                    ),
                                  ),
                                ),
                                style: TextStyle(
                                  color: NeonPalette.text,
                                  fontSize: 23 * scale,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 3,
                                ),
                              ),
                              if (_error.isNotEmpty) ...[
                                SizedBox(height: 10 * scale),
                                Text(
                                  _error,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: NeonPalette.red,
                                    fontSize: 12 * scale,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                              SizedBox(height: 18 * scale),
                              SizedBox(
                                width: double.infinity,
                                height: 60 * scale,
                                child: ElevatedButton(
                                  onPressed: _busy ? null : _unlock,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF18AFC0),
                                    foregroundColor: const Color(0xFF071118),
                                    disabledBackgroundColor:
                                        NeonPalette.cyanSoft,
                                    shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(13 * scale),
                                    ),
                                  ),
                                  child: Text(
                                    _busy ? 'VERIFYING...' : 'UNLOCK',
                                    style: TextStyle(
                                      fontSize: 15 * scale,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 4,
                                    ),
                                  ),
                                ),
                              ),
                              SizedBox(height: 28 * scale),
                              Divider(color: NeonPalette.cyan.withOpacity(0.1)),
                              SizedBox(height: 22 * scale),
                              Text(
                                'AES-256  •  DEVICE BOUND  •  SINGLE SESSION',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: NeonPalette.muted.withOpacity(0.7),
                                  fontSize: 10 * scale,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 2.4,
                                ),
                              ),
                              SizedBox(height: 18 * scale),
                              Text(
                                'একবার key unlock করলে local mode access auto থাকবে।',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: NeonPalette.muted.withOpacity(0.65),
                                  fontSize: 11 * scale,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _TopLine extends StatelessWidget {
  const _TopLine({required this.scale});

  final double scale;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          '• SYS://ACCESS',
          style: TextStyle(
            color: NeonPalette.cyan.withOpacity(0.62),
            fontSize: 11 * scale,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.5,
          ),
        ),
        const Spacer(),
        Container(
          width: 7 * scale,
          height: 7 * scale,
          decoration: const BoxDecoration(
            color: NeonPalette.green,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(color: NeonPalette.green, blurRadius: 10),
            ],
          ),
        ),
        SizedBox(width: 7 * scale),
        Text(
          'ONLINE',
          style: TextStyle(
            color: NeonPalette.green,
            fontSize: 11 * scale,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.2,
          ),
        ),
      ],
    );
  }
}

class _CornerPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = NeonPalette.cyan.withOpacity(0.75)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    const length = 22.0;

    canvas.drawLine(Offset.zero, const Offset(length, 0), paint);
    canvas.drawLine(Offset.zero, const Offset(0, length), paint);
    canvas.drawLine(
        Offset(size.width, 0), Offset(size.width - length, 0), paint);
    canvas.drawLine(Offset(size.width, 0), Offset(size.width, length), paint);
    canvas.drawLine(Offset(0, size.height), Offset(length, size.height), paint);
    canvas.drawLine(
        Offset(0, size.height), Offset(0, size.height - length), paint);
    canvas.drawLine(Offset(size.width, size.height),
        Offset(size.width - length, size.height), paint);
    canvas.drawLine(Offset(size.width, size.height),
        Offset(size.width, size.height - length), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
