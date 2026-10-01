class AppRoles {
  static const String hospitalAuthority = 'HOSPITAL_AUTHORITY';
  static const String collectionOfficer = 'COLLECTION_OFFICER';
  static const String transportOfficer = 'TRANSPORT_OFFICER';
  static const String treatmentFacility = 'TREATMENT_FACILITY';
  static const String governmentAuthority = 'GOVERNMENT_AUTHORITY';
  static const String complianceInspector = 'COMPLIANCE_INSPECTOR';

  static String format(String role) {
    switch (role) {
      case hospitalAuthority:
        return 'Hospital Authority';
      case collectionOfficer:
        return 'Collection Officer';
      case transportOfficer:
        return 'Transport Officer';
      case treatmentFacility:
        return 'Treatment Facility (CBWTF)';
      case governmentAuthority:
        return 'Government Authority (CPCB)';
      case complianceInspector:
        return 'Compliance Inspector';
      default:
        return role;
    }
  }
}

class DemoAccount {
  final String role;
  final String title;
  final String name;
  final String email;
  final String password;
  final String facility;
  final String desc;

  const DemoAccount({
    required this.role,
    required this.title,
    required this.name,
    required this.email,
    required this.password,
    required this.facility,
    required this.desc,
  });
}

class AppConstants {
  static const String appName = 'BIOTrace';
  static const String appSubtitle = 'Digital Chain of Custody';
  static const String statutoryAct = 'Bio-Medical Waste Management Rules 2016';

  static const List<DemoAccount> demoAccounts = [
    DemoAccount(
      role: AppRoles.hospitalAuthority,
      title: 'Hospital Authority',
      name: 'Dr. Aarav Mehta',
      email: 'hospital@demo.com',
      password: 'password123',
      facility: 'AIIMS Central Hospital',
      desc: 'Point-of-generation manifest logging & QR tag creation',
    ),
    DemoAccount(
      role: AppRoles.collectionOfficer,
      title: 'Collection Officer',
      name: 'Meera Iyer',
      email: 'collection@demo.com',
      password: 'password123',
      facility: 'EcoSafe Waste Handlers',
      desc: 'QR verification scan & bag custody handover',
    ),
    DemoAccount(
      role: AppRoles.transportOfficer,
      title: 'Transport Officer',
      name: 'Vikram Singh',
      email: 'transport@demo.com',
      password: 'password123',
      facility: 'BioTransit Fleet DL-01',
      desc: 'GPS corridor navigation & transit telemetry pings',
    ),
    DemoAccount(
      role: AppRoles.treatmentFacility,
      title: 'Treatment Facility (CBWTF)',
      name: 'Rajesh Patel',
      email: 'treatment@demo.com',
      password: 'password123',
      facility: 'Apex Bio-Clean (CBWTF)',
      desc: 'Weighbridge intake, autoclave staging & disposal certs',
    ),
    DemoAccount(
      role: AppRoles.governmentAuthority,
      title: 'Government Authority',
      name: 'Sunita Sharma',
      email: 'regulator@demo.com',
      password: 'password123',
      facility: 'CPCB Regulatory Board',
      desc: 'Statewide BMW chain oversight & SLA breach monitoring',
    ),
    DemoAccount(
      role: AppRoles.complianceInspector,
      title: 'Compliance Inspector',
      name: 'Amit Deshmukh',
      email: 'inspector@demo.com',
      password: 'password123',
      facility: 'CPCB National Audit Unit',
      desc: 'AI anomaly detection, field audits & statutory sanctions',
    ),
  ];

  static const List<String> wasteCategories = [
    'Yellow (Anatomical)',
    'Red (Contaminated Recyclable)',
    'White (Sharps/Needles)',
    'Blue (Glassware/Metallic)',
  ];

  static const List<String> departments = [
    'Emergency & Trauma ICU',
    'Main Surgery OT-1',
    'Main Surgery OT-2',
    'General Surgery Ward',
    'Oncology & Chemo Bay',
    'Microbiology Lab',
    'Pediatrics Ward',
    'Pathology Lab',
  ];
}
