import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

/// A newer build the server is offering.
class AppUpdate {
  const AppUpdate({
    required this.versionCode,
    required this.versionName,
    required this.url,
    required this.notes,
    required this.force,
  });

  final int versionCode;
  final String versionName;
  final String url;
  final String notes;

  /// true: the prompt has no "later" — for a build the old one cannot work without
  final bool force;
}

/// The in-app updater.
///
/// The server says which build is current at /api/signal-terminal/app-version
/// (written by scripts/ship-signal-apk.sh when a new APK goes up). If that is
/// newer than this build, the app downloads the APK into its own cache and
/// hands it to Android's installer — so a new version reaches every phone
/// without a cable or a trip to the website. Android still asks the player to
/// tap Install; that is the system's rule and stays.
class AppUpdater {
  AppUpdater(this.baseUrl);

  final String baseUrl;
  static const _channel = MethodChannel('ariyan/updater');

  Future<Map<String, dynamic>> _info() async {
    final raw = await _channel.invokeMethod<Map<dynamic, dynamic>>('info');
    return Map<String, dynamic>.from(raw ?? const {});
  }

  /// The offered build, or null when this one is current (or the check failed —
  /// a phone offline should just carry on).
  Future<AppUpdate?> check() async {
    try {
      final info = await _info();
      final mine = (info['versionCode'] as num?)?.toInt() ?? 0;
      final res = await http
          .get(Uri.parse('$baseUrl/api/signal-terminal/app-version'))
          .timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) return null;
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final code = (json['versionCode'] as num?)?.toInt() ?? 0;
      final url = '${json['url'] ?? ''}';
      if (code <= mine || url.isEmpty) return null;
      return AppUpdate(
        versionCode: code,
        versionName: '${json['versionName'] ?? code}',
        url: url.startsWith('http') ? url : '$baseUrl$url',
        notes: '${json['notes'] ?? ''}',
        force: json['force'] == true,
      );
    } catch (_) {
      return null;
    }
  }

  Future<bool> canInstall() async =>
      (await _channel.invokeMethod<bool>('canInstall')) ?? false;

  /// Android's "Install unknown apps" switch for this app.
  Future<void> openInstallSettings() => _channel.invokeMethod('openInstallSettings');

  /// Downloads the APK, reporting 0..1 as it goes, and returns its path.
  Future<String> download(AppUpdate update, void Function(double) onProgress) async {
    final info = await _info();
    final dir = Directory('${info['downloadDir']}');
    if (!dir.existsSync()) dir.createSync(recursive: true);
    // an older download is dead weight once a newer one is asked for
    for (final old in dir.listSync()) {
      try { old.deleteSync(); } catch (_) {}
    }
    final file = File('${dir.path}/ariyan-khan-${update.versionCode}.apk');

    final client = http.Client();
    try {
      final res = await client.send(http.Request('GET', Uri.parse(update.url)));
      if (res.statusCode != 200) throw HttpException('HTTP ${res.statusCode}');
      final total = res.contentLength ?? 0;
      var got = 0;
      final sink = file.openWrite();
      await for (final chunk in res.stream) {
        sink.add(chunk);
        got += chunk.length;
        if (total > 0) onProgress(got / total);
      }
      await sink.close();
      if (total > 0 && got != total) throw const HttpException('download cut short');
      return file.path;
    } finally {
      client.close();
    }
  }

  Future<void> install(String path) => _channel.invokeMethod('install', {'path': path});
}
