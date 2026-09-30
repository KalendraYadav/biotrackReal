import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/services/evidence_service.dart';
import '../../core/services/location_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../../shared/models/waste_batch_model.dart';
import '../../shared/widgets/category_badge.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/evidence_picker_sheet.dart';
import '../../shared/widgets/stat_card.dart';
import '../../shared/widgets/status_badge.dart';

class HospitalDashboardScreen extends StatefulWidget {
  final UserModel user;

  const HospitalDashboardScreen({super.key, required this.user});

  @override
  State<HospitalDashboardScreen> createState() => _HospitalDashboardScreenState();
}

class _HospitalDashboardScreenState extends State<HospitalDashboardScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<WasteBatchModel> _batches = [];
  String _searchQuery = '';
  String _selectedCategory = 'ALL';

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

  List<WasteBatchModel> get _filteredBatches {
    return _batches.where((b) {
      final matchesSearch = _searchQuery.isEmpty ||
          b.batchCode.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          b.generatingDepartment.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesCat = _selectedCategory == 'ALL' ||
          b.cpcbWasteCategory.toLowerCase().contains(_selectedCategory.toLowerCase());
      return matchesSearch && matchesCat;
    }).toList();
  }

  double get _totalLoggedKg {
    return _batches.fold(0.0, (sum, b) => sum + b.quantityKg);
  }

  void _openRegisterBatchSheet() {
    String department = AppConstants.departments.first;
    String category = AppConstants.wasteCategories.first;
    final qtyCtrl = TextEditingController(text: '12.5');
    final notesCtrl = TextEditingController();
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
                      const Text(
                        'Register Point-of-Generation Batch',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const Text(
                    'CPCB BMW Rules 2016 statutory digital manifest registration',
                    style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 14),

                  if (modalError != null) ...[
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.dangerBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(modalError!, style: const TextStyle(color: AppColors.danger, fontSize: 11)),
                    ),
                    const SizedBox(height: 10),
                  ],

                  // Generating Department
                  const Text('Generating Department', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  DropdownButtonFormField<String>(
                    value: department,
                    items: AppConstants.departments
                        .map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 13))))
                        .toList(),
                    onChanged: (val) => setSheetState(() => department = val!),
                  ),
                  const SizedBox(height: 12),

                  // CPCB Category
                  const Text('CPCB Waste Category', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  DropdownButtonFormField<String>(
                    value: category,
                    items: AppConstants.wasteCategories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13))))
                        .toList(),
                    onChanged: (val) => setSheetState(() => category = val!),
                  ),
                  const SizedBox(height: 12),

                  // Quantity in Kg
                  const Text('Confirmed Weight (kg)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  TextField(
                    controller: qtyCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      hintText: 'e.g. 14.5',
                      suffixText: 'kg',
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Photo Evidence Attachment
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Bag Photo Evidence', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      TextButton.icon(
                        icon: const Icon(Icons.camera_alt_outlined, size: 16),
                        label: Text(photoEvidence != null ? 'Retake Photo' : 'Attach Photo'),
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
                              'Evidence attached: ${photoEvidence!.fileName} (${(photoEvidence!.fileSizeBytes / 1024).toStringAsFixed(1)} KB)',
                              style: const TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.w500),
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
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.qr_code, size: 18),
                      label: Text(isSubmitting ? 'Registering...' : 'Register & Generate QR Tag'),
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              final qty = double.tryParse(qtyCtrl.text.trim());
                              if (qty == null || qty <= 0) {
                                setSheetState(() => modalError = 'Please enter a valid weight in kg.');
                                return;
                              }

                              setSheetState(() {
                                isSubmitting = true;
                                modalError = null;
                              });

                              final messenger = ScaffoldMessenger.of(context);
                              final loc = await LocationService.getCurrentCoordinates();

                              final res = await ApiClient.post(
                                '/waste-batches',
                                body: {
                                  'generating_department': department,
                                  'cpcb_waste_category': category,
                                  'quantity_kg': qty,
                                  'latitude': loc.latitude,
                                  'longitude': loc.longitude,
                                  'notes': notesCtrl.text.trim(),
                                  if (photoEvidence != null) 'photo_url': photoEvidence!.base64DataUri,
                                },
                              );

                              if (res.isSuccess) {
                                if (ctx.mounted) Navigator.pop(ctx);
                                _fetchBatches();
                                if (mounted) {
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('Batch ${res.data?['batch']?['batch_code'] ?? ''} created with digital QR tag!'),
                                      backgroundColor: AppColors.primary,
                                    ),
                                  );
                                }
                              } else {
                                setSheetState(() {
                                  isSubmitting = false;
                                  modalError = res.errorMessage ?? 'Failed to register batch.';
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: _fetchBatches,
        color: AppColors.primary,
        child: CustomScrollView(
          slivers: [
            // Sub-header Anchor
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
                          'Hospital Point of Generation',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        Text(
                          'Facility: ${widget.user.facilityName ?? "AIIMS Central"}',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      onPressed: _openRegisterBatchSheet,
                      icon: const Icon(Icons.add, size: 16),
                      label: const Text('Log Batch', style: TextStyle(fontSize: 12)),
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
                  const StatCard(
                    title: 'Beds & Occupancy',
                    value: '420 / 500',
                    subtitle: '84% bed occupancy',
                    icon: Icons.hotel_rounded,
                    iconColor: AppColors.primary,
                    iconBg: AppColors.primaryBg,
                  ),
                  const StatCard(
                    title: 'Clinical Activity',
                    value: '34 Surgeries',
                    subtitle: '142 OPD patients today',
                    icon: Icons.healing_rounded,
                    iconColor: Color(0xFF0284C7),
                    iconBg: Color(0xFFF0F9FF),
                  ),
                  StatCard(
                    title: 'Logged Today',
                    value: '${_totalLoggedKg.toStringAsFixed(1)} kg',
                    subtitle: '${_batches.length} registered batches',
                    icon: Icons.inventory_2_outlined,
                    iconColor: AppColors.accent,
                    iconBg: AppColors.accentLight,
                  ),
                  const StatCard(
                    title: '48H Compliance',
                    value: '98.4%',
                    subtitle: 'BMW Rules 2016 compliant',
                    icon: Icons.verified_outlined,
                    iconColor: AppColors.success,
                    iconBg: AppColors.successBg,
                    valueColor: AppColors.success,
                  ),
                ]),
              ),
            ),

            // Filter & Search Strip
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    TextField(
                      decoration: const InputDecoration(
                        hintText: 'Search batch code, department...',
                        prefixIcon: Icon(Icons.search, size: 18),
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val),
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ['ALL', 'Yellow', 'Red', 'White', 'Blue'].map((cat) {
                          final isSelected = _selectedCategory == cat;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ChoiceChip(
                              label: Text(cat, style: const TextStyle(fontSize: 11)),
                              selected: isSelected,
                              selectedColor: AppColors.primaryBg,
                              onSelected: (_) => setState(() => _selectedCategory = cat),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 12),
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
                  title: 'Failed to load manifests',
                  description: _errorMessage!,
                  onRetry: _fetchBatches,
                ),
              )
            else if (_filteredBatches.isEmpty)
              const SliverFillRemaining(
                child: EmptyView(
                  title: 'No waste batches found',
                  description: 'No registered batches match your active search filter.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final batch = _filteredBatches[index];
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
                                    batch.generatingDepartment,
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '${batch.quantityKg.toStringAsFixed(1)} kg',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: _filteredBatches.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
