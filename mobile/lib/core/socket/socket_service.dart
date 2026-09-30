import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';

class SocketService {
  static io.Socket? _socket;
  static bool _isConnected = false;

  static final _telemetryStreamController = StreamController<Map<String, dynamic>>.broadcast();
  static final _riskAlertStreamController = StreamController<Map<String, dynamic>>.broadcast();
  static final _custodyEventStreamController = StreamController<Map<String, dynamic>>.broadcast();
  static final _connectionStatusController = StreamController<bool>.broadcast();

  static bool get isConnected => _isConnected;
  static Stream<Map<String, dynamic>> get telemetryStream => _telemetryStreamController.stream;
  static Stream<Map<String, dynamic>> get riskAlertStream => _riskAlertStreamController.stream;
  static Stream<Map<String, dynamic>> get custodyEventStream => _custodyEventStreamController.stream;
  static Stream<bool> get connectionStatusStream => _connectionStatusController.stream;

  static Future<void> initSocket() async {
    disconnect();

    final token = await SecureStorageService.getToken();
    if (token == null || token.isEmpty) return;

    final socketUrl = AppConfig.socketBaseUrl;

    try {
      _socket = io.io(
        socketUrl,
        io.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .setAuth({'token': token})
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(3000)
            .build(),
      );

      _socket?.onConnect((_) {
        _isConnected = true;
        _connectionStatusController.add(true);
        debugPrint('[SocketService] Connected to $socketUrl');
      });

      _socket?.onDisconnect((_) {
        _isConnected = false;
        _connectionStatusController.add(false);
        debugPrint('[SocketService] Disconnected from server');
      });

      _socket?.onConnectError((err) {
        _isConnected = false;
        _connectionStatusController.add(false);
        debugPrint('[SocketService] Connect error: $err');
      });

      _socket?.on('telemetry:ping', (data) {
        if (data is Map) {
          _telemetryStreamController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket?.on('risk:alert', (data) {
        if (data is Map) {
          _riskAlertStreamController.add(Map<String, dynamic>.from(data));
        }
      });

      _socket?.on('custody:event', (data) {
        if (data is Map) {
          _custodyEventStreamController.add(Map<String, dynamic>.from(data));
        }
      });
    } catch (e) {
      debugPrint('[SocketService] Initialization error: $e');
    }
  }

  static void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _connectionStatusController.add(false);
  }
}
