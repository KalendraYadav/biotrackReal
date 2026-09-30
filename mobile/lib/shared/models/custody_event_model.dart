class CustodyEventModel {
  final String id;
  final String stage;
  final double? quantityAtStageKg;
  final bool verifiedByScan;
  final String? photoUrl;
  final double? latitude;
  final double? longitude;
  final bool? geofenceValid;
  final String? notes;
  final DateTime? timestamp;
  final String? performedByName;

  CustodyEventModel({
    required this.id,
    required this.stage,
    this.quantityAtStageKg,
    this.verifiedByScan = false,
    this.photoUrl,
    this.latitude,
    this.longitude,
    this.geofenceValid,
    this.notes,
    this.timestamp,
    this.performedByName,
  });

  factory CustodyEventModel.fromJson(Map<String, dynamic> json) {
    return CustodyEventModel(
      id: json['id']?.toString() ?? '',
      stage: json['stage']?.toString() ?? 'GENERATION',
      quantityAtStageKg: (json['quantity_at_stage_kg'] as num?)?.toDouble() ??
          (json['quantity'] as num?)?.toDouble(),
      verifiedByScan: json['verified_by_scan'] == true,
      photoUrl: json['photo_url']?.toString(),
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      geofenceValid: json['geofence_valid'] as bool?,
      notes: json['notes']?.toString(),
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'].toString())
          : null,
      performedByName: json['performer']?['name']?.toString() ??
          json['performed_by_name']?.toString(),
    );
  }
}
