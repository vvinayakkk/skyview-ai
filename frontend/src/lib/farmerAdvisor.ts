// Farmer Advisory System - Crop recommendations, tips, and alerts

export interface CropAdvice {
  crop: string;
  idealTemp: { min: number; max: number };
  idealHumidity: { min: number; max: number };
  waterNeeds: string;
  season: string;
  emoji: string;
}

export const FARM_CROPS: CropAdvice[] = [
  {
    crop: "Rice",
    idealTemp: { min: 24, max: 30 },
    idealHumidity: { min: 50, max: 90 },
    waterNeeds: "1200-1500mm annually",
    season: "Monsoon (June-Oct)",
    emoji: ""
  },
  {
    crop: "Wheat",
    idealTemp: { min: 15, max: 25 },
    idealHumidity: { min: 40, max: 80 },
    waterNeeds: "450-650mm annually",
    season: "Winter (Oct-Mar)",
    emoji: ""
  },
  {
    crop: "Cotton",
    idealTemp: { min: 21, max: 30 },
    idealHumidity: { min: 40, max: 60 },
    waterNeeds: "600-900mm annually",
    season: "Summer (Apr-Oct)",
    emoji: "️"
  },
  {
    crop: "Sugarcane",
    idealTemp: { min: 20, max: 30 },
    idealHumidity: { min: 50, max: 90 },
    waterNeeds: "1500-2250mm annually",
    season: "Year-round",
    emoji: ""
  },
  {
    crop: "Maize",
    idealTemp: { min: 20, max: 27 },
    idealHumidity: { min: 40, max: 80 },
    waterNeeds: "500-800mm annually",
    season: "Monsoon/Rabi (Apr-Oct)",
    emoji: ""
  },
  {
    crop: "Onion",
    idealTemp: { min: 13, max: 24 },
    idealHumidity: { min: 60, max: 80 },
    waterNeeds: "400-500mm annually",
    season: "Winter (Sep-Mar)",
    emoji: ""
  },
  {
    crop: "Potato",
    idealTemp: { min: 15, max: 22 },
    idealHumidity: { min: 70, max: 90 },
    waterNeeds: "500-625mm annually",
    season: "Winter (Oct-Apr)",
    emoji: ""
  },
  {
    crop: "Tomato",
    idealTemp: { min: 20, max: 30 },
    idealHumidity: { min: 50, max: 70 },
    waterNeeds: "400-600mm annually",
    season: "Summer/Monsoon",
    emoji: ""
  }
];

export interface FarmingAlert {
  type: "warning" | "info" | "success" | "danger";
  title: string;
  message: string;
  icon: string;
}

export function generateFarmingAlerts(
  temp: number,
  humidity: number,
  windSpeed: number,
  rainfall: number
): FarmingAlert[] {
  const alerts: FarmingAlert[] = [];

  // Temperature alerts
  if (temp > 40) {
    alerts.push({
      type: "danger",
      title: "️ Extreme Heat",
      message: "Provide irrigation and shade. Risk of crop damage.",
      icon: ""
    });
  } else if (temp < 5) {
    alerts.push({
      type: "danger",
      title: "️ Frost Warning",
      message: "Protect tender plants. Frost damage risk.",
      icon: ""
    });
  } else if (temp > 35) {
    alerts.push({
      type: "warning",
      title: "️ High Temperature",
      message: "Increase watering frequency for crops.",
      icon: "️"
    });
  }

  // Humidity alerts
  if (humidity > 85) {
    alerts.push({
      type: "warning",
      title: " High Humidity",
      message: "High disease risk. Improve ventilation. Check for fungal infections.",
      icon: ""
    });
  } else if (humidity < 30) {
    alerts.push({
      type: "info",
      title: " Low Humidity",
      message: "Increase irrigation. Risk of insect pests increases.",
      icon: ""
    });
  }

  // Wind alerts
  if (windSpeed > 40) {
    alerts.push({
      type: "danger",
      title: "️ Strong Winds",
      message: "Risk of crop damage and soil erosion. Secure structures.",
      icon: ""
    });
  } else if (windSpeed > 25) {
    alerts.push({
      type: "warning",
      title: "️ Moderate Winds",
      message: "Avoid pesticide spraying. Good for natural ventilation.",
      icon: ""
    });
  }

  // Rainfall alerts
  if (rainfall > 50) {
    alerts.push({
      type: "warning",
      title: "️ Heavy Rainfall",
      message: "Ensure proper drainage. Avoid field operations.",
      icon: ""
    });
  } else if (rainfall > 20) {
    alerts.push({
      type: "success",
      title: " Good Rainfall",
      message: "Ideal for crop growth. Update irrigation schedule.",
      icon: "️"
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "success",
      title: " Safe Conditions",
      message: "Weather conditions are favorable for farming.",
      icon: "️"
    });
  }

  return alerts;
}

