/**
 * ============================================================================
 * SENSOR FUSION ACCELERATOR - Main Implementation
 * ============================================================================
 * 
 * AMD Slingshot Hackathon 2026
 * Target: Zynq-7000 ZC706 Evaluation Kit
 * Tool: Vitis HLS 2024.1
 * 
 * This file implements the hardware accelerator for weighted sensor fusion.
 * The design uses HLS pragmas to achieve:
 *   - AXI-Lite interface for ARM PS access
 *   - Pipelined execution with II=1
 *   - DSP48 utilization for multiplications
 *   - 5-stage pipeline (50ns latency @ 100MHz)
 * 
 * ============================================================================
 */

#include "sensor_fusion.h"
#include <hls_math.h>

// ============================================================================
// MAIN ACCELERATOR FUNCTION - Floating Point Version
// ============================================================================

/**
 * fusion_accelerator - Primary sensor fusion accelerator
 * 
 * This is the top-level function that will be synthesized to RTL.
 * It computes a weighted risk score from 4 sensor inputs.
 * 
 * Pipeline Architecture:
 *   Stage 0: Input capture & normalization
 *   Stage 1: Stress computation (parallel)
 *   Stage 2: Weighted multiplication (4x DSP48)
 *   Stage 3: Addition tree (sum pairs)
 *   Stage 4: Final sum, clamp & classification
 * 
 * AXI-Lite Register Map:
 *   0x00: soil_moisture (R/W)
 *   0x04: temperature   (R/W)
 *   0x08: humidity      (R/W)
 *   0x0C: wind_speed    (R/W)
 *   0x10: risk_score    (R)
 *   0x14: risk_level    (R)
 */
void fusion_accelerator(
    float soil_moisture,
    float temperature,
    float humidity,
    float wind_speed,
    float *risk_score,
    int *risk_level
) {
    // ========================================================================
    // HLS INTERFACE PRAGMAS
    // ========================================================================
    
    // AXI-Lite slave interface for all ports
    // All grouped into single CTRL bundle for unified register access
    #pragma HLS INTERFACE s_axilite port=soil_moisture bundle=CTRL
    #pragma HLS INTERFACE s_axilite port=temperature   bundle=CTRL
    #pragma HLS INTERFACE s_axilite port=humidity      bundle=CTRL
    #pragma HLS INTERFACE s_axilite port=wind_speed    bundle=CTRL
    #pragma HLS INTERFACE s_axilite port=risk_score    bundle=CTRL
    #pragma HLS INTERFACE s_axilite port=risk_level    bundle=CTRL
    #pragma HLS INTERFACE s_axilite port=return        bundle=CTRL
    
    // ========================================================================
    // HLS OPTIMIZATION PRAGMAS
    // ========================================================================
    
    // Pipeline with initiation interval of 1 (one output per cycle)
    #pragma HLS PIPELINE II=1
    
    // Latency constraint (target 5 cycles)
    #pragma HLS LATENCY min=3 max=8
    
    // ========================================================================
    // STAGE 0: Input Validation & Normalization
    // ========================================================================
    
    // Saturate inputs to valid sensor ranges
    float soil_sat = saturate(soil_moisture, SOIL_MIN, SOIL_MAX);
    float temp_sat = saturate(temperature, TEMP_MIN, TEMP_MAX);
    float humidity_sat = saturate(humidity, HUMIDITY_MIN, HUMIDITY_MAX);
    float wind_sat = saturate(wind_speed, WIND_MIN, WIND_MAX);
    
    // ========================================================================
    // STAGE 1: Compute Individual Stress Values
    // ========================================================================
    
    // These can execute in parallel
    float soil_stress = compute_soil_stress(soil_sat);
    float temp_stress = compute_temp_stress(temp_sat);
    float humidity_stress = compute_humidity_stress(humidity_sat);
    float wind_stress = compute_wind_stress(wind_sat);
    
    // ========================================================================
    // STAGE 2: Weighted Multiplication (DSP48 Slices)
    // ========================================================================
    
    // Declare intermediate variables for DSP allocation
    float term1, term2, term3, term4;
    
    // Force DSP48 usage for consistent timing
    #pragma HLS BIND_OP variable=term1 op=fmul impl=dsp
    #pragma HLS BIND_OP variable=term2 op=fmul impl=dsp
    #pragma HLS BIND_OP variable=term3 op=fmul impl=dsp
    #pragma HLS BIND_OP variable=term4 op=fmul impl=dsp
    
    // Parallel multiplications (all 4 execute in same cycle)
    term1 = soil_stress * WEIGHT_SOIL;      // DSP48 #1
    term2 = temp_stress * WEIGHT_TEMP;      // DSP48 #2
    term3 = humidity_stress * WEIGHT_HUMIDITY;  // DSP48 #3
    term4 = wind_stress * WEIGHT_WIND;      // DSP48 #4
    
    // ========================================================================
    // STAGE 3: Addition Tree
    // ========================================================================
    
    // First level: parallel additions
    float sum1 = term1 + term2;
    float sum2 = term3 + term4;
    
    // Second level: final sum
    float result = sum1 + sum2;
    
    // ========================================================================
    // STAGE 4: Output Saturation & Classification
    // ========================================================================
    
    // Clamp to valid risk range [0.0, 1.0]
    float final_risk = saturate(result, 0.0f, 1.0f);
    
    // Classify into discrete risk levels
    risk_level_t level = classify_risk(final_risk);
    
    // Write outputs
    *risk_score = final_risk;
    *risk_level = (int)level;
}


