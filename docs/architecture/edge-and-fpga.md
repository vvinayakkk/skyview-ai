# ⚡ Edge Computing & FPGA Hardware Acceleration

SkyView AG-RIN combines ultra-low-power field sensors with hardware-accelerated edge intelligence. In rural agricultural zones with intermittent internet connectivity, real-time edge processing guarantees that farmers receive instantaneous warnings for frost, heat stress, and fungal pathogen outbreaks.

---

## 🔬 AMD Xilinx Vivado HLS Core

### Mathematical Formulation
The edge core implements hardware-synthesized C/C++ kernels for the **FAO-56 Penman-Monteith Evapotranspiration ($ET_0$)** and **Vapor Pressure Deficit (VPD)** equations:

$$VPD = e_s - e_a = 0.61078 \times \exp\left(\frac{17.27 \times T}{T + 237.3}\right) \times \left(1 - \frac{RH}{100}\right)$$

$$ET_0 = \frac{0.408 \Delta (R_n - G) + \gamma \frac{900}{T + 273} u_2 (e_s - e_a)}{\Delta + \gamma (1 + 0.34 u_2)}$$

### AXI4-Lite Register Map
The Vivado HLS kernel exposes memory-mapped registers via an AXI4-Lite slave interface:

| Offset | Register Name | Direction | Bit Width | Description |
| :--- | :--- | :--- | :--- | :--- |
| `0x00` | `AP_CTRL` | R/W | 32-bit | Control signals (`[0]=start, [1]=done, [2]=idle, [3]=ready`) |
| `0x10` | `DATA_TEMP_IN` | In | 32-bit float | Ambient Air Temperature in °C |
| `0x18` | `DATA_HUM_IN` | In | 32-bit float | Relative Humidity (0.0 to 100.0%) |
| `0x20` | `DATA_WIND_IN` | In | 32-bit float | Wind Speed in m/s ($u_2$) |
| `0x28` | `DATA_RAD_IN` | In | 32-bit float | Solar Net Radiation ($R_n$ in $MJ/m^2/day$) |
| `0x30` | `DATA_SOIL_IN` | In | 32-bit float | Soil Moisture Volumetric Water Content (%) |
| `0x40` | `RES_ET0_OUT` | Out | 32-bit float | Calculated $ET_0$ Reference Evapotranspiration (mm/day) |
| `0x48` | `RES_VPD_OUT` | Out | 32-bit float | Vapor Pressure Deficit (kPa) |
| `0x50` | `RES_RISK_OUT` | Out | 32-bit int | Disease Risk Score (`0=Optimal, 1=Watch, 2=Severe Alert`) |

---

## 📡 LoRaWAN Field Telemetry Flow

The ESP32 node packages raw readings into an 18-byte binary packet transmitted via LoRa SX1276:

```
+------------+------------+------------+------------+------------+------------+------------+
| Station ID | Timestamp  | Temp (°C)  | Hum (%)    | Soil VWC%  | Rain (mm)  | CRC16      |
|  (2 bytes) |  (4 bytes) |  (2 bytes) |  (2 bytes) |  (2 bytes) |  (2 bytes) | (2 bytes)  |
+------------+------------+------------+------------+------------+------------+------------+
```

### Power Efficiency Profile
- **Active Transmission (Tx):** 120 mA for 180 ms every 5 minutes.
- **Deep Sleep (Hibernate):** 15 µA standby consumption.
- **Power Autonomy:** An integrated 10W solar panel and 6400mAh LiFePO4 battery pack allows the AgriSense WS01 station to operate indefinitely without grid power.
