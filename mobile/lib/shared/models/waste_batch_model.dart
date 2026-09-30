import 'custody_event_model.dart';

class WasteBatchModel {
  final String id;
  final String batchCode;
  final String? hospitalId;
  final String? hospitalName;
  final String generatingDepartment;
  final String cpcbWasteCategory;
  final String? cpcbWasteType;
  final double quantityKg;
  final String status;
  final String? qrCodeValue;
  final String? assignedCbwtfId;
  final String? assignedCbwtfName;
  final DateTime? complianceDeadlineAt;
  final DateTime createdAt;
  final List<CustodyEventModel> custodyEvents;

  WasteBatchModel({
    required this.id,
    required this.batchCode,
    this.hospitalId,
    this.hospitalName,
    required this.generatingDepartment,
    required this.cpcbWasteCategory,
    this.cpcbWasteType,
    required this.quantityKg,
    required this.status,
    this.qrCodeValue,
    this.assignedCbwtfId,
    this.assignedCbwtfName,
    this.complianceDeadlineAt,
    required this.createdAt,
    this.custodyEvents = const [],
  });

  factory WasteBatchModel.fromJson(Map<String, dynamic> json) {
    var rawEvents = json['custody_events'] as List<dynamic>? ??
        json['custodyEvents'] as List<dynamic>? ??
        [];
    var events = rawEvents
        .map((e) => CustodyEventModel.fromJson(e as Map<String, dynamic>))
        .toList();

    return WasteBatchModel(
      id: json['id']?.toString() ?? '',
      batchCode: json['batch_code']?.toString() ?? json['batchCode']?.toString() ?? '',
      hospitalId: json['hospital_id']?.toString(),
      hospitalName: json['hospital']?['name']?.toString() ??
          json['hospital_name']?.toString() ??
          json['facility_name']?.toString(),
      generatingDepartment: json['generating_department']?.toString() ?? 'General Ward',
      cpcbWasteCategory: json['cpcb_waste_category']?.toString() ?? 'Yellow (Anatomical)',
      cpcbWasteType: json['cpcb_waste_type']?.toString(),
      quantityKg: (json['quantity_kg'] as num?)?.toDouble() ?? 0.0,
      status: json['status']?.toString() ?? 'GENERATED',
      qrCodeValue: json['qr_code_value']?.toString(),
      assignedCbwtfId: json['assigned_cbwtf_id']?.toString(),
      assignedCbwtfName: json['assigned_cbwtf']?['name']?.toString() ??
          json['cbwtf_name']?.toString(),
      complianceDeadlineAt: json['compliance_deadline_at'] != null
          ? DateTime.tryParse(json['compliance_deadline_at'].toString())
          : null,
      createdAt: json['created_at'] != null
          ? (DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now())
          : DateTime.now(),
      custodyEvents: events,
    );
  }
}
