import 'dart:math' as math;

enum SignalGame { aviator, crash }

extension SignalGameLabel on SignalGame {
  String get apiValue => switch (this) {
        SignalGame.aviator => 'aviator',
        SignalGame.crash => 'crash',
      };

  String get label => switch (this) {
        SignalGame.aviator => 'AVIATOR',
        SignalGame.crash => 'CRASH',
      };
}

SignalGame parseSignalGame(Object? value) {
  final raw = value?.toString().toLowerCase();
  return raw == 'crash' ? SignalGame.crash : SignalGame.aviator;
}

class StatIndicator {
  const StatIndicator({
    required this.value,
    required this.label,
  });

  final String value;
  final String label;
}

class SignalRound {
  const SignalRound({
    required this.multiplier,
    this.happenedAt,
  });

  final double multiplier;
  final DateTime? happenedAt;

  factory SignalRound.fromJson(Object? raw) {
    if (raw is num) {
      return SignalRound(multiplier: raw.toDouble());
    }

    if (raw is Map) {
      final map = Map<String, dynamic>.from(raw);
      return SignalRound(
        multiplier:
            _readDouble(map['multiplier'] ?? map['x'] ?? map['crashAt'], 1),
        happenedAt:
            DateTime.tryParse('${map['happenedAt'] ?? map['createdAt'] ?? ''}'),
      );
    }

    return const SignalRound(multiplier: 1);
  }
}

class SignalSnapshot {
  const SignalSnapshot({
    required this.game,
    required this.title,
    required this.subtitle,
    required this.modeBadge,
    required this.accuracy,
    required this.mode,
    required this.winRate,
    required this.targetMultiplier,
    required this.timestamp,
    required this.signalActive,
    required this.signalLabel,
    required this.autoSignalActive,
    required this.recentRounds,
    required this.notice,
  });

  final SignalGame game;
  final String title;
  final String subtitle;
  final String modeBadge;
  final int accuracy;
  final String mode;
  final int winRate;
  final double targetMultiplier;
  final DateTime timestamp;
  final bool signalActive;
  final String signalLabel;
  final bool autoSignalActive;
  final List<SignalRound> recentRounds;
  final String notice;

  SignalSnapshot copyWith({
    double? targetMultiplier,
    DateTime? timestamp,
    bool? signalActive,
    String? signalLabel,
    bool? autoSignalActive,
    String? notice,
  }) {
    return SignalSnapshot(
      game: game,
      title: title,
      subtitle: subtitle,
      modeBadge: modeBadge,
      accuracy: accuracy,
      mode: mode,
      winRate: winRate,
      targetMultiplier: targetMultiplier ?? this.targetMultiplier,
      timestamp: timestamp ?? this.timestamp,
      signalActive: signalActive ?? this.signalActive,
      signalLabel: signalLabel ?? this.signalLabel,
      autoSignalActive: autoSignalActive ?? this.autoSignalActive,
      recentRounds: recentRounds,
      notice: notice ?? this.notice,
    );
  }

  List<StatIndicator> get stats => [
        StatIndicator(value: '$accuracy%', label: 'ACCURACY'),
        StatIndicator(value: mode, label: 'MODE'),
        StatIndicator(value: '$winRate%', label: 'WIN RATE'),
      ];

  factory SignalSnapshot.fromJson(
      Map<String, dynamic> json, SignalGame fallbackGame) {
    final branding = _readMap(json['branding']);
    final stats = _readMap(json['stats']);
    final signal = _readMap(json['signal']);
    final rounds = (json['recentRounds'] as List? ?? const [])
        .map(SignalRound.fromJson)
        .where((round) => round.multiplier >= 1)
        .toList(growable: false);

    return SignalSnapshot(
      game: parseSignalGame(json['game'] ?? fallbackGame.apiValue),
      title: _readString(branding['title'], 'PRIME VAI DEVX'),
      subtitle: _readString(branding['subtitle'], 'ENCRYPTED SIGNAL TERMINAL'),
      modeBadge: _readString(branding['modeBadge'], 'MODE: BASS'),
      accuracy: _readInt(stats['accuracy'], 60),
      mode: _readString(stats['mode'], 'AUTO').toUpperCase(),
      winRate: _readInt(stats['winRate'], 80),
      targetMultiplier: _readDouble(
        json['targetMultiplier'] ?? json['target'] ?? json['multiplier'],
        60.17,
      ),
      timestamp:
          DateTime.tryParse('${json['timestamp'] ?? ''}') ?? DateTime.now(),
      signalActive: _readBool(signal['active'], true),
      signalLabel: _readString(signal['label'], 'SIGNAL ACTIVE').toUpperCase(),
      autoSignalActive: _readBool(signal['auto'], true),
      recentRounds: rounds.isEmpty ? _demoRounds(DateTime.now(), 0) : rounds,
      notice: _readString(json['notice'], 'এক্সেস গ্রান্টেড'),
    );
  }

  factory SignalSnapshot.demo(
    SignalGame game, {
    DateTime? now,
    bool offline = false,
  }) {
    final time = now ?? DateTime.now();
    final seed =
        (time.millisecondsSinceEpoch ~/ Duration.millisecondsPerMinute) +
            (game == SignalGame.crash ? 5 : 0);
    final targets = game == SignalGame.aviator
        ? const [60.17, 3.82, 2.46, 8.71, 1.92, 12.34]
        : const [7.48, 2.16, 4.08, 1.64, 9.22, 3.35];
    final target = targets[seed % targets.length];
    final mode = seed.isEven ? 'AUTO' : 'BASS';

    return SignalSnapshot(
      game: game,
      title: 'PRIME VAI DEVX',
      subtitle: 'ENCRYPTED SIGNAL TERMINAL',
      modeBadge: 'MODE: $mode',
      accuracy: 60 + seed % 9,
      mode: mode,
      winRate: 78 + seed % 7,
      targetMultiplier: target,
      timestamp: time,
      signalActive: !offline,
      signalLabel: offline ? 'DEMO SIGNAL' : 'SIGNAL ACTIVE',
      autoSignalActive: true,
      recentRounds: _demoRounds(time, seed),
      notice: offline ? 'ডেমো ডাটা চালু' : 'এক্সেস গ্রান্টেড',
    );
  }
}

List<SignalRound> _demoRounds(DateTime now, int seed) {
  const values = [3.03, 2.38, 1.83, 2.64, 3.02, 2.18, 6.44, 1.21];
  final offset = seed % values.length;

  return List.generate(values.length, (index) {
    return SignalRound(
      multiplier: values[(index + offset) % values.length],
      happenedAt: now.subtract(Duration(minutes: index + 1)),
    );
  });
}

Map<String, dynamic> _readMap(Object? value) {
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

String _readString(Object? value, String fallback) {
  final raw = value?.toString().trim();
  return raw == null || raw.isEmpty ? fallback : raw;
}

int _readInt(Object? value, int fallback) {
  if (value is num) return value.round().clamp(0, 100).toInt();
  return int.tryParse('${value ?? ''}')?.clamp(0, 100).toInt() ?? fallback;
}

double _readDouble(Object? value, double fallback) {
  if (value is num) return math.max(1.0, value.toDouble());
  return math.max(1.0, double.tryParse('${value ?? ''}') ?? fallback);
}

bool _readBool(Object? value, bool fallback) {
  if (value is bool) return value;
  final raw = value?.toString().toLowerCase();
  if (raw == 'true' || raw == '1' || raw == 'yes') return true;
  if (raw == 'false' || raw == '0' || raw == 'no') return false;
  return fallback;
}