// ============================================================================
// FIXED-POINT VERSION (Ultra-Low-Power)
// ============================================================================

/**
 * fusion_accelerator_fixed - Fixed-point implementation
 * 
 * Uses Q16.16 fixed-point arithmetic for lower power consumption.
 * Approximately 2-3x lower power than floating-point version.
 */
void fusion_accelerator_fixed(
    fixed32_t soil_moisture,
    fixed32_t temperature,
    fixed32_t humidity,
    fixed32_t wind_speed,
    fixed32_t *risk_score,
    int *risk_level
) {
    // AXI-Lite interface
    #pragma HLS INTERFACE s_axilite port=soil_moisture bundle=CTRL_FX
    #pragma HLS INTERFACE s_axilite port=temperature   bundle=CTRL_FX
    #pragma HLS INTERFACE s_axilite port=humidity      bundle=CTRL_FX
    #pragma HLS INTERFACE s_axilite port=wind_speed    bundle=CTRL_FX
    #pragma HLS INTERFACE s_axilite port=risk_score    bundle=CTRL_FX
    #pragma HLS INTERFACE s_axilite port=risk_level    bundle=CTRL_FX
    #pragma HLS INTERFACE s_axilite port=return        bundle=CTRL_FX
    
    #pragma HLS PIPELINE II=1
    
    // Fixed-point weights
    const fixed32_t W_SOIL = 0.35;
    const fixed32_t W_TEMP = 0.25;
    const fixed32_t W_HUMID = 0.20;
    const fixed32_t W_WIND = 0.20;
    
    // Normalize inputs (assume already in 0-1 range or pre-normalized)
    fixed32_t soil_norm = soil_moisture / fixed32_t(100.0);
    fixed32_t temp_norm = (temperature - fixed32_t(-10.0)) / fixed32_t(60.0);
    fixed32_t humid_norm = humidity / fixed32_t(100.0);
    fixed32_t wind_norm = wind_speed / fixed32_t(30.0);
    
    // Compute stress (simplified for fixed-point)
    fixed32_t soil_stress = fixed32_t(1.0) - soil_norm;
    fixed32_t temp_stress = (temp_norm > fixed32_t(0.5)) ? 
                            (temp_norm - fixed32_t(0.5)) * 2 : 
                            (fixed32_t(0.5) - temp_norm) * 2;
    fixed32_t humid_stress = (humid_norm > fixed32_t(0.6)) ?
                             (humid_norm - fixed32_t(0.6)) / fixed32_t(0.6) :
                             (fixed32_t(0.6) - humid_norm) / fixed32_t(0.6);
    fixed32_t wind_stress = wind_norm;
    
    // Weighted sum
    fixed32_t term1 = soil_stress * W_SOIL;
    fixed32_t term2 = temp_stress * W_TEMP;
    fixed32_t term3 = humid_stress * W_HUMID;
    fixed32_t term4 = wind_stress * W_WIND;
    
    fixed32_t result = term1 + term2 + term3 + term4;
    
    // Clamp
    if (result < fixed32_t(0.0)) result = fixed32_t(0.0);
    if (result > fixed32_t(1.0)) result = fixed32_t(1.0);
    
    // Classify
    int level;
    if (result >= fixed32_t(RISK_CRITICAL)) level = LEVEL_CRITICAL;
    else if (result >= fixed32_t(RISK_HIGH)) level = LEVEL_HIGH;
    else if (result >= fixed32_t(RISK_MEDIUM)) level = LEVEL_MEDIUM;
    else if (result >= fixed32_t(RISK_LOW)) level = LEVEL_LOW;
    else level = LEVEL_MINIMAL;
    
    *risk_score = result;
    *risk_level = level;
}


// ============================================================================
// STREAMING VERSION (High-Throughput)
// ============================================================================

/**
 * fusion_accelerator_stream - AXI-Stream implementation
 * 
 * Uses streaming interfaces for maximum throughput.
 * Input stream: 4 floats per packet (soil, temp, humid, wind)
 * Output stream: 2 floats per packet (risk_score, risk_level as float)
 */
