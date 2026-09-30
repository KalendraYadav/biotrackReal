import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../core/network/api_client.dart';
import '../../core/socket/socket_service.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/models/user_model.dart';
import '../../shared/models/vehicle_model.dart';
import '../../shared/widgets/stat_card.dart';

class TransportDashboardScreen extends StatefulWidget {
  final UserModel user;

  const TransportDashboardScreen({super.key, required this.user});

  @override
  State<TransportDashboardScreen> createState() => _TransportDashboardScreenState();
}

class _TransportDashboardScreenState extends State<TransportDashboardScreen> {
  final MapController _mapController = MapController();
  StreamSubscription? _telemetrySub;

  VehicleModel? _vehicle;
  bool _isDeviated = false;
  int _currentCheckpointIndex = 0;

  // Safe Green Corridor route from AIIMS Central to Apex CBWTF Okhla
  final List<LatLng> _safeCorridor = const [
    LatLng(28.5672, 77.2100), // AIIMS Gate
    LatLng(28.5720, 77.2210), // Ring Road Checkpoint 1
    LatLng(28.5600, 77.2400), // Moolchand Flyover
    LatLng(28.5450, 77.2600), // Nehru Place Bypass
    LatLng(28.5300, 77.2750), // Okhla Industrial Phase II
    LatLng(28.5200, 77.2850), // Apex CBWTF Weighbridge Terminal
  ];

  LatLng _currentLocation = const LatLng(28.5672, 77.2100);

  @override
  void initState() {
    super.initState();
    _fetchVehicle();
    _listenToTelemetry();
  }

  @override
  void dispose() {
    _telemetrySub?.cancel();
    super.dispose();
  }

  void _listenToTelemetry() {
    _telemetrySub = SocketService.telemetryStream.listen((data) {
      if (mounted) {
        final lat = (data['latitude'] as num?)?.toDouble() ?? (data['lat'] as num?)?.toDouble();
        final lng = (data['longitude'] as num?)?.toDouble() ?? (data['lng'] as num?)?.toDouble();
        if (lat != null && lng != null) {
          setState(() {
            _currentLocation = LatLng(lat, lng);
            _isDeviated = _checkDeviation(_currentLocation);
          });
          _mapController.move(_currentLocation, 14);
        }
      }
    });
  }

  bool _checkDeviation(LatLng point) {
    // If distance from nearest corridor point is > 1.5 km (~0.015 deg), flag deviation
    double minDistance = double.infinity;
    for (final corridorPoint in _safeCorridor) {
      final dist = (point.latitude - corridorPoint.latitude).abs() +
          (point.longitude - corridorPoint.longitude).abs();
      if (dist < minDistance) minDistance = dist;
    }
    return minDistance > 0.035;
  }

  Future<void> _fetchVehicle() async {
    final res = await ApiClient.get('/vehicles');
    if (res.isSuccess) {
      final list = res.data?['vehicles'] as List<dynamic>? ?? [];
      if (list.isNotEmpty && mounted) {
        setState(() {
          _vehicle = VehicleModel.fromJson(list.first as Map<String, dynamic>);
          _currentLocation = LatLng(_vehicle!.currentLat, _vehicle!.currentLng);
          _isDeviated = _checkDeviation(_currentLocation);
        });
      }
    }
  }

  Future<void> _sendPing(LatLng point, {double speedKmh = 38.0}) async {
    final vehId = _vehicle?.id ?? 'veh-001';
    await ApiClient.post(
      '/vehicles/$vehId/ping',
      body: {
        'latitude': point.latitude,
        'longitude': point.longitude,
        'speed_kmh': speedKmh,
      },
    );
  }

