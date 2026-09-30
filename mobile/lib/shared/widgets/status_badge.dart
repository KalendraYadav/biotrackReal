import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg = AppColors.surfaceAlt;
    Color text = AppColors.textPrimary;
    Color border = AppColors.border;

    switch (status.toUpperCase()) {
      case 'GENERATED':
        bg = AppColors.infoBg;
        text = AppColors.info;
        border = AppColors.infoBorder;
        break;
      case 'COLLECTED':
      case 'IN_TRANSIT':
        bg = AppColors.warningBg;
        text = AppColors.warning;
        border = AppColors.warningBorder;
        break;
      case 'RECEIVED':
      case 'TREATED':
      case 'DISPOSED':
      case 'RESOLVED':
      case 'VERIFIED':
        bg = AppColors.successBg;
        text = AppColors.success;
        border = AppColors.successBorder;
        break;
      case 'ASSIGNED':
        bg = AppColors.surfaceAlt;
        text = AppColors.textSecondary;
        border = AppColors.border;
        break;
      case 'UNDER_INVESTIGATION':
      case 'HIGH_RISK':
      case 'CRITICAL':
      case 'REJECTED':
        bg = AppColors.dangerBg;
        text = AppColors.danger;
        border = AppColors.dangerBorder;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: border, width: 0.8),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: text,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.2,
        ),
      ),
    );
  }
}
