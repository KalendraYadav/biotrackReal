import 'package:flutter_test/flutter_test.dart';
import 'package:biotrace/core/constants/app_constants.dart';
import 'package:biotrace/shared/models/user_model.dart';
import 'package:biotrace/shared/models/waste_batch_model.dart';
import 'package:biotrace/shared/models/risk_case_model.dart';
import 'package:biotrace/main.dart';

void main() {
  test('AppConstants contains all 6 statutory demo roles', () {
    expect(AppConstants.demoAccounts.length, equals(6));
    final roles = AppConstants.demoAccounts.map((a) => a.role).toSet();
    expect(roles.contains(AppRoles.hospitalAuthority), isTrue);
    expect(roles.contains(AppRoles.collectionOfficer), isTrue);
    expect(roles.contains(AppRoles.transportOfficer), isTrue);
    expect(roles.contains(AppRoles.treatmentFacility), isTrue);
    expect(roles.contains(AppRoles.governmentAuthority), isTrue);
    expect(roles.contains(AppRoles.complianceInspector), isTrue);
  });

  test('UserModel serializes and deserializes correctly', () {
    final json = {
      'id': 'usr-001',
      'name': 'Dr. Aarav Mehta',
      'email': 'hospital@demo.com',
      'role': 'HOSPITAL_AUTHORITY',
      'facility_name': 'AIIMS Central Hospital',
      'verification_status': 'VERIFIED',
    };
    final user = UserModel.fromJson(json);
    expect(user.id, equals('usr-001'));
    expect(user.name, equals('Dr. Aarav Mehta'));
    expect(user.role, equals('HOSPITAL_AUTHORITY'));
    expect(user.facilityName, equals('AIIMS Central Hospital'));

    final outJson = user.toJson();
    expect(outJson['email'], equals('hospital@demo.com'));
  });

  test('WasteBatchModel parses JSON correctly', () {
    final json = {
      'id': 'batch-001',
      'batch_code': 'BMW-2026-00124',
      'hospital_name': 'AIIMS Central Hospital',
      'generating_department': 'Trauma ICU',
      'cpcb_waste_category': 'Yellow (Anatomical)',
      'quantity_kg': 14.5,
      'status': 'GENERATED',
      'created_at': '2026-09-30T10:00:00Z',
      'custody_events': [
        {
          'id': 'evt-001',
          'stage': 'GENERATION',
          'quantity_at_stage_kg': 14.5,
          'verified_by_scan': true,
        }
      ],
    };
    final batch = WasteBatchModel.fromJson(json);
    expect(batch.batchCode, equals('BMW-2026-00124'));
    expect(batch.quantityKg, equals(14.5));
    expect(batch.status, equals('GENERATED'));
    expect(batch.custodyEvents.length, equals(1));
    expect(batch.custodyEvents.first.stage, equals('GENERATION'));
  });

  test('RiskCaseModel parses triggers and scores correctly', () {
    final json = {
      'id': 'case-001',
      'case_code': 'INS-2026-0042',
      'risk_score': 92,
      'triggers': ['quantity_discrepancy_28kg', 'route_deviation'],
      'status': 'UNDER_INVESTIGATION',
      'created_at': '2026-09-30T11:00:00Z',
    };
    final riskCase = RiskCaseModel.fromJson(json);
    expect(riskCase.caseNumber, equals('INS-2026-0042'));
    expect(riskCase.riskScore, equals(92));
    expect(riskCase.triggers.length, equals(2));
    expect(riskCase.status, equals('UNDER_INVESTIGATION'));
  });

  testWidgets('BIOTraceApp builds and renders login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const BIOTraceApp());
    expect(find.text('BIOTrace'), findsWidgets);
    expect(find.text('NIDUSCLEAN'), findsOneWidget);
  });
}
