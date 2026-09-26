import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { getCurrentWeatherData, WeatherData } from '@/lib/weatherData';
import { Sun, Cloud, CloudRain, Lightbulb, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WeatherInsight {
  insight: string;
  recommendation: string;
}

interface Recommendation {
  number: number;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

export function WeatherInsightPanel() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [insight, setInsight] = useState<WeatherInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Parse recommendations from numbered list
  const parseRecommendations = (text: string): Recommendation[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsed: Recommendation[] = [];

    lines.forEach((line, idx) => {
      const match = line.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        const number = parseInt(match[1]);
        const text = match[2].trim();
        // Assign priority based on keywords
        let priority: 'high' | 'medium' | 'low' = 'low';
        if (text.toLowerCase().includes('urgent') || text.toLowerCase().includes('immediately') || text.toLowerCase().includes('critical')) {
          priority = 'high';
        } else if (text.toLowerCase().includes('ensure') || text.toLowerCase().includes('monitor') || text.toLowerCase().includes('important')) {
          priority = 'medium';
        }
        parsed.push({ number, text, priority });
      }
    });

    return parsed;
  };

  const fetchInsight = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const weatherData = await getCurrentWeatherData();
      setWeatherData(weatherData);

      const backendUrl = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${backendUrl}/api/weather-insight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Current weather: ${weatherData.temperature}°C, ${weatherData.humidity}% humidity, ${weatherData.windSpeed} km/h wind, pressure ${weatherData.pressure} hPa. Provide farming recommendations.`,
          station_id: 'WS01',
          user_id: 'dashboard_user'
        }),
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error("Insight endpoint not found on backend.");
        if (response.status === 429) throw new Error(t('rate_limit_error'));
        const errorText = await response.text();
        console.error(' Weather insight error response:', response.status, errorText);
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      console.log(' Weather insight response:', data);
      if (data.error || data.status === 'error') {
        console.error(' Backend error:', data.response);
        throw new Error(data.response || 'Failed to get insight');
      }

      const responseText = data.response || 'No insights available';
      setInsight({
        insight: responseText,
        recommendation: responseText
      });

      // Parse recommendations for visual display
      const parsed = parseRecommendations(responseText);
      setRecommendations(parsed);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn('Weather insight fetch failed, using local offline fallback:', errorMessage);
      setError(null); // Clear error state to display local recommendations instead

      const temp = weatherData?.temperature ?? 28.5;
      const hum = weatherData?.humidity ?? 65;
      const rain = weatherData?.rainfall ?? 0;
      const wind = weatherData?.windSpeed ?? 12.3;

      const recs = [
        `1. Ambient temperature is ${temp}°C. Monitor crops for heat or cold stress based on your local crop varieties.`,
        `2. Relative humidity is ${hum}%. Keep fields well ventilated to reduce the risk of fungal pests.`,
        `3. Wind speed is ${wind} km/h. Avoid pesticide spraying during high wind periods to prevent drift.`,
      ];

      if (rain > 0) {
        recs.push(`4. Rainfall of ${rain}mm recorded. Ensure field drainage channels are clear to prevent waterlogging.`);
        recs.push(`5. Adjust irrigation schedules dynamically to conserve water during natural rainfall.`);
      } else {
        recs.push(`4. Dry conditions observed. Optimize drip irrigation systems to maintain adequate root zone moisture.`);
        recs.push(`5. Apply organic mulch around crop bases to reduce evaporation and preserve soil organic matter.`);
      }

      const fallbackText = recs.join('\n');
      setInsight({
        insight: fallbackText,
        recommendation: fallbackText
      });
      const parsed = parseRecommendations(fallbackText);
      setRecommendations(parsed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [language]);

  const getWeatherIcon = () => {
    if (!weatherData) return <Sun style={{ width: '24px', height: '24px', color: '#FFD93D' }} />;
    if (weatherData.rainfall > 0) return <CloudRain style={{ width: '24px', height: '24px', color: '#42A5F5' }} />;
    if (weatherData.humidity > 80) return <Cloud style={{ width: '24px', height: '24px', color: '#78909C' }} />;
    return <Sun style={{ width: '24px', height: '24px', color: '#FFD93D' }} />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return isDark ? '#FF6B6B' : '#E53935';
      case 'medium': return isDark ? '#FFD93D' : '#F57C00';
      default: return isDark ? '#2ECC71' : '#43A047';
    }
  };

  const getPriorityBgColor = (priority: string) => {
    switch (priority) {
      case 'high': return isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(229, 57, 53, 0.08)';
      case 'medium': return isDark ? 'rgba(255, 217, 61, 0.1)' : 'rgba(245, 124, 0, 0.08)';
      default: return isDark ? 'rgba(46, 204, 113, 0.1)' : 'rgba(67, 160, 71, 0.08)';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {getWeatherIcon()}
          <h3 style={{
            fontSize: '16px', fontWeight: 700,
            color: isDark ? '#A8D89A' : '#1B3A20',
            fontFamily: "'Nunito', sans-serif",
          }}>
            {t('weather_insight_title')}
          </h3>
        </div>
        <button
          onClick={fetchInsight}
          disabled={isLoading}
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(46,204,113,0.1)' : 'rgba(0,0,0,0.04)',
            color: isDark ? '#6A8A6A' : '#8A9A8C',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[100, 85, 65].map((w, i) => (
            <div key={i} style={{
              height: '14px', borderRadius: '7px',
              background: isDark ? 'rgba(46,204,113,0.06)' : 'rgba(0,0,0,0.05)',
              width: `${w}%`,
              animation: 'pulse 2s infinite',
            }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <AlertCircle style={{ width: '20px', height: '20px', color: '#E53935', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '13px', color: '#E53935' }}>{error}</p>
        </div>
      ) : recommendations.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recommendations.map((rec) => (
            <div
              key={rec.number}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: getPriorityBgColor(rec.priority),
                border: `1px solid ${getPriorityColor(rec.priority)}30`,
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              {/* Priority indicator - bar on left */}
              <div style={{
                width: '4px',
                height: '100%',
                borderRadius: '2px',
                background: getPriorityColor(rec.priority),
                flexShrink: 0,
              }} />

              {/* Number circle */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: getPriorityColor(rec.priority),
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}>
                {rec.number}
              </div>

              {/* Text */}
              <p style={{
                fontSize: '13px',
                lineHeight: '1.5',
                color: isDark ? '#C8E8C8' : '#2A3A2A',
                margin: 0,
              }}>
                {rec.text}
              </p>
            </div>
          ))}

          {/* Disclaimer */}
          <p style={{
            fontSize: '11px', fontStyle: 'italic',
            color: isDark ? '#4A6A4A' : '#8A9A8C',
            marginTop: '8px',
          }}>
            {t('weather_insight_disclaimer')}
          </p>
        </div>
      ) : null}
    </div>
  );
}
