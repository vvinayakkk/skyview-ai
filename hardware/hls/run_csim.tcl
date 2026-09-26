# ============================================================================
# VITIS HLS - C Simulation Script
# ============================================================================
# 
# Usage: vitis_hls -f run_csim.tcl
# 
# This script runs the C-level simulation to verify functional correctness
# before synthesizing to RTL.
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

# Configure for Vivado IP export
config_export -format ip_catalog \
              -output ./ip_export \
              -display_name "Sensor Fusion Accelerator" \
              -vendor "hackathon" \
              -version "1.0"

# ============================================================================
# RUN C SIMULATION
# ============================================================================

puts ""
puts "═══════════════════════════════════════════════════════════════"
puts "  Running C Simulation..."
puts "═══════════════════════════════════════════════════════════════"
puts ""

# Run C simulation
csim_design

puts ""
puts "═══════════════════════════════════════════════════════════════"
puts "  C Simulation Complete!"
puts "  Check console output for test results."
puts "═══════════════════════════════════════════════════════════════"
puts ""

# Exit
exit
