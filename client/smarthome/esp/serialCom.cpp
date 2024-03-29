#include "header.h"

#define PINGGER true

// Hardware serial
#define Rx D3
#define Tx D4
// nano
// #define Rx 5
// #define Tx 6
SoftwareSerial nano(Rx, Tx);
String serialMsg = "";
bool fromSerial = false;
bool serialAvilable = true;
bool connectedToNano = false;

// serial function
String basicRes(String type)
{
    return String(F("{  \"type\": \"")) + type + F("\"}");
}
bool readSerial()
{
    bool msgPending = false;
    while (Serial.available())
    {
        serialMsg = Serial.readString();
        msgPending = true;
        fromSerial = true;
    }
    while (nano.available())
    {
        serialMsg = nano.readString();
        msgPending = true;
        fromSerial = false;
    }
    if (msgPending)
        Serial.println(String(F("Incoming from ")) + (fromSerial ? F("Serial") : F("nano")) + F(" :{\n ") + serialMsg + F("\n}\n "));
    return msgPending;
}
void Send(String msg, int size, bool toSerial = false)
{
    Serial.println(String(F("pending message with size of ")) + String(size) + F(" bytes"));
    if (!toSerial)
        nano.println(size);
    while (!readSerial())
        ;
    if (!toSerial)
        nano.println(msg);
    Serial.println(toSerial ? String(F("message: ")) + msg : String(F("sending to nano:{\n")) + msg + F("\n}"));
}
void sendError(String msg, int size, bool toSerial = false)
{
    DynamicJsonDocument error(size);
    error[F("type")] = F("error");
    error[F("err")] = msg;
    String out;
    serializeJson(error, out);
    Send(out, size, toSerial);
}

// initialize serial
void SerialInit()
{
    Serial.println(F("hello from esp"));
    delay(1000);
    do
    {
        Serial.println(F("connecting to nano..."));
        nano.begin(9600);
        delay(1000);
        nano.println();
    } while (!nano);
    Serial.println(F("\nconnected to nano\n"));
#if PINGGER
    Send(basicRes(F("ping")), 48);
#endif
}

// run serial
void SerialRun()
{
    /* Serial Comunication*/ {
        if (readSerial())
        {
            if (!fromSerial && !serialAvilable)
                return;
            unsigned int size = serialMsg.toInt();
            // if its not a valid number
            if (size <= 0)
            {
                Serial.println(String(F("invalid size, asumed as miscom.\nreceaved data is: ")) + serialMsg);
                return;
            }
            Serial.println(String(F("incoming msg with size of ")) + String(size) + F(" bytes"));
            DynamicJsonDocument doc(size);
            // if its from serial
            if (fromSerial)
                Serial.println(F("!"));
            else
                nano.println(F("!"));
            // wait for the data
            while (!readSerial())
                ;
            DeserializationError err = deserializeJson(doc, serialMsg);
            if (err)
            {
                String errorMsg = err.f_str();
                Serial.println(String(F("Error: ") + errorMsg));
                sendError(errorMsg, 192, fromSerial);
                return;
            }
            if (doc[F("type")] == F("ping"))
            {
                Send(basicRes("pong"), 48, fromSerial);
                serialAvilable = true;
                Serial.println(F("serial com activated from ping"));
#if !PINGGER
                connectedToNano = true;
#endif
                return;
            }
            if (doc[F("type")] == F("pong"))
            {
                serialAvilable = true;
                Serial.println(F("serial com activated from pong"));
#if PINGGER
                connectedToNano = true;
#endif
                return;
            }
            if (doc[F("type")] == F("disconnect!"))
            {
                Send(basicRes("disconnectForward"), 68);
                goto disconnectSerial;
            }
            if (doc[F("type")] == F("disconnectForward"))
                goto disconnectSerial;
        }
    }
    // simple "void"s
    return;
    // ↑ a stop sign for void loop

// disconnect other controller
disconnectSerial:
    Serial.println(F("disconnecting..."));
    serialAvilable = false;
    return;
}
