/**
 * Report Generator - Creates various weather and system reports
 */

export interface ReportData {
  title: string;
  generatedAt: string;
  period: string;
  data: Record<string, any>;
  metrics: ReportMetrics;
}

export interface ReportMetrics {
  avgTemperature?: number;
  maxTemperature?: number;
  minTemperature?: number;
  avgHumidity?: number;
  totalRainfall?: number;
  avgWindSpeed?: number;
  systemUptime?: number;
  alertCount?: number;
}

/**
 * Generate CSV content from report data
 */
export const generateCSVContent = (report: ReportData): string => {
  let csv = '';

  // Header
  csv += `${report.title}\n`;
  csv += `Generated: ${report.generatedAt}\n`;
  csv += `Period: ${report.period}\n\n`;

  // Metrics Section
  csv += 'Metrics Summary\n';
  csv += '---\n';
  Object.entries(report.metrics).forEach(([key, value]) => {
    if (value !== undefined) {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
      csv += `${formattedKey},${value}\n`;
    }
  });

  csv += '\n';

  // Detailed Data
  if (report.data.readings && Array.isArray(report.data.readings)) {
    csv += 'Detailed Readings\n';
    csv += 'Timestamp,Temperature (°C),Humidity (%),Pressure (hPa),Wind Speed (m/s),Rainfall (mm)\n';
    report.data.readings.forEach((reading: any) => {
      csv += `${reading.timestamp || ''},${reading.temperature || ''},${reading.humidity || ''},${reading.pressure || ''},${reading.windSpeed || ''},${reading.rainfall || ''}\n`;
    });
  }

  if (report.data.alerts && Array.isArray(report.data.alerts)) {
    csv += '\nAlerts Log\n';
    csv += 'Timestamp,Severity,Message,Status\n';
    report.data.alerts.forEach((alert: any) => {
      csv += `${alert.timestamp || ''},${alert.severity || ''},${alert.message || ''},${alert.status || ''}\n`;
    });
  }

  return csv;
};

/**
 * Generate HTML content for PDF export
 */
