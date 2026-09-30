import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/config/app_config.dart';
import 'core/socket/socket_service.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/navigation/main_shell_screen.dart';
import 'shared/models/user_model.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set Android status bar to dark navy brand color
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  await AppConfig.init();

  // Check cached session
  final token = await SecureStorageService.getToken();
  final user = await SecureStorageService.getUser();

  if (token != null && user != null) {
    await SocketService.initSocket();
  }

  runApp(BIOTraceApp(cachedUser: user));
}

class BIOTraceApp extends StatelessWidget {
  final UserModel? cachedUser;

  const BIOTraceApp({super.key, this.cachedUser});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BIOTrace',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: cachedUser != null
          ? MainShellScreen(initialUser: cachedUser!)
          : const LoginScreen(),
    );
  }
}
