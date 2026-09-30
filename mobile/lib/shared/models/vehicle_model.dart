class VehicleModel {
  final String id;
  final String plateNo;
  final String? transportOfficerId;
  final String? transportOfficerName;
  final double currentLat;
  final double currentLng;
  final DateTime? lastPingAt;
  final List<List<double>> gpsTrail;

  VehicleModel({
    required this.id,
    required this.plateNo,
    this.transportOfficerId,
    this.transportOfficerName,
    required this.currentLat,
    required this.currentLng,
    this.lastPingAt,
    this.gpsTrail = const [],
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    List<List<double>> trail = [];
    if (json['gps_trail'] is List) {
      for (var pt in json['gps_trail']) {
        if (pt is List && pt.length >= 2) {
          trail.add([(pt[0] as num).toDouble(), (pt[1] as num).toDouble()]);
        }
      }
    }

    return VehicleModel(
      id: json['id']?.toString() ?? json['vehicle_id']?.toString() ?? '',
      plateNo: json['plate_no']?.toString() ?? 'DL-01-AB-4421',
      transportOfficerId: json['transport_officer_id']?.toString() ??
          json['transport_officer']?['id']?.toString(),
      transportOfficerName: json['transport_officer']?['name']?.toString(),
      currentLat: (json['current_lat'] as num?)?.toDouble() ??
          (json['current_location']?['latitude'] as num?)?.toDouble() ??
          28.6520,
      currentLng: (json['current_lng'] as num?)?.toDouble() ??
          (json['current_location']?['longitude'] as num?)?.toDouble() ??
          77.1520,
      lastPingAt: json['last_ping_at'] != null
          ? DateTime.tryParse(json['last_ping_at'].toString())
          : (json['current_location']?['last_ping_at'] != null
              ? DateTime.tryParse(json['current_location']['last_ping_at'].toString())
              : null),
      gpsTrail: trail,
    );
  }
}
