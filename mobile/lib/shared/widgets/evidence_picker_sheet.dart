import 'package:flutter/material.dart';
import '../../core/services/evidence_service.dart';
import '../../core/theme/app_colors.dart';

class EvidencePickerSheet extends StatelessWidget {
  const EvidencePickerSheet({super.key});

  static Future<EvidenceResult?> show(BuildContext context) {
    return showModalBottomSheet<EvidenceResult>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const EvidencePickerSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
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
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.primaryBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.camera_alt_rounded, color: AppColors.primary, size: 18),
              ),
              const SizedBox(width: 10),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Attach Photo Evidence',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  Text(
                    'Custody handover proof for CPCB ledger (max 5 MB)',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 18),

          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.photo_camera_rounded, color: AppColors.primary),
            ),
            title: const Text('Capture with Camera', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: const Text('Live photo of sealed waste bag and barcode tag', style: TextStyle(fontSize: 11)),
            onTap: () async {
              final result = await EvidenceService.capturePhotoFromCamera();
              if (context.mounted && result != null) {
                Navigator.of(context).pop(result);
              }
            },
          ),

          ListTile(
            leading: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.photo_library_rounded, color: AppColors.textSecondary),
            ),
            title: const Text('Pick from Gallery', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            subtitle: const Text('Select an existing photo file from device storage', style: TextStyle(fontSize: 11)),
            onTap: () async {
              final result = await EvidenceService.pickPhotoFromGallery();
              if (context.mounted && result != null) {
                Navigator.of(context).pop(result);
              }
            },
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
