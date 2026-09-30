import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';

class ApiResponse<T> {
  final bool isSuccess;
  final T? data;
  final String? errorMessage;
  final int statusCode;

  ApiResponse({
    required this.isSuccess,
    this.data,
    this.errorMessage,
    required this.statusCode,
  });

  factory ApiResponse.success(T data, {int statusCode = 200}) {
    return ApiResponse(
      isSuccess: true,
      data: data,
      statusCode: statusCode,
    );
  }

  factory ApiResponse.error(String message, {int statusCode = 500}) {
    return ApiResponse(
      isSuccess: false,
      errorMessage: message,
      statusCode: statusCode,
    );
  }
}

class ApiClient {
  static final http.Client _client = http.Client();
  // 40s allows Render Free cloud instance to spin up from cold-sleep if needed
  static const Duration timeoutDuration = Duration(seconds: 40);

  static Uri _buildUri(String endpoint, [Map<String, String>? queryParams]) {
    final base = AppConfig.apiBaseUrl.trim();
    final cleanBase = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
    final cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    var uri = Uri.parse('$cleanBase$cleanEndpoint');
    if (queryParams != null && queryParams.isNotEmpty) {
      uri = uri.replace(queryParameters: queryParams);
    }
    return uri;
  }

  static Future<Map<String, String>> _getHeaders({bool requiresAuth = true}) async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requiresAuth) {
      final token = await SecureStorageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  static Future<ApiResponse<Map<String, dynamic>>> checkHealth() async {
    final uri = _buildUri('/health');
    try {
      debugPrint('[ApiClient] Health check probing: $uri');
      final response = await _client.get(uri).timeout(const Duration(seconds: 20));
      debugPrint('[ApiClient] Health check response: ${response.statusCode}');
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final json = jsonDecode(response.body);
        return ApiResponse.success(Map<String, dynamic>.from(json));
      }
      return ApiResponse.error('Health check returned HTTP ${response.statusCode}', statusCode: response.statusCode);
    } catch (e) {
      debugPrint('[ApiClient] Health check probe failed: $e');
      return ApiResponse.error('Health probe failed: $e', statusCode: 0);
    }
  }

  static Future<ApiResponse<dynamic>> get(
    String endpoint, {
    bool requiresAuth = true,
    Map<String, String>? queryParams,
  }) async {
    final uri = _buildUri(endpoint, queryParams);
    try {
      debugPrint('[ApiClient] GET $uri (requiresAuth: $requiresAuth)');
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final stopwatch = Stopwatch()..start();
      final response = await _client.get(uri, headers: headers).timeout(timeoutDuration);
      stopwatch.stop();
      debugPrint('[ApiClient] GET $uri completed in ${stopwatch.elapsedMilliseconds}ms with status ${response.statusCode}');

      return _handleResponse(response, uri);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] SocketException for $uri: ${e.message} (osError: ${e.osError})');
      String msg = 'Cannot connect to backend (${uri.host})';
      if (e.osError?.errorCode == 7 || e.message.contains('No address associated with hostname')) {
        msg = 'DNS lookup failed for ${uri.host}. Please check your phone internet connection.';
      } else if (e.osError?.errorCode == 111 || e.message.contains('Connection refused')) {
        msg = 'Connection refused by ${uri.host}:${uri.port}. Ensure backend is running.';
      } else {
        msg = 'Network connection failed (${e.message}) for ${uri.host}';
      }
      return ApiResponse.error(msg, statusCode: 0);
    } on HandshakeException catch (e) {
      debugPrint('[ApiClient] HandshakeException for $uri: $e');
      return ApiResponse.error('Secure TLS/SSL handshake failed for ${uri.host}: ${e.message}', statusCode: 495);
    } on TlsException catch (e) {
      debugPrint('[ApiClient] TlsException for $uri: $e');
      return ApiResponse.error('TLS secure connection error for ${uri.host}: ${e.message}', statusCode: 495);
    } on TimeoutException catch (e) {
      debugPrint('[ApiClient] TimeoutException for $uri after ${timeoutDuration.inSeconds}s: $e');
      return ApiResponse.error(
        'Request timed out reaching ${uri.host} after ${timeoutDuration.inSeconds}s. If the cloud server was sleeping, please retry in a moment.',
        statusCode: 408,
      );
    } on HttpException catch (e) {
      debugPrint('[ApiClient] HttpException for $uri: $e');
      return ApiResponse.error('HTTP protocol error: ${e.message}', statusCode: 500);
    } catch (e, stack) {
      debugPrint('[ApiClient] Unexpected error for $uri: $e\n$stack');
      return ApiResponse.error('Network failure (${e.runtimeType}): $e', statusCode: 500);
    }
  }

  static Future<ApiResponse<dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final uri = _buildUri(endpoint);
    try {
      debugPrint('[ApiClient] POST $uri (requiresAuth: $requiresAuth)');
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final stopwatch = Stopwatch()..start();
      final response = await _client
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeoutDuration);
      stopwatch.stop();
      debugPrint('[ApiClient] POST $uri completed in ${stopwatch.elapsedMilliseconds}ms with status ${response.statusCode}');

      return _handleResponse(response, uri);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] SocketException for $uri: ${e.message} (osError: ${e.osError})');
      String msg = 'Cannot connect to backend (${uri.host})';
      if (e.osError?.errorCode == 7 || e.message.contains('No address associated with hostname')) {
        msg = 'DNS lookup failed for ${uri.host}. Please check your phone internet connection.';
      } else if (e.osError?.errorCode == 111 || e.message.contains('Connection refused')) {
        msg = 'Connection refused by ${uri.host}:${uri.port}. Ensure backend is running.';
      } else {
        msg = 'Network connection failed (${e.message}) for ${uri.host}';
      }
      return ApiResponse.error(msg, statusCode: 0);
    } on HandshakeException catch (e) {
      debugPrint('[ApiClient] HandshakeException for $uri: $e');
      return ApiResponse.error('Secure TLS/SSL handshake failed for ${uri.host}: ${e.message}', statusCode: 495);
    } on TlsException catch (e) {
      debugPrint('[ApiClient] TlsException for $uri: $e');
      return ApiResponse.error('TLS secure connection error for ${uri.host}: ${e.message}', statusCode: 495);
    } on TimeoutException catch (e) {
      debugPrint('[ApiClient] TimeoutException for $uri after ${timeoutDuration.inSeconds}s: $e');
      return ApiResponse.error(
        'Request timed out reaching ${uri.host} after ${timeoutDuration.inSeconds}s. If the cloud server was sleeping, please retry in a moment.',
        statusCode: 408,
      );
    } on HttpException catch (e) {
      debugPrint('[ApiClient] HttpException for $uri: $e');
      return ApiResponse.error('HTTP protocol error: ${e.message}', statusCode: 500);
    } catch (e, stack) {
      debugPrint('[ApiClient] Unexpected error for $uri: $e\n$stack');
      return ApiResponse.error('Network failure (${e.runtimeType}): $e', statusCode: 500);
    }
  }

  static Future<ApiResponse<dynamic>> put(
    String endpoint, {
    Map<String, dynamic>? body,
    bool requiresAuth = true,
  }) async {
    final uri = _buildUri(endpoint);
    try {
      debugPrint('[ApiClient] PUT $uri (requiresAuth: $requiresAuth)');
      final headers = await _getHeaders(requiresAuth: requiresAuth);
      final stopwatch = Stopwatch()..start();
      final response = await _client
          .put(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(timeoutDuration);
      stopwatch.stop();
      debugPrint('[ApiClient] PUT $uri completed in ${stopwatch.elapsedMilliseconds}ms with status ${response.statusCode}');

      return _handleResponse(response, uri);
    } on SocketException catch (e) {
      debugPrint('[ApiClient] SocketException for $uri: ${e.message} (osError: ${e.osError})');
      String msg = 'Cannot connect to backend (${uri.host})';
      if (e.osError?.errorCode == 7 || e.message.contains('No address associated with hostname')) {
        msg = 'DNS lookup failed for ${uri.host}. Please check your phone internet connection.';
      } else if (e.osError?.errorCode == 111 || e.message.contains('Connection refused')) {
        msg = 'Connection refused by ${uri.host}:${uri.port}. Ensure backend is running.';
      } else {
        msg = 'Network connection failed (${e.message}) for ${uri.host}';
      }
      return ApiResponse.error(msg, statusCode: 0);
    } on HandshakeException catch (e) {
      debugPrint('[ApiClient] HandshakeException for $uri: $e');
      return ApiResponse.error('Secure TLS/SSL handshake failed for ${uri.host}: ${e.message}', statusCode: 495);
    } on TlsException catch (e) {
      debugPrint('[ApiClient] TlsException for $uri: $e');
      return ApiResponse.error('TLS secure connection error for ${uri.host}: ${e.message}', statusCode: 495);
    } on TimeoutException catch (e) {
      debugPrint('[ApiClient] TimeoutException for $uri after ${timeoutDuration.inSeconds}s: $e');
      return ApiResponse.error(
        'Request timed out reaching ${uri.host} after ${timeoutDuration.inSeconds}s. If the cloud server was sleeping, please retry in a moment.',
        statusCode: 408,
      );
    } on HttpException catch (e) {
      debugPrint('[ApiClient] HttpException for $uri: $e');
      return ApiResponse.error('HTTP protocol error: ${e.message}', statusCode: 500);
    } catch (e, stack) {
      debugPrint('[ApiClient] Unexpected error for $uri: $e\n$stack');
      return ApiResponse.error('Network failure (${e.runtimeType}): $e', statusCode: 500);
    }
  }

  static ApiResponse<dynamic> _handleResponse(http.Response response, Uri uri) {
    dynamic jsonBody;
    try {
      if (response.body.isNotEmpty) {
        jsonBody = jsonDecode(response.body);
      }
    } catch (_) {
      jsonBody = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return ApiResponse.success(jsonBody, statusCode: response.statusCode);
    }

    String errorMsg = 'An error occurred (HTTP ${response.statusCode})';
    if (jsonBody is Map) {
      errorMsg = jsonBody['message']?.toString() ??
          jsonBody['error']?.toString() ??
          errorMsg;
    }

    if (response.statusCode == 400) {
      return ApiResponse.error(errorMsg, statusCode: 400);
    }

    if (response.statusCode == 401) {
      return ApiResponse.error(errorMsg, statusCode: 401);
    }

    if (response.statusCode == 403) {
      return ApiResponse.error(errorMsg, statusCode: 403);
    }

    if (response.statusCode == 404) {
      return ApiResponse.error('Endpoint not found: ${uri.path}', statusCode: 404);
    }

    if (response.statusCode == 422) {
      return ApiResponse.error(errorMsg, statusCode: 422);
    }

    if (response.statusCode == 429) {
      return ApiResponse.error('Rate limit exceeded. Please wait a moment before trying again.', statusCode: 429);
    }

    if (response.statusCode == 502 || response.statusCode == 503) {
      return ApiResponse.error('Server unavailable or starting up (HTTP ${response.statusCode}). Please retry in a few seconds.', statusCode: response.statusCode);
    }

    return ApiResponse.error(errorMsg, statusCode: response.statusCode);
  }
}

