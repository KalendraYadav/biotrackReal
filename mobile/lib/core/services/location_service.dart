import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class LocationResult {
  final double latitude;
  final double longitude;
  final bool isSimulated;
  final String? errorMessage;

  LocationResult({
    required this.latitude,
    required this.longitude,
    this.isSimulated = false,
    this.errorMessage,
  });
}

class LocationService {
  // Default CPCB AIIMS Central Hospital coordinates for testing/emulator fallback
  static const double defaultLat = 28.5672;
  static const double defaultLng = 77.2100;

  static Future<LocationResult> getCurrentCoordinates() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return LocationResult(
          latitude: defaultLat,
          longitude: defaultLng,
          isSimulated: true,
          errorMessage: 'Location services disabled. Using facility anchor coordinates.',
        );
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          return LocationResult(
            latitude: defaultLat,
            longitude: defaultLng,
            isSimulated: true,
            errorMessage: 'Location permission denied. Using facility anchor.',
          );
        }
      }

      if (permission == LocationPermission.deniedForever) {
        return LocationResult(
          latitude: defaultLat,
          longitude: defaultLng,
          isSimulated: true,
          errorMessage: 'Location permission permanently denied.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );

      return LocationResult(
        latitude: position.latitude,
        longitude: position.longitude,
        isSimulated: false,
      );
    } catch (e) {
      debugPrint('[LocationService] Error fetching coordinates: $e');
      return LocationResult(
        latitude: defaultLat,
        longitude: defaultLng,
        isSimulated: true,
        errorMessage: 'GPS read error: ${e.toString()}',
      );
    }
  }
}
