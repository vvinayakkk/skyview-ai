# ============================================================================
# VITIS HLS - Complete Synthesis Script
# ============================================================================
# 
# Usage: vitis_hls -f run_synth.tcl
# 
# This script performs:
#   1. C Simulation (functional verification)
#   2. C Synthesis (generate RTL)
#   3. Co-simulation (verify RTL matches C)
#   4. Export IP (package for Vivado)
# 
# ============================================================================

# Create a new project
open_project sensor_fusion_prj

# Set the top-level function
set_top fusion_accelerator

# Add source files
add_files sensor_fusion.cpp
add_files sensor_fusion.h

# Add testbench files
add_files -tb sensor_fusion_tb.cpp

# Create solution for ZC706 (Zynq-7045)
open_solution "solution1" -flow_target vivado

# Set target device (ZC706 evaluation board)
set_part {xc7z045ffg900-2}

# Set clock period (100 MHz = 10ns)
create_clock -period 10 -name default

# ============================================================================
# CONFIGURATION OPTIONS
# ============================================================================

# Enable interface synthesis options
config_interface -m_axi_latency 0
config_interface -s_axilite_data32

# Optimization settings
config_compile -pipeline_loops 1
config_compile -enable_auto_rewind

# Export configuration
config_export -format ip_catalog \
              -output ./ip_export \
              -rtl verilog \
              -display_name "Sensor Fusion Accelerator" \
              -description "FPGA accelerator for agricultural sensor fusion" \
              -vendor "hackathon" \
              -library "hls" \
              -version "1.0" \
              -vivado_phys_opt place \
              -vivado_report_level 2

# ============================================================================
# STEP 1: C SIMULATION
# ============================================================================

puts ""
puts "╔═══════════════════════════════════════════════════════════════╗"
puts "║  STEP 1: C SIMULATION                                         ║"
puts "╚═══════════════════════════════════════════════════════════════╝"
puts ""

csim_design

# ============================================================================
# STEP 2: C SYNTHESIS
# ============================================================================

puts ""
puts "╔═══════════════════════════════════════════════════════════════╗"
puts "║  STEP 2: C SYNTHESIS (HLS → RTL)                              ║"
puts "╚═══════════════════════════════════════════════════════════════╝"
puts ""

csynth_design

# ============================================================================
# STEP 3: CO-SIMULATION (RTL Verification)
# ============================================================================

puts ""
puts "╔═══════════════════════════════════════════════════════════════╗"
puts "║  STEP 3: CO-SIMULATION (RTL Verification)                     ║"
puts "╚═══════════════════════════════════════════════════════════════╝"
puts ""

# Run co-simulation with Verilog
cosim_design -rtl verilog -trace_level all

# ============================================================================
# STEP 4: EXPORT IP FOR VIVADO
# ============================================================================

puts ""
puts "╔═══════════════════════════════════════════════════════════════╗"
puts "║  STEP 4: EXPORT IP FOR VIVADO                                 ║"
puts "╚═══════════════════════════════════════════════════════════════╝"
puts ""

export_design -rtl verilog -format ip_catalog

# ============================================================================
# SUMMARY
# ============================================================================

puts ""
puts "═══════════════════════════════════════════════════════════════"
puts "  SYNTHESIS COMPLETE!"
puts "═══════════════════════════════════════════════════════════════"
puts ""
puts "  Generated files:"
puts "    - RTL:     sensor_fusion_prj/solution1/syn/verilog/"
puts "    - Reports: sensor_fusion_prj/solution1/syn/report/"
puts "    - IP:      ip_export/"
puts ""
puts "  Next steps:"
puts "    1. Open Vivado"
puts "    2. Add IP repository: ip_export/"
puts "    3. Add IP to block design"
puts "    4. Connect to Zynq PS via AXI"
puts "    5. Generate bitstream"
puts ""
puts "═══════════════════════════════════════════════════════════════"
puts ""

# Exit
exit
