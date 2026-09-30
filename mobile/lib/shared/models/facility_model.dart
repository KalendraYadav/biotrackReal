class FacilityModel {
  final String id;
  final String name;
  final String type; // HOSPITAL | CBWTF
  final String city;
  final String? address;
  final double lat;
  final double lng;
  final int? bedCount;
  final String? cpcbRegistrationNo;
  final int totalBatchesCount;
  final int activeBatchesCount;

  FacilityModel({
    required this.id,
    required this.name,
    required this.type,
    required this.city,
    this.address,
    required this.lat,
    required this.lng,
    this.bedCount,
    this.cpcbRegistrationNo,
    this.totalBatchesCount = 0,
    this.activeBatchesCount = 0,
  });

  factory FacilityModel.fromJson(Map<String, dynamic> json) {
    return FacilityModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Facility',
      type: json['type']?.toString() ?? 'HOSPITAL',
      city: json['city']?.toString() ?? 'Delhi',
      address: json['address']?.toString(),
      lat: (json['lat'] as num?)?.toDouble() ?? 28.6139,
      lng: (json['lng'] as num?)?.toDouble() ?? 77.2090,
      bedCount: (json['bed_count'] as num?)?.toInt(),
      cpcbRegistrationNo: json['cpcb_registration_no']?.toString(),
      totalBatchesCount: (json['total_batches_count'] as num?)?.toInt() ?? 0,
      activeBatchesCount: (json['active_batches_count'] as num?)?.toInt() ?? 0,
    );
  }
}
