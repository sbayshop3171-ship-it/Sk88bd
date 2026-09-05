class SignalAccessSession {
  const SignalAccessSession({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresAt,
    required this.deviceId,
  });

  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;
  final String deviceId;

  bool get hasFreshAccess =>
      accessToken.isNotEmpty &&
      expiresAt.isAfter(DateTime.now().add(const Duration(seconds: 30)));

  SignalAccessSession copyWith({
    String? accessToken,
    String? refreshToken,
    DateTime? expiresAt,
    String? deviceId,
  }) {
    return SignalAccessSession(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      expiresAt: expiresAt ?? this.expiresAt,
      deviceId: deviceId ?? this.deviceId,
    );
  }

  factory SignalAccessSession.fromJson(
    Map<String, dynamic> json, {
    required String deviceId,
    String? fallbackRefreshToken,
  }) {
    return SignalAccessSession(
      accessToken: '${json['accessToken'] ?? ''}',
      refreshToken: '${json['refreshToken'] ?? fallbackRefreshToken ?? ''}',
      expiresAt:
          DateTime.tryParse('${json['expiresAt'] ?? ''}') ?? DateTime.now(),
      deviceId: deviceId,
    );
  }
}
