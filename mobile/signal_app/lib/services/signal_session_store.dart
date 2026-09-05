import 'dart:math' as math;

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/signal_access_session.dart';

class SignalSessionStore {
  SignalSessionStore({FlutterSecureStorage? storage})
      : _storage = storage ?? _defaultStorage;

  static const _defaultStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _accessTokenKey = 'prime_signal_access_token';
  static const _refreshTokenKey = 'prime_signal_refresh_token';
  static const _expiresAtKey = 'prime_signal_expires_at';
  static const _deviceIdKey = 'prime_signal_device_id';

  final FlutterSecureStorage _storage;
  String? _memoryDeviceId;
  SignalAccessSession? _memorySession;

  Future<String> getOrCreateDeviceId() async {
    try {
      final existing = await _storage.read(key: _deviceIdKey);
      if (existing != null && existing.isNotEmpty) return existing;

      final created = _newDeviceId();
      await _storage.write(key: _deviceIdKey, value: created);
      return created;
    } catch (_) {
      _memoryDeviceId ??= _newDeviceId();
      return _memoryDeviceId!;
    }
  }

  Future<SignalAccessSession?> readSession() async {
    try {
      final deviceId = await getOrCreateDeviceId();
      final accessToken = await _storage.read(key: _accessTokenKey) ?? '';
      final refreshToken = await _storage.read(key: _refreshTokenKey) ?? '';
      final expiresAt = DateTime.tryParse(
            await _storage.read(key: _expiresAtKey) ?? '',
          ) ??
          DateTime.fromMillisecondsSinceEpoch(0);

      if (accessToken.isEmpty && refreshToken.isEmpty) return null;
      return SignalAccessSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: expiresAt,
        deviceId: deviceId,
      );
    } catch (_) {
      return _memorySession;
    }
  }

  Future<void> saveSession(SignalAccessSession session) async {
    _memorySession = session;
    try {
      await _storage.write(key: _accessTokenKey, value: session.accessToken);
      await _storage.write(key: _refreshTokenKey, value: session.refreshToken);
      await _storage.write(
        key: _expiresAtKey,
        value: session.expiresAt.toIso8601String(),
      );
      await _storage.write(key: _deviceIdKey, value: session.deviceId);
    } catch (_) {
      // Widget tests and some debug shells have no platform storage channel.
    }
  }

  Future<void> clearSession() async {
    _memorySession = null;
    try {
      await _storage.delete(key: _accessTokenKey);
      await _storage.delete(key: _refreshTokenKey);
      await _storage.delete(key: _expiresAtKey);
    } catch (_) {
      // Ignore storage channel failures.
    }
  }

  String _newDeviceId() {
    final random = math.Random.secure();
    final bytes = List<int>.generate(18, (_) => random.nextInt(256));
    return 'psd-${bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join()}';
  }
}
