#include <Arduino.h>
#include <ArduinoJson.h>
#include <SoftwareSerial.h>
#include <ESP8266WiFi.h>
#include <ArduinoWebsockets.h>
using namespace websockets;

// outputs pin
#define lamp D3
#define fan D4
#define buzzer D0
const int outputs[] = {lamp, fan, buzzer};

// ir
#define irDalam D6
#define irLuar D5
const int inputs[] = {irDalam, irLuar};

void pinInit();

// Websocket
void WebsocketInit();
void WebsocketRun();
extern bool activated;

// Security
extern bool securityMode;


// room detection
extern volatile int jumlahOrang;
void RoomDetectionInit();
void RoomDetectionRun();

// Software serial
extern SoftwareSerial nano;
extern bool connectedToNano;
void SerialInit();
void SerialRun();