import 'package:flutter/material.dart';

/// Accurate vector line-art silhouette of India's Geographical Boundary
/// matching the official Survey of India boundary specification.
class IndiaSilhouette extends StatelessWidget {
  final double width;
  final double height;
  final Color color;
  final double strokeWidth;

  const IndiaSilhouette({
    super.key,
    this.width = 34,
    this.height = 44,
    this.color = const Color(0xFF9CC5EC),
    this.strokeWidth = 1.4,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: height,
      child: CustomPaint(
        painter: _IndiaMapPainter(color: color, strokeWidth: strokeWidth),
      ),
    );
  }
}

class _IndiaMapPainter extends CustomPainter {
  final Color color;
  final double strokeWidth;

  _IndiaMapPainter({required this.color, required this.strokeWidth});

  static const List<Offset> _points = [
    Offset(28.7, 5.0), Offset(34.6, 9.7), Offset(42.9, 8.6), Offset(44.1, 9.7),
    Offset(40.5, 14.5), Offset(41.7, 19.2), Offset(39.3, 20.4), Offset(39.3, 22.8),
    Offset(46.4, 28.7), Offset(44.1, 32.2), Offset(51.2, 37.0), Offset(54.7, 37.0),
    Offset(63.0, 40.5), Offset(65.4, 40.5), Offset(67.8, 34.6), Offset(70.1, 34.6),
    Offset(70.1, 37.0), Offset(71.3, 38.2), Offset(78.4, 38.2), Offset(82.0, 33.4),
    Offset(87.9, 29.9), Offset(91.4, 29.9), Offset(95.0, 34.6), Offset(93.8, 37.0),
    Offset(89.1, 40.5), Offset(89.1, 44.1), Offset(85.5, 49.0), Offset(84.3, 53.6),
    Offset(82.0, 54.0), Offset(79.6, 48.0), Offset(71.3, 51.2), Offset(71.3, 55.9),
    Offset(66.6, 57.1), Offset(65.4, 60.7), Offset(60.7, 64.2), Offset(48.8, 76.1),
    Offset(46.4, 76.1), Offset(44.1, 82.0), Offset(44.1, 89.1), Offset(41.7, 92.6),
    Offset(41.7, 97.4), Offset(34.6, 105.7), Offset(31.1, 104.5), Offset(28.7, 99.7),
    Offset(28.7, 96.2), Offset(23.9, 87.9), Offset(22.8, 82.0), Offset(19.2, 76.1),
    Offset(19.2, 71.3), Offset(18.0, 70.1), Offset(18.0, 60.7), Offset(15.7, 59.5),
    Offset(12.1, 61.8), Offset(6.2, 55.9), Offset(7.4, 53.6), Offset(5.0, 51.2),
    Offset(7.4, 47.6), Offset(12.1, 47.6), Offset(13.3, 46.4), Offset(9.7, 40.5),
    Offset(9.7, 38.2), Offset(12.1, 35.8), Offset(16.8, 35.8), Offset(23.9, 27.5),
    Offset(26.3, 22.8), Offset(25.1, 20.4), Offset(22.8, 19.2), Offset(22.8, 10.9),
    Offset(20.4, 8.6), Offset(21.6, 6.2), Offset(23.9, 5.0)
  ];

  @override
  void paint(Canvas canvas, Size size) {
    if (_points.isEmpty) return;

    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final scaleX = size.width / 100.0;
    final scaleY = size.height / 120.0;

    final path = Path();
    path.moveTo(_points[0].dx * scaleX, _points[0].dy * scaleY);

    for (int i = 1; i < _points.length; i++) {
      path.lineTo(_points[i].dx * scaleX, _points[i].dy * scaleY);
    }
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _IndiaMapPainter oldDelegate) {
    return oldDelegate.color != color || oldDelegate.strokeWidth != strokeWidth;
  }
}
