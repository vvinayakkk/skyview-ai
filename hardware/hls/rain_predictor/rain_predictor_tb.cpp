/**
 * Rain Predictor HLS Testbench
 */

#include <iostream>
#include <iomanip>
#include "rain_predictor.cpp"

using namespace std;

// Helper to convert Q8.8 to float for output
float q88_to_float_display(q88_t v) {
    return (float)v / 256.0f;
}

void test_rain_predictor(const char* name, float temp, float humid, float press, float wind) {
    cout << "\n--- " << name << " ---" << endl;
    cout << "Inputs: T=" << temp << "°C, H=" << humid << "%, P=" << press << ", W=" << wind << " m/s" << endl;
    
    q88_t t = float_to_q88(temp);
    q88_t h = float_to_q88(humid);
    q88_t p = float_to_q88(press);
    q88_t w = float_to_q88(wind);
    
    q88_t rain_prob, stress_level;
    uint32_t alert_flag;
    
    rain_predictor_core(t, h, p, w, &rain_prob, &stress_level, &alert_flag);
    
    cout << "Rain Prob: " << fixed << setprecision(2) << q88_to_float_display(rain_prob) << "%" << endl;
    cout << "Stress Level: " << q88_to_float_display(stress_level) << "%" << endl;
    cout << "Rain Alert: " << (alert_flag ? "YES" : "NO") << endl;
}

int main() {
    cout << "========================================" << endl;
    cout << "  Rain Predictor HLS Testbench" << endl;
    cout << "========================================" << endl;
    
    // Test Case 1: Optimal rain conditions
    test_rain_predictor("Stormy (High Rain Risk)", 20.0, 95.0, 25.0, 12.0);
    
    // Test Case 2: Dry conditions
    test_rain_predictor("Dry (Low Rain Risk)", 35.0, 30.0, 60.0, 5.0);
    
    // Test Case 3: Warm & humid (summer thunderstorm)
    test_rain_predictor("Summer Storm", 28.0, 85.0, 35.0, 8.0);
    
    // Test Case 4: Cold & damp (spring rain)
    test_rain_predictor("Spring Rain", 12.0, 80.0, 40.0, 6.0);
    
    // Test Case 5: Extreme low pressure (cyclone risk)
    test_rain_predictor("Cyclone Risk", 25.0, 88.0, 15.0, 22.0);
    
    // Test Case 6: Mild conditions
    test_rain_predictor("Mild", 18.0, 55.0, 50.0, 3.0);
    
    cout << "\n========================================" << endl;
    cout << "  Testbench Complete!" << endl;
    cout << "========================================" << endl;
    
    return 0;
}
