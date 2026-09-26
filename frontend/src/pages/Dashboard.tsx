import { useLanguage } from '@/contexts/LanguageContext';
import { ParameterCard } from '@/components/dashboard/ParameterCard';
import { SystemHealthPanel } from '@/components/dashboard/SystemHealthPanel';
import { StationMapPanel } from '@/components/dashboard/StationMapPanel';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { WeatherInsightPanel } from '@/components/dashboard/WeatherInsightPanel';
import { FarmBackground, GlassSection } from '@/components/FarmTheme';
import WeatherLoader from '@/components/WeatherLoader';
import { AIOverview } from '@/components/AIOverview';
import {
  getCurrentWeatherData,
  getSystemHealth,
  getRecentAlerts,
  getParameterStatus,
  WeatherData,
  SystemHealth,
  Alert,
} from '@/lib/weatherData';
import {
  Thermometer,
  Droplets,
  Gauge,
  Wind,
  Compass,
  CloudRain,
  Sun,
  Lightbulb,
  Cloud,
  ThermometerSun,
  Waves,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Add pulse animation styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
if (!document.head.querySelector('style[data-pulse]')) {
  styleSheet.setAttribute('data-pulse', 'true');
  document.head.appendChild(styleSheet);
}

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Dashboard() {
  const { t } = useLanguage();

  const { data: weatherData, error: weatherError } = useQuery({
    queryKey: ['weatherData'],
    queryFn: getCurrentWeatherData,
    refetchInterval: 10000,
  });

  const { data: systemHealth, error: healthError } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: getSystemHealth,
    refetchInterval: 10000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: getRecentAlerts,
    refetchInterval: 10000,
  });

  const { data: currentSensorData, dataUpdatedAt: sensorUpdatedAt } = useQuery({
    queryKey: ['latestSensorData', 'WS01'],
    queryFn: async () => {
      console.log('Dashboard: Fetching fresh sensor data...');
      try {
        const response = await fetch(`${API_URL}/api/sensors/latest/WS01`);
        if (!response.ok) throw new Error('Sensor fetch failed');
        const data = await response.json();
        return {
          temperature: data.temperature ?? 25,
          humidity: data.humidity ?? 60,
          pressure: data.pressure ?? 1013,
          wind_speed: data.windSpeed ?? data.wind_speed ?? 5,
          rainfall: data.rainfall ?? 0,
          soil_moisture: data.soilMoisture ?? data.soil_moisture ?? 50,
          soil_temperature: data.soilTemperature ?? data.soil_temperature ?? 30,
          light_level: data.lightIntensity ?? data.light_level ?? 70,
          pm25: data.airQualityPM25 ?? data.pm25 ?? 60,
          pm10: data.airQualityPM10 ?? data.pm10 ?? 120,
          uv_index: data.uvIndex ?? data.uv_index ?? 2,
          battery_voltage: data.batteryVoltage ?? data.battery_voltage ?? 12.5,
        };
      } catch (err) {
        console.warn('Dashboard: latest sensor data fetch failed, using fallback data:', err);
        return {
          temperature: 25,
          humidity: 60,
          pressure: 1013,
          wind_speed: 5,
          rainfall: 0,
          soil_moisture: 50,
          soil_temperature: 30,
          light_level: 70,
          pm25: 60,
          pm10: 120,
          uv_index: 2,
          battery_voltage: 12.5,
        };
      }
    },
    refetchInterval: 10000,
  });

  const loading = !weatherData || !systemHealth || !currentSensorData;
  const error = (weatherError || healthError) ? ((weatherError?.message || '') + ' ' + (healthError?.message || '')) : null;
  const connectionStatus = !!currentSensorData;
  const lastUpdate = sensorUpdatedAt ? new Date(sensorUpdatedAt).toLocaleTimeString() : "Never";

  if (loading && !weatherData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'relative' }}>
        <FarmBackground />
        <div style={{ position: 'relative', zIndex: 10 }}><WeatherLoader /></div>
      </div>
    );
  }

  if (!weatherData || !systemHealth) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'relative' }}>
        <FarmBackground />
        <GlassSection title="" noHeader>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#D32F2F', marginBottom: '12px', fontWeight: 700 }}>{error || t('error')}</p>
            <p style={{ color: '#5A7A60', fontSize: '13px' }}>Ensure backend is running on {API_URL}</p>
          </div>
        </GlassSection>
      </div>
    );
  }

  // Use live sensor data for display (updates every 10 seconds), fallback to weatherData
  // Format all numbers to 2 decimal places for readability
  const displayTemp = Number((currentSensorData?.temperature ?? weatherData.temperature).toFixed(2));
  const displayHumidity = Number((currentSensorData?.humidity ?? weatherData.humidity).toFixed(2));
  const displayPressure = Number((currentSensorData?.pressure ?? weatherData.pressure).toFixed(2));
  const displayWindSpeed = Number((currentSensorData?.wind_speed ?? weatherData.windSpeed).toFixed(2));
  const displayRainfall = Number((currentSensorData?.rainfall ?? weatherData.rainfall).toFixed(2));
  const displaySoilTemp = Number((currentSensorData?.soil_temperature ?? weatherData.soilTemperature).toFixed(2));
  const displaySoilMoisture = Number((currentSensorData?.soil_moisture ?? weatherData.soilMoisture).toFixed(2));
  const displayPM25 = Number((currentSensorData?.pm25 ?? weatherData.airQualityPM25).toFixed(1));
  const displayPM10 = Number((currentSensorData?.pm10 ?? weatherData.airQualityPM10).toFixed(1));
  const displayUVIndex = Number((currentSensorData?.uv_index ?? weatherData.uvIndex).toFixed(1));
  const displayLightLevel = Number((currentSensorData?.light_level ?? weatherData.lightIntensity).toFixed(1));

  const atmosphericParams = [
    { icon: <Thermometer className="w-5 h-5" />, labelKey: 'ambient_temperature', value: displayTemp, unit: '°C', status: getParameterStatus('temperature', displayTemp) },
    { icon: <Droplets className="w-5 h-5" />, labelKey: 'relative_humidity', value: displayHumidity, unit: '%', status: getParameterStatus('humidity', displayHumidity) },
    { icon: <Gauge className="w-5 h-5" />, labelKey: 'barometric_pressure', value: displayPressure, unit: 'hPa', status: 'normal' as const },
  ];

  const windRainParams = [
    { icon: <Wind className="w-5 h-5" />, labelKey: 'wind_speed', value: displayWindSpeed, unit: 'km/h', status: getParameterStatus('windSpeed', displayWindSpeed) },
    { icon: <Compass className="w-5 h-5" />, labelKey: 'wind_direction', value: weatherData.windDirection, unit: '', status: 'normal' as const },
    { icon: <CloudRain className="w-5 h-5" />, labelKey: 'rainfall', value: displayRainfall, unit: 'mm', status: 'normal' as const },
  ];

  const radiationLightParams = [
    { icon: <Sun className="w-5 h-5" />, labelKey: 'uv_index', value: displayUVIndex, unit: '', status: getParameterStatus('uvIndex', displayUVIndex) },
    { icon: <Lightbulb className="w-5 h-5" />, labelKey: 'ambient_light', value: displayLightLevel, unit: 'lux', status: 'normal' as const },
  ];

  const airSoilParams = [
    { icon: <Cloud className="w-5 h-5" />, labelKey: 'air_quality', value: `${displayPM25}/${displayPM10}`, unit: 'µg/m³', status: getParameterStatus('airQualityPM25', displayPM25), colorClass: 'text-muted-foreground' },
    { icon: <ThermometerSun className="w-5 h-5" />, labelKey: 'soil_temperature', value: displaySoilTemp, unit: '°C', status: 'normal' as const, colorClass: 'text-soil' },
    { icon: <Waves className="w-5 h-5" />, labelKey: 'soil_moisture', value: displaySoilMoisture, unit: '%', status: getParameterStatus('soilMoisture', displaySoilMoisture), colorClass: 'text-soil' },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <FarmBackground />
      <div style={{ position: 'relative', zIndex: 50 }}>
        <DashboardHeader lastUpdateSeconds={systemHealth.lastUpdateSeconds} sensorNodeOnline={systemHealth.sensorNodeOnline} />
      </div>

      <main style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto', padding: '32px 20px 60px' }}>
        <AIOverview page="dashboard" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <GlassSection title={t('atmospheric_conditions')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {atmosphericParams.map((p) => <ParameterCard key={p.labelKey} {...p} />)}
            </div>
          </GlassSection>

          <GlassSection title={t('wind_rain')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {windRainParams.map((p) => <ParameterCard key={p.labelKey} {...p} />)}
            </div>
          </GlassSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <GlassSection title={t('radiation_light')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {radiationLightParams.map((p) => <ParameterCard key={p.labelKey} {...p} />)}
              </div>
            </GlassSection>
            <GlassSection title={t('air_soil')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {airSoilParams.map((p) => <ParameterCard key={p.labelKey} {...p} colorClass={p.colorClass} />)}
              </div>
            </GlassSection>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            <GlassSection title="" noHeader>
              <WeatherInsightPanel />
            </GlassSection>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <SystemHealthPanel health={systemHealth} />
              {/* <StationMapPanel /> */}
              <AlertsPanel alerts={alerts} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
