import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

class EvidenceResult {
  final File file;
  final String base64DataUri;
  final int fileSizeBytes;
  final String fileName;

  EvidenceResult({
    required this.file,
    required this.base64DataUri,
    required this.fileSizeBytes,
    required this.fileName,
  });
}

class EvidenceService {
  static final ImagePicker _picker = ImagePicker();

  static Future<EvidenceResult?> capturePhotoFromCamera() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 80,
      );
      if (photo == null) return null;

      final file = File(photo.path);
      final bytes = await file.readAsBytes();
      final base64Str = base64Encode(bytes);
      final dataUri = 'data:image/jpeg;base64,$base64Str';

      return EvidenceResult(
        file: file,
        base64DataUri: dataUri,
        fileSizeBytes: bytes.length,
        fileName: photo.name,
      );
    } catch (e) {
      debugPrint('[EvidenceService] Error capturing photo: $e');
      return null;
    }
  }

  static Future<EvidenceResult?> pickPhotoFromGallery() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        maxHeight: 1600,
        imageQuality: 80,
      );
      if (photo == null) return null;

      final file = File(photo.path);
      final bytes = await file.readAsBytes();
      final base64Str = base64Encode(bytes);
      final dataUri = 'data:image/jpeg;base64,$base64Str';

      return EvidenceResult(
        file: file,
        base64DataUri: dataUri,
        fileSizeBytes: bytes.length,
        fileName: photo.name,
      );
    } catch (e) {
      debugPrint('[EvidenceService] Error picking image: $e');
      return null;
    }
  }
}
