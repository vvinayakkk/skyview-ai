/**
 * ============================================================================
 * SENSOR FUSION ACCELERATOR - Header File
 * ============================================================================
 * 
 * AMD Slingshot Hackathon 2026
 * Target: Zynq-7000 ZC706 Evaluation Kit
 * 
 * This accelerator performs weighted sensor fusion for agricultural
 * risk assessment, computing a risk score from 4 sensor inputs.
 * 
 * Algorithm:
 *   risk = 0.35 * soil_stress + 0.25 * temp_stress + 
 *          0.20 * humidity_stress + 0.20 * wind_stress
 * 
 * Where stress values are normalized (0.0 - 1.0)
 * 
 * Performance Targets:
 *   - Latency: 5 cycles (50ns @ 100MHz)
 *   - Throughput: 1 sample/cycle (II=1)
 *   - DSP Usage: 4 slices
 *   - Power: ~50mW active
 * 
 * ============================================================================
 */

#ifndef SENSOR_FUSION_H
#define SENSOR_FUSION_H

#include <ap_fixed.h>
#include <hls_stream.h>

// ============================================================================
// Configuration Constants
// ============================================================================

// Fusion weights (must sum to 1.0)
#define WEIGHT_SOIL      0.35f
#define WEIGHT_TEMP      0.25f
#define WEIGHT_HUMIDITY  0.20f
#define WEIGHT_WIND      0.20f

// Sensor normalization ranges
#define SOIL_MIN         0.0f
#define SOIL_MAX         100.0f    // Percentage
#define TEMP_MIN         -10.0f
#define TEMP_MAX         50.0f     // Celsius
#define HUMIDITY_MIN     0.0f
#define HUMIDITY_MAX     100.0f    // Percentage
#define WIND_MIN         0.0f
#define WIND_MAX         30.0f     // m/s

// Risk thresholds for classification
#define RISK_CRITICAL    0.80f
#define RISK_HIGH        0.60f
#define RISK_MEDIUM      0.40f
#define RISK_LOW         0.20f

// AXI-Lite register offsets (for software driver reference)
#define REG_SOIL_MOISTURE   0x00
#define REG_TEMPERATURE     0x04
#define REG_HUMIDITY        0x08
#define REG_WIND_SPEED      0x0C
#define REG_RISK_SCORE      0x10
#define REG_RISK_LEVEL      0x14
#define REG_STATUS          0x18
#define REG_CONTROL         0x1C

// Status register bits
#define STATUS_DONE         0x01
#define STATUS_IDLE         0x02
#define STATUS_READY        0x04

// Control register bits
#define CTRL_START          0x01
#define CTRL_RESET          0x02

// ============================================================================
// Data Types
// ============================================================================

// Fixed-point type for ultra-low-power mode (optional)
typedef ap_fixed<32, 16> fixed32_t;   // Q16.16 format
typedef ap_fixed<16, 8>  fixed16_t;   // Q8.8 format

// Risk level enumeration
typedef enum {
    LEVEL_MINIMAL  = 0,
    LEVEL_LOW      = 1,
    LEVEL_MEDIUM   = 2,
    LEVEL_HIGH     = 3,
    LEVEL_CRITICAL = 4
} risk_level_t;

// Accelerator status
typedef struct {
    bool done;
    bool idle;
    bool ready;
    unsigned int compute_count;
} accel_status_t;

// ============================================================================
// Function Prototypes
// ============================================================================

/**
 * Main accelerator function - Floating Point Version
 * 
 * @param soil_moisture  Raw soil moisture percentage (0-100%)
 * @param temperature    Temperature in Celsius (-10 to 50°C)
 * @param humidity       Relative humidity percentage (0-100%)
 * @param wind_speed     Wind speed in m/s (0-30 m/s)
 * @param risk_score     Output: computed risk score (0.0 to 1.0)
 * @param risk_level     Output: risk classification (0-4)
 */
void fusion_accelerator(
    float soil_moisture,
    float temperature,
    float humidity,
    float wind_speed,
    float *risk_score,
    int *risk_level
);

/**
 * Fixed-point version for ultra-low-power applications
 * Uses Q16.16 fixed-point arithmetic
 */
void fusion_accelerator_fixed(
    fixed32_t soil_moisture,
    fixed32_t temperature,
    fixed32_t humidity,
    fixed32_t wind_speed,
    fixed32_t *risk_score,
    int *risk_level
);

/**
 * Streaming version for high-throughput applications
 * Uses AXI-Stream interfaces
 */
void fusion_accelerator_stream(
    hls::stream<float> &sensor_stream,
    hls::stream<float> &result_stream
);

// ============================================================================
// Helper Functions (inline for synthesis)
// ============================================================================

/**
 * Normalize a value to 0.0 - 1.0 range
 */
inline float normalize(float value, float min_val, float max_val) {
    float normalized = (value - min_val) / (max_val - min_val);
    // Clamp to valid range
    if (normalized < 0.0f) normalized = 0.0f;
    if (normalized > 1.0f) normalized = 1.0f;
    return normalized;
}

/**
 * Compute soil moisture stress
 * Low moisture = high stress
 */
inline float compute_soil_stress(float soil_moisture) {
    float normalized = normalize(soil_moisture, SOIL_MIN, SOIL_MAX);
    // Invert: low moisture = high stress
    return 1.0f - normalized;
}

/**
 * Compute temperature stress
 * Extreme temperatures = high stress
 * Optimal around 20-25°C
 */
inline float compute_temp_stress(float temperature) {
    float normalized = normalize(temperature, TEMP_MIN, TEMP_MAX);
    // Optimal at 0.5 (normalized), stress increases as deviation
    float deviation = (normalized - 0.5f);
    if (deviation < 0.0f) deviation = -deviation;  // abs
    return deviation * 2.0f;  // Scale to 0-1
}

/**
 * Compute humidity stress
 * Very low or very high = stress
 */
inline float compute_humidity_stress(float humidity) {
    float normalized = normalize(humidity, HUMIDITY_MIN, HUMIDITY_MAX);
    // Optimal around 60%, compute distance from optimal
    float optimal = 0.6f;
    float deviation = (normalized - optimal);
    if (deviation < 0.0f) deviation = -deviation;  // abs
    // Scale so max deviation (0.6) maps to 1.0
    return deviation / 0.6f;
}

/**
 * Compute wind stress
 * Higher wind = higher stress
 */
inline float compute_wind_stress(float wind_speed) {
    return normalize(wind_speed, WIND_MIN, WIND_MAX);
}

/**
 * Classify risk score into discrete levels
 */
inline risk_level_t classify_risk(float risk_score) {
    if (risk_score >= RISK_CRITICAL) return LEVEL_CRITICAL;
    if (risk_score >= RISK_HIGH)     return LEVEL_HIGH;
    if (risk_score >= RISK_MEDIUM)   return LEVEL_MEDIUM;
    if (risk_score >= RISK_LOW)      return LEVEL_LOW;
    return LEVEL_MINIMAL;
}

/**
 * Saturate/clamp a float to valid range
 */
inline float saturate(float value, float min_val, float max_val) {
    if (value < min_val) return min_val;
    if (value > max_val) return max_val;
    return value;
}

#endif // SENSOR_FUSION_H
