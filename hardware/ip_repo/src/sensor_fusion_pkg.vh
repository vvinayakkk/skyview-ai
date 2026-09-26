//============================================================================
// Sensor Fusion Accelerator - Parameters and Constants
// Target: Zynq-7000 ZC706 (xc7z045ffg900-2)
// Clock: 100 MHz
//============================================================================

`ifndef SENSOR_FUSION_PKG_VH
`define SENSOR_FUSION_PKG_VH

// ============================================================================
// Fixed-Point Format: Q8.8 (8 integer bits, 8 fractional bits)
// Range: -128.0 to +127.996 with resolution of 0.00390625
// ============================================================================
localparam DATA_WIDTH = 16;
localparam FRAC_BITS  = 8;
localparam INT_BITS   = 8;

// ============================================================================
// Sensor Input Ranges (scaled to Q8.8)
// ============================================================================
// Soil Moisture: 0-100% -> 0x0000 to 0x6400
// Temperature:   -40 to 60°C -> 0xD800 to 0x3C00
// Humidity:      0-100% -> 0x0000 to 0x6400
// Light:         0-100000 lux -> scaled to 0-100

// ============================================================================
// Fusion Weights (Q8.8 format)
// Total should equal 1.0 (0x0100)
// ============================================================================
localparam [DATA_WIDTH-1:0] WEIGHT_SOIL  = 16'h0059;  // 0.35 * 256 = 89.6 ≈ 0x59
localparam [DATA_WIDTH-1:0] WEIGHT_TEMP  = 16'h0040;  // 0.25 * 256 = 64   = 0x40
localparam [DATA_WIDTH-1:0] WEIGHT_HUMID = 16'h0033;  // 0.20 * 256 = 51.2 ≈ 0x33
localparam [DATA_WIDTH-1:0] WEIGHT_LIGHT = 16'h0033;  // 0.20 * 256 = 51.2 ≈ 0x33

// ============================================================================
// Thresholds for Stress Score (Q8.8 format)
// ============================================================================
localparam [DATA_WIDTH-1:0] THRESH_CRITICAL = 16'h5000;  // 80.0
localparam [DATA_WIDTH-1:0] THRESH_HIGH     = 16'h3C00;  // 60.0
localparam [DATA_WIDTH-1:0] THRESH_MODERATE = 16'h2800;  // 40.0
localparam [DATA_WIDTH-1:0] THRESH_LOW      = 16'h1400;  // 20.0

// ============================================================================
// Status Codes
// ============================================================================
localparam [3:0] STATUS_IDLE       = 4'b0000;
localparam [3:0] STATUS_PROCESSING = 4'b0001;
localparam [3:0] STATUS_DONE       = 4'b0010;
localparam [3:0] STATUS_ERROR      = 4'b1111;

// ============================================================================
// Alert Levels
// ============================================================================
localparam [2:0] ALERT_NONE     = 3'b000;
localparam [2:0] ALERT_LOW      = 3'b001;
localparam [2:0] ALERT_MODERATE = 3'b010;
localparam [2:0] ALERT_HIGH     = 3'b011;
localparam [2:0] ALERT_CRITICAL = 3'b100;

// ============================================================================
// AXI-Lite Register Map (byte addresses)
// ============================================================================
localparam ADDR_CONTROL      = 8'h00;  // [0]=start, [1]=reset, [31]=busy
localparam ADDR_STATUS       = 8'h04;  // [3:0]=status, [6:4]=alert_level
localparam ADDR_SOIL_IN      = 8'h08;  // Soil moisture input
localparam ADDR_TEMP_IN      = 8'h0C;  // Temperature input
localparam ADDR_HUMID_IN     = 8'h10;  // Humidity input
localparam ADDR_LIGHT_IN     = 8'h14;  // Light level input
localparam ADDR_FUSION_OUT   = 8'h18;  // Fusion score output
localparam ADDR_STRESS_OUT   = 8'h1C;  // Stress index output
localparam ADDR_TIMESTAMP    = 8'h20;  // Processing timestamp
localparam ADDR_VERSION      = 8'h24;  // IP version (read-only)

// ============================================================================
// IP Version
// ============================================================================
localparam [31:0] IP_VERSION = 32'h0001_0000;  // v1.0.0

`endif // SENSOR_FUSION_PKG_VH
