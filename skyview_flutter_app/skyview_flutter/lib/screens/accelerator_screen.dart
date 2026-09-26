import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import '../services/auth_service.dart';
import '../utils/constants.dart';
import '../widgets/ai_overview_widget.dart';

class AcceleratorScreen extends ConsumerStatefulWidget {
  const AcceleratorScreen({super.key});

  @override
  ConsumerState<AcceleratorScreen> createState() => _AcceleratorScreenState();
}

class _AcceleratorScreenState extends ConsumerState<AcceleratorScreen> {
  bool _loadingRain = false;
  bool _loadingFusion = false;
  bool _loadingCombined = false;
  bool _loadingStatus = true;

  Map<String, dynamic>? _rainResult;
  Map<String, dynamic>? _fusionResult;
  Map<String, dynamic>? _combinedResult;

  String _hardwareStatus = 'Checking...';
  bool _sensorOnline = false;

  Map<String, dynamic> _sensor = {
    'temperature': 25.0,
    'humidity': 60.0,
    'pressure': 1013.0,
    'wind_speed': 5.0,
    'rainfall': 0.0,
    'soil_moisture': 50.0,
    'soil_temperature': 26.0,
    'light_level': 70.0,
  };

  @override
  void initState() {
    super.initState();
    _fetchInitialData();
  }

  Future<void> _fetchInitialData() async {
    setState(() => _loadingStatus = true);
    await Future.wait([_fetchLatestSensorData(), _fetchHardwareStatus()]);
    if (mounted) setState(() => _loadingStatus = false);
  }

