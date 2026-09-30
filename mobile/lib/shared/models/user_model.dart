class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? facilityId;
  final String? facilityName;
  final String? facilityType;
  final String? verificationStatus;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.facilityId,
    this.facilityName,
    this.facilityType,
    this.verificationStatus,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'User',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? 'HOSPITAL_AUTHORITY',
      facilityId: json['facility_id']?.toString(),
      facilityName: json['facility_name']?.toString() ?? json['facility']?['name']?.toString(),
      facilityType: json['facility_type']?.toString() ?? json['facility']?['type']?.toString(),
      verificationStatus: json['verification_status']?.toString() ?? 'VERIFIED',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'facility_id': facilityId,
      'facility_name': facilityName,
      'facility_type': facilityType,
      'verification_status': verificationStatus,
    };
  }
}