void fusion_accelerator_stream(
    hls::stream<float> &sensor_stream,
    hls::stream<float> &result_stream
) {
    // AXI-Stream interfaces
    #pragma HLS INTERFACE axis port=sensor_stream
    #pragma HLS INTERFACE axis port=result_stream
    #pragma HLS INTERFACE s_axilite port=return bundle=CTRL_STREAM
    
    #pragma HLS PIPELINE II=1
    
    // Read 4 sensor values from stream
    float soil_moisture = sensor_stream.read();
    float temperature = sensor_stream.read();
    float humidity = sensor_stream.read();
    float wind_speed = sensor_stream.read();
    
    // Process using inline logic
    float soil_sat = saturate(soil_moisture, SOIL_MIN, SOIL_MAX);
    float temp_sat = saturate(temperature, TEMP_MIN, TEMP_MAX);
    float humidity_sat = saturate(humidity, HUMIDITY_MIN, HUMIDITY_MAX);
    float wind_sat = saturate(wind_speed, WIND_MIN, WIND_MAX);
    
    float soil_stress = compute_soil_stress(soil_sat);
    float temp_stress = compute_temp_stress(temp_sat);
    float humidity_stress = compute_humidity_stress(humidity_sat);
    float wind_stress = compute_wind_stress(wind_sat);
    
    float term1 = soil_stress * WEIGHT_SOIL;
    float term2 = temp_stress * WEIGHT_TEMP;
    float term3 = humidity_stress * WEIGHT_HUMIDITY;
    float term4 = wind_stress * WEIGHT_WIND;
    
    float result = term1 + term2 + term3 + term4;
    float final_risk = saturate(result, 0.0f, 1.0f);
    risk_level_t level = classify_risk(final_risk);
    
    // Write results to output stream
    result_stream.write(final_risk);
    result_stream.write((float)level);
}


// ============================================================================
// BATCH PROCESSING VERSION (Multiple Samples)
// ============================================================================

/**
 * fusion_accelerator_batch - Process multiple samples in parallel
 * 
 * Uses loop unrolling to process BATCH_SIZE samples simultaneously.
 * Hardware cost scales linearly with batch size.
 */
#define BATCH_SIZE 4

void fusion_accelerator_batch(
    float soil_moisture[BATCH_SIZE],
    float temperature[BATCH_SIZE],
    float humidity[BATCH_SIZE],
    float wind_speed[BATCH_SIZE],
    float risk_score[BATCH_SIZE],
    int risk_level[BATCH_SIZE]
) {
    // AXI-Lite interfaces for arrays
    #pragma HLS INTERFACE s_axilite port=soil_moisture bundle=CTRL_BATCH
    #pragma HLS INTERFACE s_axilite port=temperature   bundle=CTRL_BATCH
    #pragma HLS INTERFACE s_axilite port=humidity      bundle=CTRL_BATCH
    #pragma HLS INTERFACE s_axilite port=wind_speed    bundle=CTRL_BATCH
    #pragma HLS INTERFACE s_axilite port=risk_score    bundle=CTRL_BATCH
    #pragma HLS INTERFACE s_axilite port=risk_level    bundle=CTRL_BATCH
    #pragma HLS INTERFACE s_axilite port=return        bundle=CTRL_BATCH
    
    // Array partitioning for parallel access
    #pragma HLS ARRAY_PARTITION variable=soil_moisture complete dim=1
    #pragma HLS ARRAY_PARTITION variable=temperature   complete dim=1
    #pragma HLS ARRAY_PARTITION variable=humidity      complete dim=1
    #pragma HLS ARRAY_PARTITION variable=wind_speed    complete dim=1
    #pragma HLS ARRAY_PARTITION variable=risk_score    complete dim=1
    #pragma HLS ARRAY_PARTITION variable=risk_level    complete dim=1
    
    // Process all samples in parallel
    BATCH_LOOP: for (int i = 0; i < BATCH_SIZE; i++) {
        #pragma HLS UNROLL
        
        // Input saturation
        float soil_sat = saturate(soil_moisture[i], SOIL_MIN, SOIL_MAX);
        float temp_sat = saturate(temperature[i], TEMP_MIN, TEMP_MAX);
        float humidity_sat = saturate(humidity[i], HUMIDITY_MIN, HUMIDITY_MAX);
        float wind_sat = saturate(wind_speed[i], WIND_MIN, WIND_MAX);
        
        // Stress computation
        float soil_stress = compute_soil_stress(soil_sat);
        float temp_stress = compute_temp_stress(temp_sat);
        float humidity_stress = compute_humidity_stress(humidity_sat);
        float wind_stress = compute_wind_stress(wind_sat);
        
        // Weighted sum
        float term1 = soil_stress * WEIGHT_SOIL;
        float term2 = temp_stress * WEIGHT_TEMP;
        float term3 = humidity_stress * WEIGHT_HUMIDITY;
        float term4 = wind_stress * WEIGHT_WIND;
        
        float result = term1 + term2 + term3 + term4;
        float final_risk = saturate(result, 0.0f, 1.0f);
        
        // Output
        risk_score[i] = final_risk;
        risk_level[i] = (int)classify_risk(final_risk);
    }
}
