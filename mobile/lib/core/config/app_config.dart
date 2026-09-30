import 'package:shared_preferences/shared_preferences.dart';

enum AppEnvironment {
  production, // Deployed Render backend (DEFAULT for physical devices & cloud)
  localLan,   // Custom LAN IP for testing over WiFi on physical phone
  emulator,   // 10.0.2.2 (Android Emulator to local PC)
}

class AppConfig {
  static const String keySelectedEnv = 'biotrace_selected_env';
  static const String keyCustomLanIp = 'biotrace_custom_lan_ip';

  static const String prodApiBase = 'https://biotrace-backend-aniv.onrender.com/api';
  static const String prodSocketBase = 'https://biotrace-backend-aniv.onrender.com';

  static const String emulatorApiBase = 'http://10.0.2.2:5000/api';
  static const String emulatorSocketBase = 'http://10.0.2.2:5000';

  static AppEnvironment _currentEnv = AppEnvironment.production;
  static String _customLanIp = '192.168.1.100';

  static AppEnvironment get currentEnv => _currentEnv;
  static String get customLanIp => _customLanIp;
  static bool get isProduction => _currentEnv == AppEnvironment.production;

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final envString = prefs.getString(keySelectedEnv);
      if (envString != null) {
        _currentEnv = AppEnvironment.values.firstWhere(
          (e) => e.name == envString,
          orElse: () => AppEnvironment.production,
        );
      } else {
        _currentEnv = AppEnvironment.production;
      }
      _customLanIp = prefs.getString(keyCustomLanIp) ?? '192.168.1.100';
    } catch (_) {
      _currentEnv = AppEnvironment.production;
    }
  }

  static Future<void> setEnvironment(AppEnvironment env, {String? customIp}) async {
    _currentEnv = env;
    if (customIp != null && customIp.isNotEmpty) {
      _customLanIp = customIp;
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(keySelectedEnv, env.name);
    await prefs.setString(keyCustomLanIp, _customLanIp);
  }

  static String get apiBaseUrl {
    switch (_currentEnv) {
      case AppEnvironment.production:
        return prodApiBase;
      case AppEnvironment.localLan:
        return 'http://$_customLanIp:5000/api';
      case AppEnvironment.emulator:
        return emulatorApiBase;
    }
  }

  static String get socketBaseUrl {
    switch (_currentEnv) {
      case AppEnvironment.production:
        return prodSocketBase;
      case AppEnvironment.localLan:
        return 'http://$_customLanIp:5000';
      case AppEnvironment.emulator:
        return emulatorSocketBase;
    }
  }

  static String get environmentLabel {
    switch (_currentEnv) {
      case AppEnvironment.production:
        return 'Production Cloud';
      case AppEnvironment.localLan:
        return 'Local WiFi ($_customLanIp)';
      case AppEnvironment.emulator:
        return 'Android Host (10.0.2.2)';
    }
  }
}
