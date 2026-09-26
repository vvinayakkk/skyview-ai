/**
 * Rain Predictor AXI4-Lite Wrapper
 * Provides AXI4-Lite slave interface for rain predictor module
 */

// signal defination
module rain_predictor_axi (
    // AXI4-Lite Interface
    input clk,
    input rst_n,
    
    // Write address channel
    input [11:0] awaddr,
    input awvalid,
    output awready,
    
    // Write data channel
    input [31:0] wdata,
    input [3:0] wstrb,
    input wvalid,
    output wready,
    
    // Write response channel
    output [1:0] bresp,
    output bvalid,
    input bready,
    
    // Read address channel
    input [11:0] araddr,
    input arvalid,
    output arready,
    
    // Read data channel
    output [31:0] rdata,
    output [1:0] rresp,
    output rvalid,
    input rready
);

    // ===== REGISTER MAP =====
    // 0x00: CONTROL     (W) [0]=start, [31]=done (RO)
    // 0x04: STATUS      (R) Status flags
    // 0x08: TEMP_IN     (W) Temperature input (Q8.8)
    // 0x0C: HUMID_IN    (W) Humidity input (Q8.8)
    // 0x10: PRESS_IN    (W) Pressure input (Q8.8)
    // 0x14: WIND_IN     (W) Wind speed input (Q8.8)
    // 0x18: RAIN_OUT    (R) Rain probability output (Q8.8)
    // 0x1C: STRESS_OUT  (R) Stress level output (Q8.8)
    // 0x20: ALERT_OUT   (R) Alert flag
    // 0x24: TIMESTAMP   (R) Cycle counter
    // 0x28: VERSION     (R) IP version (0x00010000)

    // Internal registers
    reg [31:0] control_reg;
    reg [15:0] temp_in_reg;
    reg [15:0] humid_in_reg;
    reg [15:0] press_in_reg;
    reg [15:0] wind_in_reg;
    reg [31:0] timestamp_counter;
    
    // Wires for module outputs
    wire [15:0] rain_out_wire;
    wire [15:0] stress_out_wire;
    wire alert_out_wire;
    wire start_pulse;
    wire done_flag;
    
    // Registered copies of outputs
    reg [15:0] rain_out_reg;
    reg [15:0] stress_out_reg;
    reg alert_out_reg;
    
    // Instantiate rain predictor core
    rain_predictor rain_pred_inst (
        .clk(clk),
        .rst_n(rst_n),
        .temp_in(temp_in_reg),
        .humid_in(humid_in_reg),
        .press_in(press_in_reg),
        .wind_in(wind_in_reg),
        .rain_prob_out(rain_out_wire),
        .stress_level_out(stress_out_wire),
        .alert_flag_out(alert_out_wire),
        .start(start_pulse),
        .done(done_flag)
    );
    
    // Register the accelerator outputs for AXI read path
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            rain_out_reg <= 0;
            stress_out_reg <= 0;
            alert_out_reg <= 0;
        end else begin
            rain_out_reg <= rain_out_wire;
            stress_out_reg <= stress_out_wire;
            alert_out_reg <= alert_out_wire;
        end
    end
    
    // Start pulse (edge-triggered)
    reg start_r;
    assign start_pulse = control_reg[0] & ~start_r;
    
    // Timestamp counter
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            timestamp_counter <= 0;
        else
            timestamp_counter <= timestamp_counter + 1;
    end
    
    // Update start_r for edge detection
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n)
            start_r <= 0;
        else
            start_r <= control_reg[0];
    end
    
    // ===== AXI WRITE INTERFACE =====
    reg aw_active, w_active;
    reg [11:0] write_addr;
    
    assign awready = !aw_active;
    assign wready = !w_active;
    assign bvalid = aw_active & w_active;
    assign bresp = 2'b00;  // OKAY response
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            aw_active <= 0;
            w_active <= 0;
            write_addr <= 0;
        end else begin
            // Write address channel
            if (awvalid & awready) begin
                aw_active <= 1;
                write_addr <= awaddr;
            end
            
            // Write data channel
            if (wvalid & wready) begin
                w_active <= 1;
            end
            
            // Clear flags after response
            if (bvalid & bready) begin
                aw_active <= 0;
                w_active <= 0;
            end
        end
    end
    
    // Write data to registers
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            control_reg <= 0;
            temp_in_reg <= 0;
            humid_in_reg <= 0;
            press_in_reg <= 0;
            wind_in_reg <= 0;
        end else if (wvalid & wready) begin
            case (write_addr)
                12'h000: control_reg <= wdata;
                12'h008: temp_in_reg <= wdata[15:0];
                12'h00C: humid_in_reg <= wdata[15:0];
                12'h010: press_in_reg <= wdata[15:0];
                12'h014: wind_in_reg <= wdata[15:0];
                default: ;
            endcase
        end
    end
    
    // ===== AXI READ INTERFACE =====
    reg ar_active;
    reg [11:0] read_addr;
    reg [31:0] read_data;
    
    assign arready = !ar_active;
    assign rvalid = ar_active;
    assign rresp = 2'b00;  // OKAY response
    assign rdata = read_data;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            ar_active <= 0;
            read_addr <= 0;
        end else begin
            if (arvalid & arready) begin
                ar_active <= 1;
                read_addr <= araddr;
            end else if (rvalid & rready) begin
                ar_active <= 0;
            end
        end
    end
    
    // Read mux
    always @(*) begin
        case (read_addr)
            12'h000: read_data = {done_flag, 30'b0, control_reg[0]};  // CONTROL (done @ bit31)
            12'h004: read_data = {31'b0, alert_out_reg};             // STATUS
            12'h018: read_data = {16'b0, rain_out_reg};              // RAIN_OUT
            12'h01C: read_data = {16'b0, stress_out_reg};            // STRESS_OUT
            12'h020: read_data = {31'b0, alert_out_reg};             // ALERT_OUT
            12'h024: read_data = timestamp_counter;                  // TIMESTAMP
            12'h028: read_data = 32'h00010000;                       // VERSION
            default: read_data = 32'h00000000;
        endcase
    end

endmodule
