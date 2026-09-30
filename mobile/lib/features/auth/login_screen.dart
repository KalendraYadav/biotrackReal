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
  String _selectedRole = AppRoles.hospitalAuthority;
  bool _obscurePassword = true;
  bool _isLoading = false;
  String _loadingMessage = 'Authenticating...';
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onSelectRole(DemoAccount account) {
    setState(() {
      _selectedRole = account.role;
      _emailController.text = account.email;
      _passwordController.text = account.password;
      _errorMessage = null;
    });
  }

  void _onInstantLogin(DemoAccount account) {
    _onSelectRole(account);
    _handleLogin(email: account.email, password: account.password);
  }

  Future<void> _handleLogin({String? email, String? password}) async {
    final targetHost = Uri.tryParse(AppConfig.apiBaseUrl)?.host ?? 'BIOTrace Cloud';
    setState(() {
      _isLoading = true;
      _loadingMessage = 'Connecting to $targetHost...';
      _errorMessage = null;
    });

    final rawEmail = email ?? _emailController.text.trim();
    // Transparently alias legacy demo email if needed
    final targetEmail = (rawEmail == 'government@demo.com') ? 'regulator@demo.com' : rawEmail;
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

  Future<void> _probeServer() async {
    final messenger = ScaffoldMessenger.of(context);
    final res = await ApiClient.checkHealth();
    if (mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(res.isSuccess
              ? 'Backend is online & reachable: 200 OK (${res.data?['database'] ?? 'connected'})'
              : 'Probe failed: ${res.errorMessage}'),
          backgroundColor: res.isSuccess ? const Color(0xFF14462A) : AppColors.danger,
          duration: const Duration(seconds: 4),
        ),
      );
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
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text(
                'Target Backend Environment',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    RadioListTile<AppEnvironment>(
                      activeColor: const Color(0xFF14462A),
                      title: const Text(
                        'Production Cloud (Default)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF14462A)),
                      ),
                      subtitle: const Text('biotrace-backend-aniv.onrender.com/api', style: TextStyle(fontSize: 11)),
                      value: AppEnvironment.production,
                      groupValue: selected,
                      onChanged: (val) => setDlgState(() {
                        selected = val!;
                        probeResult = null;
                      }),
                    ),
                    RadioListTile<AppEnvironment>(
                      activeColor: const Color(0xFF14462A),
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
                      activeColor: const Color(0xFF14462A),
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
                            color: probeResult!.startsWith('OK') ? const Color(0xFF14462A) : const Color(0xFF991B1B),
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
                  child: const Text('Test Connection', style: TextStyle(color: Color(0xFF14462A))),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF14462A),
                    foregroundColor: Colors.white,
                  ),
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

  IconData _getRoleIcon(String role) {
    switch (role) {
      case AppRoles.hospitalAuthority:
        return Icons.domain_rounded;
      case AppRoles.collectionOfficer:
        return Icons.verified_user_rounded;
      case AppRoles.transportOfficer:
        return Icons.local_shipping_rounded;
      case AppRoles.treatmentFacility:
        return Icons.local_fire_department_rounded;
      case AppRoles.governmentAuthority:
        return Icons.show_chart_rounded;
      case AppRoles.complianceInspector:
        return Icons.balance_rounded;
      default:
        return Icons.shield_outlined;
    }
  }

  Color _getRoleAccentColor(String role) {
    switch (role) {
      case AppRoles.hospitalAuthority:
        return const Color(0xFF14462A); // Forest Green
      case AppRoles.collectionOfficer:
        return const Color(0xFF103823); // Dark Forest
      case AppRoles.transportOfficer:
        return const Color(0xFFB45309); // Hazmat Amber
      case AppRoles.treatmentFacility:
        return const Color(0xFFC2410C); // Biohazard Orange
      case AppRoles.governmentAuthority:
        return const Color(0xFF1E293B); // Slate Navy
      case AppRoles.complianceInspector:
        return const Color(0xFFD97706); // Gold Amber
      default:
        return const Color(0xFF14462A);
    }
  }

  @override
  Widget build(BuildContext context) {
    final accounts = AppConstants.demoAccounts;
    final selectedAccount = accounts.firstWhere(
      (a) => a.role == _selectedRole,
      orElse: () => accounts.first,
    );

    final screenWidth = MediaQuery.of(context).size.width;
    final horizontalPadding = screenWidth < 360 ? 12.0 : 16.0;

    return Scaffold(
      backgroundColor: const Color(0xFF090D16), // Dark institutional navy (#090D16 / #0B132B)
      body: Stack(
        children: [
          // Subtle ambient radial glow at the top center
          Positioned(
            top: -100,
            left: 0,
            right: 0,
            height: 380,
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 0.85,
                  colors: [
                    Color(0x1A10B981), // Emerald glow
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 20),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Shield Identity Mark (Web reference squircle)
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF1E293B), width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.45),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.shield_outlined,
                          color: Color(0xFFF03E3E), // Biohazard coral red accent
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Brand Wordmark + NIDUSCLEAN Badge
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          const Text(
                            'BIOTrace',
                            style: TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                              color: Colors.white,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFB91C1C), // Red badge matching web
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFDC2626), width: 1),
                            ),
                            child: const Text(
                              'NIDUSCLEAN',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.8,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Institutional Subtitle
                      const Text(
                        'BIOMEDICAL WASTE DIGITAL CHAIN OF CUSTODY & REAL-TIME STATUTORY MONITORING',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF94A3B8),
                          fontFamily: 'monospace',
                          letterSpacing: 0.5,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Statutory Compliance Rule Line
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 6,
                        runSpacing: 2,
                        children: const [
                          Text(
                            'CPCB Rule 2016 Compliant',
                            style: TextStyle(
                              fontSize: 10,
                              color: Color(0xFF64748B),
                              fontFamily: 'monospace',
                            ),
                          ),
                          Text(
                            '•',
                            style: TextStyle(
                              fontSize: 10,
                              color: Color(0xFF475569),
                            ),
                          ),
                          Text(
                            'Server-Side RBAC Enforced',
                            style: TextStyle(
                              fontSize: 10,
                              color: Color(0xFF64748B),
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Production Cloud / Environment Selector Chip
                      InkWell(
                        onTap: _showEnvironmentDialog,
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F172A),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: AppConfig.isProduction ? const Color(0xFF166534) : const Color(0xFF334155),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: AppConfig.isProduction ? const Color(0xFF22C55E) : AppColors.accent,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    if (AppConfig.isProduction)
                                      BoxShadow(
                                        color: const Color(0xFF22C55E).withValues(alpha: 0.6),
                                        blurRadius: 6,
                                        spreadRadius: 1,
                                      ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                AppConfig.environmentLabel,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppConfig.isProduction ? const Color(0xFF86EFAC) : const Color(0xFFCBD5E1),
                                ),
                              ),
                              const SizedBox(width: 4),
                              const Icon(Icons.arrow_drop_down_rounded, size: 18, color: Color(0xFF94A3B8)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        AppConfig.apiBaseUrl,
                        style: const TextStyle(
                          fontSize: 9.5,
                          color: Color(0xFF64748B),
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Main Institutional Authentication Card
                      Container(
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFF334155).withValues(alpha: 0.35)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.4),
                              blurRadius: 28,
                              offset: const Offset(0, 12),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // ─── Section A: Quick Duty Role Selector ───
                            Container(
                              padding: EdgeInsets.all(screenWidth < 360 ? 12 : 16),
                              decoration: const BoxDecoration(
                                color: Color(0xFFF8FAFC),
                                border: Border(
                                  bottom: BorderSide(color: Color(0xFFE2E8F0)),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      const Icon(
                                        Icons.sensors_rounded,
                                        color: Color(0xFF059669),
                                        size: 15,
                                      ),
                                      const SizedBox(width: 6),
                                      Flexible(
                                        child: Text(
                                          'DUTY ROLE TERMINAL ACCESS',
                                          style: const TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.6,
                                            color: Color(0xFF0F172A),
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  RichText(
                                    text: const TextSpan(
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF64748B),
                                        fontFamily: 'monospace',
                                      ),
                                      children: [
                                        TextSpan(text: 'Select role for instant evaluation (demo password: '),
                                        TextSpan(
                                          text: 'password123',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: Color(0xFF334155),
                                          ),
                                        ),
                                        TextSpan(text: ')'),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 12),

                                  // Responsive 2-Column Grid (3 rows)
                                  for (int i = 0; i < accounts.length; i += 2)
                                    Padding(
                                      padding: EdgeInsets.only(bottom: i < accounts.length - 2 ? 8.0 : 0.0),
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: _buildRoleCard(
                                              accounts[i],
                                              isSelected: _selectedRole == accounts[i].role,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          if (i + 1 < accounts.length)
                                            Expanded(
                                              child: _buildRoleCard(
                                                accounts[i + 1],
                                                isSelected: _selectedRole == accounts[i + 1].role,
                                              ),
                                            )
                                          else
                                            const Spacer(),
                                        ],
                                      ),
                                    ),
                                ],
                              ),
                            ),

                            // ─── Section B: Authentication Form & Action Area ───
                            Padding(
                              padding: EdgeInsets.all(screenWidth < 360 ? 14 : 20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Error Banner
                                  if (_errorMessage != null) ...[
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      margin: const EdgeInsets.only(bottom: 16),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFFF1F2),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFFFDA4AF)),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(
                                            Icons.error_outline_rounded,
                                            color: Color(0xFFE11D48),
                                            size: 18,
                                          ),
                                          const SizedBox(width: 10),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  'Authentication failed',
                                                  style: TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w700,
                                                    color: Color(0xFF9F1239),
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  _errorMessage!,
                                                  style: const TextStyle(
                                                    fontSize: 11,
                                                    color: Color(0xFF881337),
                                                  ),
                                                ),
                                                const SizedBox(height: 6),
                                                InkWell(
                                                  onTap: _probeServer,
                                                  child: const Text(
                                                    'Probe Server Health',
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w600,
                                                      color: Color(0xFFBE123C),
                                                      decoration: TextDecoration.underline,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],

                                  // Official Registered Email Field
                                  RichText(
                                    text: const TextSpan(
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF334155),
                                      ),
                                      children: [
                                        TextSpan(text: 'Official Registered Email'),
                                        TextSpan(
                                          text: ' *',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFFDC2626),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.next,
                                    onChanged: (val) {
                                      final match = accounts.where(
                                        (a) => a.email.toLowerCase() == val.trim().toLowerCase(),
                                      );
                                      if (match.isNotEmpty && _selectedRole != match.first.role) {
                                        setState(() => _selectedRole = match.first.role);
                                      }
                                    },
                                    decoration: InputDecoration(
                                      hintText: 'e.g. hospital@demo.com',
                                      prefixIcon: const Icon(
                                        Icons.mail_outline_rounded,
                                        size: 18,
                                        color: Color(0xFF64748B),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      fillColor: Colors.white,
                                      filled: true,
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFF14462A), width: 1.5),
                                      ),
                                    ),
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 14),

                                  // Access Password Field
                                  RichText(
                                    text: const TextSpan(
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF334155),
                                      ),
                                      children: [
                                        TextSpan(text: 'Access Password'),
                                        TextSpan(
                                          text: ' *',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFFDC2626),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  TextFormField(
                                    controller: _passwordController,
                                    obscureText: _obscurePassword,
                                    textInputAction: TextInputAction.done,
                                    onFieldSubmitted: (_) => _handleLogin(),
                                    decoration: InputDecoration(
                                      hintText: 'Enter password',
                                      prefixIcon: const Icon(
                                        Icons.lock_outline_rounded,
                                        size: 18,
                                        color: Color(0xFF64748B),
                                      ),
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                          size: 18,
                                          color: const Color(0xFF64748B),
                                        ),
                                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                      ),
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      fillColor: Colors.white,
                                      filled: true,
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(8),
                                        borderSide: const BorderSide(color: Color(0xFF14462A), width: 1.5),
                                      ),
                                    ),
                                    style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 16),

                                  // Selected Authority Indicator
                                  Wrap(
                                    crossAxisAlignment: WrapCrossAlignment.center,
                                    spacing: 6,
                                    runSpacing: 4,
                                    children: [
                                      const Text(
                                        'Selected authority: ',
                                        style: TextStyle(fontSize: 11.5, color: Color(0xFF64748B)),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(color: const Color(0xFFE2E8F0)),
                                        ),
                                        child: Text(
                                          selectedAccount.title,
                                          style: const TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF0F172A),
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 16),

                                  // Primary Button: Authenticate & Enter (Strong Green)
                                  SizedBox(
                                    width: double.infinity,
                                    height: 48,
                                    child: ElevatedButton(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF14462A), // Forest-900 web brand green
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                      ),
                                      onPressed: _isLoading ? null : () => _handleLogin(),
                                      child: _isLoading
                                          ? Row(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              children: [
                                                const SizedBox(
                                                  width: 16,
                                                  height: 16,
                                                  child: CircularProgressIndicator(
                                                    color: Colors.white,
                                                    strokeWidth: 2,
                                                  ),
                                                ),
                                                const SizedBox(width: 10),
                                                Flexible(
                                                  child: Text(
                                                    _loadingMessage,
                                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            )
                                          : Row(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              children: const [
                                                Icon(Icons.arrow_forward_rounded, size: 16),
                                                SizedBox(width: 8),
                                                Flexible(
                                                  child: Text(
                                                    'Authenticate & Enter',
                                                    style: TextStyle(
                                                      fontSize: 13,
                                                      fontWeight: FontWeight.w700,
                                                      letterSpacing: 0.2,
                                                    ),
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                              ],
                                            ),
                                    ),
                                  ),
                                  const SizedBox(height: 10),

                                  // Secondary Button: 1-Click Demo Login
                                  SizedBox(
                                    width: double.infinity,
                                    height: 44,
                                    child: OutlinedButton(
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: const Color(0xFF0F172A),
                                        backgroundColor: Colors.white,
                                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                      ),
                                      onPressed: _isLoading ? null : () => _onInstantLogin(selectedAccount),
                                      child: Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: const [
                                          Icon(
                                            Icons.bolt_rounded,
                                            size: 16,
                                            color: Color(0xFFD97706),
                                          ),
                                          SizedBox(width: 6),
                                          Flexible(
                                            child: Text(
                                              '1-Click Demo Login',
                                              style: TextStyle(
                                                fontSize: 12.5,
                                                fontWeight: FontWeight.w600,
                                                color: Color(0xFF334155),
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // ─── Footer Institutional Legal & Security Messaging ───
                      const Text(
                        'Protected by BioTrace JWT & Bcrypt Authentication • Monitored by Real-Time Statutory Risk Engine',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 10,
                          color: Color(0xFF64748B),
                          fontFamily: 'monospace',
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        alignment: WrapAlignment.center,
                        spacing: 8,
                        children: const [
                          Text(
                            'CPCB Compliance Terms of Service',
                            style: TextStyle(
                              fontSize: 9.5,
                              color: Color(0xFF475569),
                              fontFamily: 'monospace',
                            ),
                          ),
                          Text(
                            '•',
                            style: TextStyle(
                              fontSize: 9.5,
                              color: Color(0xFF334155),
                            ),
                          ),
                          Text(
                            'Statutory Data Privacy Policy',
                            style: TextStyle(
                              fontSize: 9.5,
                              color: Color(0xFF475569),
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleCard(DemoAccount account, {required bool isSelected}) {
    final iconData = _getRoleIcon(account.role);
    final accentColor = _getRoleAccentColor(account.role);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _isLoading ? null : () => _onSelectRole(account),
        onDoubleTap: _isLoading ? null : () => _onInstantLogin(account),
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFF0FDF4) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0),
              width: isSelected ? 1.5 : 1.0,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: const Color(0xFF16A34A).withValues(alpha: 0.12),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ]
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: accentColor,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Icon(iconData, size: 15, color: Colors.white),
                  ),
                  if (isSelected)
                    const Icon(
                      Icons.check_circle_rounded,
                      size: 15,
                      color: Color(0xFF16A34A),
                    )
                  else
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Color(0xFFCBD5E1),
                        shape: BoxShape.circle,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                account.title,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                  height: 1.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 1.5),
              Text(
                account.name,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF475569),
                  height: 1.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 1.5),
              Text(
                account.facility,
                style: const TextStyle(
                  fontSize: 9,
                  color: Color(0xFF94A3B8),
                  height: 1.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
