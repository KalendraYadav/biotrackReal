import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
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

  void _showOperationalIdentitySheet() {
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
                    Icon(Icons.badge_outlined, color: AppColors.primary, size: 22),
                    SizedBox(width: 8),
                    Text(
                      'Operational Identity',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                  ],
                ),
                IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const Text(
              'SIGNED IN AS',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.primaryBg,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.primary, width: 1.5),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      _getRoleIcon(_currentUser.role),
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              AppRoles.format(_currentUser.role),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                _currentUser.verificationStatus ?? 'VERIFIED',
                                style: const TextStyle(
                                  color: Color(0xFF059669),
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _currentUser.name,
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                        ),
                        Text(
                          _currentUser.facilityName ?? 'CPCB Regulatory Office',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Statutory Authorization Notice',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Your operational role is strictly determined by server-side authentication and bound to your official credentials. Role escalation or arbitrary context switching is prohibited by regulatory security policy.',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.35),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  _handleLogout();
                },
                icon: const Icon(Icons.logout_rounded, size: 16, color: AppColors.danger),
                label: const Text('Sign Out to Switch Duty Role', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.danger),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  IconData _getRoleIcon(String? role) {
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

  void _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('Are you sure you want to sign out of BIOTrace?', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            SizedBox(height: 6),
            Text('You will need to authenticate again to access your account.', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ],
        ),
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
        onShowIdentity: _showOperationalIdentitySheet,
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
