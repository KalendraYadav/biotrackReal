import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/risk_case_model.dart';
import '../../shared/models/user_model.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/stat_card.dart';
import '../../shared/widgets/status_badge.dart';

class InspectorDashboardScreen extends StatefulWidget {
  final UserModel user;

  const InspectorDashboardScreen({super.key, required this.user});

  @override
  State<InspectorDashboardScreen> createState() => _InspectorDashboardScreenState();
}

class _InspectorDashboardScreenState extends State<InspectorDashboardScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<RiskCaseModel> _cases = [];
  String _activeFilter = 'ALL';
  String _searchQuery = '';
  bool _isTestingBrokenChain = false;

  @override
  void initState() {
    super.initState();
    _fetchCases();
  }

  Future<void> _fetchCases() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiClient.get('/risk-cases');
    if (!res.isSuccess) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = res.errorMessage;
        });
      }
      return;
    }

    final rawCases = res.data?['risk_cases'] as List<dynamic>? ?? [];
    final list = rawCases.map((c) => RiskCaseModel.fromJson(c as Map<String, dynamic>)).toList();

    if (mounted) {
      setState(() {
        _cases = list;
        _isLoading = false;
      });
    }
  }

  List<RiskCaseModel> get _filteredCases {
    return _cases.where((c) {
      final matchesSearch = _searchQuery.isEmpty ||
          c.caseNumber.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (c.batchCode != null && c.batchCode!.toLowerCase().contains(_searchQuery.toLowerCase())) ||
          (c.facilityName != null && c.facilityName!.toLowerCase().contains(_searchQuery.toLowerCase()));

      bool matchesTab = true;
      if (_activeFilter == 'ASSIGNED') matchesTab = c.status == 'ASSIGNED';
      if (_activeFilter == 'HIGH_PRIORITY') matchesTab = c.riskScore >= 75;
      if (_activeFilter == 'UNDER_INVESTIGATION') matchesTab = c.status == 'UNDER_INVESTIGATION';
      if (_activeFilter == 'RESOLVED') matchesTab = c.status == 'RESOLVED';

      return matchesSearch && matchesTab;
    }).toList();
  }

  int get _assignedCount => _cases.where((c) => c.status == 'ASSIGNED').length;
  int get _highPriorityCount => _cases.where((c) => c.riskScore >= 75).length;
  int get _underInvestigationCount => _cases.where((c) => c.status == 'UNDER_INVESTIGATION').length;
  int get _resolvedCount => _cases.where((c) => c.status == 'RESOLVED').length;

  Future<void> _testBrokenChain() async {
    setState(() => _isTestingBrokenChain = true);
    final res = await ApiClient.post('/risk-cases/test-broken-chain');
    if (mounted) {
      setState(() => _isTestingBrokenChain = false);
      if (res.isSuccess) {
        _fetchCases();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Simulated Broken Chain of Custody! New High Risk Case detected & opened.'),
            backgroundColor: AppColors.danger,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res.errorMessage ?? 'Simulation failed'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  void _openCaseDossier(RiskCaseModel c) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
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
                Text(
                  'Case Dossier: ${c.caseNumber}',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                ),
                IconButton(icon: const Icon(Icons.close, size: 20), onPressed: () => Navigator.pop(ctx)),
              ],
            ),
            const SizedBox(height: 10),

            // Score Banner
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: c.riskScore >= 75 ? AppColors.dangerBg : AppColors.warningBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: c.riskScore >= 75 ? AppColors.dangerBorder : AppColors.warningBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    c.riskScore >= 75 ? Icons.report_problem_rounded : Icons.warning_rounded,
                    color: c.riskScore >= 75 ? AppColors.danger : AppColors.warning,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Risk Score: ${c.riskScore}/100',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: c.riskScore >= 75 ? AppColors.danger : AppColors.warning,
                        ),
                      ),
                      Text(
                        c.riskScore >= 75 ? 'CRITICAL NON-COMPLIANCE' : 'ELEVATED SUSPICIOUS ACTIVITY',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: c.riskScore >= 75 ? AppColors.danger : AppColors.warning,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Metadata rows
            _detailRow('Target Facility', c.facilityName ?? 'Hospital Unit'),
            _detailRow('Linked Batch', c.batchCode ?? 'BMW-2026-Batch'),
            _detailRow('Trigger Type', c.triggerType?.replaceAll('_', ' ') ?? 'SLA Anomaly'),
            if (c.description != null) _detailRow('Description', c.description!),
            _detailRow('Current Status', c.status),

            const SizedBox(height: 16),
            const Text('Statutory Enforcement Actions', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            Row(
              children: [
                if (c.status != 'UNDER_INVESTIGATION')
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _applyAction(ctx, c.id, 'INVESTIGATE', 'Inquiry opened'),
                      child: const Text('Investigate', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                if (c.status != 'UNDER_INVESTIGATION') const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    onPressed: () => _applyAction(ctx, c.id, 'RESOLVE', 'Case closed'),
                    child: const Text('Resolve & Close', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
          ),
        ],
      ),
    );
  }

  Future<void> _applyAction(BuildContext ctx, String caseId, String action, String successMsg) async {
    Navigator.pop(ctx);
    final res = await ApiClient.post(
      '/risk-cases/$caseId/action',
      body: {'action': action, 'notes': 'Field Inspector action via mobile'},
    );
    if (res.isSuccess) {
      _fetchCases();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Action Applied: $successMsg'), backgroundColor: AppColors.primary),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res.errorMessage ?? 'Action failed'), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: _fetchCases,
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
                          'Compliance & Enforcement',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        Text(
                          'Inspector: ${widget.user.name} • CPCB Audit Unit',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.danger,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                      onPressed: _isTestingBrokenChain ? null : _testBrokenChain,
                      icon: _isTestingBrokenChain
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.flash_on_rounded, size: 16),
                      label: const Text('Test Chain', style: TextStyle(fontSize: 11)),
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
                    title: 'Assigned Audits',
                    value: '$_assignedCount',
                    subtitle: 'Awaiting initial inspection',
                    icon: Icons.assignment_outlined,
                    iconColor: AppColors.primary,
                    iconBg: AppColors.primaryBg,
                    onTap: () => setState(() => _activeFilter = 'ASSIGNED'),
                  ),
                  StatCard(
                    title: 'High Priority',
                    value: '$_highPriorityCount',
                    subtitle: 'Risk score ≥ 75/100',
                    icon: Icons.report_problem_outlined,
                    iconColor: AppColors.danger,
                    iconBg: AppColors.dangerBg,
                    valueColor: AppColors.danger,
                    onTap: () => setState(() => _activeFilter = 'HIGH_PRIORITY'),
                  ),
                  StatCard(
                    title: 'Under Inquiry',
                    value: '$_underInvestigationCount',
                    subtitle: 'Field inquiry active',
                    icon: Icons.search_rounded,
                    iconColor: AppColors.warning,
                    iconBg: AppColors.warningBg,
                    valueColor: AppColors.warning,
                    onTap: () => setState(() => _activeFilter = 'UNDER_INVESTIGATION'),
                  ),
                  StatCard(
                    title: 'Resolved Audits',
                    value: '$_resolvedCount',
                    subtitle: 'Sanctions closed',
                    icon: Icons.check_circle_outline_rounded,
                    iconColor: AppColors.success,
                    iconBg: AppColors.successBg,
                    valueColor: AppColors.success,
                    onTap: () => setState(() => _activeFilter = 'RESOLVED'),
                  ),
                ]),
              ),
            ),

            // Filter Tabs & Search
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    TextField(
                      decoration: const InputDecoration(
                        hintText: 'Search case code, batch, facility...',
                        prefixIcon: Icon(Icons.search, size: 18),
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val),
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _filterChip('All (${_cases.length})', 'ALL'),
                          _filterChip('Assigned ($_assignedCount)', 'ASSIGNED'),
                          _filterChip('High Priority ($_highPriorityCount)', 'HIGH_PRIORITY'),
                          _filterChip('In Progress ($_underInvestigationCount)', 'UNDER_INVESTIGATION'),
                          _filterChip('Resolved ($_resolvedCount)', 'RESOLVED'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),

            // Cases List
            if (_isLoading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (_errorMessage != null)
              SliverFillRemaining(
                child: EmptyView(
                  icon: Icons.error_outline,
                  title: 'Failed to load risk cases',
                  description: _errorMessage!,
                  onRetry: _fetchCases,
                ),
              )
            else if (_filteredCases.isEmpty)
              const SliverFillRemaining(
                child: EmptyView(
                  title: 'No audit cases match filter',
                  description: 'All compliance records are clear for this selection.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final c = _filteredCases[index];
                      final isCritical = c.riskScore >= 75;

                      return InkWell(
                        onTap: () => _openCaseDossier(c),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isCritical ? AppColors.dangerBorder : AppColors.border,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    c.caseNumber,
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: isCritical ? AppColors.dangerBg : AppColors.warningBg,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '${c.riskScore}/100',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isCritical ? AppColors.danger : AppColors.warning,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                c.triggerType?.replaceAll('_', ' ') ?? 'Anomaly',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                              if (c.description != null)
                                Text(
                                  c.description!,
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    c.facilityName ?? 'Hospital',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                  ),
                                  StatusBadge(status: c.status),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                    childCount: _filteredCases.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, String filterKey) {
    final isSelected = _activeFilter == filterKey;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 11)),
        selected: isSelected,
        selectedColor: AppColors.primaryBg,
        onSelected: (_) => setState(() => _activeFilter = filterKey),
      ),
    );
  }
}
