import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/theme/app_colors.dart';

class QrScannerSheet extends StatefulWidget {
  final Function(String scannedCode) onCodeDetected;

  const QrScannerSheet({super.key, required this.onCodeDetected});

  static Future<String?> show(BuildContext context) {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => QrScannerSheet(
        onCodeDetected: (code) => Navigator.of(ctx).pop(code),
      ),
    );
  }

  @override
  State<QrScannerSheet> createState() => _QrScannerSheetState();
}

class _QrScannerSheetState extends State<QrScannerSheet> {
  final MobileScannerController _cameraController = MobileScannerController();
  final TextEditingController _manualController = TextEditingController();
  bool _isManualEntry = false;
  bool _hasScanned = false;

  @override
  void dispose() {
    _cameraController.dispose();
    _manualController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return;
    for (final barcode in capture.barcodes) {
      final code = barcode.rawValue;
      if (code != null && code.isNotEmpty) {
        _hasScanned = true;
        widget.onCodeDetected(code.trim());
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Header Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.qr_code_scanner_rounded, color: AppColors.primary, size: 22),
                    const SizedBox(width: 8),
                    const Text(
                      'Scan Waste Tag QR',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isManualEntry = !_isManualEntry;
                    });
                  },
                  child: Text(_isManualEntry ? 'Use Camera' : 'Manual Entry'),
                ),
              ],
            ),
          ),

          // Scanner or Manual Form
          Expanded(
            child: _isManualEntry
                ? Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Manual Tag / Batch Code',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _manualController,
                          decoration: const InputDecoration(
                            hintText: 'e.g. BMW-2026-00124',
                            prefixIcon: Icon(Icons.qr_code, size: 20),
                          ),
                          textCapitalization: TextCapitalization.characters,
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () {
                              final text = _manualController.text.trim();
                              if (text.isNotEmpty) {
                                widget.onCodeDetected(text);
                              }
                            },
                            child: const Text('Confirm Code'),
                          ),
                        ),
                      ],
                    ),
                  )
                : Stack(
                    alignment: Alignment.center,
                    children: [
                      MobileScanner(
                        controller: _cameraController,
                        onDetect: _onDetect,
                      ),
                      // Target Reticle
                      Container(
                        width: 220,
                        height: 220,
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.white70, width: 2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      Positioned(
                        bottom: 24,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black87,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'Align CPCB digital QR tag within the frame',
                            style: TextStyle(color: Colors.white, fontSize: 11),
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }
}
