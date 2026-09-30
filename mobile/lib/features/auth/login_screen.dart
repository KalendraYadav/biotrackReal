import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/socket/socket_service.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../navigation/main_shell_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'hospital@demo.com');
  final _passwordController = TextEditingController(text: 'password123');
  bool _isLoading = false;
  String _loadingMessage = 'Authenticating...';
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin({String? email, String? password}) async {
    final targetHost = Uri.tryParse(AppConfig.apiBaseUrl)?.host ?? 'BIOTrace Cloud';
    setState(() {
      _isLoading = true;
      _loadingMessage = 'Connecting to $targetHost...';
      _errorMessage = null;
    });

    final targetEmail = email ?? _emailController.text.trim();
    final targetPassword = password ?? _passwordController.text;

    Timer? standbyTimer;
    if (AppConfig.isProduction) {
      standbyTimer = Timer(const Duration(seconds: 4), () {
        if (mounted && _isLoading) {
          setState(() {
            _loadingMessage = 'Connecting to Render Cloud (waking server if idle)...';
          });
        }
      });
    }

    try {
      final response = await ApiClient.post(
        '/auth/login',
        body: {
          'email': targetEmail,
          'password': targetPassword,
        },
        requiresAuth: false,
      );

      standbyTimer?.cancel();

      if (!response.isSuccess) {
        setState(() {
          _isLoading = false;
          _errorMessage = response.errorMessage ?? 'Authentication failed.';
        });
        return;
      }

      final data = response.data;
      final token = data['token']?.toString();
      final userMap = data['user'] as Map<String, dynamic>?;

      if (token == null || userMap == null) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Invalid response payload from authentication server.';
        });
        return;
      }

      final user = UserModel.fromJson(userMap);
      await SecureStorageService.saveAuthData(token: token, user: user);

      // Initialize Socket.IO connection
      await SocketService.initSocket();

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => MainShellScreen(initialUser: user)),
        );
      }
    } catch (e) {
      standbyTimer?.cancel();
      setState(() {
        _isLoading = false;
        _errorMessage = 'Connection failure: ${e.toString()}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showEnvironmentDialog() {
    showDialog(
      context: context,
      builder: (ctx) {
        AppEnvironment selected = AppConfig.currentEnv;
        final ipCtrl = TextEditingController(text: AppConfig.customLanIp);
        String? probeResult;
        bool isProbing = false;

        return StatefulBuilder(
          builder: (context, setDlgState) {
            return AlertDialog(
              title: const Text('Target Backend Environment', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RadioListTile<AppEnvironment>(
                      title: const Text('Production Cloud (Default)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF166534))),
                      subtitle: const Text('biotrace-backend-aniv.onrender.com/api', style: TextStyle(fontSize: 11)),
                      value: AppEnvironment.production,
                      groupValue: selected,
                      onChanged: (val) => setDlgState(() {
                        selected = val!;
                        probeResult = null;
                      }),
                    ),
                    RadioListTile<AppEnvironment>(
                      title: const Text('Local WiFi / LAN IP', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      subtitle: const Text('Physical phone on same WiFi as PC', style: TextStyle(fontSize: 11)),
                      value: AppEnvironment.localLan,
                      groupValue: selected,
                      onChanged: (val) => setDlgState(() {
                        selected = val!;
                        probeResult = null;
                      }),
                    ),
                    RadioListTile<AppEnvironment>(
                      title: const Text('Android Emulator (10.0.2.2:5000)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      subtitle: const Text('Only for Android Studio PC emulator', style: TextStyle(fontSize: 11)),
                      value: AppEnvironment.emulator,
                      groupValue: selected,
                      onChanged: (val) => setDlgState(() {
                        selected = val!;
                        probeResult = null;
                      }),
                    ),
                    if (selected == AppEnvironment.localLan) ...[
                      const SizedBox(height: 8),
                      TextField(
                        controller: ipCtrl,
                        decoration: const InputDecoration(
                          labelText: 'PC IP Address',
                          hintText: 'e.g. 192.168.1.100',
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    if (probeResult != null)
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: probeResult!.startsWith('OK') ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: probeResult!.startsWith('OK') ? const Color(0xFF86EFAC) : const Color(0xFFFECACA),
                          ),
                        ),
                        child: Text(
                          probeResult!,
                          style: TextStyle(
                            fontSize: 11,
                            color: probeResult!.startsWith('OK') ? const Color(0xFF166534) : const Color(0xFF991B1B),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isProbing
                      ? null
                      : () async {
                          setDlgState(() {
                            isProbing = true;
                            probeResult = 'Testing connection...';
                          });
                          await AppConfig.setEnvironment(selected, customIp: ipCtrl.text.trim());
                          final res = await ApiClient.checkHealth();
                          setDlgState(() {
                            isProbing = false;
                            if (res.isSuccess) {
                              probeResult = 'OK: Backend is reachable & healthy (${res.data?['status'] ?? 'connected'})';
                            } else {
                              probeResult = 'Probe Failed: ${res.errorMessage}';
                            }
                          });
                        },
                  child: const Text('Test Connection'),
                ),
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  onPressed: () async {
                    await AppConfig.setEnvironment(selected, customIp: ipCtrl.text.trim());
                    if (ctx.mounted) Navigator.pop(ctx);
                    setState(() {});
                  },
                  child: const Text('Apply'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Top Brand Anchor
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.shield_outlined, color: Colors.white, size: 32),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      'BIOTrace',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF064E3B),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'NIDUSCLEAN',
                        style: TextStyle(
                          color: Color(0xFF6EE7B7),
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Biomedical Waste Digital Chain of Custody',
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 14),

                // Environment Chip & Target Host
                InkWell(
                  onTap: _showEnvironmentDialog,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppConfig.isProduction ? const Color(0xFFF0FDF4) : AppColors.surfaceAlt,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AppConfig.isProduction ? const Color(0xFF86EFAC) : AppColors.border,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: AppConfig.isProduction ? const Color(0xFF16A34A) : AppColors.accent,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          AppConfig.environmentLabel,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppConfig.isProduction ? const Color(0xFF166534) : AppColors.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.textMuted),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  AppConfig.apiBaseUrl,
                  style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontFamily: 'monospace'),
                ),
                const SizedBox(height: 16),

                // Login Form Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Authorized Personnel Login',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Enter statutory CPCB credentials',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 16),

                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.dangerBg,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.dangerBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.error_outline, color: AppColors.danger, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(color: AppColors.danger, fontSize: 11.5, fontWeight: FontWeight.w500),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Align(
                                alignment: Alignment.centerRight,
                                child: InkWell(
                                  onTap: () async {
                                    final messenger = ScaffoldMessenger.of(context);
                                    final res = await ApiClient.checkHealth();
                                    if (mounted) {
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text(res.isSuccess
                                              ? 'Backend is online & reachable: 200 OK'
                                              : 'Probe failed: ${res.errorMessage}'),
                                          backgroundColor: res.isSuccess ? AppColors.primary : AppColors.danger,
                                          duration: const Duration(seconds: 4),
                                        ),
                                      );
                                    }
                                  },
                                  child: const Text(
                                    'Probe Server Health',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary, decoration: TextDecoration.underline),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Official Email',
                          hintText: 'name@hospital.demo',
                          prefixIcon: Icon(Icons.email_outlined, size: 18),
                        ),
                      ),
                      const SizedBox(height: 12),

                      TextField(
                        controller: _passwordController,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          prefixIcon: Icon(Icons.lock_outline, size: 18),
                        ),
                      ),
                      const SizedBox(height: 16),

                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : () => _handleLogin(),
                          child: _isLoading
                              ? Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                    ),
                                    const SizedBox(width: 10),
                                    Flexible(
                                      child: Text(
                                        _loadingMessage,
                                        style: const TextStyle(fontSize: 12),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                )
                              : const Text('Authenticate & Enter'),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 1-Click Demo Role Grid
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: AppColors.accentLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Icon(Icons.touch_app_rounded, color: AppColors.accent, size: 15),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            '1-Click Demo Testing Roles',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Tap any statutory role to sign in instantly:',
                        style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 12),

                      GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                          childAspectRatio: 1.8,
                        ),
                        itemCount: AppConstants.demoAccounts.length,
                        itemBuilder: (context, index) {
                          final account = AppConstants.demoAccounts[index];
                          return InkWell(
                            onTap: _isLoading
                                ? null
                                : () {
                                    _emailController.text = account.email;
                                    _passwordController.text = account.password;
                                    _handleLogin(email: account.email, password: account.password);
                                  },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceAlt,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    account.title,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    account.name,
                                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(
                                    account.facility,
                                    style: const TextStyle(fontSize: 9, color: AppColors.primary, fontWeight: FontWeight.w500),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
