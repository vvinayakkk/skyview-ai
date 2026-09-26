/**
 * Rain Predictor Accelerator (Verilog RTL)
 * Predicts rainfall based on temperature, humidity, pressure, wind
 * Fixed-point Q8.8 format
 * 
 * Inputs:  temperature, humidity, pressure, wind speed (Q8.8)
 * Outputs: rain_probability, weather_stress, rain_alert
 */

// signal defination
module rain_predictor (
    input clk,
    input rst_n,
    
    // Input values (Q8.8 fixed-point)
    input [15:0] temp_in,      // Temperature
    input [15:0] humid_in,     // Humidity
    input [15:0] press_in,     // Pressure
    input [15:0] wind_in,      // Wind speed
    
    // Output values (Q8.8)
    output reg [15:0] rain_prob_out,   // Rain probability (0-100%)
    output reg [15:0] stress_level_out, // Weather stress (0-100)
    output reg alert_flag_out,          // Rain alert (1=alert, 0=clear)
    
    // Control
    input start,
    output reg done
);

    // Fixed-point Q8.8 constants
    localparam Q88_70  = 16'h4600;   // 70.0
    localparam Q88_100 = 16'h6400;   // 100.0
    localparam Q88_50  = 16'h3200;   // 50.0
    localparam Q88_90  = 16'h5A00;   // 90.0
    localparam Q88_30  = 16'h1E00;   // 30.0
    localparam Q88_60  = 16'h3C00;   // 60.0
    localparam Q88_25  = 16'h1900;   // 25.0
    localparam Q88_15  = 16'h0F00;   // 15.0
    localparam Q88_85  = 16'h5500;   // 85.0
    localparam Q88_40  = 16'h2800;   // 40.0
    localparam Q88_80  = 16'h5000;   // 80.0
    localparam Q88_95  = 16'h5F00;   // 95.0
    localparam Q88_20  = 16'h1400;   // 20.0
    localparam Q88_45  = 16'h2D00;   // 45.0
    localparam Q88_5   = 16'h0500;   // 5.0
    localparam Q88_35  = 16'h2300;   // 35.0

    // State machine
    reg [2:0] state;
    localparam IDLE = 0, COMPUTE = 1, DONE_STATE = 2;
    
    // Working registers
    reg [23:0] rain_score;    // 24-bit to avoid overflow
    reg [23:0] stress_score;
    reg alert;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state <= IDLE;
            done <= 0;
            rain_prob_out <= 0;
            stress_level_out <= 0;
            alert_flag_out <= 0;
        end else begin
            case (state)
                IDLE: begin
                    done <= 0;
                    if (start) begin
                        state <= COMPUTE;
                    end
                end
                
                COMPUTE: begin
                    // ===== RAIN PROBABILITY CALCULATION =====
                    rain_score = 0;
                    
                    // High humidity contribution (weight: 0.35)
                    if (humid_in > Q88_70) begin
                        // 35 + (humid - 70) * 1.0
                        rain_score = rain_score + 32'h0023 + (humid_in - Q88_70);
                    end else if (humid_in > Q88_50) begin
                        // (humid - 50) * 1.75
                        rain_score = rain_score + ((humid_in - Q88_50) * 28) >> 4;
                    end
                    
                    // Pressure contribution (lower = more rain, weight: 0.40)
                    if (press_in < Q88_30) begin
                        // (30 - press) * 1.33
                        rain_score = rain_score + ((Q88_30 - press_in) * 21) >> 4;
                    end else if (press_in < Q88_50) begin
                        // (50 - press) * 0.4
                        rain_score = rain_score + ((Q88_50 - press_in) * 6) >> 4;
                    end
                    
                    // Temperature contribution (15-25°C optimal, weight: 0.15)
                    if ((temp_in >= Q88_15) && (temp_in <= Q88_25)) begin
                        rain_score = rain_score + 16'h000F;  // 15 points
                    end else if ((temp_in > Q88_25) && (temp_in < Q88_35)) begin
                        rain_score = rain_score + 16'h000A;  // 10 points
                    end else if ((temp_in >= Q88_5) && (temp_in < Q88_15)) begin
                        rain_score = rain_score + 16'h000C;  // 12 points
                    end
                    
                    // Wind contribution (5-15 m/s optimal, weight: 0.10)
                    if ((wind_in > Q88_5) && (wind_in < Q88_15)) begin
                        rain_score = rain_score + 16'h000A;  // 10 points
                    end else if (wind_in >= Q88_15) begin
                        rain_score = rain_score + 16'h0008;  // 8 points
                    end
                    
                    // Clamp to 0-100
                    if (rain_score > Q88_100) rain_score = Q88_100;
                    rain_prob_out <= rain_score[15:0];
                    
                    // ===== WEATHER STRESS LEVEL =====
                    stress_score = 0;
                    
                    // Humidity extremes
                    if ((humid_in > Q88_90) || (humid_in < Q88_20)) begin
                        stress_score = stress_score + 16'h0019;  // 25 points
                    end else if ((humid_in > Q88_80) || (humid_in < Q88_30)) begin
                        stress_score = stress_score + 16'h000F;  // 15 points
                    end
                    
                    // Pressure instability (very low = severe)
                    if (press_in < Q88_20) begin
                        stress_score = stress_score + 16'h001E;  // 30 points
                    end else if (press_in < Q88_30) begin
                        stress_score = stress_score + 16'h0014;  // 20 points
                    end
                    
                    // Temperature extremes
                    if ((temp_in > 16'h2800) || (temp_in < Q88_5)) begin  // > 40 or < 0
                        stress_score = stress_score + 16'h0014;  // 20 points
                    end else if ((temp_in > Q88_35) || (temp_in < 16'h0500)) begin  // > 35 or < 5
                        stress_score = stress_score + 16'h000A;  // 10 points
                    end
                    
                    // Wind extremes
                    if (wind_in > 16'h1400) begin  // > 20
                        stress_score = stress_score + 16'h0019;  // 25 points
                    end else if (wind_in > Q88_15) begin  // > 15
                        stress_score = stress_score + 16'h000F;  // 15 points
                    end
                    
                    // Clamp stress level
                    if (stress_score > Q88_100) stress_score = Q88_100;
                    stress_level_out <= stress_score[15:0];
                    
                    // ===== RAIN ALERT FLAG =====
                    alert = 0;
                    
                    if ((rain_score > 16'h003C) && (press_in < Q88_40)) begin  // rain > 60% AND press < 40
                        alert = 1;
                    end
                    
                    if ((humid_in > Q88_85) && (press_in < Q88_45)) begin  // humid > 85% AND press < 45
                        alert = 1;
                    end
                    
                    if ((stress_score > 16'h0046) && (rain_score > 16'h0032)) begin  // stress > 70% AND rain > 50%
                        alert = 1;
                    end
                    
                    alert_flag_out <= alert;
                    
                    state <= DONE_STATE;
                end
                
                DONE_STATE: begin
                    done <= 1;
                    if (!start) state <= IDLE;
                end
                
                default: state <= IDLE;
            endcase
        end
    end

endmodule