  Future<void> _fetchHardwareStatus() async {
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/api/fpga/status')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        setState(() {
          _hardwareStatus = d['hardware_mode'] ?? 'unknown';
          _sensorOnline = _hardwareStatus != 'disconnected';
        });
      }
    } catch (_) {
      setState(() {
        _hardwareStatus = 'disconnected';
        _sensorOnline = false;
      });
    }
  }

  Future<void> _fetchLatestSensorData() async {
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/api/sensors/latest/WS01')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        setState(() {
          _sensor = {
            'temperature': d['temperature'] ?? 25.0,
            'humidity': d['humidity'] ?? 60.0,
            'pressure': d['pressure'] ?? 1013.0,
            'wind_speed': d['wind_speed'] ?? d['windSpeed'] ?? 5.0,
            'rainfall': d['rainfall'] ?? 0.0,
            'soil_moisture': d['soil_moisture'] ?? d['soilMoisture'] ?? 50.0,
            'soil_temperature': d['soil_temperature'] ?? d['soilTemperature'] ?? 26.0,
            'light_level': d['light_level'] ?? d['lightIntensity'] ?? 70.0,
          };
        });
      }
    } catch (_) {}
  }

  Future<void> _predictRain() async {
    setState(() => _loadingRain = true);
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/fpga/rain-predict'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'temperature': _sensor['temperature'],
          'humidity': _sensor['humidity'],
          'pressure': _sensor['pressure'],
          'wind_speed': _sensor['wind_speed'],
        }),
      );
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        setState(() {
          _rainResult = d;
          if (d['hardware_mode'] != null) {
            _hardwareStatus = d['hardware_mode'];
            _sensorOnline = _hardwareStatus != 'disconnected';
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Rain prediction completed on FPGA fabric!')),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error running FPGA Rain Predictor')),
      );
    }
    setState(() => _loadingRain = false);
  }

  Future<void> _runFusion() async {
    setState(() => _loadingFusion = true);
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/fpga/fusion'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'soil_moisture': _sensor['soil_moisture'],
          'temperature': _sensor['temperature'],
          'humidity': _sensor['humidity'],
          'light_level': _sensor['light_level'],
        }),
      );
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        setState(() {
          _fusionResult = d;
          if (d['hardware_mode'] != null) {
            _hardwareStatus = d['hardware_mode'];
            _sensorOnline = _hardwareStatus != 'disconnected';
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sensor fusion completed on FPGA fabric!')),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error running FPGA Sensor Fusion')),
      );
    }
    setState(() => _loadingFusion = false);
  }

  Future<void> _runCombined() async {
    setState(() => _loadingCombined = true);
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/fpga/combined-analysis'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'soil_moisture': _sensor['soil_moisture'],
          'temperature': _sensor['temperature'],
          'humidity': _sensor['humidity'],
          'light_level': _sensor['light_level'],
        }),
      );
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        setState(() {
          _combinedResult = d;
          if (d['hardware_mode'] != null) {
            _hardwareStatus = d['hardware_mode'];
            _sensorOnline = _hardwareStatus != 'disconnected';
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Combined analysis completed on FPGA fabric!')),
        );
      }
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Error running FPGA Irrigation Intelligence')),
      );
    }
    setState(() => _loadingCombined = false);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.56);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.white.withValues(alpha: 0.8);
    final textColor = isDark ? Colors.white : AppColors.textDark;

    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_rounded, color: isDark ? Colors.white : AppColors.textDark),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'AI Hardware Accelerator',
          style: TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: isDark ? Colors.white : AppColors.textDark),
            onPressed: _fetchInitialData,
          ),
        ],
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [AppColors.darkBackground, AppColors.darkSurface]
                : const [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: _loadingStatus
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Status card
                      _buildStatusCard(isDark, cardColor, borderColor, textColor),
                      const SizedBox(height: 16),

                      // Collapsible AI Overview widget
                      AiOverviewWidget(
                        page: 'growth',
                        isDark: isDark,
                      ),
                      const SizedBox(height: 16),

                      // 1. Rain Predictor Card
                      _buildPredictionCard(
                        title: 'Rain Predictor (Random Forest)',
                        description: 'Kalman-trained random forest classification core running on the FPGA hardware fabric.',
                        loading: _loadingRain,
                        onPressed: _predictRain,
                        result: _rainResult,
                        resultWidget: _buildRainResultWidget(textColor),
                        isDark: isDark,
                        cardColor: cardColor,
                        borderColor: borderColor,
                        textColor: textColor,
                      ),
                      const SizedBox(height: 16),

                      // 2. Sensor Fusion Card
                      _buildPredictionCard(
                        title: 'Sensor Fusion (Kalman Filter)',
                        description: 'AXI4-Lite Kalman filter core fusing soil, light, and temperature streams into a single health index.',
                        loading: _loadingFusion,
                        onPressed: _runFusion,
                        result: _fusionResult,
                        resultWidget: _buildFusionResultWidget(textColor),
                        isDark: isDark,
                        cardColor: cardColor,
                        borderColor: borderColor,
                        textColor: textColor,
                      ),
                      const SizedBox(height: 16),

                      // 3. Irrigation AI Card
                      _buildPredictionCard(
                        title: 'Irrigation Scheduler',
                        description: 'Multi-factor scheduling hardware core computing watering time and duration.',
                        loading: _loadingCombined,
                        onPressed: _runCombined,
                        result: _combinedResult,
                        resultWidget: _buildCombinedResultWidget(textColor),
                        isDark: isDark,
                        cardColor: cardColor,
                        borderColor: borderColor,
                        textColor: textColor,
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildStatusCard(bool isDark, Color cardColor, Color borderColor, Color textColor) {
    final statusColor = _sensorOnline ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          Container(
            width: 12, height: 12,
            decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FPGA Status: ${_hardwareStatus.toUpperCase()}',
                  style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 14, color: textColor),
                ),
                Text(
                  _sensorOnline
                      ? 'ZC706 Development Board active via AXI4-Lite registers.'
                      : 'No hardware board detected. Emulating prediction layers in software.',
                  style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: isDark ? Colors.white60 : AppColors.textMuted),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPredictionCard({
    required String title,
    required String description,
    required bool loading,
    required VoidCallback onPressed,
    required Map<String, dynamic>? result,
    required Widget resultWidget,
    required bool isDark,
    required Color cardColor,
    required Color borderColor,
    required Color textColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 15, color: textColor),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: const Text(
                  'HLS CORE',
                  style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 9, color: AppColors.primary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            description,
            style: TextStyle(fontFamily: 'Poppins', fontSize: 11.5, color: isDark ? Colors.white70 : AppColors.textDark),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: loading ? null : onPressed,
              child: loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Execute Hardware Inference', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold)),
            ),
          ),
          if (result != null) ...[
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),
            resultWidget,
          ],
        ],
      ),
    );
  }

  Widget _buildRainResultWidget(Color textColor) {
    if (_rainResult == null) return const SizedBox();
    final prob = _rainResult!['prediction']?['rain_probability'] ?? _rainResult!['rain_probability'] ?? 0;
    final confidence = _rainResult!['prediction']?['confidence'] ?? 'medium';
    final reasoning = _rainResult!['ai_reasoning'] ?? '';
    final rec = _rainResult!['farmer_recommendation'] ?? '';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Inference Output:', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.umbrella_rounded, color: AppColors.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'Rain Probability: $prob%',
              style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 14, color: textColor),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'Confidence: ${confidence.toString().toUpperCase()}',
                style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.primary),
              ),
            ),
          ],
        ),
        if (rec.isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('RECOMMENDATION', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 10, color: AppColors.primary)),
                const SizedBox(height: 4),
                Text(rec, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: textColor, height: 1.4)),
                if (reasoning.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text('Reasoning: $reasoning', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: isDark ? Colors.white60 : AppColors.textMuted, fontStyle: FontStyle.italic)),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildFusionResultWidget(Color textColor) {
    if (_fusionResult == null) return const SizedBox();
    final score = _fusionResult!['fpga_result']?['fusion_score'] ?? _fusionResult!['health_index'] ?? 0;
    final stress = _fusionResult!['fpga_result']?['stress_index'] ?? _fusionResult!['stress_percentage'] ?? 0;
    final alert = _fusionResult!['fpga_result']?['alert_name'] ?? 'Normal';
    final insights = _fusionResult!['ai_insights'] ?? '';
    final recs = _fusionResult!['ai_recommendations'] ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Inference Output:', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.spa_rounded, color: Colors.green, size: 20),
            const SizedBox(width: 8),
            Text(
              'Plant Health Score: $score / 100',
              style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 14, color: textColor),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                'Alert: $alert',
                style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 10, color: Colors.orange),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text('Environmental Stress Index: $stress%', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor)),
        if (insights.isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.green.withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('AI SENSOR INSIGHTS', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 10, color: Colors.green)),
                const SizedBox(height: 4),
                Text(insights, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: textColor, height: 1.4)),
                if (recs is List && recs.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  ...recs.map((r) => Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text('• $r', style: TextStyle(fontFamily: 'Poppins', fontSize: 11.5, color: textColor)),
                  )),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildCombinedResultWidget(Color textColor) {
    if (_combinedResult == null) return const SizedBox();
    final analysis = _combinedResult!['combined_analysis'] ?? {};
    final risk = analysis['overall_risk_level'] ?? 'low';
    final rec = analysis['recommendation'] ?? '';
    final actions = analysis['actions'] ?? [];

    final fusionScore = _combinedResult!['sensor_fusion']?['fusion_score'] ?? '—';
    final rainProb = _combinedResult!['rain_prediction']?['rain_probability'] ?? '—';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Inference Output:', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.water_drop_rounded, color: Colors.blue, size: 20),
            const SizedBox(width: 8),
            Text(
              'Overall Risk Level: ${risk.toString().toUpperCase()}',
              style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 14, color: textColor),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text('Plant Stress Score: $fusionScore / 100', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor)),
        Text('Rain Probability: $rainProb%', style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor)),
        if (rec.isNotEmpty) ...[
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('FIELD ACTION PLAN', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 10, color: Colors.blue)),
                const SizedBox(height: 4),
                Text(rec, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: textColor, height: 1.4)),
                if (actions is List && actions.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  ...actions.map((act) => Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text('• $act', style: TextStyle(fontFamily: 'Poppins', fontSize: 11.5, color: textColor)),
                  )),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}