export interface WaterCalculation {
  cropName: string;
  growthStage: string;
  daysOld: number;
  estimatedWaterNeeded: number;
  unit: string;
}

export function calculateWaterNeeds(
  crop: string,
  daysSincePlanting: number,
  temp: number
): WaterCalculation {
  let baseWater = 25;
  let growthStage = "Early";

  if (daysSincePlanting < 20) {
    baseWater = 15;
    growthStage = "Germination";
  } else if (daysSincePlanting < 50) {
    baseWater = 25;
    growthStage = "Vegetative";
  } else if (daysSincePlanting < 90) {
    baseWater = 35;
    growthStage = "Flowering";
  } else {
    baseWater = 20;
    growthStage = "Maturity";
  }

  // Adjust for temperature
  const tempFactor = temp > 30 ? 1.3 : temp < 15 ? 0.8 : 1;
  const estimatedWater = Math.round(baseWater * tempFactor);

  return {
    cropName: crop,
    growthStage,
    daysOld: daysSincePlanting,
    estimatedWaterNeeded: estimatedWater,
    unit: "mm/day"
  };
}

export const FARMING_TIPS = [
  " Always check soil moisture before watering - stick your finger 2 inches deep",
  " Inspect crops every 2-3 days for pest infestations",
  " Water early in morning (5-7am) to reduce evaporation",
  " Rotate crops yearly to improve soil health",
  "️ Use organic compost to boost soil fertility",
  "️ Monitor weather forecasts 7 days in advance for planning",
  " Take soil samples every 2-3 years for testing",
  " Clean farm equipment after each use to prevent disease spread",
  " Follow lunar calendar for better planting results",
  " Provide support structures for heavy-bearing crops",
  " Remove weeds regularly to reduce competition",
  " Apply lime to acidic soils to neutralize pH",
  " Ensure 6-8 hours of sunlight for most vegetables",
  " Keep farm records for yield tracking",
  " Join farmer groups for knowledge sharing"
];

export const MOON_PHASES = {
  "New Moon": "Best for planting root vegetables",
  "Waxing Crescent": "Good for leafy greens and vines",
  "First Quarter": "Ideal for fruiting crops",
  "Waxing Gibbous": "Great for flowering plants",
  "Full Moon": "Best harvest time",
  "Waning Gibbous": "Prepare soil, plant root crops",
  "Last Quarter": "Weeding and pest control",
  "Waning Crescent": "Rest period for soil"
};

export const PEST_DISEASES = [
  {
    name: "Powdery Mildew",
    symptoms: "White powder on leaves",
    remedy: "Spray sulfur or neem oil",
    prevention: "Improve air circulation"
  },
  {
    name: "Leaf Spot",
    symptoms: "Brown/black spots on leaves",
    remedy: "Remove affected leaves, apply fungicide",
    prevention: "Water at soil level, not leaves"
  },
  {
    name: "Armyworm",
    symptoms: "Holes in leaves, larval damage",
    remedy: "Hand-pick or use organic insecticide",
    prevention: "Crop rotation, remove debris"
  },
  {
    name: "Root Rot",
    symptoms: "Wilting, yellow leaves, mushy roots",
    remedy: "Improve drainage, reduce watering",
    prevention: "Use well-draining soil"
  },
  {
    name: "Aphids",
    symptoms: "Curled leaves, sticky residue",
    remedy: "Spray water or neem oil",
    prevention: "Plant companion crops"
  }
];

export function getSoilHealthScore(
  moisture: number,
  temperature: number
): { score: number; status: string; tips: string[] } {
  let score = 50;
  const tips: string[] = [];

  if (moisture > 40 && moisture < 60) {
    score += 20;
  } else if (moisture > 70 || moisture < 20) {
    tips.push("Adjust watering - soil moisture is extreme");
  } else {
    score += 10;
  }

  if (temperature > 15 && temperature < 30) {
    score += 20;
  } else if (temperature > 35 || temperature < 10) {
    tips.push("Temperature not ideal for soil organisms");
  } else {
    score += 10;
  }

  let status = "Poor";
  if (score > 80) status = "Excellent";
  else if (score > 60) status = "Good";
  else if (score > 40) status = "Fair";

  if (tips.length === 0) {
    tips.push("Soil conditions are optimal for plant growth");
  }

  return { score, status, tips };
}
