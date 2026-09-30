class RiskCaseModel {
  final String id;
  final String caseNumber;
  final String? batchId;
  final String? batchCode;
  final String? facilityName;
  final int riskScore;
  final String? triggerType;
  final String? description;
  final List<String> triggers;
  final String status;
  final DateTime detectedAt;

  RiskCaseModel({
    required this.id,
    required this.caseNumber,
    this.batchId,
    this.batchCode,
    this.facilityName,
    required this.riskScore,
    this.triggerType,
    this.description,
    this.triggers = const [],
    required this.status,
    required this.detectedAt,
  });

  factory RiskCaseModel.fromJson(Map<String, dynamic> json) {
    List<String> trList = [];
    if (json['triggers'] is List) {
      trList = (json['triggers'] as List).map((t) => t.toString()).toList();
    }

    return RiskCaseModel(
      id: json['id']?.toString() ?? '',
      caseNumber: json['caseNumber']?.toString() ??
          json['case_code']?.toString() ??
          json['id']?.toString() ??
          '',
      batchId: json['batch_id']?.toString() ?? json['batch']?['id']?.toString(),
      batchCode: json['wasteBatch']?['batch_code']?.toString() ??
          json['batch']?['batch_code']?.toString() ??
          json['batchCode']?.toString(),
      facilityName: json['wasteBatch']?['facility']?['name']?.toString() ??
          json['facilityName']?.toString() ??
          json['batch']?['hospital']?['name']?.toString() ??
          'AIIMS Central Hospital',
      riskScore: (json['riskScore'] as num?)?.toInt() ??
          (json['risk_score'] as num?)?.toInt() ??
          0,
      triggerType: json['triggerType']?.toString() ??
          (trList.isNotEmpty ? trList.first : 'SUSPICIOUS_ANOMALY'),
      description: json['description']?.toString(),
      triggers: trList,
      status: json['status']?.toString() ?? 'ASSIGNED',
      detectedAt: json['detectedAt'] != null
          ? (DateTime.tryParse(json['detectedAt'].toString()) ?? DateTime.now())
          : (json['created_at'] != null
              ? (DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now())
              : DateTime.now()),
    );
  }
}
