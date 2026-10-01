import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/socket/socket_service.dart';
import '../../core/theme/app_colors.dart';
import '../models/user_model.dart';
import 'biotrace_mark.dart';

class AppHeader extends StatelessWidget implements PreferredSizeWidget {
  final UserModel? user;
  final VoidCallback? onSwitchRole;
  final VoidCallback? onShowIdentity;
  final VoidCallback? onLogout;
  final VoidCallback? onSettings;

  const AppHeader({
    super.key,
    this.user,
    this.onSwitchRole,
    this.onShowIdentity,
    this.onLogout,
    this.onSettings,
  });

  @override
  Size get preferredSize => const Size.fromHeight(60);

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.navyHeader,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 6,
        bottom: 8,
        left: 16,
        right: 12,
      ),
      child: Row(
        children: [
          // Logo & Branding
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.5)),
            ),
            child: const Center(
              child: BioTraceMark(width: 16, height: 25),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Row(
                  children: [
                    RichText(
                      text: const TextSpan(
                        style: TextStyle(
                          fontSize: 16,
                          letterSpacing: -0.3,
                        ),
                        children: [
                          TextSpan(
                            text: 'BIO',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          TextSpan(
                            text: 'Trace',
                            style: TextStyle(
                              color: Color(0xFFB8D2EA),
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF07559B).withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: AppColors.accentTeal.withValues(alpha: 0.5), width: 0.8),
                      ),
                      child: const Text(
                        'CPCB BMW',
                        style: TextStyle(
                          color: AppColors.accentTeal,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  user?.facilityName ?? AppConstants.statutoryAct,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 10,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),

          // Live Socket Pulse Indicator
          StreamBuilder<bool>(
            stream: SocketService.connectionStatusStream,
            initialData: SocketService.isConnected,
            builder: (context, snapshot) {
              final isOnline = snapshot.data ?? false;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isOnline ? const Color(0xFF10B981) : Colors.amber,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      isOnline ? 'LIVE' : 'SYNC',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(width: 8),

          // Operational Duty Identity Action
          if (onShowIdentity != null || onSwitchRole != null)
            IconButton(
              icon: const Icon(Icons.badge_outlined, color: Colors.white, size: 22),
              tooltip: 'Operational Identity',
              onPressed: onShowIdentity ?? onSwitchRole,
            ),

          if (onLogout != null)
            IconButton(
              icon: const Icon(Icons.logout_rounded, color: Colors.white70, size: 20),
              tooltip: 'Sign Out',
              onPressed: onLogout,
            ),
        ],
      ),
    );
  }
}
