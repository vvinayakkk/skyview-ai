import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WeatherSummary {
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: string;
  rainfall: number;
  uvIndex: number;
  airQualityPM25: number;
  airQualityPM10: number;
  soilTemperature: number;
  soilMoisture: number;
  region?: string;
  language: 'en' | 'hi' | 'te';
}

const languageInstructions: Record<string, string> = {
  en: "Respond in simple, clear English suitable for rural users with low technical literacy.",
  hi: "हिंदी में सरल और स्पष्ट भाषा में जवाब दें जो ग्रामीण उपयोगकर्ताओं के लिए आसानी से समझ में आए।",
  te: "గ్రామీణ వినియోగదారులకు అర్థమయ్యే సరళమైన, స్పష్టమైన తెలుగులో స్పందించండి।"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const weatherData: WeatherSummary = await req.json();
    const { language = 'en' } = weatherData;

    const systemPrompt = `You are a helpful agricultural weather assistant that converts weather sensor data into simple, easy-to-understand insights for farmers and rural users. ${languageInstructions[language]}

Your task:
1. Provide a brief, plain-language explanation of current weather conditions (2-4 sentences)
2. Give one simple, practical recommendation for the day

Rules:
- Do NOT use technical jargon or numbers
- Do NOT mention specific sensor values
- Keep language friendly and conversational
- Focus on practical implications for farming activities
- Be advisory, not prescriptive - use phrases like "you may consider" or "it might be a good day for"
- Do NOT make guarantees about outcomes

Respond with a JSON object containing:
{
  "insight": "2-4 sentence plain-language explanation of conditions",
  "recommendation": "One simple advisory statement"
}`;

    const userPrompt = `Current weather conditions:
- Temperature: ${weatherData.temperature}°C
- Humidity: ${weatherData.humidity}%
- Pressure: ${weatherData.pressure} hPa
- Wind: ${weatherData.windSpeed} km/h from ${weatherData.windDirection}
- Rainfall: ${weatherData.rainfall} mm
- UV Index: ${weatherData.uvIndex}
- Air Quality (PM2.5/PM10): ${weatherData.airQualityPM25}/${weatherData.airQualityPM10} µg/m³
- Soil Temperature: ${weatherData.soilTemperature}°C
- Soil Moisture: ${weatherData.soilMoisture}%
${weatherData.region ? `- Region: ${weatherData.region}` : ''}

Please provide a simple weather insight and recommendation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service payment required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response content from AI");
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch {
      // If JSON parsing fails, try to extract from the response
      parsedContent = {
        insight: content.slice(0, 300),
        recommendation: "Please monitor weather conditions throughout the day.",
      };
    }

    return new Response(JSON.stringify({
      insight: parsedContent.insight || "Weather conditions are being analyzed.",
      recommendation: parsedContent.recommendation || "Please check back later for recommendations.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Weather insight error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: errorMessage,
      insight: null,
      recommendation: null,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
