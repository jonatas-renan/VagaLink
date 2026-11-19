/*
  VagaLink - firmware do ESP32
  Lê 4 sensores ultrassônicos HC-SR04 e envia as distâncias (cm) para a tabela
  "sensores" do Supabase, via HTTPS, cerca de uma vez por segundo.

  Placa no Arduino IDE: "ESP32 Dev Module"    Monitor serial: 115200

  Ligações (HC-SR04 de 5 V):
    VCC  -> VIN (5 V)        GND -> GND (comum)
    TRIG -> GPIO 12, 13, 14, 15  (sensores 1 a 4, direto)
    ECHO -> resistor 1 kOhm -> GPIO 16, 17, 18, 19
            e, no mesmo ponto do GPIO, resistor 2 kOhm para o GND
            (divisor de tensão: 5 V -> ~3,3 V)

  Antes de gravar, preencha WIFI_SSID, WIFI_PASS, URL e API_KEY.
  Nunca publique este arquivo com as suas senhas preenchidas.
*/
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ====== CONFIGURAÇÃO ======
const char* WIFI_SSID = "SEU_WIFI_2.4GHZ";
const char* WIFI_PASS = "SUA_SENHA";
const char* URL = "https://SEU_PROJETO.supabase.co/rest/v1/sensores?on_conflict=sensor_id";
const char* API_KEY = "sb_publishable_XXXXXXXX";   // só a chave publishable

const int TRIG[4] = {12, 13, 14, 15};
const int ECHO[4] = {16, 17, 18, 19};
const unsigned long INTERVALO_MS = 1000;

unsigned long ultimoEnvio = 0;

// ====== SENSORES ======
float lerDistanciaCm(int trig, int echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long dur = pulseIn(echo, HIGH, 30000);   // timeout 30 ms
  if (dur == 0) return -1;                 // sem eco
  return dur * 0.0343 / 2.0;
}

// ====== WI-FI ======
bool conectarWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Conectando ao Wi-Fi");
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 20000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWi-Fi conectado");
    return true;
  }
  Serial.println("\nFalha ao conectar no Wi-Fi");
  return false;
}

// ====== SUPABASE ======
void enviarParaSupabase(float d[4]) {
  // Sensor sem leitura vai como null (o app e o painel tratam como "sem leitura")
  String body = "[";
  for (int i = 0; i < 4; i++) {
    body += "{\"sensor_id\":" + String(i + 1) + ",\"distancia_cm\":";
    body += (d[i] < 0) ? "null" : String(d[i], 1);
    body += "}";
    if (i < 3) body += ",";
  }
  body += "]";

  WiFiClientSecure client;
  client.setInsecure();   // OK para protótipo; em produção valide o certificado
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(client, URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", API_KEY);
  http.addHeader("Authorization", String("Bearer ") + API_KEY);
  http.addHeader("Prefer", "resolution=merge-duplicates,return=minimal");

  int code = http.POST(body);
  Serial.printf("Envio: %d\n", code);   // 200/201/204 = gravou
  if (code != 200 && code != 201 && code != 204) {
    Serial.println(http.getString());
  }
  http.end();
}

// ====== PROGRAMA ======
void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 4; i++) {
    pinMode(TRIG[i], OUTPUT);
    pinMode(ECHO[i], INPUT);
  }
  conectarWiFi();
}

void loop() {
  if (millis() - ultimoEnvio < INTERVALO_MS) return;
  ultimoEnvio = millis();

  float d[4];
  for (int i = 0; i < 4; i++) {
    d[i] = lerDistanciaCm(TRIG[i], ECHO[i]);
    delay(60);   // evita um sensor captar o eco do outro
  }
  Serial.printf("S1: %.1f | S2: %.1f | S3: %.1f | S4: %.1f cm\n", d[0], d[1], d[2], d[3]);

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi caiu, reconectando...");
    if (!conectarWiFi()) return;
  }
  enviarParaSupabase(d);
}
