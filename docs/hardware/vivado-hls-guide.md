# 💎 AMD Xilinx Vivado HLS Synthesis Guide

SkyView offloads heavy matrix and exponential calculations (Penman-Monteith $ET_0$ and VPD) to an FPGA hardware-accelerated processing engine.

---

## 🛠 Prerequisites & Toolchain

- **Software:** AMD Vivado Design Suite / Vitis HLS 2024.1 or later.
- **Target Boards:**
  - Digilent PYNQ-Z2 (Zynq-7020 XC7Z020-1CLG400C)
  - AMD Xilinx Kria KV260 Vision AI Starter Kit
- **Host Interface:** Python PYNQ overlay or Linux kernel UIO / AXI driver.

---

## ⚡ Synthesis Workflow

```bash
# 1. Launch Vitis HLS in command line batch mode
vitis_hls -f scripts/run_hls.tcl
```

### Synthesis Directives (`directives.tcl`)
```tcl
# Function Level Interface Directives
set_directive_top "skyview_agri_core" "skyview_agri_core.cpp"
set_directive_interface -mode s_axilite -bundle CTRL_BUS "skyview_agri_core"
set_directive_interface -mode s_axilite -bundle DATA_BUS "skyview_agri_core" temp_in
set_directive_interface -mode s_axilite -bundle DATA_BUS "skyview_agri_core" hum_in
set_directive_interface -mode s_axilite -bundle DATA_BUS "skyview_agri_core" et0_out

# Pipeline Optimization
set_directive_pipeline -II 1 "skyview_agri_core/compute_loop"
```

---

## 📊 Hardware Resource Utilization (PYNQ-Z2)

| Resource | Available | Used | Utilization % |
| :--- | :--- | :--- | :--- |
| **LUT (Look-Up Tables)** | 53,200 | 4,120 | 7.7% |
| **FF (Flip-Flops)** | 106,400 | 5,840 | 5.5% |
| **DSP48 Slices** | 220 | 18 | 8.2% |
| **BRAM (Block RAM)** | 140 | 4 | 2.8% |

- **Target Clock:** 100 MHz (10.0 ns period)
- **Achieved Timing:** 7.82 ns (Worst Negative Slack: +2.18 ns)
- **Throughput:** 1 calculation every clock cycle (Initiation Interval = 1).
