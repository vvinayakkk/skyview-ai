# 🌾 AgriSense WS01 Hardware Station Specifications

The **AgriSense WS01** is a solar-powered agricultural micro-weather and soil monitoring station engineered for extreme field environments (IP66 weatherproof rating).

---

## 🛠 Bill of Materials (BOM)

| Component | Part Number / Model | Interface | Purpose |
| :--- | :--- | :--- | :--- |
| **Main Processing Unit** | ESP32-WROOM-32D | Dual Core 240MHz, 4MB Flash | Edge telemetry acquisition & packetizing |
| **LoRa Transceiver** | Semtech SX1276 (868/915 MHz) | SPI Bus | Long-range low-power RF communication (up to 12 km) |
| **Atmospheric Sensor** | Bosch BME280 | $I^2C$ (`0x76` or `0x77`) | Ambient Temperature, Humidity, Barometric Pressure |
| **Soil NPK Sensor** | RS485 Modbus Soil Probe | UART via MAX485 | Nitrogen, Phosphorus, Potassium, Moisture, EC |
| **Wind Speed** | Pulse Reed Anemometer | GPIO Interrupt | 1 pulse/sec = 2.4 km/h wind velocity |
| **Rain Gauge** | Tipping Bucket Mechanism | GPIO Interrupt | 0.2 mm rain per bucket tip |
| **Solar Power Subsystem** | 10W Monocrystalline Panel + CN3791 MPPT | Battery JST | Continuous charging for 6400mAh LiFePO4 cells |

---

## 🔌 ESP32 Pinout Configuration

| Sensor / Module | ESP32 Pin | Function |
| :--- | :--- | :--- |
| **BME280 SDA** | `GPIO 21` | $I^2C$ Data |
| **BME280 SCL** | `GPIO 22` | $I^2C$ Clock |
| **LoRa SCK** | `GPIO 18` | SPI Clock |
| **LoRa MISO** | `GPIO 19` | SPI Master-In Slave-Out |
| **LoRa MOSI** | `GPIO 23` | SPI Master-Out Slave-In |
| **LoRa NSS / CS** | `GPIO 5` | SPI Chip Select |
| **LoRa DIO0** | `GPIO 2` | Packet Interrupt |
| **Rain Gauge Pulse** | `GPIO 13` | Interrupt with Internal Pullup |
| **Anemometer Pulse** | `GPIO 14` | Interrupt with Internal Pullup |
| **MAX485 TX / RX** | `GPIO 16 / 17` | Hardware Serial 2 |

---

## 📐 Mechanical Enclosure
- **Housing:** Custom 3D printed PETG / Polycarbonate enclosure with Stevenson screen louvered radiation shield for accurate ambient temperature reading.
- **Mounting:** 1.5-inch galvanized steel mast mount with U-bolt brackets.
