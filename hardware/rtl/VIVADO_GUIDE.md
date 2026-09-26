# Vivado Integration Guide - Sensor Fusion Accelerator
## Direct RTL Integration (No HLS Required)

This guide shows how to integrate the Verilog sensor fusion accelerator into Vivado for the ZC706 board.

---

## Files Overview

```
rtl/
├── sensor_fusion_pkg.vh    # Parameters and constants
├── sensor_fusion.v         # Core accelerator (5-cycle, 4 DSP48)
├── sensor_fusion_axi.v     # AXI4-Lite wrapper
└── sensor_fusion_tb.v      # Simulation testbench
```

---

## Step 1: Create Vivado Project

### 1.1 Launch Vivado 2025.2
- Open Vivado from Start Menu

### 1.2 Create New Project
1. **File → Project → New**
2. Project name: `sensor_fusion_zc706`
3. Project location: `C:\Users\Anuj\A_V_N\agentic\vivado`
4. Project type: **RTL Project**
5. Click **Next**

### 1.3 Add RTL Sources
1. Click **Add Files**
2. Navigate to `C:\Users\Anuj\A_V_N\agentic\rtl\`
3. Select:
   - `sensor_fusion_pkg.vh`
   - `sensor_fusion.v`
   - `sensor_fusion_axi.v`
4. Check **Copy sources into project**
5. Click **Next**

### 1.4 Add Simulation Sources (Optional)
1. Click **Add Files**
2. Select `sensor_fusion_tb.v`
3. Set as **Simulation Only**
4. Click **Next**

### 1.5 Select Part
1. Click **Boards** tab
2. Search for **ZC706**
3. Select **Zynq-7000 ZC706 Evaluation Board**
4. Click **Next → Finish**

---

## Step 2: Package as Custom IP

### 2.1 Create IP Package
1. **Tools → Create and Package New IP**
2. Select **Package your current project**
3. Click **Next**
4. IP location: Keep default or choose `C:\Users\Anuj\A_V_N\agentic\ip_repo`
5. Click **Finish**

### 2.2 Configure IP
1. In the Package IP window:
   - **Identification**: 
     - Name: `sensor_fusion_axi`
     - Version: `1.0`
     - Vendor: `user.org`
     - Description: `Sensor Fusion Accelerator with AXI4-Lite`
   
   - **File Groups**: Verify all RTL files are included
   
   - **Ports and Interfaces**:
     - Click **Infer Interfaces** (should detect AXI4-Lite)
     - Verify `S_AXI` interface is recognized
   
   - **Addressing and Memory**:
     - Range: 256 bytes (0x100)
     - Base address: Auto-assigned

2. Click **Review and Package → Package IP**

---

## Step 3: Create Block Design

### 3.1 New Block Design
1. **Create Block Design**
2. Name: `sensor_fusion_system`
3. Click **OK**

### 3.2 Add Zynq Processing System
1. Click **+ (Add IP)**
2. Search: `Zynq`
3. Add **ZYNQ7 Processing System**
4. Double-click to configure:
   - Apply **ZC706 Preset**
   - Enable **M_AXI_GP0** (PS-PL interface)
   - Enable **FCLK_CLK0** at 100 MHz
5. Click **OK**

### 3.3 Add Your Custom IP
1. Click **+ (Add IP)**
2. Search: `sensor_fusion`
3. Add **sensor_fusion_axi_v1_0**

### 3.4 Run Connection Automation
1. Click **Run Connection Automation**
2. Check **All Automation**
3. Click **OK**

This will automatically:
- Connect `S_AXI` to Zynq's `M_AXI_GP0`
- Connect clocks and resets
- Add AXI Interconnect if needed

### 3.5 Connect Interrupt (Optional)
1. Click the `interrupt` port on sensor_fusion_axi
2. Connect to **ZYNQ7 → IRQ_F2P[0:0]**
3. (Enable IRQ_F2P in Zynq PS configuration if not already)

### 3.6 Validate Design
1. Click **Validate Design** (checkmark icon)
2. Should show "Validation successful"

---

## Step 4: Generate Bitstream

### 4.1 Create HDL Wrapper
1. In Sources panel, right-click block design
2. Select **Create HDL Wrapper**
3. Choose **Let Vivado manage wrapper**
4. Click **OK**

### 4.2 Generate Bitstream
1. Click **Generate Bitstream**
2. Select **Yes** to run synthesis and implementation
3. Wait for completion (10-30 minutes)

### 4.3 Export Hardware
1. **File → Export → Export Hardware**
2. Include bitstream: **Yes**
3. Export location: `C:\Users\Anuj\A_V_N\agentic\vivado\sensor_fusion_zc706`
4. File name: `sensor_fusion_system.xsa`
5. Click **OK**

---

## Step 5: Memory Map

The accelerator will be mapped to PS address space. View in **Address Editor**:

| Register | Offset | Access | Description |
|----------|--------|--------|-------------|
| CONTROL | 0x00 | R/W | [0]=start, [1]=reset, [31]=busy |
| STATUS | 0x04 | R | [3:0]=status, [6:4]=alert |
| SOIL_IN | 0x08 | R/W | Soil moisture (Q8.8) |
| TEMP_IN | 0x0C | R/W | Temperature (Q8.8) |
| HUMID_IN | 0x10 | R/W | Humidity (Q8.8) |
| LIGHT_IN | 0x14 | R/W | Light level (Q8.8) |
| FUSION_OUT | 0x18 | R | Fusion score (Q8.8) |
| STRESS_OUT | 0x1C | R | Stress index (Q8.8) |
| TIMESTAMP | 0x20 | R | Processing timestamp |
| VERSION | 0x24 | R | IP version (0x00010000) |

Default base address: **0x43C00000** (check Address Editor)

---

## Step 6: Run Simulation (Optional)

### In Vivado
1. In Flow Navigator, click **Run Simulation → Run Behavioral Simulation**
2. Simulation will run with `sensor_fusion_tb.v`
3. View waveforms in the simulator

### Expected Output
```
=========================================================
Sensor Fusion Accelerator Testbench
Target: Zynq-7000 ZC706 @ 100 MHz
=========================================================

