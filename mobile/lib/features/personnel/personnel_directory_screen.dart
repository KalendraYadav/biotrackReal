import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../../shared/widgets/empty_view.dart';
import '../../shared/widgets/status_badge.dart';

class PersonnelDirectoryScreen extends StatefulWidget {
  final UserModel user;

  const PersonnelDirectoryScreen({super.key, required this.user});

  @override
  State<PersonnelDirectoryScreen> createState() => _PersonnelDirectoryScreenState();
}

class _PersonnelDirectoryScreenState extends State<PersonnelDirectoryScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _personnel = [];
  String _activeFilter = 'ALL';
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _fetchPersonnel();
  }

  Future<void> _fetchPersonnel() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiClient.get('/personnel');
    if (!res.isSuccess) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = res.errorMessage;
        });
      }
      return;
    }

    final rawList = res.data?['personnel'] as List<dynamic>? ?? [];
    if (mounted) {
      setState(() {
        _personnel = rawList;
        _isLoading = false;
      });
    }
  }

  Future<void> _updateStatus(String personId, String newStatus, String name, {String? reason}) async {
    final body = <String, dynamic>{'status': newStatus};
    if (reason != null && reason.isNotEmpty) {
      body['reason'] = reason;
    } else if (newStatus == 'REJECTED') {
      body['reason'] = 'Administrative rejection by facility authority';
    } else if (newStatus == 'SUSPENDED') {
      body['reason'] = 'Operational suspension by authority';
    }

    final res = await ApiClient.put(
      '/personnel/$personId/verify',
      body: body,
    );

    if (res.isSuccess) {
      _fetchPersonnel();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$name status updated to $newStatus'),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res.errorMessage ?? 'Update failed'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  void _confirmVerification(dynamic person) {
    final name = person['name']?.toString() ?? 'Personnel';
    final email = person['email']?.toString() ?? '';
    final phone = person['phone_number']?.toString() ?? 'Not provided';
    final role = person['role']?.toString() ?? '';
    final facility = person['assigned_facility']?.toString() ?? 'Unassigned';
    final status = person['verification_status']?.toString() ?? 'PENDING';
    final id = person['id']?.toString() ?? '';
    final isReinstate = status == 'SUSPENDED';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          isReinstate ? 'Confirm Reinstatement' : 'Confirm Personnel Verification',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Please review the personnel details before granting operational access.',
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              _dialogRow('Name', name),
              _dialogRow('Email', email),
              _dialogRow('Phone', phone),
              _dialogRow('Requested Role', AppRoles.format(role)),
              _dialogRow('Assigned Facility', facility),
              _dialogRow('Current Status', status),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.success,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _updateStatus(id, 'VERIFIED', name);
            },
            child: Text(isReinstate ? 'Confirm Reinstatement' : 'Confirm Verification'),
          ),
        ],
      ),
    );
  }

  Widget _dialogRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  List<dynamic> get _filteredPersonnel {
    return _personnel.where((p) {
      final name = p['name']?.toString() ?? '';
      final email = p['email']?.toString() ?? '';
      final role = p['role']?.toString() ?? '';
      final status = p['verification_status']?.toString() ?? 'PENDING';

      final matchesSearch = _searchQuery.isEmpty ||
          name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          email.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          role.toLowerCase().contains(_searchQuery.toLowerCase());

      final matchesTab = _activeFilter == 'ALL' || status == _activeFilter;
      return matchesSearch && matchesTab;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: RefreshIndicator(
        onRefresh: _fetchPersonnel,
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
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Personnel & Staff Directory',
                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                        ),
                        Text(
                          'CPCB BMW Handling RBAC Authorization',
                          style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 20),
                      onPressed: _fetchPersonnel,
                    ),
                  ],
                ),
              ),
            ),

            // Search & Filter
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    TextField(
                      decoration: const InputDecoration(
                        hintText: 'Search by name, role, email...',
                        prefixIcon: Icon(Icons.search, size: 18),
                      ),
                      onChanged: (val) => setState(() => _searchQuery = val),
                    ),
                    const SizedBox(height: 10),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: ['ALL', 'VERIFIED', 'PENDING', 'REJECTED'].map((st) {
                          final isSelected = _activeFilter == st;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ChoiceChip(
                              label: Text(st, style: const TextStyle(fontSize: 11)),
                              selected: isSelected,
                              selectedColor: AppColors.primaryBg,
                              onSelected: (_) => setState(() => _activeFilter = st),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Personnel List
            if (_isLoading)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (_errorMessage != null)
              SliverFillRemaining(
                child: EmptyView(
                  icon: Icons.error_outline,
                  title: 'Failed to load personnel',
                  description: _errorMessage!,
                  onRetry: _fetchPersonnel,
                ),
              )
            else if (_filteredPersonnel.isEmpty)
              const SliverFillRemaining(
                child: EmptyView(
                  title: 'No personnel found',
                  description: 'No staff records match your current search criteria.',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final p = _filteredPersonnel[index];
                      final id = p['id']?.toString() ?? '';
                      final name = p['name']?.toString() ?? 'Personnel';
                      final email = p['email']?.toString() ?? '';
                      final role = p['role']?.toString() ?? 'STAFF';
                      final status = p['verification_status']?.toString() ?? 'PENDING';
                      final facility = p['assigned_facility']?.toString() ?? 'Facility';

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
                                Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                StatusBadge(status: status),
                              ],
                            ),
                            Text(email, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                            const SizedBox(height: 6),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  AppRoles.format(role),
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.primary),
                                ),
                                Text(
                                  facility,
                                  style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                ),
                              ],
                            ),

                            // Verification Action Row
                            if (status != 'REVOKED') ...[
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  if (status != 'VERIFIED')
                                    TextButton(
                                      style: TextButton.styleFrom(foregroundColor: AppColors.success),
                                      onPressed: () => _confirmVerification(p),
                                      child: Text(
                                        status == 'SUSPENDED' ? 'Reinstate' : 'Verify',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  if (status == 'PENDING')
                                    TextButton(
                                      style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                                      onPressed: () => _updateStatus(id, 'REJECTED', name),
                                      child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    ),
                                  if (status == 'VERIFIED')
                                    TextButton(
                                      style: TextButton.styleFrom(foregroundColor: AppColors.warning),
                                      onPressed: () => _updateStatus(id, 'SUSPENDED', name, reason: 'Field operational suspension'),
                                      child: const Text('Suspend', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      );
                    },
                    childCount: _filteredPersonnel.length,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
