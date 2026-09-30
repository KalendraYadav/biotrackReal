import 'package:flutter/material.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/facility_model.dart';
import '../../shared/models/risk_case_model.dart';
import '../../shared/models/user_model.dart';
import '../../shared/widgets/stat_card.dart';
import '../../shared/widgets/status_badge.dart';

class GovernmentDashboardScreen extends StatefulWidget {
  final UserModel user;

  const GovernmentDashboardScreen({super.key, required this.user});

  @override
  State<GovernmentDashboardScreen> createState() => _GovernmentDashboardScreenState();
}

class _GovernmentDashboardScreenState extends State<GovernmentDashboardScreen> {
  bool _isLoading = true;
  List<FacilityModel> _facilities = [];
  List<RiskCaseModel> _breaches = [];
  String _activeTab = 'FACILITIES'; // FACILITIES | BREACHES
  bool _isScanningSla = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
    });

    final facRes = await ApiClient.get('/facilities');
    final breachRes = await ApiClient.get('/risk-cases');

    if (facRes.isSuccess) {
      final list = facRes.data?['facilities'] as List<dynamic>? ?? [];
      _facilities = list.map((f) => FacilityModel.fromJson(f as Map<String, dynamic>)).toList();
    }

    if (breachRes.isSuccess) {
      final rawCases = breachRes.data?['risk_cases'] as List<dynamic>? ?? [];
      _breaches = rawCases.map((c) => RiskCaseModel.fromJson(c as Map<String, dynamic>)).toList();
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _runSlaScanner() async {
    setState(() => _isScanningSla = true);
    final res = await ApiClient.post('/risk-cases/run-sla-check');
    if (mounted) {
      setState(() => _isScanningSla = false);
      if (res.isSuccess) {
        _fetchData();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Statutory SLA Scanner completed! Active cases updated.'),
            backgroundColor: AppColors.primary,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res.errorMessage ?? 'SLA check failed'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: _fetchData,
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
                          'Central Pollution Control Board',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        Text(
                          'Regulator: ${widget.user.name} • CPCB / SPCB Oversight',
                          style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        backgroundColor: AppColors.primary,
                      ),
                      onPressed: _isScanningSla ? null : _runSlaScanner,
                      icon: _isScanningSla
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.radar_rounded, size: 16),
                      label: const Text('Scan SLA', style: TextStyle(fontSize: 11)),
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
                    title: 'Total Tracked',
                    value: '1311.1 kg',
                    subtitle: '43 digital manifests verified',
                    icon: Icons.account_balance_outlined,
                    iconColor: AppColors.primary,
                    iconBg: AppColors.primaryBg,
                  ),
                  const StatCard(
                    title: '48H SLA Rate',
                    value: '37.2%',
                    subtitle: 'Treated within statutory limit',
                    icon: Icons.timer_outlined,
                    iconColor: Color(0xFF0284C7),
                    iconBg: Color(0xFFF0F9FF),
                  ),
                  StatCard(
                    title: 'Regulated Units',
                    value: '${_facilities.length} units',
                    subtitle: 'Hospitals & CBWTF plants',
                    icon: Icons.domain_rounded,
                    iconColor: AppColors.textSecondary,
                    onTap: () => setState(() => _activeTab = 'FACILITIES'),
                  ),
                  StatCard(
                    title: 'Regulatory Breaches',
                    value: '${_breaches.length} active',
                    subtitle: 'Field audit cases opened',
                    icon: Icons.shield_outlined,
                    iconColor: AppColors.danger,
                    iconBg: AppColors.dangerBg,
                    valueColor: AppColors.danger,
                    onTap: () => setState(() => _activeTab = 'BREACHES'),
                  ),
                ]),
              ),
            ),

            // Tab Selector
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _activeTab = 'FACILITIES'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: _activeTab == 'FACILITIES' ? AppColors.primary : Colors.transparent,
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            'Regulated Facilities (${_facilities.length})',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: _activeTab == 'FACILITIES' ? FontWeight.bold : FontWeight.w500,
                              color: _activeTab == 'FACILITIES' ? AppColors.primary : AppColors.textMuted,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () => setState(() => _activeTab = 'BREACHES'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: _activeTab == 'BREACHES' ? AppColors.primary : Colors.transparent,
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            'Active Breaches (${_breaches.length})',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: _activeTab == 'BREACHES' ? FontWeight.bold : FontWeight.w500,
                              color: _activeTab == 'BREACHES' ? AppColors.primary : AppColors.textMuted,
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
            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            // Content List
            if (_isLoading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (_activeTab == 'FACILITIES')
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final fac = _facilities[index];
                      final isHospital = fac.type == 'HOSPITAL';
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: isHospital ? AppColors.primaryBg : AppColors.accentLight,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                isHospital ? Icons.local_hospital_rounded : Icons.factory_rounded,
                                color: isHospital ? AppColors.primary : AppColors.accent,
                                size: 18,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    fac.name,
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                  ),
                                  Text(
                                    '${fac.city} • Reg: ${fac.cpcbRegistrationNo ?? "CPCB-REG-2026"}',
                                    style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${fac.activeBatchesCount} Active',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                ),
                                if (fac.bedCount != null)
                                  Text(
                                    '${fac.bedCount} Beds',
                                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                                  ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: _facilities.length,
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final breach = _breaches[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.dangerBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  breach.caseNumber,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.dangerBg,
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: AppColors.dangerBorder),
                                  ),
                                  child: Text(
                                    'Score: ${breach.riskScore}/100',
                                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.danger),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              breach.triggerType?.replaceAll('_', ' ') ?? 'SLA BREACH',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                            ),
                            if (breach.description != null)
                              Text(
                                breach.description!,
                                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                              ),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  breach.facilityName ?? 'AIIMS Central Hospital',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                                StatusBadge(status: breach.status),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: _breaches.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
