import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../models/signal_snapshot.dart';
import '../services/signal_api_client.dart';
import '../widgets/auto_signal_bar.dart';
import '../widgets/brand_terminal.dart';
import '../widgets/game_switcher.dart';
import '../widgets/neon_background.dart';
import '../widgets/next_signals_list.dart';
import '../widgets/recent_rounds_strip.dart';
import '../widgets/scan_gate.dart';
import '../widgets/signal_gauge.dart';
import '../widgets/stat_grid.dart';
import '../widgets/status_alert.dart';


/// How long after a burst the dial may still show it, while the next
/// round's number is not out yet. The real gap is ~2.5 s (3.5 s hold +
/// 6 s betting − 7 s reveal); this only has to outlast it.
const _burstHold = Duration(seconds: 8);

class SignalTerminalScreen extends StatefulWidget {
  const SignalTerminalScreen({
    super.key,
    required this.apiBaseUrl,
    required this.accessToken,
    required this.onUnauthorized,
  });

  final String apiBaseUrl;
  final String accessToken;
  final Future<String?> Function() onUnauthorized;

  @override
  State<SignalTerminalScreen> createState() => _SignalTerminalScreenState();
}

class _SignalTerminalScreenState extends State<SignalTerminalScreen>
    with SingleTickerProviderStateMixin {
  late final SignalApiClient _api;
  late final AnimationController _pulse;
  late String _accessToken;
  late SignalSnapshot _snapshot;
  SignalGame _game = SignalGame.aviator;
  /* The terminal opens on the scan, not on the numbers. Switching games puts
     it back — a queue read for Aviator says nothing about Crash. */
  bool _scanned = false;
  DateTime _now = DateTime.now();
  /* How far the server's clock is ahead of this phone's. Every countdown is
     "flyAt minus now", and flyAt is the server's time — counted against the
     phone's own clock, a phone a second or two off ran every signal that
     much early or late. Measured afresh on each poll. */
  Duration _clockOffset = Duration.zero;
  Timer? _clockTimer;
  Timer? _pollTimer;

  DateTime get _serverNow => DateTime.now().add(_clockOffset);

  @override
  void initState() {
    super.initState();
    _api = SignalApiClient(baseUrl: widget.apiBaseUrl);
    _accessToken = widget.accessToken;
    _snapshot = SignalSnapshot.demo(_game, now: _now);
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    /* ticks at 4 Hz so the whole-second countdown turns over within a
       quarter-second of the server's, not up to a second late */
    _clockTimer = Timer.periodic(const Duration(milliseconds: 250), (_) {
      setState(() => _now = _serverNow);
    });
    _pollTimer = Timer.periodic(signalPollInterval, (_) => _loadSnapshot());
    _loadSnapshot();
  }

  @override
  void didUpdateWidget(covariant SignalTerminalScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.accessToken != widget.accessToken) {
      _accessToken = widget.accessToken;
    }
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    _pollTimer?.cancel();
    _pulse.dispose();
    _api.dispose();
    super.dispose();
  }

  Future<void> _loadSnapshot() async {
    try {
      final sent = DateTime.now();
      final next = await _api.fetchSnapshot(
        _game,
        accessToken: _accessToken,
      );
      if (!mounted) return;
      // the server stamped its time halfway through the round trip
      final got = DateTime.now();
      final serverAt = next.timestamp.add(got.difference(sent) ~/ 2);
      setState(() {
        _clockOffset = serverAt.difference(got);
        _now = _serverNow;
        _snapshot = next;
      });
    } on SignalUnauthorizedException {
      final refreshedToken = await widget.onUnauthorized();
      if (refreshedToken == null || !mounted) return;
      _accessToken = refreshedToken;
      await _loadSnapshot();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _snapshot = _snapshot.copyWith(
          targetMultiplier: 1,
          timestamp: DateTime.now(),
          signalActive: false,
          signalLabel: 'SERVER OFFLINE',
          autoSignalActive: false,
          notice: 'সার্ভার সংযোগ নেই',
        );
      });
    }
  }

  void _selectGame(SignalGame game) {
    // the switcher already refuses a locked tab; this is the backstop, so a
    // future caller cannot open one by going round it
    if (game == _game || game.locked) return;
    setState(() {
      _game = game;
      _scanned = false;
      _snapshot = SignalSnapshot.demo(game, now: _now);
    });
    _loadSnapshot();
  }

  /// Back to the dial for another read.
  void _rescan() => setState(() => _scanned = false);

  @override
  Widget build(BuildContext context) {
    // the round being counted to, and whether its number may show yet
    final next = _snapshot.upcoming.isEmpty ? null : _snapshot.upcoming.first;
    final int? msToFly = next == null
        ? null
        : (next.flyAt != null ? next.flyAt!.difference(_now).inMilliseconds : next.flyInMs);
    final revealed = msToFly == null || msToFly <= signalRevealLead.inMilliseconds;
    /* The signal stays up through the flight and bursts with the plane
       (2026-09-12). Burst: the round shown has passed its crashAt (the next
       poll has not moved us on yet), or the next round is still hidden and
       the last one went down moments ago — the gap between a burst and the
       next reveal is about 2.5 s. */
    final crashAt = next?.crashAt;
    final last = _snapshot.recentRounds.isEmpty ? null : _snapshot.recentRounds.first;
    final double? burstX = crashAt != null && !_now.isBefore(crashAt)
        ? (next!.targetX ?? _snapshot.targetMultiplier)
        : (!revealed &&
                last?.happenedAt != null &&
                _now.difference(last!.happenedAt!) < _burstHold)
            ? last.multiplier
            : null;

    return Scaffold(
      extendBody: true,
      body: NeonBackground(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final layout = _SignalLayout.from(constraints);

              return SizedBox.expand(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: EdgeInsets.fromLTRB(
                    layout.horizontalPadding,
                    layout.topPadding,
                    layout.horizontalPadding,
                    layout.bottomPadding,
                  ),
                  child: ConstrainedBox(
                    constraints:
                        BoxConstraints(minHeight: layout.contentHeight),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            GameSwitcher(
                              selected: _game,
                              height: layout.switcherHeight,
                              scale: layout.scale,
                              onChanged: _selectGame,
                            ),
                            SizedBox(height: layout.gapSm),
                            BrandTerminal(
                              snapshot: _snapshot,
                              scale: layout.scale,
                            ),
                            SizedBox(height: layout.gapSm),
                            StatGrid(
                              stats: _snapshot.stats,
                              cardHeight: layout.statHeight,
                              gap: layout.statGap,
                              scale: layout.scale,
                            ),
                          ],
                        ),
                        if (!_scanned)
                          ScanGate(
                            gameLabel: _game.label,
                            scale: layout.scale,
                            onScan: _loadSnapshot,
                            onComplete: () =>
                                setState(() => _scanned = true),
                          )
                        else
                          SignalGauge(
                            multiplier: burstX ?? _snapshot.targetMultiplier,
                            burst: burstX != null,
                            timestamp: _now,
                            msToFly: msToFly,
                            revealed: revealed,
                            active: _snapshot.signalActive,
                            label: _snapshot.signalLabel,
                            pulse: _pulse,
                            size: layout.gaugeSize,
                            scale: layout.scale,
                          ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_scanned) ...[
                              NextSignalsList(
                                signals: _snapshot.upcoming,
                                now: _now,
                                revealed: revealed,
                                burstX: burstX,
                                scale: layout.scale,
                              ),
                              SizedBox(height: layout.gapSm),
                              AutoSignalBar(
                                active: _snapshot.autoSignalActive,
                                onTap: _rescan,
                                height: layout.autoBarHeight,
                                scale: layout.scale,
                              ),
                              SizedBox(height: layout.gapSm),
                              RecentRoundsStrip(
                                rounds: _snapshot.recentRounds,
                                scale: layout.scale,
                              ),
                              SizedBox(height: layout.gapSm),
                            ],
                            StatusAlert(
                              text: _snapshot.notice,
                              scale: layout.scale,
                            ),
                          ],
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

class _SignalLayout {
  const _SignalLayout({
    required this.scale,
    required this.horizontalPadding,
    required this.topPadding,
    required this.bottomPadding,
    required this.contentHeight,
    required this.switcherHeight,
    required this.statHeight,
    required this.statGap,
    required this.gaugeSize,
    required this.autoBarHeight,
    required this.gapSm,
    required this.gapLg,
  });

  final double scale;
  final double horizontalPadding;
  final double topPadding;
  final double bottomPadding;
  final double contentHeight;
  final double switcherHeight;
  final double statHeight;
  final double statGap;
  final double gaugeSize;
  final double autoBarHeight;
  final double gapSm;
  final double gapLg;

  factory _SignalLayout.from(BoxConstraints constraints) {
    final width = constraints.maxWidth.isFinite ? constraints.maxWidth : 390.0;
    final height =
        constraints.maxHeight.isFinite ? constraints.maxHeight : 760.0;
    final widthScale = (width / 393).clamp(0.86, 1.18).toDouble();
    final heightScale = (height / 820).clamp(0.82, 1.12).toDouble();
    final scale = math.min(widthScale, heightScale);
    const horizontalPadding = 0.0;
    const topPadding = 0.0;
    const bottomPadding = 0.0;
    final gaugeSize = math
        .min(width - horizontalPadding * 2 - 6, height * 0.27)
        .clamp(188.0, 252.0)
        .toDouble();
    final gapSm = (12 * scale).clamp(8.0, 14.0).toDouble();
    final gapLg = (18 * scale).clamp(12.0, 22.0).toDouble();
    final switcherHeight = (38 * scale).clamp(34.0, 44.0).toDouble();
    final statHeight = (70 * scale).clamp(58.0, 78.0).toDouble();
    final autoBarHeight = (50 * scale).clamp(44.0, 56.0).toDouble();
    final contentHeight =
        math.max(0, height - topPadding - bottomPadding).toDouble();

    return _SignalLayout(
      scale: scale,
      horizontalPadding: horizontalPadding,
      topPadding: topPadding,
      bottomPadding: bottomPadding,
      contentHeight: contentHeight,
      switcherHeight: switcherHeight,
      statHeight: statHeight,
      statGap: (8 * scale).clamp(6.0, 10.0).toDouble(),
      gaugeSize: gaugeSize,
      autoBarHeight: autoBarHeight,
      gapSm: gapSm,
      gapLg: gapLg,
    );
  }
}
