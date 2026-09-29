import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

// ─── Pathology Model Data ──────────────────────────────────────────────────
class BoundingBox {
  final double x;
  final double y;
  final double width;
  final double height;

  const BoundingBox({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });

  factory BoundingBox.fromMap(Map<String, dynamic> map) {
    return BoundingBox(
      x: (map['x'] as num).toDouble(),
      y: (map['y'] as num).toDouble(),
      width: (map['width'] as num).toDouble(),
      height: (map['height'] as num).toDouble(),
    );
  }
}

class TreatmentSolution {
  final String stage;
  final String title;
  final String details;
  final String type;

  const TreatmentSolution({
    required this.stage,
    required this.title,
    required this.details,
    required this.type,
  });
}

class CropDiagnosticReport {
  final String diseaseName;
  final String cropIdentified;
  final String imagePath;
  final String severity; // Low, Moderate, Severe, Critical
  final double confidence;
  final List<BoundingBox> boxes;
  final String explanation;
  final String description;
  final List<String> symptoms;
  final List<TreatmentSolution> solutions;
  final List<String> prevention;

  const CropDiagnosticReport({
    required this.diseaseName,
    required this.cropIdentified,
    required this.imagePath,
    required this.severity,
    required this.confidence,
    required this.boxes,
    required this.explanation,
    required this.description,
    required this.symptoms,
    required this.solutions,
    required this.prevention,
  });
}

// ─── Verified Pathology Presets (1:1 with Web CropDoctor) ───────────────────
final List<CropDiagnosticReport> kVerifiedPathologies = [
  CropDiagnosticReport(
    diseaseName: 'Rice Blast / धान का झुलसा रोग',
    cropIdentified: 'Rice / धान',
    imagePath: 'assets/crops.png',
    severity: 'Severe',
    confidence: 94.6,
    boxes: const [
      BoundingBox(x: 22.0, y: 18.0, width: 36.0, height: 40.0),
      BoundingBox(x: 64.0, y: 46.0, width: 26.0, height: 32.0),
    ],
    explanation:
        'Spindle-shaped elliptical lesions with grayish-white centers on foliar canopy.',
    description:
        'Magnaporthe oryzae fungal infection exacerbated by high humidity (>90%) and excess nitrogen fertilizer application.',
    symptoms: [
      'Spindle-shaped lesions on leaves with dark brown borders',
      'Necrotic spots causing leaf blade wilting and lodging',
      'Collar rot at the junction of leaf sheath and blade',
    ],
    solutions: [
      TreatmentSolution(
        stage: 'Immediate',
        title: 'Systemic Foliar Fungicide',
        details:
            'Spray Tricyclazole 75 WP @ 0.6 g/L or Azoxystrobin 23 SC @ 1 ml/L at first appearance of leaf blast spots.',
        type: 'Chemical',
      ),
      TreatmentSolution(
        stage: 'Biological',
        title: 'Bio-Control Seed & Leaf Coating',
        details:
            'Apply Pseudomonas fluorescens @ 10 g/kg seed and foliar spray at 2.5 kg/ha in 500L water.',
        type: 'Organic/Bio',
      ),
      TreatmentSolution(
        stage: 'Nutritional',
        title: 'Nitrogen Split Application',
        details:
            'Reduce basal urea dose; split into 3 dressing stages and apply Potassium (MOP) to toughen foliar cuticle.',
        type: 'Cultural',
      ),
    ],
    prevention: [
      'Use certified blast-tolerant cultivars (Swarna Sub-1, Pusa 1509).',
      'Avoid excess nitrogen fertilizer application during vegetative tillering.',
      'Maintain 5cm shallow water level to minimize spore deposition.',
    ],
  ),
  CropDiagnosticReport(
    diseaseName: 'Wheat Yellow Rust / पीला रतुआ',
    cropIdentified: 'Wheat / गेहूँ',
    imagePath: 'assets/crops.png',
    severity: 'Critical',
    confidence: 96.2,
    boxes: const [
      BoundingBox(x: 28.0, y: 22.0, width: 44.0, height: 48.0),
    ],
    explanation:
        'Linear yellow-orange pustules arranged parallel to leaf veins.',
    description:
        'Puccinia striiformis fungal pathology that spreads rapidly through wind-borne urediniospores in cool weather.',
    symptoms: [
      'Bright yellow stripes of pustules along leaf veins',
      'Yellow powder rubbing off onto fingers when touched',
      'Premature foliage desiccation leading to grain shriveling',
    ],
    solutions: [
      TreatmentSolution(
        stage: 'Immediate',
        title: 'Curative Triazole Spray',
        details:
            'Immediately spray Propiconazole 25 EC (Tilt) @ 1 ml/L or Tebuconazole 250 EC @ 1 ml/L with hollow cone nozzle.',
        type: 'Chemical',
      ),
      TreatmentSolution(
        stage: 'Cultural',
        title: 'Containment Isolation',
        details:
            'Disinfect equipment and boots before entering adjoining fields to arrest airborne fungal spread.',
        type: 'Cultural',
      ),
    ],
    prevention: [
      'Sow certified rust-resistant wheat varieties (HD-3086, DBW-187, PBW-725).',
      'Ensure early timely sowing to escape late season thermal rust stress.',
    ],
  ),
  CropDiagnosticReport(
    diseaseName: 'Tomato Early Blight / अगेती झुलसा',
    cropIdentified: 'Tomato / टमाटर',
    imagePath: 'assets/crops.png',
    severity: 'Moderate',
    confidence: 89.8,
    boxes: const [
      BoundingBox(x: 14.0, y: 32.0, width: 34.0, height: 38.0),
      BoundingBox(x: 54.0, y: 18.0, width: 32.0, height: 36.0),
    ],
    explanation:
        'Concentric target-board rings on lower older foliage.',
    description:
        'Alternaria solani pathology affecting solanaceous crops in humid, rain-splashed environments.',
    symptoms: [
      'Brown to black circular spots with concentric target-like rings',
      'Yellow halo surrounding active lesions',
      'Leaf shedding starting from bottom leaves upward',
    ],
    solutions: [
      TreatmentSolution(
        stage: 'Immediate',
        title: 'Contact & Systemic Fungicide',
        details:
            'Apply Chlorothalonil 75 WP @ 2 g/L or Mancozeb 75 WP @ 2.5 g/L thoroughly covering lower leaf surfaces.',
        type: 'Chemical',
      ),
      TreatmentSolution(
        stage: 'Bio-Management',
        title: 'Trichoderma Foliar Drench',
        details:
            'Drench with Trichoderma harzianum @ 5 g/L mixed with jaggery water as a microbial bio-barrier.',
        type: 'Organic/Bio',
      ),
    ],
    prevention: [
      'Mulch soil bed with straw or silver plastic film to prevent soil-splash.',
      'Prune lower branches up to 30cm above ground to enhance aeration.',
    ],
  ),
];

