#include <OneWire.h>
#include <DallasTemperature.h>
#include <TimerOne.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>

#define VER_MAJOR 2
#define VER_MINOR 1
#define VER_BUILD 0

#define TEMP_PIN  7

OneWire oneWire(TEMP_PIN);
DallasTemperature sensors(&oneWire);
DeviceAddress insideThermometer;
Adafruit_BMP085 bmp;

float currentTemp = 0.00;
uint32_t currentPressure = 0;

void setup() {
  Serial.begin(115200);
  sensors.begin();
  sensors.getAddress(insideThermometer, 0);
  sensors.setResolution(insideThermometer, 12);
  bmp.begin();
  Timer1.initialize(800000);
  Timer1.attachInterrupt(sendTemp);
}

void loop() {
  if (Serial.available()) {
    if (Serial.read() == 0x42) {
      while (!Serial.available());
      switch (Serial.read()) {
        case 0x01:
          Serial.write(0x69);
          Serial.write(VER_MAJOR);
          Serial.write(VER_MINOR);
          Serial.write(VER_BUILD);
          break;
        case 0x02:
        {
          Serial.write(0x69);
          uint32_t val = currentTemp * 100;
          Serial.write((byte)(val >> 24));
          Serial.write((byte)(val >> 16));
          Serial.write((byte)(val >> 8));
          Serial.write((byte)(val));
          val = currentPressure;
          Serial.write((byte)(val >> 24));
          Serial.write((byte)(val >> 16));
          Serial.write((byte)(val >> 8));
          Serial.write((byte)(val));
          break;
        }
        default:
          break;
      }
    }
  }
}

void sendTemp(void) {
  sensors.requestTemperatures();
  currentTemp = sensors.getTempC(insideThermometer);
  currentPressure = bmp.readPressure();
}