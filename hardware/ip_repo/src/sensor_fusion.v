//============================================================================
// Sensor Fusion Accelerator - Core Processing Engine
// Target: Zynq-7000 ZC706 (xc7z045ffg900-2)
// Clock: 100 MHz (10ns period)
// Latency: 5 clock cycles
// Resources: 4x DSP48E1 slices
//============================================================================

`timescale 1ns / 1ps
`include "sensor_fusion_pkg.vh"

module sensor_fusion (
    input  wire                  clk,
    input  wire                  rst_n,
    
    // Control interface
    input  wire                  start,
    output reg                   done,
    output reg                   busy,
    
    // Sensor inputs (Q8.8 fixed-point)
    input  wire [DATA_WIDTH-1:0] soil_moisture,
    input  wire [DATA_WIDTH-1:0] temperature,
    input  wire [DATA_WIDTH-1:0] humidity,
    input  wire [DATA_WIDTH-1:0] light_level,
    
    // Outputs
    output reg  [DATA_WIDTH-1:0] fusion_score,
    output reg  [DATA_WIDTH-1:0] stress_index,
    output reg  [2:0]            alert_level,
    output reg  [3:0]            status
);

    // ========================================================================
    // Pipeline Registers
    // ========================================================================
    
    // Stage 1: Input registration
    reg [DATA_WIDTH-1:0] soil_reg, temp_reg, humid_reg, light_reg;
    reg                  valid_s1;
    
    // Stage 2: Multiplication results (32-bit to hold full precision)
    reg signed [31:0] mult_soil, mult_temp, mult_humid, mult_light;
    reg               valid_s2;
    
    // Stage 3: Partial sums
    reg signed [31:0] sum_01, sum_23;
    reg               valid_s3;
    
    // Stage 4: Final fusion sum
    reg signed [31:0] fusion_full;
    reg               valid_s4;
    
    // Stage 5: Output registration and classification
    reg               valid_s5;
    
    // ========================================================================
    // Helper: Convert unsigned input to signed for multiplication
    // ========================================================================
    wire signed [DATA_WIDTH:0] soil_signed  = {1'b0, soil_reg};
    wire signed [DATA_WIDTH:0] temp_signed  = {1'b0, temp_reg};
    wire signed [DATA_WIDTH:0] humid_signed = {1'b0, humid_reg};
    wire signed [DATA_WIDTH:0] light_signed = {1'b0, light_reg};
    
    wire signed [DATA_WIDTH:0] w_soil_signed  = {1'b0, WEIGHT_SOIL};
    wire signed [DATA_WIDTH:0] w_temp_signed  = {1'b0, WEIGHT_TEMP};
    wire signed [DATA_WIDTH:0] w_humid_signed = {1'b0, WEIGHT_HUMID};
    wire signed [DATA_WIDTH:0] w_light_signed = {1'b0, WEIGHT_LIGHT};
    
    // ========================================================================
    // Stage 1: Input Registration
    // ========================================================================
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            soil_reg  <= 16'd0;
            temp_reg  <= 16'd0;
            humid_reg <= 16'd0;
            light_reg <= 16'd0;
            valid_s1  <= 1'b0;
        end else begin
            if (start && !busy) begin
                soil_reg  <= soil_moisture;
                temp_reg  <= temperature;
                humid_reg <= humidity;
                light_reg <= light_level;
                valid_s1  <= 1'b1;
            end else begin
                valid_s1 <= 1'b0;
            end
        end
    end
    
    // ========================================================================
    // Stage 2: Weighted Multiplication (uses 4x DSP48E1)
    // Fusion = soil*W_soil + temp*W_temp + humid*W_humid + light*W_light
    // ========================================================================
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            mult_soil  <= 32'd0;
            mult_temp  <= 32'd0;
            mult_humid <= 32'd0;
            mult_light <= 32'd0;
            valid_s2   <= 1'b0;
        end else begin
            // DSP48 multiplication
            mult_soil  <= soil_signed  * w_soil_signed;
            mult_temp  <= temp_signed  * w_temp_signed;
            mult_humid <= humid_signed * w_humid_signed;
            mult_light <= light_signed * w_light_signed;
            valid_s2   <= valid_s1;
        end
    end
    
    // ========================================================================
    // Stage 3: Partial Sum (tree reduction)
    // ========================================================================
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            sum_01   <= 32'd0;
            sum_23   <= 32'd0;
            valid_s3 <= 1'b0;
        end else begin
            sum_01   <= mult_soil + mult_temp;
            sum_23   <= mult_humid + mult_light;
            valid_s3 <= valid_s2;
        end
    end
    
    // ========================================================================
    // Stage 4: Final Sum
    // ========================================================================
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            fusion_full <= 32'd0;
            valid_s4    <= 1'b0;
        end else begin
            fusion_full <= sum_01 + sum_23;
            valid_s4    <= valid_s3;
        end
    end
    
    // ========================================================================
    // Stage 5: Output Registration and Classification
    // Extract Q8.8 result from Q16.16 multiplication result
    // ========================================================================
    wire [DATA_WIDTH-1:0] fusion_result = fusion_full[FRAC_BITS + DATA_WIDTH - 1 : FRAC_BITS];
    
    // Stress index calculation (simplified: deviation from optimal 50%)
    wire [DATA_WIDTH-1:0] optimal_value = 16'h3200;  // 50.0 in Q8.8
    wire [DATA_WIDTH-1:0] stress_raw;
    
    // |fusion - optimal| calculation
    wire fusion_above_optimal = (fusion_result >= optimal_value);
    assign stress_raw = fusion_above_optimal ? 
                        (fusion_result - optimal_value) : 
                        (optimal_value - fusion_result);
    
    // Scale stress to 0-100 range (multiply by 2)
    wire [DATA_WIDTH-1:0] stress_scaled = {stress_raw[DATA_WIDTH-2:0], 1'b0};
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            fusion_score <= 16'd0;
            stress_index <= 16'd0;
            alert_level  <= ALERT_NONE;
            valid_s5     <= 1'b0;
        end else begin
            if (valid_s4) begin
                fusion_score <= fusion_result;
                stress_index <= stress_scaled;
                
                // Alert classification based on stress index
                if (stress_scaled >= THRESH_CRITICAL)
                    alert_level <= ALERT_CRITICAL;
                else if (stress_scaled >= THRESH_HIGH)
                    alert_level <= ALERT_HIGH;
                else if (stress_scaled >= THRESH_MODERATE)
                    alert_level <= ALERT_MODERATE;
                else if (stress_scaled >= THRESH_LOW)
                    alert_level <= ALERT_LOW;
                else
                    alert_level <= ALERT_NONE;
            end
            valid_s5 <= valid_s4;
        end
    end
    
    // ========================================================================
    // Control Logic: Busy and Done signals
    // ========================================================================
    reg [2:0] pipeline_tracker;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            busy   <= 1'b0;
            done   <= 1'b0;
            status <= STATUS_IDLE;
            pipeline_tracker <= 3'd0;
        end else begin
            done <= 1'b0;  // Single-cycle pulse
            
            if (start && !busy) begin
                busy   <= 1'b1;
                status <= STATUS_PROCESSING;
                pipeline_tracker <= 3'd5;  // 5 stages
            end
            
            if (pipeline_tracker > 0) begin
                pipeline_tracker <= pipeline_tracker - 1;
            end
            
            if (pipeline_tracker == 1) begin
                done   <= 1'b1;
                busy   <= 1'b0;
                status <= STATUS_DONE;
            end
            
            // Return to idle after done
            if (status == STATUS_DONE && !start) begin
                status <= STATUS_IDLE;
            end
        end
    end

endmodule