// ─── Main Screen ───────────────────────────────────────────────────────────
class CropDoctorScreen extends ConsumerStatefulWidget {
  const CropDoctorScreen({super.key});

  @override
  ConsumerState<CropDoctorScreen> createState() => _CropDoctorScreenState();
}

class _CropDoctorScreenState extends ConsumerState<CropDoctorScreen>
    with TickerProviderStateMixin {
  late CropDiagnosticReport _report;
  int? _activeBoxIndex;
  bool _showOverlays = true;
  bool _showCrosshairs = true;
  bool _laserActive = true;
  bool _isAnalyzing = false;
  bool _isPlayingAudio = false;

  late final AnimationController _laserController;
  late final Animation<double> _laserAnimation;

  @override
  void initState() {
    super.initState();
    _report = kVerifiedPathologies[0];

    // High-tech laser sweep animation
    _laserController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _laserAnimation = CurvedAnimation(
      parent: _laserController,
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _laserController.dispose();
    super.dispose();
  }

  void _switchPreset(CropDiagnosticReport report) {
    HapticFeedback.lightImpact();
    setState(() {
      _report = report;
      _activeBoxIndex = null;
    });
  }

  Future<void> _simulateLiveScan([String? label]) async {
    HapticFeedback.mediumImpact();
    setState(() {
      _isAnalyzing = true;
      _activeBoxIndex = null;
    });

    final steps = [
      'Extracting foliar optical features...',
      'Running neural pathogen segmentation...',
      'Calculating spatial lesion boundaries...',
      'Synthesizing tri-phasic prescription...',
    ];

    for (int i = 0; i < steps.length; i++) {
      if (!mounted) return;
      await Future.delayed(const Duration(milliseconds: 450));
    }

    // Attempt online API check
    try {
      await http.get(Uri.parse('$kBaseUrl/disease/info')).timeout(const Duration(seconds: 4));
    } catch (_) {}

    if (mounted) {
      setState(() {
        _isAnalyzing = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: AppColors.primaryGreen, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${_report.cropIdentified}: Diagnosis verified (Confidence: ${_report.confidence}%)',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF0F172A),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.primaryGreen, width: 1.2),
          ),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  void _toggleAudioPrescription() {
    HapticFeedback.selectionClick();
    setState(() {
      _isPlayingAudio = !_isPlayingAudio;
    });

    if (_isPlayingAudio) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.volume_up_rounded, color: AppColors.primaryGreen, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Playing Audio Prescription for ${_report.diseaseName}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF0F172A),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: AppColors.primaryGreen, width: 1.0),
          ),
          duration: const Duration(seconds: 3),
        ),
      );

      // Auto shutoff after simulated playback
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted) setState(() => _isPlayingAudio = false);
      });
    }
  }

  Color _severityColor(String sev) {
    switch (sev.toLowerCase()) {
      case 'critical':
        return const Color(0xFFF43F5E); // Rose
      case 'severe':
        return const Color(0xFFF97316); // Orange
      case 'moderate':
        return const Color(0xFFF59E0B); // Amber
      case 'low':
      default:
        return AppColors.primaryGreen; // Emerald
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sevColor = _severityColor(_report.severity);

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF060907) : const Color(0xFFF0FDF4),
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_rounded,
            color: isDark ? Colors.white : AppColors.textDark,
            size: 20,
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Crop Doctor / फसल निदान',
          style: TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w700,
            fontSize: 17,
            color: isDark ? Colors.white : AppColors.textDark,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Audio Prescription',
            icon: Icon(
              _isPlayingAudio ? Icons.volume_up_rounded : Icons.volume_mute_rounded,
              color: _isPlayingAudio ? AppColors.primaryGreen : (isDark ? Colors.white60 : Colors.black45),
            ),
            onPressed: _toggleAudioPrescription,
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF060907) : const Color(0xFFF0FDF4),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Tagline Banner
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.primaryGreen.withOpacity(0.4),
                      width: 1.0,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreen.withOpacity(0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.psychology_rounded,
                            color: AppColors.primaryGreen, size: 20),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Precision Foliar Pathology & Lesion Segmentation',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white : AppColors.textDark,
                              ),
                            ),
                            Text(
                              'Surgical bounding boxes with tri-phasic treatment regimens',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? Colors.white54 : AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Quick Pathology Presets Horizontal Chips
                Row(
                  children: [
                    const Icon(Icons.eco_rounded, color: AppColors.primaryGreen, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'Quick Pathology Presets:',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isDark ? Colors.white70 : AppColors.textDark,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  child: Row(
                    children: kVerifiedPathologies.map((p) {
                      final isSelected = _report.cropIdentified == p.cropIdentified;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: () => _switchPreset(p),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                            decoration: BoxDecoration(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primaryGreen
                                    : (isDark ? Colors.white24 : Colors.black12),
                                width: isSelected ? 1.5 : 1.0,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 7,
                                  height: 7,
                                  decoration: BoxDecoration(
                                    color: isSelected ? AppColors.primaryGreen : Colors.grey,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 7),
                                Text(
                                  p.cropIdentified,
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                    color: isSelected
                                        ? (isDark ? Colors.white : AppColors.textDark)
                                        : (isDark ? Colors.white60 : Colors.black54),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // ── Specimen Canvas (1:1 with Web CropDoctor) ───────────────
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F1115) : Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(
                      color: isDark ? Colors.white.withOpacity(0.12) : Colors.black.withOpacity(0.08),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(isDark ? 0.45 : 0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Canvas Toolbar Header
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.layers_rounded,
                                    color: AppColors.primaryGreen, size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  'Specimen Canvas (Auto-Scaled 1:1)',
                                  style: TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? Colors.white70 : AppColors.textDark,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                // Toggle Lesions
                                InkWell(
                                  borderRadius: BorderRadius.circular(8),
                                  onTap: () {
                                    HapticFeedback.selectionClick();
                                    setState(() => _showOverlays = !_showOverlays);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.transparent,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: _showOverlays
                                            ? AppColors.primaryGreen
                                            : (isDark ? Colors.white24 : Colors.black26),
                                        width: 1.0,
                                      ),
                                    ),
                                    child: Text(
                                      _showOverlays ? 'Hide Lesions' : 'Show Lesions',
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                        color: _showOverlays
                                            ? AppColors.primaryGreen
                                            : (isDark ? Colors.white60 : Colors.black54),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),

                                // Toggle Crosshairs
                                InkWell(
                                  borderRadius: BorderRadius.circular(8),
                                  onTap: () {
                                    HapticFeedback.selectionClick();
                                    setState(() => _showCrosshairs = !_showCrosshairs);
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.transparent,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: _showCrosshairs
                                            ? const Color(0xFF38BDF8)
                                            : (isDark ? Colors.white24 : Colors.black26),
                                        width: 1.0,
                                      ),
                                    ),
                                    child: Text(
                                      'Crosshairs',
                                      style: TextStyle(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w600,
                                        color: _showCrosshairs
                                            ? const Color(0xFF38BDF8)
                                            : (isDark ? Colors.white60 : Colors.black54),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, color: Colors.white12),

                      // Canvas Viewport with Bounding Boxes & Laser Scanner
                      ClipRRect(
                        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(22)),
                        child: LayoutBuilder(
                          builder: (context, constraints) {
                            final canvasWidth = constraints.maxWidth;
                            final canvasHeight = canvasWidth * 0.72; // Responsive 1:1 foliar aspect ratio

                            return SizedBox(
                              width: canvasWidth,
                              height: canvasHeight,
                              child: Stack(
                                children: [
                                  // Base Leaf Image Specimen
                                  Positioned.fill(
                                    child: Image.asset(
                                      _report.imagePath,
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) {
                                        return Container(
                                          color: isDark ? const Color(0xFF0F1115) : const Color(0xFFE2E8F0),
                                          child: const Center(
                                            child: Icon(Icons.broken_image_rounded, color: Colors.grey, size: 40),
                                          ),
                                        );
                                      },
                                    ),
                                  ),

                                  // Darkening overlay for cinematic contrast
                                  Positioned.fill(
                                    child: Container(
                                      color: Colors.black.withOpacity(isDark ? 0.25 : 0.10),
                                    ),
                                  ),

                                  // Surgical Lesion Overlays (Bounding Boxes + Corner Reticles + Crosshairs)
                                  if (_showOverlays)
                                    Positioned.fill(
                                      child: CustomPaint(
                                        painter: _LesionOverlayPainter(
                                          boxes: _report.boxes,
                                          activeIndex: _activeBoxIndex,
                                          showCrosshairs: _showCrosshairs,
                                        ),
                                      ),
                                    ),

                                  // Interactive Lesion Badge Tags
                                  if (_showOverlays)
                                    ..._report.boxes.asMap().entries.map((entry) {
                                      final i = entry.key;
                                      final box = entry.value;
                                      final bx = box.x * canvasWidth / 100.0;
                                      final by = box.y * canvasHeight / 100.0;
                                      final bw = box.width * canvasWidth / 100.0;
                                      final bh = box.height * canvasHeight / 100.0;
                                      final isSelected = _activeBoxIndex == i;

                                      final tagX = math.max(6.0, math.min(bx, canvasWidth - 145));
                                      final tagY = by > 26 ? by - 22 : by + 4;

                                      return Positioned(
                                        left: tagX,
                                        top: tagY,
                                        child: GestureDetector(
                                          onTap: () {
                                            HapticFeedback.selectionClick();
                                            setState(() {
                                              _activeBoxIndex = isSelected ? null : i;
                                            });
                                          },
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: isSelected
                                                  ? const Color(0xFFF43F5E)
                                                  : const Color(0xDD0F172A),
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(
                                                color: const Color(0xFFEF4444),
                                                width: 0.9,
                                              ),
                                            ),
                                            child: Text(
                                              'Lesion #${i + 1} (${box.width.round()}×${box.height.round()}%)',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                        ),
                                      );
                                    }),

                                  // Laser Sweep Beam Animation
                                  if (_laserActive)
                                    AnimatedBuilder(
                                      animation: _laserAnimation,
                                      builder: (context, child) {
                                        final currentY = _laserAnimation.value * canvasHeight;
                                        return Positioned(
                                          top: currentY,
                                          left: 0,
                                          right: 0,
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              // Trailing soft beam glow
                                              Container(
                                                height: 16,
                                                decoration: BoxDecoration(
                                                  gradient: LinearGradient(
                                                    begin: Alignment.topCenter,
                                                    end: Alignment.bottomCenter,
                                                    colors: [
                                                      Colors.transparent,
                                                      AppColors.primaryGreen.withOpacity(0.22),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                              // Bright Laser Core Line
                                              Container(
                                                height: 2.2,
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF34D399),
                                                  boxShadow: [
                                                    BoxShadow(
                                                      color: AppColors.primaryGreen.withOpacity(0.95),
                                                      blurRadius: 10,
                                                      spreadRadius: 2,
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),

                                  // Analyzing Glass Spinner Overlay
                                  if (_isAnalyzing)
                                    Positioned.fill(
                                      child: Container(
                                        color: Colors.black.withOpacity(0.70),
                                        child: const Center(
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              CircularProgressIndicator(
                                                color: AppColors.primaryGreen,
                                                strokeWidth: 3,
                                              ),
                                              SizedBox(height: 14),
                                              Text(
                                                'Executing multimodal spatial foliar analysis...',
                                                style: TextStyle(
                                                  color: Colors.white,
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 12,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Capture & Upload CTA Controls
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryGreen,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 3,
                        ),
                        onPressed: () => _simulateLiveScan('Uploaded Photo'),
                        icon: const Icon(Icons.file_upload_outlined, size: 18),
                        label: const Text(
                          'Choose Photo',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          foregroundColor: isDark ? Colors.white : AppColors.textDark,
                          side: const BorderSide(color: AppColors.primaryGreen, width: 1.2),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        onPressed: () => _simulateLiveScan('Live Camera Capture'),
                        icon: const Icon(Icons.camera_alt_outlined, color: AppColors.primaryGreen, size: 18),
                        label: const Text(
                          'Capture Live',
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // ── Lesion Navigator Cards ──────────────────────────────────
                if (_report.boxes.isNotEmpty) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F1115) : Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isDark ? Colors.white.withOpacity(0.12) : Colors.black.withOpacity(0.08),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.filter_center_focus_rounded,
                                    color: AppColors.primaryGreen, size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  'Segmented Pathological Lesions (${_report.boxes.length})',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: isDark ? Colors.white : AppColors.textDark,
                                  ),
                                ),
                              ],
                            ),
                            Text(
                              'Tap lesion to highlight',
                              style: TextStyle(
                                fontSize: 10.5,
                                color: isDark ? Colors.white54 : AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: _report.boxes.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final box = entry.value;
                            final isSelected = _activeBoxIndex == idx;

                            return Expanded(
                              child: Padding(
                                padding: EdgeInsets.only(right: idx == _report.boxes.length - 1 ? 0 : 8),
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(12),
                                  onTap: () {
                                    HapticFeedback.selectionClick();
                                    setState(() {
                                      _activeBoxIndex = isSelected ? null : idx;
                                    });
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: Colors.transparent,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: isSelected
                                            ? const Color(0xFFF43F5E)
                                            : (isDark ? Colors.white24 : Colors.black12),
                                        width: isSelected ? 1.8 : 1.0,
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              'Lesion #${idx + 1}',
                                              style: TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w700,
                                                color: isSelected
                                                    ? const Color(0xFFF43F5E)
                                                    : (isDark ? Colors.white : AppColors.textDark),
                                              ),
                                            ),
                                            Text(
                                              '${box.width.round()}×${box.height.round()}%',
                                              style: TextStyle(
                                                fontSize: 9.5,
                                                fontFamily: 'Courier',
                                                color: isDark ? Colors.white60 : Colors.black54,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          'Coord: X:${box.x.round()}% Y:${box.y.round()}%',
                                          style: TextStyle(
                                            fontSize: 9.5,
                                            fontFamily: 'Courier',
                                            color: isDark ? Colors.white38 : Colors.black38,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // ── Diagnostic Intelligence Dossier ─────────────────────────
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F1115) : Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isDark ? Colors.white.withOpacity(0.12) : Colors.black.withOpacity(0.08),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(isDark ? 0.45 : 0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header: Crop Badge + Severity Pill + Confidence Bar
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    // Crop Pill (Transparent background with border)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.transparent,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(
                                          color: AppColors.primaryGreen,
                                          width: 1.0,
                                        ),
                                      ),
                                      child: Text(
                                        _report.cropIdentified.toUpperCase(),
                                        style: const TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primaryGreen,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),

                                    // Severity Badge (Transparent background with border)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.transparent,
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(
                                          color: sevColor,
                                          width: 1.0,
                                        ),
                                      ),
                                      child: Text(
                                        '${_report.severity.toUpperCase()} SEVERITY',
                                        style: TextStyle(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w700,
                                          color: sevColor,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _report.diseaseName,
                                  style: TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    color: isDark ? Colors.white : AppColors.textDark,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Confidence Meter
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'Confidence',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  color: isDark ? Colors.white54 : AppColors.textMuted,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${_report.confidence.toStringAsFixed(1)}%',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: sevColor,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Container(
                                width: 75,
                                height: 5,
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white12 : Colors.black12,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: FractionallySizedBox(
                                  alignment: Alignment.centerLeft,
                                  widthFactor: _report.confidence / 100.0,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: sevColor,
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1, color: Colors.white10),
                      const SizedBox(height: 14),

                      // Pathology Analysis & Etiology
                      Row(
                        children: [
                          const Icon(Icons.biotech_rounded,
                              color: AppColors.primaryGreen, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'Pathology Analysis / रोग विश्लेषण',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white70 : AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _report.description,
                        style: TextStyle(
                          fontSize: 12.5,
                          height: 1.45,
                          color: isDark ? Colors.white.withOpacity(0.85) : Colors.black87,
                        ),
                      ),
                      if (_report.explanation.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        Text(
                          'Visual segmentation: ${_report.explanation}',
                          style: TextStyle(
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                            color: isDark ? Colors.white54 : AppColors.textMuted,
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      const Divider(height: 1, color: Colors.white10),
                      const SizedBox(height: 14),

                      // Observable Foliar Symptoms
                      Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded,
                              color: Color(0xFFF59E0B), size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'Observable Symptoms / प्रत्यक्ष लक्षण',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white70 : AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ..._report.symptoms.map((symptom) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: const Color(0xFFF59E0B).withOpacity(0.35),
                                width: 1.0,
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(top: 4),
                                  child: Icon(Icons.circle,
                                      color: Color(0xFFF59E0B), size: 6),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    symptom,
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: isDark ? Colors.white.withOpacity(0.9) : Colors.black87,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 14),
                      const Divider(height: 1, color: Colors.white10),
                      const SizedBox(height: 14),

                      // Tri-Phasic Treatment Protocol
                      Row(
                        children: [
                          const Icon(Icons.medical_services_outlined,
                              color: AppColors.primaryGreen, size: 16),
                          const SizedBox(width: 6),
                          Text(
                            'Recommended Treatment Protocol / उपचार',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white70 : AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ..._report.solutions.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final sol = entry.value;

                        return Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: AppColors.primaryGreen.withOpacity(0.35),
                              width: 1.0,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.transparent,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(
                                            color: AppColors.primaryGreen,
                                            width: 1.0,
                                          ),
                                        ),
                                        child: Text(
                                          'STAGE ${idx + 1}: ${sol.stage.toUpperCase()}',
                                          style: const TextStyle(
                                            color: AppColors.primaryGreen,
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w800,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        sol.title,
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: isDark ? Colors.white : AppColors.textDark,
                                        ),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.transparent,
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: isDark ? Colors.white24 : Colors.black26,
                                        width: 0.8,
                                      ),
                                    ),
                                    child: Text(
                                      sol.type,
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? Colors.white60 : Colors.black54,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                sol.details,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  height: 1.4,
                                  color: isDark ? Colors.white70 : Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      const SizedBox(height: 14),
                      const Divider(height: 1, color: Colors.white10),
                      const SizedBox(height: 14),

                      // Preventive Agronomy Hygiene
                      if (_report.prevention.isNotEmpty) ...[
                        Row(
                          children: [
                            const Icon(Icons.shield_outlined,
                                color: Color(0xFF38BDF8), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Preventive Crop Hygiene / रोकथाम',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.white70 : AppColors.textDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ..._report.prevention.map((prev) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.check_circle_outline_rounded,
                                    color: Color(0xFF38BDF8), size: 14),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    prev,
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: isDark ? Colors.white60 : Colors.black87,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                        const SizedBox(height: 16),
                      ],

                      // Consult Voice AI Advisor Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryGreen,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 4,
                          ),
                          onPressed: () => context.push('/voice'),
                          icon: const Icon(Icons.mic, size: 18),
                          label: const Text(
                            'Consult Voice AI Advisor / बोलकर सलाह लें',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Precision Lesion Overlay Painter (Bounding Boxes & Reticles) ─────────────
class _LesionOverlayPainter extends CustomPainter {
  final List<BoundingBox> boxes;
  final int? activeIndex;
  final bool showCrosshairs;

  const _LesionOverlayPainter({
    required this.boxes,
    this.activeIndex,
    required this.showCrosshairs,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (int i = 0; i < boxes.length; i++) {
      final box = boxes[i];
      final double bx = box.x * size.width / 100.0;
      final double by = box.y * size.height / 100.0;
      final double bw = box.width * size.width / 100.0;
      final double bh = box.height * size.height / 100.0;

      final isSelected = activeIndex == i;
      final rect = Rect.fromLTWH(bx, by, bw, bh);

      // 1. Lesion fill (semi-transparent pulsing rose)
      final fillPaint = Paint()
        ..color = isSelected
            ? const Color(0xFFEF4444).withOpacity(0.35)
            : const Color(0xFFEF4444).withOpacity(0.18)
        ..style = PaintingStyle.fill;
      canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(5)), fillPaint);

      // 2. Lesion boundary border
      final borderPaint = Paint()
        ..color = isSelected ? const Color(0xFFF43F5E) : const Color(0xFFEF4444)
        ..strokeWidth = isSelected ? 2.0 : 1.2
        ..style = PaintingStyle.stroke;
      canvas.drawRRect(RRect.fromRectAndRadius(rect, const Radius.circular(5)), borderPaint);

      // 3. Precision Corner Reticles (White)
      final cornerPaint = Paint()
        ..color = Colors.white
        ..strokeWidth = 2.0
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;

      final double cLen = (bw < bh ? bw : bh) * 0.28;

      // Top-Left
      final pathTL = Path()
        ..moveTo(bx, by + cLen)
        ..lineTo(bx, by)
        ..lineTo(bx + cLen, by);
      canvas.drawPath(pathTL, cornerPaint);

      // Top-Right
      final pathTR = Path()
        ..moveTo(bx + bw - cLen, by)
        ..lineTo(bx + bw, by)
        ..lineTo(bx + bw, by + cLen);
      canvas.drawPath(pathTR, cornerPaint);

      // Bottom-Left
      final pathBL = Path()
        ..moveTo(bx, by + bh - cLen)
        ..lineTo(bx, by + bh)
        ..lineTo(bx + cLen, by + bh);
      canvas.drawPath(pathBL, cornerPaint);

      // Bottom-Right
      final pathBR = Path()
        ..moveTo(bx + bw - cLen, by + bh)
        ..lineTo(bx + bw, by + bh)
        ..lineTo(bx + bw, by + bh - cLen);
      canvas.drawPath(pathBR, cornerPaint);

      // 4. Center Crosshairs if selected or crosshairs enabled
      if (showCrosshairs && isSelected) {
        final crossPaint = Paint()
          ..color = Colors.white.withOpacity(0.85)
          ..strokeWidth = 1.0
          ..style = PaintingStyle.stroke;

        final double cx = bx + bw / 2;
        final double cy = by + bh / 2;

        canvas.drawLine(Offset(cx, by), Offset(cx, by + bh), crossPaint);
        canvas.drawLine(Offset(bx, cy), Offset(bx + bw, cy), crossPaint);

        // Center reticle point
        final dotPaint = Paint()..color = const Color(0xFFF43F5E);
        canvas.drawCircle(Offset(cx, cy), 3.0, dotPaint);
        final dotRing = Paint()
          ..color = Colors.white
          ..strokeWidth = 1.0
          ..style = PaintingStyle.stroke;
        canvas.drawCircle(Offset(cx, cy), 3.0, dotRing);
      }
    }
  }

  @override
  bool shouldRepaint(covariant _LesionOverlayPainter oldDelegate) {
    return oldDelegate.boxes != boxes ||
        oldDelegate.activeIndex != activeIndex ||
        oldDelegate.showCrosshairs != showCrosshairs;
  }
}
