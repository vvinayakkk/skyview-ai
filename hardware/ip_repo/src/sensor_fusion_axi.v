//============================================================================
// Sensor Fusion Accelerator - AXI4-Lite Slave Wrapper
// Target: Zynq-7000 ZC706 (xc7z045ffg900-2)
// Interface: AXI4-Lite Slave (32-bit data, 8-bit address)
// Base Address: Configurable in Vivado Address Editor
//============================================================================

`timescale 1ns / 1ps
`include "sensor_fusion_pkg.vh"

module sensor_fusion_axi #(
    parameter C_S_AXI_DATA_WIDTH = 32,
    parameter C_S_AXI_ADDR_WIDTH = 8
) (
    // AXI4-Lite Slave Interface
    input  wire                              S_AXI_ACLK,
    input  wire                              S_AXI_ARESETN,
    
    // Write Address Channel
    input  wire [C_S_AXI_ADDR_WIDTH-1:0]     S_AXI_AWADDR,
    input  wire [2:0]                        S_AXI_AWPROT,
    input  wire                              S_AXI_AWVALID,
    output wire                              S_AXI_AWREADY,
    
    // Write Data Channel
    input  wire [C_S_AXI_DATA_WIDTH-1:0]     S_AXI_WDATA,
    input  wire [C_S_AXI_DATA_WIDTH/8-1:0]   S_AXI_WSTRB,
    input  wire                              S_AXI_WVALID,
    output wire                              S_AXI_WREADY,
    
    // Write Response Channel
    output wire [1:0]                        S_AXI_BRESP,
    output wire                              S_AXI_BVALID,
    input  wire                              S_AXI_BREADY,
    
    // Read Address Channel
    input  wire [C_S_AXI_ADDR_WIDTH-1:0]     S_AXI_ARADDR,
    input  wire [2:0]                        S_AXI_ARPROT,
    input  wire                              S_AXI_ARVALID,
    output wire                              S_AXI_ARREADY,
    
    // Read Data Channel
    output wire [C_S_AXI_DATA_WIDTH-1:0]     S_AXI_RDATA,
    output wire [1:0]                        S_AXI_RRESP,
    output wire                              S_AXI_RVALID,
    input  wire                              S_AXI_RREADY,
    
    // Interrupt Output (active high)
    output wire                              interrupt
);

    // ========================================================================
    // Internal Signals
    // ========================================================================
    
    // AXI4-Lite internal signals
    reg [C_S_AXI_ADDR_WIDTH-1:0] axi_awaddr;
    reg                         axi_awready;
    reg                         axi_wready;
    reg [1:0]                   axi_bresp;
    reg                         axi_bvalid;
    reg [C_S_AXI_ADDR_WIDTH-1:0] axi_araddr;
    reg                         axi_arready;
    reg [C_S_AXI_DATA_WIDTH-1:0] axi_rdata;
    reg [1:0]                   axi_rresp;
    reg                         axi_rvalid;
    
    // Register interface to accelerator
    reg  [DATA_WIDTH-1:0] reg_soil_in;
    reg  [DATA_WIDTH-1:0] reg_temp_in;
    reg  [DATA_WIDTH-1:0] reg_humid_in;
    reg  [DATA_WIDTH-1:0] reg_light_in;
    reg                   reg_start;
    reg                   soft_reset;
    
    wire [DATA_WIDTH-1:0] fusion_out;
    wire [DATA_WIDTH-1:0] stress_out;
    wire [2:0]            alert_level;
    wire [3:0]            accel_status;
    wire                  accel_busy;
    wire                  accel_done;
    
    // Timestamp counter
    reg [31:0] timestamp_counter;
    reg [31:0] last_timestamp;
    
    // ========================================================================
    // AXI4-Lite Output Assignments
    // ========================================================================
    assign S_AXI_AWREADY = axi_awready;
    assign S_AXI_WREADY  = axi_wready;
    assign S_AXI_BRESP   = axi_bresp;
    assign S_AXI_BVALID  = axi_bvalid;
    assign S_AXI_ARREADY = axi_arready;
    assign S_AXI_RDATA   = axi_rdata;
    assign S_AXI_RRESP   = axi_rresp;
    assign S_AXI_RVALID  = axi_rvalid;
    
    // Interrupt on done
    assign interrupt = accel_done;
    
    // ========================================================================
    // Write Address Ready
    // ========================================================================
    always @(posedge S_AXI_ACLK) begin
        if (!S_AXI_ARESETN) begin
            axi_awready <= 1'b0;
            axi_awaddr  <= 0;
        end else begin
            if (~axi_awready && S_AXI_AWVALID && S_AXI_WVALID) begin
                axi_awready <= 1'b1;
                axi_awaddr  <= S_AXI_AWADDR;
            end else begin
                axi_awready <= 1'b0;
            end
        end
    end
    
    // ========================================================================
    // Write Data Ready
    // ========================================================================
    always @(posedge S_AXI_ACLK) begin
        if (!S_AXI_ARESETN) begin
            axi_wready <= 1'b0;
        end else begin
            if (~axi_wready && S_AXI_WVALID && S_AXI_AWVALID) begin
                axi_wready <= 1'b1;
            end else begin
                axi_wready <= 1'b0;
            end
        end
    end
    
    // ========================================================================
    // Register Write Logic
    // ========================================================================
    wire slv_reg_wren = axi_wready && S_AXI_WVALID && axi_awready && S_AXI_AWVALID;
    
    always @(posedge S_AXI_ACLK) begin
        if (!S_AXI_ARESETN) begin
            reg_soil_in  <= 16'd0;
            reg_temp_in  <= 16'd0;
            reg_humid_in <= 16'd0;
            reg_light_in <= 16'd0;
            reg_start    <= 1'b0;
            soft_reset   <= 1'b0;
        end else begin
            reg_start  <= 1'b0;  // Auto-clear start
            soft_reset <= 1'b0;  // Auto-clear reset
            
            if (slv_reg_wren) begin
                case (axi_awaddr[7:2])  // Word address
                    ADDR_CONTROL[7:2]: begin
                        if (S_AXI_WSTRB[0]) begin
                            reg_start  <= S_AXI_WDATA[0];
                            soft_reset <= S_AXI_WDATA[1];
                        end
                    end
                    ADDR_SOIL_IN[7:2]: begin
                        if (S_AXI_WSTRB[0]) reg_soil_in[7:0]  <= S_AXI_WDATA[7:0];
                        if (S_AXI_WSTRB[1]) reg_soil_in[15:8] <= S_AXI_WDATA[15:8];
                    end
                    ADDR_TEMP_IN[7:2]: begin
                        if (S_AXI_WSTRB[0]) reg_temp_in[7:0]  <= S_AXI_WDATA[7:0];
                        if (S_AXI_WSTRB[1]) reg_temp_in[15:8] <= S_AXI_WDATA[15:8];
                    end
                    ADDR_HUMID_IN[7:2]: begin
                        if (S_AXI_WSTRB[0]) reg_humid_in[7:0]  <= S_AXI_WDATA[7:0];
                        if (S_AXI_WSTRB[1]) reg_humid_in[15:8] <= S_AXI_WDATA[15:8];
                    end
                    ADDR_LIGHT_IN[7:2]: begin
                        if (S_AXI_WSTRB[0]) reg_light_in[7:0]  <= S_AXI_WDATA[7:0];
                        if (S_AXI_WSTRB[1]) reg_light_in[15:8] <= S_AXI_WDATA[15:8];
                    end
                endcase
            end
        end
    end
    
    // ========================================================================
    // Write Response
    // ========================================================================
    always @(posedge S_AXI_ACLK) begin
        if (!S_AXI_ARESETN) begin
            axi_bvalid <= 1'b0;
            axi_bresp  <= 2'b00;
        end else begin
            if (axi_awready && S_AXI_AWVALID && ~axi_bvalid && axi_wready && S_AXI_WVALID) begin
                axi_bvalid <= 1'b1;
                axi_bresp  <= 2'b00;  // OKAY
            end else if (S_AXI_BREADY && axi_bvalid) begin
                axi_bvalid <= 1'b0;
            end
        end
    end
    
    // ========================================================================
    // Read Address Ready
    // ========================================================================
    always @(posedge S_AXI_ACLK) begin
        if (!S_AXI_ARESETN) begin
            axi_arready <= 1'b0;
            axi_araddr  <= 0;
        end else begin
            if (~axi_arready && S_AXI_ARVALID) begin
                axi_arready <= 1'b1;
                axi_araddr  <= S_AXI_ARADDR;
            end else begin
                axi_arready <= 1'b0;
            end
        end
    end
    
    // ========================================================================
    // Read Data
    // ========================================================================
    always @(posedge S_AXI_ACLK) begin
        if (!S_AXI_ARESETN) begin
            axi_rvalid <= 1'b0;
            axi_rresp  <= 2'b00;
            axi_rdata  <= 32'd0;
        end else begin
            if (axi_arready && S_AXI_ARVALID && ~axi_rvalid) begin
                axi_rvalid <= 1'b1;
                axi_rresp  <= 2'b00;  // OKAY
                
                case (axi_araddr[7:2])  // Word address
                    ADDR_CONTROL[7:2]:    axi_rdata <= {accel_busy, 31'd0};
                    ADDR_STATUS[7:2]:     axi_rdata <= {25'd0, alert_level, accel_status};
                    ADDR_SOIL_IN[7:2]:    axi_rdata <= {16'd0, reg_soil_in};
                    ADDR_TEMP_IN[7:2]:    axi_rdata <= {16'd0, reg_temp_in};
                    ADDR_HUMID_IN[7:2]:   axi_rdata <= {16'd0, reg_humid_in};
                    ADDR_LIGHT_IN[7:2]:   axi_rdata <= {16'd0, reg_light_in};
                    ADDR_FUSION_OUT[7:2]: axi_rdata <= {16'd0, fusion_out};
                    ADDR_STRESS_OUT[7:2]: axi_rdata <= {16'd0, stress_out};
                    ADDR_TIMESTAMP[7:2]:  axi_rdata <= last_timestamp;
                    ADDR_VERSION[7:2]:    axi_rdata <= IP_VERSION;
                    default:              axi_rdata <= 32'hDEADBEEF;
                endcase
            end else if (axi_rvalid && S_AXI_RREADY) begin
                axi_rvalid <= 1'b0;
            end
        end
    end
    
    // ========================================================================
    // Timestamp Counter
    // ========================================================================
    always @(posedge S_AXI_ACLK) begin
        if (!S_AXI_ARESETN) begin
            timestamp_counter <= 32'd0;
            last_timestamp    <= 32'd0;
        end else begin
            timestamp_counter <= timestamp_counter + 1;
            if (accel_done) begin
                last_timestamp <= timestamp_counter;
            end
        end
    end
    
    // ========================================================================
    // Sensor Fusion Core Instance
    // ========================================================================
    sensor_fusion u_sensor_fusion (
        .clk           (S_AXI_ACLK),
        .rst_n         (S_AXI_ARESETN && !soft_reset),
        
        .start         (reg_start),
        .done          (accel_done),
        .busy          (accel_busy),
        
        .soil_moisture (reg_soil_in),
        .temperature   (reg_temp_in),
        .humidity      (reg_humid_in),
        .light_level   (reg_light_in),
        
        .fusion_score  (fusion_out),
        .stress_index  (stress_out),
        .alert_level   (alert_level),
        .status        (accel_status)
    );

endmodule