  void _advanceNextCheckpoint() {
    if (_currentCheckpointIndex < _safeCorridor.length - 1) {
      _currentCheckpointIndex++;
    } else {
      _currentCheckpointIndex = 0;
    }
    final nextPoint = _safeCorridor[_currentCheckpointIndex];
    setState(() {
      _currentLocation = nextPoint;
      _isDeviated = false;
    });
    _mapController.move(nextPoint, 14);
    _sendPing(nextPoint, speedKmh: 42.0);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Vehicle progressed to Checkpoint ${_currentCheckpointIndex + 1} / ${_safeCorridor.length}'),
        backgroundColor: AppColors.primary,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _simulateDeviation() {
    // Offset vehicle by 8km into unauthorized civil zone
    final devPoint = LatLng(
      _currentLocation.latitude + 0.055,
      _currentLocation.longitude - 0.065,
    );
    setState(() {
      _currentLocation = devPoint;
      _isDeviated = true;
    });
    _mapController.move(devPoint, 13);
    _sendPing(devPoint, speedKmh: 65.0);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('GEOFENCE BREACH: Vehicle deviated outside approved green corridor!'),
        backgroundColor: AppColors.danger,
        duration: Duration(seconds: 4),
      ),
    );
  }

  void _resetOrigin() {
    _currentCheckpointIndex = 0;
    final origin = _safeCorridor.first;
    setState(() {
      _currentLocation = origin;
      _isDeviated = false;
    });
    _mapController.move(origin, 14);
    _sendPing(origin, speedKmh: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: CustomScrollView(
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
                        'Transit Fleet Telemetry & Geofence',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                      ),
                      Text(
                        'Carrier: EcoSafe Waste Handlers • ${_vehicle?.plateNo ?? "DL-01-AB-4421"}',
                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: _isDeviated ? AppColors.dangerBg : AppColors.successBg,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: _isDeviated ? AppColors.dangerBorder : AppColors.successBorder),
                    ),
                    child: Text(
                      _isDeviated ? 'DEVIATION ALERT' : 'CORRIDOR SECURE',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: _isDeviated ? AppColors.danger : AppColors.success,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Deviation Banner if active
          if (_isDeviated)
            SliverToBoxAdapter(
              child: Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.dangerBg,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.dangerBorder),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 24),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Geofence Route Breach Detected',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.danger),
                          ),
                          Text(
                            'Vehicle is outside approved CPCB corridor. Real-time alert dispatched.',
                            style: TextStyle(fontSize: 11, color: AppColors.danger),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: _resetOrigin,
                      child: const Text('Return', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold)),
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
                  title: 'Fleet Vehicle',
                  value: _vehicle?.plateNo ?? 'DL-01-AB-4421',
                  subtitle: 'Driver: ${widget.user.name}',
                  icon: Icons.local_shipping_outlined,
                  iconColor: AppColors.primary,
                  iconBg: AppColors.primaryBg,
                ),
                StatCard(
                  title: 'Corridor Boundary',
                  value: _isDeviated ? 'Breached' : 'Locked',
                  subtitle: _isDeviated ? '+11 km deviation' : 'Approved corridor',
                  icon: Icons.alt_route_rounded,
                  iconColor: _isDeviated ? AppColors.danger : AppColors.success,
                  iconBg: _isDeviated ? AppColors.dangerBg : AppColors.successBg,
                  valueColor: _isDeviated ? AppColors.danger : AppColors.success,
                ),
                const StatCard(
                  title: 'Cargo In Transit',
                  value: '2 batches',
                  subtitle: '60.3 kg sealed waste',
                  icon: Icons.inventory_2_outlined,
                  iconColor: Color(0xFF0284C7),
                  iconBg: Color(0xFFF0F9FF),
                ),
                const StatCard(
                  title: 'Current Speed',
                  value: '38 km/h',
                  subtitle: 'GPS Telemetry Active',
                  icon: Icons.speed_rounded,
                  iconColor: AppColors.accent,
                  iconBg: AppColors.accentLight,
                ),
              ]),
            ),
          ),

          // Simulation Action Toolbar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onPressed: _advanceNextCheckpoint,
                      icon: const Icon(Icons.navigation_outlined, size: 16),
                      label: const Text('Next Checkpoint', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: const BorderSide(color: AppColors.dangerBorder),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onPressed: _simulateDeviation,
                      child: const Text('Deviate', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, size: 20),
                    tooltip: 'Reset Origin',
                    onPressed: _resetOrigin,
                  ),
                ],
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 14)),

          // OpenStreetMap Leaflet Equivalent Map
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              height: 280,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              clipBehavior: Clip.antiAlias,
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: _currentLocation,
                  initialZoom: 13.5,
                ),
                children: [
                  TileLayer(
                    urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'com.nidusclean.biotrace',
                  ),
                  // Safe Corridor Polyline
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: _safeCorridor,
                        strokeWidth: 4.5,
                        color: const Color(0xFF10B981).withValues(alpha: 0.85),
                      ),
                    ],
                  ),
                  // Checkpoint Markers
                  MarkerLayer(
                    markers: [
                      // Origin Marker (AIIMS)
                      Marker(
                        point: _safeCorridor.first,
                        width: 26,
                        height: 26,
                        child: Container(
                          decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                          child: const Center(child: Text('H', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
                        ),
                      ),
                      // Destination Marker (CBWTF)
                      Marker(
                        point: _safeCorridor.last,
                        width: 26,
                        height: 26,
                        child: Container(
                          decoration: const BoxDecoration(color: Color(0xFF0F172A), shape: BoxShape.circle),
                          child: const Center(child: Text('T', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold))),
                        ),
                      ),
                      // Active Vehicle Marker
                      Marker(
                        point: _currentLocation,
                        width: 38,
                        height: 38,
                        child: Container(
                          decoration: BoxDecoration(
                            color: _isDeviated ? AppColors.danger : AppColors.accent,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.5),
                            boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 6)],
                          ),
                          child: const Icon(Icons.local_shipping, color: Colors.white, size: 20),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
        ],
      ),
    );
  }
}