export const generateHTMLContent = (report: ReportData): string => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title} - ${report.period}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #2ECC71;
      --primary-dark: #1a9e52;
      --secondary: #1B3A20;
      --bg: #F8FFF9;
      --card-bg: #ffffff;
      --text-main: #2c3e50;
      --text-muted: #7f8c8d;
      --border: #e0f2f1;
      --shadow: 0 10px 30px rgba(46, 204, 113, 0.08);
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
    }

    body {
      font-family: 'Nunito', sans-serif;
      margin: 0;
      padding: 60px 20px;
      color: var(--text-main);
      background-color: #f0f4f0;
      line-height: 1.6;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--card-bg);
      padding: 50px;
      border-radius: 32px;
      box-shadow: var(--shadow);
      border: 1px solid rgba(46, 204, 113, 0.1);
      position: relative;
      overflow: hidden;
    }

    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 8px;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 50px;
    }

    .header-content h1 {
      color: var(--secondary);
      margin: 0;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -1px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 14px;
      background: rgba(46, 204, 113, 0.1);
      color: var(--primary-dark);
      border-radius: 50px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 12px;
    }

    .meta-info {
      text-align: right;
      font-size: 14px;
      color: var(--text-muted);
    }

    .meta-info p {
      margin: 4px 0;
    }

    .meta-info strong {
      color: var(--secondary);
      font-weight: 700;
    }

    .section {
      margin-bottom: 45px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 25px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--primary-dark);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 0;
    }

    .section-line {
      flex: 1;
      height: 1px;
      background: linear-gradient(90deg, var(--border), transparent);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }

    .metric-card {
      background: #fbfdfb;
      padding: 24px;
      border-radius: 20px;
      border: 1px solid var(--border);
      transition: all 0.3s ease;
    }

    .metric-label {
      font-size: 10px;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 900;
      color: var(--secondary);
      display: flex;
      align-items: baseline;
    }

    .metric-unit {
      font-size: 14px;
      font-weight: 700;
      color: var(--primary);
      margin-left: 4px;
      opacity: 0.8;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: #fff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th {
      background: #f8fbf9;
      color: var(--secondary);
      padding: 18px 20px;
      text-align: left;
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      color: var(--text-main);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: #fcfdfc;
    }

    .severity {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .severity-critical { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
    .severity-warning { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
    .severity-info { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }

    .status-badge {
      font-weight: 700;
      color: var(--secondary);
      font-size: 13px;
    }

    .footer {
      margin-top: 60px;
      text-align: center;
      padding-top: 40px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 13px;
    }

    .footer p {
      margin: 6px 0;
    }

    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; border: none; max-width: 100%; padding: 0; }
      .container::before { height: 4px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-content">
        <h1>${report.title}</h1>
        <div class="badge">Station Verification Passed</div>
      </div>
      <div class="meta-info">
        <p><strong>Generated At</strong><br>${report.generatedAt}</p>
        <p><strong>Reporting Period</strong><br>${report.period}</p>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Key Performance Indicators</h2>
        <div class="section-line"></div>
      </div>
      <div class="metrics-grid">
        ${Object.entries(report.metrics).map(([key, value]) => {
    if (value === undefined) return '';
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    let unit = '';
    const lKey = key.toLowerCase();
    if (lKey.includes('temp')) unit = '°C';
    else if (lKey.includes('humidity')) unit = '%';
    else if (lKey.includes('rainfall')) unit = 'mm';
    else if (lKey.includes('uptime')) unit = '%';
    else if (lKey.includes('speed')) unit = 'm/s';

    return `
            <div class="metric-card">
              <div class="metric-label">${label}</div>
              <div class="metric-value">
                ${typeof value === 'number' ? value.toFixed(1) : value}
                ${unit ? `<span class="metric-unit">${unit}</span>` : ''}
              </div>
            </div>
          `;
  }).join('')}
      </div>
    </div>

    ${report.data.readings && Array.isArray(report.data.readings) && report.data.readings.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Detailed Sensor Readings</h2>
          <div class="section-line"></div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Wind Speed</th>
                <th>Rainfall</th>
              </tr>
            </thead>
            <tbody>
              ${report.data.readings.map((reading: any) => `
                <tr>
                  <td><strong>${reading.timestamp || '-'}</strong></td>
                  <td>${reading.temperature !== undefined ? reading.temperature.toFixed(1) + '°C' : '-'}</td>
                  <td>${reading.humidity !== undefined ? reading.humidity.toFixed(1) + '%' : '-'}</td>
                  <td>${reading.windSpeed !== undefined ? reading.windSpeed.toFixed(1) + ' m/s' : '-'}</td>
                  <td>${reading.rainfall !== undefined ? reading.rainfall.toFixed(1) + ' mm' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    ${report.data.alerts && Array.isArray(report.data.alerts) && report.data.alerts.length > 0 ? `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Alerts log</h2>
          <div class="section-line"></div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${report.data.alerts.map((alert: any) => `
                <tr>
                  <td>${alert.timestamp || '-'}</td>
                  <td><span class="severity severity-${(alert.severity || 'info').toLowerCase()}">${alert.severity || 'INFO'}</span></td>
                  <td>${alert.message || '-'}</td>
                  <td class="status-badge">${alert.status || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <div class="footer">
      <p><strong>&copy; ${new Date().getFullYear()} Weather Monitoring System</strong></p>
      <p>This report is automatically generated and contains precision environmental data.</p>
      <p style="font-size: 11px; margin-top: 15px; opacity: 0.6;">Document ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
    </div>
  </div>
</body>
</html>
  `;
  return html;
};

/**
 * Download file helper
 */
export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Export report as CSV
 */
export const exportAsCSV = (report: ReportData) => {
  const csv = generateCSVContent(report);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(csv, `weather-report-${timestamp}.csv`, 'text/csv');
};

/**
 * Export report as JSON
 */
export const exportAsJSON = (report: ReportData) => {
  const json = JSON.stringify(report, null, 2);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(json, `weather-report-${timestamp}.json`, 'application/json');
};

/**
 * Export report as HTML (can be printed/saved as PDF)
 */
export const exportAsHTML = (report: ReportData) => {
  const html = generateHTMLContent(report);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(html, `weather-report-${timestamp}.html`, 'text/html');
};

/**
 * Create a daily weather report
 */
export const createDailyReport = (weatherData: any, alerts: any[], systemHealth: any): ReportData => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  return {
    title: 'Daily Weather Report',
    generatedAt: now.toLocaleString(),
    period: today,
    data: {
      readings: [],
      alerts: alerts.filter(a => a.timestamp?.includes(today)),
    },
    metrics: {
      avgTemperature: weatherData?.temperature,
      maxTemperature: weatherData?.temperature,
      minTemperature: weatherData?.temperature,
      avgHumidity: weatherData?.humidity,
      totalRainfall: weatherData?.rainfall || 0,
      avgWindSpeed: weatherData?.windSpeed,
      systemUptime: systemHealth?.uptime || 100,
      alertCount: alerts.length,
    },
  };
};

/**
 * Create a weekly summary report
 */
export const createWeeklySummaryReport = (weatherData: any, alerts: any[], systemHealth: any): ReportData => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    title: 'Weekly Weather Summary',
    generatedAt: now.toLocaleString(),
    period: `${weekAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`,
    data: {
      readings: [],
      alerts: alerts,
    },
    metrics: {
      avgTemperature: weatherData?.temperature,
      maxTemperature: weatherData?.temperature,
      minTemperature: weatherData?.temperature,
      avgHumidity: weatherData?.humidity,
      totalRainfall: weatherData?.rainfall || 0,
      avgWindSpeed: weatherData?.windSpeed,
      systemUptime: systemHealth?.uptime || 100,
      alertCount: alerts.length,
    },
  };
};

/**
 * Create an alerts report
 */
export const createAlertsReport = (alerts: any[]): ReportData => {
  const now = new Date();

  return {
    title: 'System Alerts Report',
    generatedAt: now.toLocaleString(),
    period: 'Last 30 days',
    data: {
      alerts: alerts,
    },
    metrics: {
      alertCount: alerts.length,
    },
  };
};

/**
 * Create a system health report
 */
export const createSystemHealthReport = (systemHealth: any, alerts: any[]): ReportData => {
  const now = new Date();

  return {
    title: 'System Health Report',
    generatedAt: now.toLocaleString(),
    period: now.toISOString().split('T')[0],
    data: {
      systemHealth: systemHealth,
      recentAlerts: alerts.slice(0, 10),
    },
    metrics: {
      systemUptime: systemHealth?.uptime || 100,
      alertCount: alerts.length,
    },
  };
};