--- Test: Optimal Conditions ---
Inputs: Soil=50.0%, Temp=50.0°C, Humid=50.0%, Light=50.0%
Results: Fusion=50.00, Stress=0.00, Alert=NONE

...

Measured latency: 5 clock cycles
PASS: Latency matches specification (5 cycles)
```

---

## Step 7: Software Access (Python)

Update `fpga_interface.py` to use memory-mapped I/O:

```python
import mmap
import struct

class FPGAInterface:
    def __init__(self, base_addr=0x43C00000):
        self.base = base_addr
        self.mem_file = open('/dev/mem', 'r+b')
        self.mem = mmap.mmap(
            self.mem_file.fileno(),
            256,  # Register space size
            offset=base_addr
        )
    
    def to_q88(self, value):
        """Convert float to Q8.8 fixed-point"""
        return int(value * 256) & 0xFFFF
    
    def from_q88(self, value):
        """Convert Q8.8 to float"""
        return value / 256.0
    
    def run_fusion(self, soil, temp, humid, light):
        # Write sensor values
        self.write_reg(0x08, self.to_q88(soil))
        self.write_reg(0x0C, self.to_q88(temp))
        self.write_reg(0x10, self.to_q88(humid))
        self.write_reg(0x14, self.to_q88(light))
        
        # Start processing
        self.write_reg(0x00, 0x01)
        
        # Wait for done (busy flag clear)
        while self.read_reg(0x00) & 0x80000000:
            pass
        
        # Read results
        fusion = self.from_q88(self.read_reg(0x18))
        stress = self.from_q88(self.read_reg(0x1C))
        status = self.read_reg(0x04)
        alert = (status >> 4) & 0x7
        
        return {
            'fusion_score': fusion,
            'stress_index': stress,
            'alert_level': alert
        }
    
    def write_reg(self, offset, value):
        self.mem.seek(offset)
        self.mem.write(struct.pack('<I', value))
    
    def read_reg(self, offset):
        self.mem.seek(offset)
        return struct.unpack('<I', self.mem.read(4))[0]
```

---

## Resource Estimates

| Resource | Estimated | ZC706 Available |
|----------|-----------|-----------------|
| LUT | ~200 | 218,600 |
| FF | ~150 | 437,200 |
| DSP48 | 4 | 900 |
| BRAM | 0 | 545 |

---

## Troubleshooting

### "Cannot find file sensor_fusion_pkg.vh"
- Ensure include path is set: **Project Settings → Verilog Options → Include Directories**
- Add: `C:\Users\Anuj\A_V_N\agentic\rtl`

### AXI Interface Not Detected
- Manually add interface in Package IP:
  - **Ports and Interfaces → Add Interface → AXI4-Lite Slave**
  - Map ports: ACLK, ARESETN, AW*, W*, B*, AR*, R*

### Timing Failures
- The design targets 100 MHz, which is very conservative
- If failures occur, try reducing to 50 MHz in Zynq PS settings

---

## Next Steps

1. Generate bitstream
2. Export XSA file
3. Update Python interface for PYNQ or bare-metal
4. Connect to your LangGraph agent backend
5. Test end-to-end with MQTT sensor data
