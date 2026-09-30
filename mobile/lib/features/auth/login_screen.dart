import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/config/app_config.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/socket/socket_service.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../../shared/widgets/biotrace_mark.dart';
import '../../shared/widgets/india_silhouette.dart';
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
  bool _showManualLogin = false;

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
          backgroundColor: res.isSuccess ? AppColors.primary : AppColors.danger,
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
                      activeColor: AppColors.primary,
                      title: const Text(
                        'Production Cloud (Default)',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary),
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
                      activeColor: AppColors.primary,
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
                      activeColor: AppColors.primary,
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
                            color: probeResult!.startsWith('OK') ? AppColors.primary : const Color(0xFF991B1B),
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
                  child: const Text('Test Connection', style: TextStyle(color: AppColors.primary)),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
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
        return Icons.local_hospital_rounded;
      case AppRoles.collectionOfficer:
        return Icons.local_shipping_outlined;
      case AppRoles.transportOfficer:
        return Icons.local_shipping_rounded;
      case AppRoles.treatmentFacility:
        return Icons.factory_rounded;
      case AppRoles.governmentAuthority:
        return Icons.account_balance_rounded;
      case AppRoles.complianceInspector:
        return Icons.fact_check_rounded;
      default:
        return Icons.person_rounded;
    }
  }

  Color _getRoleAccentColor(String role) {
    switch (role) {
      case AppRoles.hospitalAuthority:
        return const Color(0xFF00CA92); // Emerald / Mint (Web tone)
      case AppRoles.collectionOfficer:
        return const Color(0xFFF59E0B); // Amber
      case AppRoles.transportOfficer:
        return const Color(0xFF3B82F6); // Blue
      case AppRoles.treatmentFacility:
        return const Color(0xFFF97316); // Orange
      case AppRoles.governmentAuthority:
        return const Color(0xFF8B5CF6); // Violet
      case AppRoles.complianceInspector:
        return const Color(0xFF06B6D4); // Cyan
      default:
        return const Color(0xFF07559B);
    }
  }

  String _getRoleSubtitle(String role) {
    switch (role) {
      case AppRoles.hospitalAuthority:
        return 'Generate & Manage Waste';
      case AppRoles.collectionOfficer:
        return 'Collect from Generators';
      case AppRoles.transportOfficer:
        return 'Track Waste Movement';
      case AppRoles.treatmentFacility:
        return 'Process & Treat Waste';
      case AppRoles.governmentAuthority:
        return 'Regulate & Monitor Compliance';
      case AppRoles.complianceInspector:
        return 'Audit & Field Inspection';
      default:
        return 'Authorized Personnel';
    }
  }

  void _showRoleSelectionSheet() {
    final accounts = AppConstants.demoAccounts;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          decoration: BoxDecoration(
            color: const Color(0xFF0A3464),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border.all(color: const Color(0xFF83B7E7).withValues(alpha: 0.8), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.6),
                blurRadius: 30,
                offset: const Offset(0, -10),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Handle bar
                  Center(
                    child: Container(
                      width: 44,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                  // Header with title, subtitle, and close icon
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0C477D),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF7BA7D1).withValues(alpha: 0.8)),
                        ),
                        child: const Icon(
                          Icons.person_outline_rounded,
                          color: Color(0xFF91F1CC),
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Select Your Role',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Choose your statutory role to access BioTrace.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFFA8C9E9),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close_rounded, color: Color(0xFFC9E1FA)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Roles List
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: accounts.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final account = accounts[index];
                        final isSelected = account.role == _selectedRole;
                        final accentColor = _getRoleAccentColor(account.role);
                        final iconData = _getRoleIcon(account.role);
                        final subtitle = _getRoleSubtitle(account.role);

                        return Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              _onSelectRole(account);
                              Navigator.pop(ctx);
                            },
                            onDoubleTap: () {
                              Navigator.pop(ctx);
                              _onInstantLogin(account);
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 150),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? const Color(0xFF0E5B9B)
                                    : const Color(0xFF0B4E85).withValues(alpha: 0.7),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected ? accentColor : const Color(0xFF78AADB).withValues(alpha: 0.4),
                                  width: isSelected ? 2 : 1,
                                ),
                                boxShadow: isSelected
                                    ? [
                                        BoxShadow(
                                          color: accentColor.withValues(alpha: 0.25),
                                          blurRadius: 8,
                                          offset: const Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: accentColor.withValues(alpha: 0.22),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(iconData, color: accentColor, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          account.title,
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          subtitle,
                                          style: const TextStyle(
                                            fontSize: 11.5,
                                            color: Color(0xFFA8C7E5),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (isSelected)
                                    const Icon(
                                      Icons.check_circle_rounded,
                                      color: Color(0xFF00CA92),
                                      size: 22,
                                    )
                                  else
                                    const Icon(
                                      Icons.arrow_forward_ios_rounded,
                                      color: Color(0xFFE0EFFF),
                                      size: 15,
                                    ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final accounts = AppConstants.demoAccounts;
    final selectedAccount = accounts.firstWhere(
      (a) => a.role == _selectedRole,
      orElse: () => accounts.first,
    );

    final screenWidth = MediaQuery.of(context).size.width;
    final horizontalPadding = screenWidth < 360 ? 14.0 : 18.0;

    return Scaffold(
      backgroundColor: const Color(0xFF03275D),
      body: Stack(
        children: [
          // 1. Environmental Background Graphic (Hospital left, Truck right)
          Positioned.fill(
            child: Image.asset(
              'assets/images/biotrace_login_bg.jpg',
              fit: BoxFit.cover,
              alignment: Alignment.bottomCenter,
              errorBuilder: (context, error, stackTrace) => Container(
                color: const Color(0xFF03275D),
              ),
            ),
          ),

          // 2. Dark Deep-Navy Atmosphere Gradient
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    const Color(0xF003275D),
                    const Color(0xD6043277),
                    const Color(0xF8021B3D),
                  ],
                ),
              ),
            ),
          ),

          // 3. Ambient Blue/Teal Glow
          Positioned(
            top: -60,
            left: 0,
            right: 0,
            height: 340,
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 0.9,
                  colors: [
                    Color(0x5500C49E),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // 4. Main Scrollable Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.symmetric(horizontal: horizontalPadding, vertical: 16),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Top Right Environment Chip
                      Align(
                        alignment: Alignment.topRight,
                        child: InkWell(
                          onTap: _showEnvironmentDialog,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF0C477D).withValues(alpha: 0.8),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: const Color(0xFF83B4E2).withValues(alpha: 0.5),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.cloud_outlined,
                                  size: 15,
                                  color: Color(0xFF91F1CC),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  AppConfig.environmentLabel,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFFD9E9FB),
                                  ),
                                ),
                                const SizedBox(width: 3),
                                const Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 16,
                                  color: Color(0xFF94A3B8),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Authentic 4-Quadrant Geometric BioTrace "B" Mark
                      const BioTraceMark(width: 62, height: 98),
                      const SizedBox(height: 12),

                      // Institutional Wordmark: BIO TRACE
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Text(
                            'BIO',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2.0,
                              color: Colors.white,
                            ),
                          ),
                          SizedBox(width: 3),
                          Text(
                            'TRACE',
                            style: TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w300,
                              letterSpacing: 2.0,
                              color: Color(0xFFD9E9FB),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Restrained Tricolor Accent (Saffron, White, Green)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 42,
                            height: 3.5,
                            decoration: BoxDecoration(
                              color: const Color(0xFFFF881B),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 42,
                            height: 3.5,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF5F9FF),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 42,
                            height: 3.5,
                            decoration: BoxDecoration(
                              color: const Color(0xFF00CA92),
                              borderRadius: BorderRadius.circular(3),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Primary Tagline
                      const Text(
                        'MAKE INDIA CLEAN',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2.4,
                          color: Color(0xFFC6E2FB),
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Secondary Subtitle
                      const Text(
                        'Digital Chain of Custody for\nBiomedical Waste Management',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFF9CC5EC),
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 22),

                      // Central Glass Entry Panel (Matching Web 1:1)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: const Color(0xB8104F89),
                          borderRadius: BorderRadius.circular(22),
                          border: Border.all(
                            color: const Color(0xFF78AADB).withValues(alpha: 0.6),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF021838).withValues(alpha: 0.7),
                              blurRadius: 24,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            // Role Selector Trigger Button
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: _showRoleSelectionSheet,
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  height: 72,
                                  padding: const EdgeInsets.symmetric(horizontal: 14),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0C477D).withValues(alpha: 0.85),
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(
                                      color: const Color(0xFF83B4E2),
                                      width: 1.8,
                                    ),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 44,
                                        height: 44,
                                        decoration: BoxDecoration(
                                          color: _getRoleAccentColor(selectedAccount.role).withValues(alpha: 0.22),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Icon(
                                          _getRoleIcon(selectedAccount.role),
                                          color: _getRoleAccentColor(selectedAccount.role),
                                          size: 22,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              selectedAccount.title,
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              _getRoleSubtitle(selectedAccount.role),
                                              style: const TextStyle(
                                                color: Color(0xFFA8C7E5),
                                                fontSize: 11.5,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                      const Icon(
                                        Icons.keyboard_arrow_down_rounded,
                                        color: Color(0xFFC9E1FA),
                                        size: 24,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),

                            // Primary ENTER Button (Web 1:1 match)
                            SizedBox(
                              width: double.infinity,
                              height: 64,
                              child: ElevatedButton(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF07559B),
                                  foregroundColor: Colors.white,
                                  elevation: 6,
                                  shadowColor: const Color(0xFF021B3D),
                                  side: const BorderSide(color: Color(0xFF36B9EE), width: 1.8),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  padding: const EdgeInsets.symmetric(horizontal: 20),
                                ),
                                onPressed: _isLoading ? null : () => _handleLogin(),
                                child: _isLoading
                                    ? Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2.2,
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Flexible(
                                            child: Text(
                                              _loadingMessage,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      )
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          const Text(
                                            'ENTER',
                                            style: TextStyle(
                                              fontSize: 18,
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 1.5,
                                              color: Colors.white,
                                            ),
                                          ),
                                          Row(
                                            children: [
                                              Container(
                                                width: 1,
                                                height: 28,
                                                color: const Color(0xFFB5F2FF).withValues(alpha: 0.4),
                                              ),
                                              const SizedBox(width: 14),
                                              const Icon(
                                                Icons.arrow_forward_rounded,
                                                size: 24,
                                                color: Colors.white,
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                            const SizedBox(height: 10),

                            // Secondary 1-Click Quick Demo Login Button
                            SizedBox(
                              width: double.infinity,
                              height: 44,
                              child: OutlinedButton(
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.white,
                                  side: BorderSide(color: const Color(0xFF83B4E2).withValues(alpha: 0.5)),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  backgroundColor: const Color(0x330C477D),
                                ),
                                onPressed: _isLoading ? null : () => _onInstantLogin(selectedAccount),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Icon(Icons.bolt_rounded, size: 16, color: Color(0xFFFF881B)),
                                    SizedBox(width: 6),
                                    Text(
                                      '1-Click Quick Demo Login',
                                      style: TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFFD9E9FB),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // Error Banner (if any)
                            if (_errorMessage != null) ...[
                              const SizedBox(height: 14),
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xDD881337),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFFDA4AF)),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.error_outline_rounded, color: Colors.white, size: 18),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Statutory Authentication Error',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.white,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            _errorMessage!,
                                            style: const TextStyle(fontSize: 11, color: Color(0xFFFECDD3)),
                                          ),
                                          const SizedBox(height: 6),
                                          InkWell(
                                            onTap: _probeServer,
                                            child: const Text(
                                              'Probe Server Health',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: Color(0xFFFFD6E0),
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

                            // Discreet Staff Credentials Form Toggle
                            const SizedBox(height: 16),
                            Divider(color: const Color(0xFF83B4E2).withValues(alpha: 0.3)),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => setState(() => _showManualLogin = !_showManualLogin),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(vertical: 4),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.vpn_key_outlined, size: 14, color: Color(0xFFA8C9E9)),
                                    const SizedBox(width: 6),
                                    Text(
                                      _showManualLogin
                                          ? 'Hide Custom Credentials Form'
                                          : 'Staff Login: Enter with Custom Credentials',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFFA8C9E9),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Icon(
                                      _showManualLogin ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                                      size: 16,
                                      color: const Color(0xFFA8C9E9),
                                    ),
                                  ],
                                ),
                              ),
                            ),

                            // Expandable Custom Credentials Area
                            if (_showManualLogin) ...[
                              const SizedBox(height: 12),
                              Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: const Color(0xCC092B54),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: const Color(0xFF83B4E2).withValues(alpha: 0.5)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'STATUTORY STAFF AUTHENTICATION',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 0.8,
                                        color: Color(0xFF91F1CC),
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    TextFormField(
                                      controller: _emailController,
                                      style: const TextStyle(fontSize: 13, color: Colors.white),
                                      decoration: InputDecoration(
                                        labelText: 'Official Registered Email',
                                        labelStyle: const TextStyle(color: Color(0xFFA8C9E9), fontSize: 12),
                                        fillColor: const Color(0xFF03275D).withValues(alpha: 0.7),
                                        filled: true,
                                        prefixIcon: const Icon(Icons.mail_outline_rounded, size: 18, color: Color(0xFF83B4E2)),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: const BorderSide(color: Color(0xFF83B4E2)),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: BorderSide(color: const Color(0xFF83B4E2).withValues(alpha: 0.5)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: const BorderSide(color: Color(0xFF36B9EE), width: 1.5),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    TextFormField(
                                      controller: _passwordController,
                                      obscureText: _obscurePassword,
                                      style: const TextStyle(fontSize: 13, color: Colors.white),
                                      decoration: InputDecoration(
                                        labelText: 'Access Password',
                                        labelStyle: const TextStyle(color: Color(0xFFA8C9E9), fontSize: 12),
                                        fillColor: const Color(0xFF03275D).withValues(alpha: 0.7),
                                        filled: true,
                                        prefixIcon: const Icon(Icons.lock_outline_rounded, size: 18, color: Color(0xFF83B4E2)),
                                        suffixIcon: IconButton(
                                          icon: Icon(
                                            _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                            size: 18,
                                            color: const Color(0xFF83B4E2),
                                          ),
                                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                        ),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: const BorderSide(color: Color(0xFF83B4E2)),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: BorderSide(color: const Color(0xFF83B4E2).withValues(alpha: 0.5)),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(8),
                                          borderSide: const BorderSide(color: Color(0xFF36B9EE), width: 1.5),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    SizedBox(
                                      width: double.infinity,
                                      height: 44,
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: const Color(0xFF0284C7),
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                        ),
                                        onPressed: _isLoading ? null : () => _handleLogin(),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: const [
                                            Text(
                                              'Authenticate & Enter Portal',
                                              style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                                            ),
                                            SizedBox(width: 6),
                                            Icon(Icons.arrow_forward_rounded, size: 15),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Dual-Sided Institutional Legal & Geographic Footer
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            // Left Side: Institutional Pillars
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'SAFE\nTRACEABLE\nCOMPLIANT\nCLEANER INDIA',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 2.2,
                                    color: Color(0xFFC6E2FB),
                                    height: 1.35,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  width: 48,
                                  height: 2,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF83B4E2).withValues(alpha: 0.6),
                                    borderRadius: BorderRadius.circular(1),
                                  ),
                                ),
                              ],
                            ),

                            // Right Side: India Silhouette & People-Process-Technology
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                const IndiaSilhouette(
                                  width: 32,
                                  height: 44,
                                  color: Color(0xFF9CC5EC),
                                ),
                                const SizedBox(width: 8),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'PEOPLE\nPROCESS\nTECHNOLOGY',
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                        letterSpacing: 1.0,
                                        color: Color(0xFFC6E2FB),
                                        height: 1.25,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    const Text(
                                      'A CLEANER TOMORROW',
                                      style: TextStyle(
                                        fontSize: 9,
                                        letterSpacing: 1.2,
                                        color: Color(0xFF83B4E2),
                                        fontWeight: FontWeight.w400,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Container(
                                      width: 48,
                                      height: 2,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF83B4E2).withValues(alpha: 0.6),
                                        borderRadius: BorderRadius.circular(1),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
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
}
