import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../models/signal_access_session.dart';
import '../services/signal_api_client.dart';
import '../services/signal_session_store.dart';
import '../theme/neon_theme.dart';
import '../widgets/neon_background.dart';
import 'access_key_screen.dart';
import 'signal_terminal_screen.dart';

class SignalAccessGate extends StatefulWidget {
  const SignalAccessGate({
    super.key,
    required this.apiBaseUrl,
  });

  final String apiBaseUrl;

  @override
  State<SignalAccessGate> createState() => _SignalAccessGateState();
}

class _SignalAccessGateState extends State<SignalAccessGate> {
  late final SignalApiClient _api;
  late final SignalSessionStore _store;
  SignalAccessSession? _session;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _api = SignalApiClient(baseUrl: widget.apiBaseUrl);
    _store = SignalSessionStore();
    _bootstrap();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    final saved = await _store.readSession();
    if (!mounted) return;

    if (saved?.hasFreshAccess == true) {
      setState(() {
        _session = saved;
        _loading = false;
      });
      return;
    }

    if (saved != null && saved.refreshToken.isNotEmpty) {
      try {
        final refreshed = await _api.refreshSession(
          refreshToken: saved.refreshToken,
          deviceId: saved.deviceId,
        );
        final merged = refreshed.refreshToken.isEmpty
            ? refreshed.copyWith(refreshToken: saved.refreshToken)
            : refreshed;
        await _store.saveSession(merged);
        if (!mounted) return;
        setState(() {
          _session = merged;
          _loading = false;
        });
        return;
      } catch (_) {
        await _store.clearSession();
      }
    }

    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<String?> _unlock(String appKey) async {
    final key = appKey.trim();
    if (key.isEmpty) return 'Access key দিন।';
    if (widget.apiBaseUrl.trim().isEmpty) {
      return 'Backend URL missing। নতুন APK API URL দিয়ে build করুন।';
    }

    try {
      final deviceId = await _store.getOrCreateDeviceId();
      final session = await _api.unlockAccessKey(
        appKey: key,
        deviceId: deviceId,
        appVersion: signalAppVersion,
      );
      await _store.saveSession(session);
      if (!mounted) return null;
      setState(() => _session = session);
      return null;
    } on SignalApiException catch (err) {
      return err.message;
    } catch (_) {
      return 'Unlock করা যায়নি। আবার চেষ্টা করুন।';
    }
  }

  Future<String?> _refreshOrLock() async {
    final saved = await _store.readSession();
    if (saved == null || saved.refreshToken.isEmpty) {
      await _lock();
      return null;
    }

    try {
      final refreshed = await _api.refreshSession(
        refreshToken: saved.refreshToken,
        deviceId: saved.deviceId,
      );
      final merged = refreshed.refreshToken.isEmpty
          ? refreshed.copyWith(refreshToken: saved.refreshToken)
          : refreshed;
      await _store.saveSession(merged);
      if (mounted) setState(() => _session = merged);
      return merged.accessToken;
    } catch (_) {
      await _lock();
      return null;
    }
  }

  Future<void> _lock() async {
    await _store.clearSession();
    if (!mounted) return;
    setState(() => _session = null);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const _LoadingAccess();

    final session = _session;
    if (session == null) {
      return AccessKeyScreen(onUnlock: _unlock);
    }

    return SignalTerminalScreen(
      apiBaseUrl: widget.apiBaseUrl,
      accessToken: session.accessToken,
      onUnauthorized: _refreshOrLock,
    );
  }
}

class _LoadingAccess extends StatelessWidget {
  const _LoadingAccess();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: NeonBackground(
        child: Center(
          child: CircularProgressIndicator(color: NeonPalette.cyan),
        ),
      ),
    );
  }
}
