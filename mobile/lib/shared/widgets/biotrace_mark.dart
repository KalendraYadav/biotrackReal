import 'package:flutter/material.dart';

/// Authentic Geometric BioTrace "B" Mark in Flutter.
/// Matches the 4-quadrant institutional identity symbol:
/// - Quadrant 1 (Top-Left): Crisp white/silver pillar
/// - Quadrant 2 (Top-Right): Mint/emerald leaf (outer top-right rounded)
/// - Quadrant 3 (Bottom-Left): Mint/emerald leaf (outer top-left rounded)
/// - Quadrant 4 (Bottom-Right): Crisp white/silver pillar
class BioTraceMark extends StatelessWidget {
  final double width;
  final double height;

  const BioTraceMark({
    super.key,
    this.width = 64,
    this.height = 102,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: CustomPaint(
        painter: _BioTraceMarkPainter(),
      ),
    );
  }
}

class _BioTraceMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final scaleX = size.width / 94.0;
    final scaleY = size.height / 150.0;

    // Shadow
    final shadowPaint = Paint()
      ..color = const Color(0x66021C42)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 6);

    // Gradients
    final whiteGrad = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFFFFFFFF), Color(0xFFD8E4F2)],
    ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final mintGrad = const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF16C98D), Color(0xFF7EE8C6)],
    ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final whitePaint = Paint()..shader = whiteGrad;
    final mintPaint = Paint()..shader = mintGrad;

    // Quadrant 1: Top-Left (Rect with small radius)
    final r1 = RRect.fromRectAndRadius(
      Rect.fromLTRB(0 * scaleX, 0 * scaleY, 40 * scaleX, 68 * scaleY),
      Radius.circular(3 * scaleX),
    );
    canvas.drawRRect(r1.shift(Offset(0, 3 * scaleY)), shadowPaint);
    canvas.drawRRect(r1, whitePaint);

    // Quadrant 2: Top-Right (Leaf with rounded top-right)
    final p2 = Path()
      ..moveTo(54 * scaleX, 0 * scaleY)
      ..lineTo(54 * scaleX, 68 * scaleY)
      ..lineTo(94 * scaleX, 68 * scaleY)
      ..lineTo(94 * scaleX, 40 * scaleY)
      ..quadraticBezierTo(94 * scaleX, 0 * scaleY, 54 * scaleX, 0 * scaleY)
      ..close();
    canvas.drawPath(p2.shift(Offset(0, 3 * scaleY)), shadowPaint);
    canvas.drawPath(p2, mintPaint);

    // Quadrant 3: Bottom-Left (Leaf with rounded top-left)
    final p3 = Path()
      ..moveTo(40 * scaleX, 82 * scaleY)
      ..lineTo(40 * scaleX, 150 * scaleY)
      ..lineTo(0 * scaleX, 150 * scaleY)
      ..lineTo(0 * scaleX, 122 * scaleY)
      ..quadraticBezierTo(0 * scaleX, 82 * scaleY, 40 * scaleX, 82 * scaleY)
      ..close();
    canvas.drawPath(p3.shift(Offset(0, 3 * scaleY)), shadowPaint);
    canvas.drawPath(p3, mintPaint);

    // Quadrant 4: Bottom-Right (Rect with small radius)
    final r4 = RRect.fromRectAndRadius(
      Rect.fromLTRB(54 * scaleX, 82 * scaleY, 94 * scaleX, 150 * scaleY),
      Radius.circular(3 * scaleX),
    );
    canvas.drawRRect(r4.shift(Offset(0, 3 * scaleY)), shadowPaint);
    canvas.drawRRect(r4, whitePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
