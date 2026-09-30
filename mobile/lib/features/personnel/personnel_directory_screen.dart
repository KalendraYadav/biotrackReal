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

  Future<void> _updateStatus(String personId, String newStatus, String name) async {
    final res = await ApiClient.put(
      '/personnel/$personId/verify',
      body: {'status': newStatus},
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
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (status != 'VERIFIED')
                                  TextButton(
                                    style: TextButton.styleFrom(foregroundColor: AppColors.success),
                                    onPressed: () => _updateStatus(id, 'VERIFIED', name),
                                    child: const Text('Verify', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  ),
                                if (status != 'REJECTED')
                                  TextButton(
                                    style: TextButton.styleFrom(foregroundColor: AppColors.danger),
                                    onPressed: () => _updateStatus(id, 'REJECTED', name),
                                    child: const Text('Reject', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  ),
                              ],
                            ),
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
