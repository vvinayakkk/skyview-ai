# HLS Accelerator Source Files

## Sensor Fusion Accelerator for Zynq-7000

This directory contains the Vitis HLS C++ source code for the hardware accelerator.

### Files

| File | Description |
|------|-------------|
| `sensor_fusion.h` | Header file with constants, types, and function prototypes |
| `sensor_fusion.cpp` | Main accelerator implementation with HLS pragmas |
| `sensor_fusion_tb.cpp` | Comprehensive testbench for verification |
| `run_csim.tcl` | TCL script for C simulation only |
| `run_synth.tcl` | TCL script for full synthesis flow |

### Quick Start

#### Prerequisites
- Vitis HLS 2024.1 (or compatible version)
- ZC706 board files installed

#### 1. Run C Simulation
```bash
cd hls/
vitis_hls -f run_csim.tcl
```

#### 2. Run Full Synthesis
```bash
cd hls/
vitis_hls -f run_synth.tcl
```

This will:
1. Run C simulation (functional test)
2. Synthesize to RTL (Verilog)
3. Run co-simulation (verify RTL)
4. Export IP for Vivado

### Generated Output

After synthesis:
```
hls/
├── sensor_fusion_prj/
│   └── solution1/
│       ├── syn/
│       │   ├── verilog/         # Generated Verilog RTL
│       │   └── report/          # Synthesis reports
│       └── impl/
│           └── ip/              # Packaged IP
└── ip_export/                   # Final IP for Vivado
```

### Accelerator Specifications

| Metric | Value |
|--------|-------|
| Latency | 5 cycles (50ns @ 100MHz) |
| Throughput | II=1 (1 result/cycle) |
| DSP Usage | 4 slices |
| LUT Usage | ~1,200 |
| Interface | AXI-Lite (CTRL bundle) |
| Clock | 100 MHz |

### Register Map (AXI-Lite)

| Offset | Name | Access | Description |
|--------|------|--------|-------------|
| 0x00 | soil_moisture | R/W | Soil moisture % (float) |
| 0x04 | temperature | R/W | Temperature °C (float) |
| 0x08 | humidity | R/W | Humidity % (float) |
| 0x0C | wind_speed | R/W | Wind m/s (float) |
| 0x10 | risk_score | R | Computed risk (float) |
| 0x14 | risk_level | R | Risk level 0-4 (int) |

### Usage in Vivado

1. Open Vivado, create project for ZC706
2. Settings → IP → Repository → Add `ip_export/`
3. Create Block Design
4. Add Zynq PS, AXI Interconnect, fusion_accelerator
5. Run Connection Automation
6. Assign address: 0x43C00000
7. Generate Bitstream

### Integration with Python

The generated IP is designed to work with `fpga_interface.py`:

```python
from fpga_interface import FPGAInterface

fpga = FPGAInterface(base_address=0x43C00000)
risk = fpga.compute_fusion(
    soil=42.5,
    temp=31.2,
    humidity=67.8,
    wind=5.1
)
print(f"Risk score: {risk}")
```
