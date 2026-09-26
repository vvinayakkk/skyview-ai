import 'package:easy_localization/easy_localization.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'dart:io';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

import '../utils/constants.dart';
import '../widgets/ai_overview_widget.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> {
  // Module toggles
  bool _inclWeather = true;
  bool _inclSoil = true;
  bool _inclMandi = true;
  bool _inclSchemes = true;
  bool _inclAlerts = true;
  bool _inclPlan = true;

  // Format
  String _format = 'digest';

  // State
  bool _isLoading = false;
  bool _reportGenerated = false;
  List<String> _steps = [];
  double _progress = 0;
  String _reportContent = '';
  Map<String, dynamic> _sensorData = {};
  List<dynamic> _mandiRecords = [];
  String _generatedAt = '';

  @override
  void initState() {
    super.initState();
    _fetchSensor();
  }

  Future<void> _fetchSensor() async {
    // Load from cache first for instant display
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('cache_sensor_WS01');
      if (cached != null && _sensorData.isEmpty) {
        final decoded = json.decode(cached) as Map<String, dynamic>;
        if (mounted) setState(() => _sensorData = decoded);
      }
    } catch (_) {}

    // Refresh from network
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/sensors/latest/WS01'),
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final decoded = json.decode(res.body) as Map<String, dynamic>;
        if (mounted) setState(() => _sensorData = decoded);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('cache_sensor_WS01', res.body);
      }
    } catch (_) {}
  }

  double _sv(String key, {double fallback = 0}) {
    final v = _sensorData[key];
    if (v == null) return fallback;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString()) ?? fallback;
  }

  Future<void> _addStep(String msg, double progress, {int delay = 500}) async {
    await Future.delayed(Duration(milliseconds: delay));
    if (!mounted) return;
    setState(() {
      _steps = [..._steps, msg];
      _progress = progress;
    });
  }

  Future<void> _generateReport() async {
    setState(() {
      _isLoading = true;
      _reportGenerated = false;
      _steps = [];
      _progress = 0;
      _mandiRecords = [];
      _reportContent = '';
    });

    try {
      await _addStep('Establishing connection with edge IoT sensor WS01…', 10);
      final temp = _sv('temperature', fallback: 28);
      final moisture = _sv('soil_moisture', fallback: 50);
      await _addStep('Telemetry read: Temp=${temp.toStringAsFixed(1)}°C, Moisture=${moisture.toStringAsFixed(0)}%', 25);

      if (_inclMandi) {
        await _addStep('Querying Mandi rates index…', 40);
        try {
          final res = await http.get(
            Uri.parse('$kBaseUrl/api/mandi/rates?limit=5'),
          ).timeout(const Duration(seconds: 10));
          if (res.statusCode == 200) {
            final data = json.decode(res.body) as Map<String, dynamic>;
            final List raw = data['rates'] ?? [];
            setState(() => _mandiRecords = raw);
            await _addStep('✓ Loaded ${raw.length} mandi prices from backend.', 50, delay: 400);
          }
        } catch (e) {
          await _addStep('Mandi data unavailable, using cached estimates.', 50, delay: 300);
        }
      }

      await _addStep('Synthesizing data prompts and formatting criteria…', 80);
      await _addStep('Calling Kisan Mitra AI model (category: $_format overview)…', 90);

      // AI call
      final prefs = await SharedPreferences.getInstance();
      final phone = prefs.getString(kPhoneKey) ?? '';
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/advisor/insights'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'category': 'overview', 'station_id': 'WS01'}),
      ).timeout(const Duration(seconds: 25));

      String aiText = '';
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final insights = data['ai_insights'];
        if (insights is String) {
          aiText = insights;
        } else if (insights is Map) {
          aiText = (insights['summary'] ?? '') + '\n\n' + (insights['details'] ?? '');
          final focusPoints = insights['focus_points'];
          if (focusPoints is List) {
            aiText += '\n\n**Focus Points:**\n' + focusPoints.map((p) => '- $p').join('\n');
          }
        } else {
          aiText = 'AI analysis complete. Conditions are within normal range.';
        }
      } else {
        aiText = 'AI analysis could not complete. Reverted to telemetry verification.';
      }

      // Build report content
      _reportContent = _buildReportMarkdown(aiText, temp, moisture);
      _generatedAt = DateTime.now().toString().substring(0, 16);

      await _addStep('Farm Intelligence report finalized successfully.', 100, delay: 400);
      setState(() {
        _isLoading = false;
        _reportGenerated = true;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _reportContent = '## Report Error\nFailed to generate report: $e';
        _reportGenerated = true;
      });
    }
  }

  String _buildReportMarkdown(String aiText, double temp, double moisture) {
    final humidity = _sv('humidity', fallback: 60);
    final rain = _sv('rainfall', fallback: 0);
    final wind = _sv('wind_speed', fallback: 5);

    final buffer = StringBuffer();
    buffer.writeln('# Farm Intelligence Report');
    buffer.writeln('**Generated:** $_generatedAt  |  **Format:** ${_format.toUpperCase()}  |  **Station:** WS01');
    buffer.writeln();

    if (_inclWeather) {
      buffer.writeln('## Live Telemetry');
      buffer.writeln('| Parameter | Value | Status |');
      buffer.writeln('|-----------|-------|--------|');
      buffer.writeln('| Temperature | ${temp.toStringAsFixed(1)}°C | ${temp > 35 ? "⚠️ High" : temp < 10 ? "⚠️ Low" : "✅ Normal"} |');
      buffer.writeln('| Humidity | ${humidity.toStringAsFixed(0)}% | ${humidity > 85 ? "⚠️ High" : humidity < 30 ? "⚠️ Low" : "✅ Normal"} |');
      buffer.writeln('| Soil Moisture | ${moisture.toStringAsFixed(0)}% | ${moisture < 25 ? "⚠️ Dry" : moisture > 70 ? "⚠️ Wet" : "✅ Normal"} |');
      buffer.writeln('| Rainfall | ${rain.toStringAsFixed(1)} mm | ${rain > 5 ? "⚠️ Heavy" : "✅ OK"} |');
      buffer.writeln('| Wind Speed | ${wind.toStringAsFixed(1)} km/h | ${wind > 30 ? "⚠️ Strong" : "✅ OK"} |');
      buffer.writeln();
    }

    if (_inclAlerts) {
      buffer.writeln('## Active Alerts');
      final alerts = <String>[];
      if (temp > 35) alerts.add('🌡️ **High temperature** (${temp.toStringAsFixed(1)}°C): Provide shade and increase irrigation.');
      if (temp < 10) alerts.add('❄️ **Low temperature** (${temp.toStringAsFixed(1)}°C): Protect frost-sensitive crops.');
      if (humidity > 85) alerts.add('💧 **High humidity** (${humidity.toStringAsFixed(0)}%): Watch for fungal diseases.');
      if (moisture < 25) alerts.add('🌱 **Dry soil** (${moisture.toStringAsFixed(0)}%): Irrigate immediately.');
      if (moisture > 70) alerts.add('🌊 **Wet soil** (${moisture.toStringAsFixed(0)}%): Reduce irrigation, check drainage.');
      if (alerts.isEmpty) alerts.add('✅ All conditions normal. Continue regular operations.');
      for (final a in alerts) { buffer.writeln('- $a'); }
      buffer.writeln();
    }

    if (_inclMandi && _mandiRecords.isNotEmpty) {
      buffer.writeln('## Mandi Spotlight');
      for (final r in _mandiRecords.take(5)) {
        buffer.writeln('- **${r['commodity']}**: ₹${r['modal_price']} (${r['market']}, ${r['state']})');
      }
      buffer.writeln();
    }

    buffer.writeln('## AI Advisory Insights');
    buffer.writeln(aiText);
    buffer.writeln();

    if (_inclPlan) {
      buffer.writeln('## Recommended 7-Day Action Plan');
      buffer.writeln('- **Day 1-2**: Monitor soil moisture levels, adjust irrigation based on today\'s readings.');
      buffer.writeln('- **Day 3-4**: Check for pest activity given current humidity and temperature combination.');
      buffer.writeln('- **Day 5-7**: Review mandi prices before any planned crop sale to maximize returns.');
    }

    return buffer.toString();
  }

  void _copyReport() {
    Clipboard.setData(ClipboardData(text: _reportContent));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: const Text('Report copied to clipboard'),
      backgroundColor: AppColors.primary,
      duration: const Duration(seconds: 2),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    ));
  }

  Future<void> _shareAsPdf() async {
    try {
      final pdf = pw.Document();
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (pw.Context context) {
            return pw.Padding(
              padding: const pw.EdgeInsets.all(32),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('SKYVIEW SMART AGRICULTURE',
                      style: pw.TextStyle(
                          fontSize: 20, fontWeight: pw.FontWeight.bold)),
                  pw.SizedBox(height: 4),
                  pw.Text('Farm Advisory Report — Generated on $_generatedAt',
                      style: pw.TextStyle(fontSize: 10, color: PdfColors.grey600)),
                  pw.SizedBox(height: 16),
                  pw.Divider(thickness: 1, color: PdfColors.grey300),
                  pw.SizedBox(height: 16),
                  pw.Text(
                    _reportContent.replaceAll(RegExp(r'#+\s*'), ''),
                    style: const pw.TextStyle(fontSize: 11, height: 1.4),
                  ),
                ],
              ),
            );
          },
        ),
      );

      final output = await getTemporaryDirectory();
      final file = File("${output.path}/SkyView_Report_${DateTime.now().millisecondsSinceEpoch}.pdf");
      await file.writeAsBytes(await pdf.save());

      await Share.shareXFiles([XFile(file.path)], text: 'SkyView Farm Advisory Report');
    } catch (e) {
      debugPrint('PDF export failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to generate PDF report.')),
        );
      }
    }
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
    final mutedColor = isDark ? Colors.white54 : AppColors.textMuted;

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
        title: Text('reports.title'.tr(), style: TextStyle(
          fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 18,
          color: isDark ? Colors.white : AppColors.textDark,
        )),
        actions: [
          if (_reportGenerated) ...[
            IconButton(
              icon: Icon(Icons.copy_rounded, color: isDark ? Colors.white70 : AppColors.textMuted),
              onPressed: _copyReport,
              tooltip: 'Copy report',
            ),
            IconButton(
              icon: Icon(Icons.restart_alt_rounded, color: isDark ? Colors.white70 : AppColors.textMuted),
              onPressed: () => setState(() { _reportGenerated = false; _steps = []; _progress = 0; }),
              tooltip: 'New report',
            ),
          ],
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
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [

                // AI Overview
                AiOverviewWidget(page: 'reports', isDark: isDark),

                // ── Setup Phase ──────────────────────────────────────────────
                if (!_reportGenerated && !_isLoading) ...[
                  _sectionTitle('Report Configuration', textColor),
                  const SizedBox(height: 12),

                  // Format selector
                  Container(
                    decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(14), border: Border.all(color: borderColor)),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Report Format', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 13, color: textColor)),
                        const SizedBox(height: 12),
                        Row(children: [
                          _formatBtn('digest', 'Digest', isDark),
                          const SizedBox(width: 8),
                          _formatBtn('scientific', 'Scientific', isDark),
                          const SizedBox(width: 8),
                          _formatBtn('action', 'Action Plan', isDark),
                        ]),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Module toggles
                  Container(
                    decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(14), border: Border.all(color: borderColor)),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Data Sources', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 13, color: textColor)),
                        const SizedBox(height: 8),
                        _toggle('Live Sensor Telemetry', _inclWeather, (v) => setState(() => _inclWeather = v), isDark),
                        _toggle('Soil Analysis', _inclSoil, (v) => setState(() => _inclSoil = v), isDark),
                        _toggle('Mandi Price Data', _inclMandi, (v) => setState(() => _inclMandi = v), isDark),
                        _toggle('Government Schemes', _inclSchemes, (v) => setState(() => _inclSchemes = v), isDark),
                        _toggle('Active Alerts', _inclAlerts, (v) => setState(() => _inclAlerts = v), isDark),
                        _toggle('7-Day Action Plan', _inclPlan, (v) => setState(() => _inclPlan = v), isDark),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Generate button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _generateReport,
                      icon: Icon(Icons.auto_awesome_rounded, size: 18, color: isDark ? Colors.white : AppColors.textDark),
                      label: Text('Generate Report', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 15, color: isDark ? Colors.white : AppColors.textDark)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
                        foregroundColor: isDark ? Colors.white : AppColors.textDark,
                        shadowColor: Colors.transparent,
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        minimumSize: const Size(double.infinity, 52),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                ],

                // ── Loading Phase ────────────────────────────────────────────
                if (_isLoading) ...[
                  Container(
                    decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderColor)),
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary)),
                          const SizedBox(width: 12),
                          Text('Generating Report…', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 14, color: textColor)),
                        ]),
                        const SizedBox(height: 14),
                        LinearProgressIndicator(
                          value: _progress / 100,
                          backgroundColor: isDark ? Colors.white10 : Colors.black12,
                          valueColor: AlwaysStoppedAnimation(AppColors.primary),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        const SizedBox(height: 4),
                        Text('${_progress.toStringAsFixed(0)}%', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: mutedColor)),
                        const SizedBox(height: 16),
                        ..._steps.asMap().entries.map((e) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 18, height: 18,
                                margin: const EdgeInsets.only(right: 10, top: 1),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(Icons.check_rounded, size: 11, color: AppColors.primary),
                              ),
                              Expanded(child: Text(e.value, style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: textColor, height: 1.4))),
                            ],
                          ),
                        )),
                      ],
                    ),
                  ),
                ],

                // ── Report Preview ───────────────────────────────────────────
                if (_reportGenerated) ...[
                  // Action bar
                  Row(children: [
                    Text('Report generated $_generatedAt', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: mutedColor)),
                    const Spacer(),
                    _actionBtn(Icons.copy_rounded, 'Copy', _copyReport),
                    const SizedBox(width: 8),
                    _actionBtn(Icons.share_rounded, 'Share PDF', _shareAsPdf),
                  ]),
                  const SizedBox(height: 12),

                  Container(
                    decoration: BoxDecoration(color: cardColor, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderColor)),
                    padding: const EdgeInsets.all(16),
                    child: MarkdownBody(
                      data: _reportContent,
                      styleSheet: MarkdownStyleSheet(
                        h1: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary),
                        h2: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.primary),
                        h3: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 13.5, color: AppColors.primary),
                        p: TextStyle(fontFamily: 'Poppins', fontSize: 13, height: 1.65, color: textColor),
                        strong: TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontFamily: 'Poppins'),
                        listBullet: TextStyle(color: AppColors.primary, fontFamily: 'Poppins'),
                        tableBorder: TableBorder.all(color: borderColor, width: 0.5),
                        tableHead: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 11.5, color: AppColors.primary),
                        tableBody: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: textColor),
                        tableCellsDecoration: BoxDecoration(color: isDark ? Colors.white.withValues(alpha: 0.03) : const Color(0xFFF8FFF8)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => setState(() { _reportGenerated = false; _steps = []; }),
                      icon: Icon(Icons.add_rounded, size: 18, color: isDark ? Colors.white : AppColors.textDark),
                      label: Text('Generate Another Report', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 14, color: isDark ? Colors.white : AppColors.textDark)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.white,
                        foregroundColor: isDark ? Colors.white : AppColors.textDark,
                        shadowColor: Colors.transparent,
                        side: const BorderSide(color: AppColors.primary, width: 1.5),
                        minimumSize: const Size(double.infinity, 48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String text, Color textColor) => Text(text, style: TextStyle(
    fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 15, color: textColor,
  ));

  Widget _formatBtn(String value, String label, bool isDark) {
    final selected = _format == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _format = value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: selected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: selected ? AppColors.primary : AppColors.primary.withValues(alpha: 0.3)),
          ),
          child: Text(label, textAlign: TextAlign.center, style: TextStyle(
            fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600,
            color: selected ? Colors.white : (isDark ? Colors.white70 : AppColors.textDark),
          )),
        ),
      ),
    );
  }

  Widget _toggle(String label, bool value, ValueChanged<bool> onChanged, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: isDark ? Colors.white70 : AppColors.textDark))),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
            inactiveTrackColor: isDark ? Colors.white12 : Colors.black12,
          ),
        ],
      ),
    );
  }

  Widget _actionBtn(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: AppColors.primary),
          const SizedBox(width: 5),
          Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
        ]),
      ),
    );
  }
}
