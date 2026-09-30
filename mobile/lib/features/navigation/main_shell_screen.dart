import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/socket/socket_service.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../../shared/widgets/app_header.dart';
import '../auth/login_screen.dart';
import '../collection/collection_dashboard_screen.dart';
import '../government/government_dashboard_screen.dart';
import '../hospital/hospital_dashboard_screen.dart';
import '../inspector/inspector_dashboard_screen.dart';
import '../personnel/personnel_directory_screen.dart';
import '../transport/transport_dashboard_screen.dart';
import '../treatment/treatment_dashboard_screen.dart';

class MainShellScreen extends StatefulWidget {
  final UserModel initialUser;

  const MainShellScreen({super.key, required this.initialUser});

  @override
  State<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends State<MainShellScreen> {
  late UserModel _currentUser;
  int _selectedTabIndex = 0;

  @override
  void initState() {
    super.initState();
    _currentUser = widget.initialUser;
  }

  void _showRoleSwitcherSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.swap_horiz_rounded, color: AppColors.primary, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'Switch Operational Context',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                  ],
                ),
                IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const Text(
              'Test RBAC & field workflows across all 6 statutory roles:',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
            const SizedBox(height: 14),

            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: AppConstants.demoAccounts.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final acc = AppConstants.demoAccounts[index];
                final isCurrent = acc.role == _currentUser.role;

                return InkWell(
                  onTap: () async {
                    Navigator.pop(ctx);
                    await _switchRole(acc);
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isCurrent ? AppColors.primaryBg : AppColors.surfaceAlt,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isCurrent ? AppColors.primary : AppColors.border,
                        width: isCurrent ? 1.5 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 34,
                          height: 34,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            _getRoleIcon(acc.role),
                            color: isCurrent ? AppColors.primary : AppColors.textSecondary,
                            size: 18,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                acc.title,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: isCurrent ? AppColors.primary : AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                '${acc.name} • ${acc.facility}',
                                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                        if (isCurrent)
                          const Icon(Icons.check_circle, color: AppColors.primary, size: 18),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  IconData _getRoleIcon(String role) {
    switch (role) {
      case AppRoles.hospitalAuthority:
        return Icons.local_hospital_rounded;
      case AppRoles.collectionOfficer:
        return Icons.qr_code_scanner_rounded;
      case AppRoles.transportOfficer:
        return Icons.local_shipping_rounded;
      case AppRoles.treatmentFacility:
        return Icons.factory_rounded;
      case AppRoles.governmentAuthority:
        return Icons.account_balance_rounded;
      case AppRoles.complianceInspector:
        return Icons.policy_rounded;
      default:
        return Icons.person_rounded;
    }
  }

  Future<void> _switchRole(DemoAccount acc) async {
    final res = await ApiClient.post(
      '/auth/login',
      body: {'email': acc.email, 'password': acc.password},
      requiresAuth: false,
    );

    if (res.isSuccess) {
      final token = res.data?['token']?.toString();
      final userMap = res.data?['user'] as Map<String, dynamic>?;
      if (token != null && userMap != null) {
        final newUser = UserModel.fromJson(userMap);
        await SecureStorageService.saveAuthData(token: token, user: newUser);
        await SocketService.initSocket();

        setState(() {
          _currentUser = newUser;
          _selectedTabIndex = 0;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Switched to ${acc.title} (${acc.name})'),
              backgroundColor: AppColors.primary,
              duration: const Duration(seconds: 2),
            ),
          );
        }
      }
    }
  }

  void _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Sign Out', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to end your statutory session?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await SecureStorageService.clearAuth();
      SocketService.disconnect();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
    }
  }

  Widget _buildRoleDashboard() {
    switch (_currentUser.role) {
      case AppRoles.hospitalAuthority:
        return HospitalDashboardScreen(user: _currentUser);
      case AppRoles.collectionOfficer:
        return CollectionDashboardScreen(user: _currentUser);
      case AppRoles.transportOfficer:
        return TransportDashboardScreen(user: _currentUser);
      case AppRoles.treatmentFacility:
        return TreatmentDashboardScreen(user: _currentUser);
      case AppRoles.governmentAuthority:
        return GovernmentDashboardScreen(user: _currentUser);
      case AppRoles.complianceInspector:
        return InspectorDashboardScreen(user: _currentUser);
      default:
        return HospitalDashboardScreen(user: _currentUser);
    }
  }

  bool get _hasSecondaryTab =>
      _currentUser.role == AppRoles.hospitalAuthority ||
      _currentUser.role == AppRoles.governmentAuthority;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppHeader(
        user: _currentUser,
        onSwitchRole: _showRoleSwitcherSheet,
        onLogout: _handleLogout,
      ),
      body: _selectedTabIndex == 0
          ? _buildRoleDashboard()
          : PersonnelDirectoryScreen(user: _currentUser),
      bottomNavigationBar: _hasSecondaryTab
          ? BottomNavigationBar(
              currentIndex: _selectedTabIndex,
              selectedItemColor: AppColors.primary,
              unselectedItemColor: AppColors.textMuted,
              selectedFontSize: 11,
              unselectedFontSize: 11,
              type: BottomNavigationBarType.fixed,
              backgroundColor: Colors.white,
              onTap: (idx) => setState(() => _selectedTabIndex = idx),
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.dashboard_rounded),
                  label: 'Dashboard',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.people_alt_rounded),
                  label: 'Personnel',
                ),
              ],
            )
          : null,
    );
  }
}
