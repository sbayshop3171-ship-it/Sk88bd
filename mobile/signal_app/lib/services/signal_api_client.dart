import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/signal_access_session.dart';
import '../models/signal_snapshot.dart';

class SignalApiClient {
  SignalApiClient({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Future<SignalSnapshot> fetchSnapshot(
    SignalGame game, {
    required String accessToken,
  }) async {
    if (baseUrl.trim().isEmpty) {
      throw const SignalUnauthorizedException('Signal API base URL missing');
    }

    final response = await _client.get(_snapshotUri(game), headers: {
      'accept': 'application/json',
      'authorization': 'Bearer $accessToken',
    }).timeout(const Duration(seconds: 4));

    if (response.statusCode == 401) {
      throw const SignalUnauthorizedException('Signal access expired');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SignalApiException('Signal API returned ${response.statusCode}');
    }

    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const SignalApiException('Signal API returned invalid JSON');
    }

    return SignalSnapshot.fromJson(decoded, game);
  }

  Future<SignalAccessSession> unlockAccessKey({
    required String appKey,
    required String deviceId,
    required String appVersion,
  }) async {
    final response = await _postJson('api/signal-terminal/unlock', {
      'appKey': appKey,
      'deviceId': deviceId,
      'appVersion': appVersion,
    });

    final decoded = _decodeMap(response);
    if (response.statusCode == 401 ||
        response.statusCode == 409 ||
        response.statusCode == 423) {
      throw SignalAccessException(_reasonMessage(decoded['reason']));
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SignalAccessException('Unlock failed (${response.statusCode})');
    }

    return SignalAccessSession.fromJson(decoded, deviceId: deviceId);
  }

  Future<SignalAccessSession> refreshSession({
    required String refreshToken,
    required String deviceId,
  }) async {
    final response = await _postJson('api/signal-terminal/refresh', {
      'refreshToken': refreshToken,
      'deviceId': deviceId,
    });

    final decoded = _decodeMap(response);
    if (response.statusCode == 401) {
      throw SignalUnauthorizedException(_reasonMessage(decoded['reason']));
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SignalAccessException('Refresh failed (${response.statusCode})');
    }

    return SignalAccessSession.fromJson(
      decoded,
      deviceId: deviceId,
      fallbackRefreshToken: refreshToken,
    );
  }

  Uri _snapshotUri(SignalGame game) {
    return _apiUri('api/signal-terminal/snapshot?game=${game.apiValue}');
  }

  Future<http.Response> _postJson(String path, Map<String, Object?> body) {
    if (baseUrl.trim().isEmpty) {
      throw const SignalAccessException('Signal API base URL missing');
    }

    return _client
        .post(
          _apiUri(path),
          headers: const {
            'accept': 'application/json',
            'content-type': 'application/json',
          },
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 6));
  }

  Uri _apiUri(String path) {
    final normalized =
        baseUrl.trim().endsWith('/') ? baseUrl.trim() : '${baseUrl.trim()}/';
    return Uri.parse(normalized).resolve(path);
  }

  Map<String, dynamic> _decodeMap(http.Response response) {
    final decoded = jsonDecode(response.body);
    if (decoded is! Map<String, dynamic>) {
      throw const SignalApiException('Signal API returned invalid JSON');
    }
    return decoded;
  }

  String _reasonMessage(Object? reason) {
    return switch ('$reason') {
      'invalid-key' => 'Access key সঠিক নয়।',
      'key-disabled' => 'এই access key disabled করা হয়েছে।',
      'key-revoked' => 'এই access key revoke করা হয়েছে।',
      'key-expired' => 'এই access key expired হয়েছে।',
      'device-limit' => 'এই key-এর device limit শেষ।',
      'locked' => 'অনেকবার ভুল key দেওয়া হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।',
      'invalid-refresh' => 'Session expired। আবার key unlock করুন।',
      'device-required' => 'Device ID তৈরি করা যায়নি।',
      _ => 'Access অনুমোদন হয়নি।',
    };
  }

  void dispose() {
    _client.close();
  }
}

class SignalApiException implements Exception {
  const SignalApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class SignalUnauthorizedException extends SignalApiException {
  const SignalUnauthorizedException(super.message);
}

class SignalAccessException extends SignalApiException {
  const SignalAccessException(super.message);
}
