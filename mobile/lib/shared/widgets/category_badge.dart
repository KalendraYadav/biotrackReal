import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class CategoryBadge extends StatelessWidget {
  final String category;

  const CategoryBadge({super.key, required this.category});

  @override
  Widget build(BuildContext context) {
    Color bg = AppColors.surfaceAlt;
    Color text = AppColors.textPrimary;
    Color border = AppColors.border;

    final lower = category.toLowerCase();
    if (lower.contains('yellow')) {
      bg = AppColors.catYellowBg;
      text = AppColors.catYellowText;
      border = AppColors.catYellowBorder;
    } else if (lower.contains('red')) {
      bg = AppColors.catRedBg;
      text = AppColors.catRedText;
      border = AppColors.catRedBorder;
    } else if (lower.contains('white')) {
      bg = AppColors.catWhiteBg;
      text = AppColors.catWhiteText;
      border = AppColors.catWhiteBorder;
    } else if (lower.contains('blue')) {
      bg = AppColors.catBlueBg;
      text = AppColors.catBlueText;
      border = AppColors.catBlueBorder;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: border, width: 0.8),
      ),
      child: Text(
        category,
        style: TextStyle(
          color: text,
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
