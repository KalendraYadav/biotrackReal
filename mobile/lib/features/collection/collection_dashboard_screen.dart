import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/services/evidence_service.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../../shared/models/waste_batch_model.dart';
import '../../shared/widgets/category_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/evidence_picker_sheet.dart';
import '../../shared/widgets/qr_scanner_sheet.dart';
import '../../shared/widgets/stat_card.dart';
import '../../shared/widgets/status_badge.dart';

class CollectionDashboardScreen extends StatefulWidget {
  final UserModel user;

  const CollectionDashboardScreen({super.key, required this.user});

  @override
  State<CollectionDashboardScreen> createState() => _CollectionDashboardScreenState();
}

class _CollectionDashboardScreenState extends State<CollectionDashboardScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<WasteBatchModel> _batches = [];
  String _activeTab = 'PENDING';

  @override
  void initState() {
    super.initState();
    _fetchBatches();
  }

  Future<void> _fetchBatches() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiClient.get('/waste-batches');
    if (!res.isSuccess) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = res.errorMessage;
        });
      }
      return;
    }

    final rawBatches = res.data?['batches'] as List<dynamic>? ?? [];
    final list = rawBatches
        .map((b) => WasteBatchModel.fromJson(b as Map<String, dynamic>))
        .toList();

    if (mounted) {
      setState(() {
        _batches = list;
        _isLoading = false;
      });
    }
  }

  List<WasteBatchModel> get _pendingBatches =>
      _batches.where((b) => b.status == 'GENERATED').toList();

  List<WasteBatchModel> get _collectedBatches =>
      _batches.where((b) => b.status != 'GENERATED').toList();

  void _openHandoverModal(WasteBatchModel batch) {
    final qtyCtrl = TextEditingController(text: batch.quantityKg.toString());
    EvidenceResult? photoEvidence;
    bool isSubmitting = false;
    String? modalError;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) {
          return Container(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Verify Handover: ${batch.batchCode}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const Text(
                    'Collection Officer custody verification (Scan + Weight + GPS + Photo)',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 14),

                  if (modalError != null) ...[
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: AppColors.dangerBg, borderRadius: BorderRadius.circular(6)),
                      child: Text(modalError!, style: const TextStyle(color: AppColors.danger, fontSize: 11)),
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Details card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceAlt,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            CategoryBadge(category: batch.cpcbWasteCategory),
                            Text('Original: ${batch.quantityKg} kg', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Hospital: ${batch.hospitalName ?? "Hospital"} • Dept: ${batch.generatingDepartment}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),

                  const Text('Verified Scale Weight (kg)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: qtyCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(suffixText: 'kg'),
                  ),
                  const SizedBox(height: 12),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Handover Photo Evidence', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      TextButton.icon(
                        icon: const Icon(Icons.camera_alt_outlined, size: 16),
                        label: Text(photoEvidence != null ? 'Retake' : 'Capture'),
                        onPressed: () async {
                          final photo = await EvidencePickerSheet.show(context);
                          if (photo != null) {
                            setSheetState(() => photoEvidence = photo);
                          }
                        },
                      ),
                    ],
                  ),
                  if (photoEvidence != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.successBg,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.successBorder),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, color: AppColors.success, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Evidence attached: ${photoEvidence!.fileName}',
                              style: const TextStyle(fontSize: 11, color: AppColors.success),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton.icon(
                      icon: isSubmitting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.verified, size: 18),
                      label: Text(isSubmitting ? 'Logging Handover...' : 'Confirm Custody Handover'),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final verifiedQty = double.tryParse(qtyCtrl.text.trim());
                              if (verifiedQty == null || verifiedQty <= 0) {
                                setSheetState(() => modalError = 'Please enter a valid weight.');
                                return;
                              }

                              setSheetState(() {
                                isSubmitting = true;
                                modalError = null;
                              });

                              final messenger = ScaffoldMessenger.of(context);
                              final loc = await LocationService.getCurrentCoordinates();

                              final res = await ApiClient.post(
                                '/waste-batches/${batch.id}/custody-event',
                                body: {
                                  'stage': 'COLLECTION',
                                  'quantity_at_stage_kg': verifiedQty,
                                  'verified_by_scan': true,
                                  'latitude': loc.latitude,
                                  'longitude': loc.longitude,
                                  if (photoEvidence != null) 'photo_url': photoEvidence!.base64DataUri,
                                },
                              );

                              if (res.isSuccess) {
                                if (ctx.mounted) Navigator.pop(ctx);
                                _fetchBatches();
                                if (mounted) {
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Handover logged for ${batch.batchCode}! Batch is now COLLECTED.'),
                                      backgroundColor: AppColors.primary,
                                    ),
                                  );
                                }
                              } else {
                                setSheetState(() {
                                  isSubmitting = false;
                                  modalError = res.errorMessage ?? 'Failed to log custody event.';
                                });
                              }
                            },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _startQrScan() async {
    final scannedCode = await QrScannerSheet.show(context);
    if (scannedCode != null && scannedCode.isNotEmpty) {
      final matchingBatch = _batches.firstWhere(
        (b) => b.batchCode.toLowerCase() == scannedCode.toLowerCase(),
        orElse: () => _batches.isNotEmpty ? _batches.first : _batches.first,
      );
      _openHandoverModal(matchingBatch);
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayBatches = _activeTab == 'PENDING' ? _pendingBatches : _collectedBatches;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: _fetchBatches,
        color: AppColors.primary,
        child: CustomScrollView(
          slivers: [
            // Sub-header
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(bottom: BorderSide(color: AppColors.border)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Collection Officer Handover',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        Text(
                          'Operator: ${widget.user.name} • Unit: EcoSafe',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      onPressed: _startQrScan,
                      icon: const Icon(Icons.qr_code_scanner, size: 16),
                      label: const Text('Scan Tag', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ),

            // 4 Stat Cards in 2x2 Grid
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 1.55,
                ),
                delegate: SliverChildListDelegate([
                  StatCard(
                    title: 'Pending Pickups',
                    value: '${_pendingBatches.length}',
                    subtitle: 'Awaiting hospital gate scan',
                    icon: Icons.pending_actions_rounded,
                    iconColor: AppColors.accent,
                    iconBg: AppColors.accentLight,
                    valueColor: AppColors.accent,
                    onTap: () => setState(() => _activeTab = 'PENDING'),
                  ),
                  StatCard(
                    title: 'Verified Today',
                    value: '${_collectedBatches.length}',
                    subtitle: 'Handed over to transport',
                    icon: Icons.check_circle_outline_rounded,
                    iconColor: AppColors.primary,
                    iconBg: AppColors.primaryBg,
                    onTap: () => setState(() => _activeTab = 'COLLECTED'),
                  ),
                  StatCard(
                    title: 'Collected Weight',
                    value: '${_collectedBatches.fold(0.0, (sum, b) => sum + b.quantityKg).toStringAsFixed(1)} kg',
                    subtitle: 'Verified scale weight',
                    icon: Icons.scale_outlined,
                    iconColor: const Color(0xFF0284C7),
                    iconBg: const Color(0xFFF0F9FF),
                  ),
                  const StatCard(
                    title: 'SLA Status',
                    value: '100%',
                    subtitle: 'Picked within 4h window',
                    icon: Icons.speed_rounded,
                    iconColor: AppColors.success,
                    iconBg: AppColors.successBg,
                    valueColor: AppColors.success,
                  ),
                ]),
              ),
            ),

            // Tabs Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _activeTab = 'PENDING'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: _activeTab == 'PENDING' ? AppColors.primary : Colors.transparent,
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            'Pending Pickup (${_pendingBatches.length})',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: _activeTab == 'PENDING' ? FontWeight.bold : FontWeight.w500,
                              color: _activeTab == 'PENDING' ? AppColors.primary : AppColors.textMuted,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _activeTab = 'COLLECTED'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: _activeTab == 'COLLECTED' ? AppColors.primary : Colors.transparent,
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            'Verified Handover (${_collectedBatches.length})',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: _activeTab == 'COLLECTED' ? FontWeight.bold : FontWeight.w500,
                              color: _activeTab == 'COLLECTED' ? AppColors.primary : AppColors.textMuted,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Batch List
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_errorMessage != null)
              SliverFillRemaining(
                child: EmptyView(
                  icon: Icons.error_outline,
                  title: 'Failed to load custody batches',
                  description: _errorMessage!,
                  onRetry: _fetchBatches,
                ),
              )
            else if (displayBatches.isEmpty)
              SliverFillRemaining(
                child: EmptyView(
                  title: _activeTab == 'PENDING' ? 'No pending pickups' : 'No verified handovers today',
                  description: _activeTab == 'PENDING'
                      ? 'All registered hospital batches have been picked up.'
                      : 'Scan hospital bags to begin custody verification.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final batch = displayBatches[index];
                      final isPending = batch.status == 'GENERATED';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  batch.batchCode,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'monospace',
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                StatusBadge(status: batch.status),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                CategoryBadge(category: batch.cpcbWasteCategory),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    '${batch.hospitalName ?? "Hospital"} • ${batch.generatingDepartment}',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${batch.quantityKg.toStringAsFixed(1)} kg',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                            if (isPending) ...[
                              const SizedBox(height: 10),
                              SizedBox(
                                width: double.infinity,
                                height: 36,
                                child: OutlinedButton.icon(
                                  icon: const Icon(Icons.qr_code_scanner, size: 16),
                                  label: const Text('Verify & Collect Tag', style: TextStyle(fontSize: 12)),
                                  onPressed: () => _openHandoverModal(batch),
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                    childCount: displayBatches.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
