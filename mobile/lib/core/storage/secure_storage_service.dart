import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../shared/models/user_model.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
    ),
  );

  static const String _keyToken = 'biotrace_jwt_token';
  static const String _keyUser = 'biotrace_user_profile';

  static Future<void> saveAuthData({required String token, required UserModel user}) async {
    await _storage.write(key: _keyToken, value: token);
    await _storage.write(key: _keyUser, value: jsonEncode(user.toJson()));
  }

  static Future<String?> getToken() async {
    try {
      return await _storage.read(key: _keyToken);
    } catch (_) {
      return null;
    }
  }

  static Future<UserModel?> getUser() async {
    try {
      final userStr = await _storage.read(key: _keyUser);
      if (userStr != null && userStr.isNotEmpty) {
        final Map<String, dynamic> jsonMap = jsonDecode(userStr);
        return UserModel.fromJson(jsonMap);
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  static Future<void> clearAuth() async {
    try {
      await _storage.delete(key: _keyToken);
      await _storage.delete(key: _keyUser);
    } catch (_) {}
  }
}
