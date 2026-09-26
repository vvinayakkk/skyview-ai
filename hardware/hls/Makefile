# ============================================================================
# Makefile for Vitis HLS Accelerator
# ============================================================================
#
# Usage:
#   make csim     - Run C simulation
#   make synth    - Run full synthesis
#   make clean    - Clean generated files
#   make gui      - Open Vitis HLS GUI
#
# ============================================================================

# Vitis HLS installation path (modify if needed)
VITIS_HLS ?= vitis_hls

# Project settings
PROJECT = sensor_fusion_prj
SOLUTION = solution1
TOP_FUNC = fusion_accelerator

# Source files
SRCS = sensor_fusion.cpp
HDRS = sensor_fusion.h
TB = sensor_fusion_tb.cpp

# Default target
.PHONY: all
all: synth

# Run C simulation only
.PHONY: csim
csim:
	@echo "════════════════════════════════════════════════════════"
	@echo "  Running C Simulation..."
	@echo "════════════════════════════════════════════════════════"
	$(VITIS_HLS) -f run_csim.tcl

# Run full synthesis flow
.PHONY: synth
synth:
	@echo "════════════════════════════════════════════════════════"
	@echo "  Running Full Synthesis Flow..."
	@echo "════════════════════════════════════════════════════════"
	$(VITIS_HLS) -f run_synth.tcl

# Open GUI for interactive work
.PHONY: gui
gui:
	@echo "Opening Vitis HLS GUI..."
	$(VITIS_HLS) -p $(PROJECT) &

# View synthesis report
.PHONY: report
report:
	@echo "════════════════════════════════════════════════════════"
	@echo "  Synthesis Report"
	@echo "════════════════════════════════════════════════════════"
	@cat $(PROJECT)/$(SOLUTION)/syn/report/$(TOP_FUNC)_csynth.rpt 2>/dev/null || \
		echo "Report not found. Run 'make synth' first."

# View resource utilization
.PHONY: resources
resources:
	@echo "════════════════════════════════════════════════════════"
	@echo "  Resource Utilization"
	@echo "════════════════════════════════════════════════════════"
	@grep -A 20 "Utilization Estimates" \
		$(PROJECT)/$(SOLUTION)/syn/report/$(TOP_FUNC)_csynth.rpt 2>/dev/null || \
		echo "Report not found. Run 'make synth' first."

# View timing information
.PHONY: timing
timing:
	@echo "════════════════════════════════════════════════════════"
	@echo "  Timing Information"
	@echo "════════════════════════════════════════════════════════"
	@grep -A 10 "Timing" \
		$(PROJECT)/$(SOLUTION)/syn/report/$(TOP_FUNC)_csynth.rpt 2>/dev/null || \
		echo "Report not found. Run 'make synth' first."

# Clean generated files
.PHONY: clean
clean:
	@echo "Cleaning generated files..."
	rm -rf $(PROJECT)
	rm -rf ip_export
	rm -rf .autopilot
	rm -rf .Xil
	rm -rf *.log
	rm -rf vitis_hls.log
	@echo "Clean complete."

# Deep clean (including Vivado files if any)
.PHONY: distclean
distclean: clean
	rm -rf vivado*
	rm -rf .vivado*
	rm -rf *.jou
	rm -rf *.str

# Help
.PHONY: help
help:
	@echo "════════════════════════════════════════════════════════"
	@echo "  Vitis HLS Makefile - Available Targets"
	@echo "════════════════════════════════════════════════════════"
	@echo ""
	@echo "  make csim      - Run C simulation only"
	@echo "  make synth     - Run full synthesis flow"
	@echo "  make gui       - Open Vitis HLS GUI"
	@echo "  make report    - View synthesis report"
	@echo "  make resources - View resource utilization"
	@echo "  make timing    - View timing information"
	@echo "  make clean     - Clean generated files"
	@echo "  make distclean - Deep clean all generated files"
	@echo "  make help      - Show this help message"
	@echo ""
