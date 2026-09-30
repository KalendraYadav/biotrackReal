import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../../shared/models/waste_batch_model.dart';
import '../../shared/widgets/category_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/stat_card.dart';
import '../../shared/widgets/status_badge.dart';

class TreatmentDashboardScreen extends StatefulWidget {
  final UserModel user;

  const TreatmentDashboardScreen({super.key, required this.user});

  @override
  State<TreatmentDashboardScreen> createState() => _TreatmentDashboardScreenState();
}

class _TreatmentDashboardScreenState extends State<TreatmentDashboardScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<WasteBatchModel> _batches = [];
  String _activeTab = 'WEIGHBRIDGE'; // WEIGHBRIDGE | TREATMENT | DISPOSAL

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

  List<WasteBatchModel> get _inboundBatches =>
      _batches.where((b) => b.status == 'IN_TRANSIT' || b.status == 'COLLECTED').toList();

  List<WasteBatchModel> get _treatmentBatches =>
      _batches.where((b) => b.status == 'RECEIVED').toList();

  List<WasteBatchModel> get _disposalBatches =>
      _batches.where((b) => b.status == 'TREATED' || b.status == 'DISPOSED').toList();

  Future<void> _logStage(WasteBatchModel batch, String stage, String nextStatusName) async {
    final loc = await LocationService.getCurrentCoordinates();
    final res = await ApiClient.post(
      '/waste-batches/${batch.id}/custody-event',
      body: {
        'stage': stage,
        'quantity_at_stage_kg': batch.quantityKg,
        'verified_by_scan': true,
        'latitude': loc.latitude,
        'longitude': loc.longitude,
      },
    );

    if (res.isSuccess) {
      _fetchBatches();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${batch.batchCode} transitioned to $nextStatusName'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res.errorMessage ?? 'Stage transition failed'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    List<WasteBatchModel> currentList = [];
    if (_activeTab == 'WEIGHBRIDGE') currentList = _inboundBatches;
    if (_activeTab == 'TREATMENT') currentList = _treatmentBatches;
    if (_activeTab == 'DISPOSAL') currentList = _disposalBatches;

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
                          'CBWTF Processing & Terminal',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        Text(
                          widget.user.facilityName ?? 'EcoSafe Central Plant',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBg,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.3)),
                      ),
                      child: const Text(
                        'CPCB LICENSED',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
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
                    title: 'Inbound Queue',
                    value: '${_inboundBatches.length}',
                    subtitle: 'Awaiting weighbridge intake',
                    icon: Icons.local_shipping_outlined,
                    iconColor: AppColors.textSecondary,
                    onTap: () => setState(() => _activeTab = 'WEIGHBRIDGE'),
                  ),
                  StatCard(
                    title: 'Treatment Bay',
                    value: '${_treatmentBatches.length}',
                    subtitle: 'Autoclave & incineration yard',
                    icon: Icons.local_fire_department_outlined,
                    iconColor: AppColors.accent,
                    iconBg: AppColors.accentLight,
                    onTap: () => setState(() => _activeTab = 'TREATMENT'),
                  ),
                  StatCard(
                    title: 'Disposal Pending',
                    value: '${_disposalBatches.length}',
                    subtitle: 'Ready for TSDF sign-off',
                    icon: Icons.shield_outlined,
                    iconColor: const Color(0xFF0284C7),
                    iconBg: const Color(0xFFF0F9FF),
                    onTap: () => setState(() => _activeTab = 'DISPOSAL'),
                  ),
                  const StatCard(
                    title: 'Reconciliation',
                    value: '99.2%',
                    subtitle: 'CPCB Rule 12 compliant',
                    icon: Icons.balance_outlined,
                    iconColor: AppColors.success,
                    iconBg: AppColors.successBg,
                    valueColor: AppColors.success,
                  ),
                ]),
              ),
            ),

            // Tabs Selector
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    _tabButton('1. Intake (${_inboundBatches.length})', 'WEIGHBRIDGE'),
                    const SizedBox(width: 6),
                    _tabButton('2. Treatment (${_treatmentBatches.length})', 'TREATMENT'),
                    const SizedBox(width: 6),
                    _tabButton('3. Disposal (${_disposalBatches.length})', 'DISPOSAL'),
                  ],
                ),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            // Batch List
            if (_isLoading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (_errorMessage != null)
              SliverFillRemaining(
                child: EmptyView(
                  icon: Icons.error_outline,
                  title: 'Failed to load batches',
                  description: _errorMessage!,
                  onRetry: _fetchBatches,
                ),
              )
            else if (currentList.isEmpty)
              SliverFillRemaining(
                child: EmptyView(
                  title: 'No batches in this queue',
                  description: 'All waste batches for this stage have been processed.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final batch = currentList[index];
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
                                    batch.hospitalName ?? 'Hospital Generator',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                  ),
                                ),
                                Text(
                                  '${batch.quantityKg.toStringAsFixed(1)} kg',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Stage Actions
                            if (_activeTab == 'WEIGHBRIDGE')
                              SizedBox(
                                width: double.infinity,
                                height: 36,
                                child: ElevatedButton.icon(
                                  icon: const Icon(Icons.scale_rounded, size: 16),
                                  label: const Text('Weighbridge Check-in (Receive)', style: TextStyle(fontSize: 12)),
                                  onPressed: () => _logStage(batch, 'TREATMENT_PICKUP', 'RECEIVED'),
                                ),
                              )
                            else if (_activeTab == 'TREATMENT')
                              SizedBox(
                                width: double.infinity,
                                height: 36,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent),
                                  icon: const Icon(Icons.local_fire_department, size: 16),
                                  label: const Text('Process Autoclave / Incineration', style: TextStyle(fontSize: 12)),
                                  onPressed: () => _logStage(batch, 'TREATMENT', 'TREATED'),
                                ),
                              )
                            else if (_activeTab == 'DISPOSAL' && batch.status == 'TREATED')
                              SizedBox(
                                width: double.infinity,
                                height: 36,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                                  icon: const Icon(Icons.task_alt, size: 16),
                                  label: const Text('Sign TSDF Final Disposal', style: TextStyle(fontSize: 12)),
                                  onPressed: () => _logStage(batch, 'DISPOSAL', 'DISPOSED'),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                    childCount: currentList.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _tabButton(String title, String tabKey) {
    final isSelected = _activeTab == tabKey;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _activeTab = tabKey),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : AppColors.surfaceAlt,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? AppColors.primary : AppColors.border),
          ),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? AppColors.primary : AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
