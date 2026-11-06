import json
import os
import ssl
import threading
import time
from pathlib import Path

import paho.mqtt.client as mqtt
import pigpio
from dotenv import load_dotenv

from rack_device.dht11 import DHT11

# ---------- Configuración ----------
load_dotenv()
ENDPOINT = os.environ["AWS_IOT_ENDPOINT"]
THING = os.getenv("THING_NAME", "rack01")
INTERVALO = int(os.getenv("PUBLISH_INTERVAL", "10"))

CERTS = Path(__file__).resolve().parents[2] / "certs"  # .../device/certs
TOPIC_TELEMETRIA = f"datacenter/{THING}/telemetry"
TOPIC_COMANDOS = f"datacenter/{THING}/commands"

DHT_PIN = 4
SERVO_PIN = 18
PULSO_MIN, PULSO_MAX = 600, 2400

# ---------- Hardware y estado ----------
pi = pigpio.pi()
if not pi.connected:
    raise SystemExit("pigpiod no está corriendo")
sensor = DHT11(pi, DHT_PIN)
angulo_compuerta = 0           # posición actual de la compuerta (servo)
ultima_lectura = None          # (temperatura, humedad) más reciente
conectado = threading.Event()  # bandera segura entre hilos


def mover_compuerta(angulo: int) -> None:
    global angulo_compuerta
    angulo = max(0, min(180, int(angulo)))
    pulso = int(PULSO_MIN + angulo / 180 * (PULSO_MAX - PULSO_MIN))
    pi.set_servo_pulsewidth(SERVO_PIN, pulso)
    angulo_compuerta = angulo
    # Tras 1 s dejamos de mandar pulsos: el servo ya llegó y así no zumba
    threading.Timer(1.0, lambda: pi.set_servo_pulsewidth(SERVO_PIN, 0)).start()
    print(f"[SERVO] Compuerta a {angulo}°")


def leer_con_reintentos(intentos: int = 3):
    for _ in range(intentos):
        resultado = sensor.leer()
        if resultado:
            return resultado
        time.sleep(2)
    return None


def publicar_estado() -> None:
    """Publica la última lectura + la posición actual de la compuerta."""
    if ultima_lectura is None:
        return
    temperatura, humedad = ultima_lectura
    payload = {
        "device_id": THING,
        "ts": int(time.time() * 1000),  # epoch en milisegundos
        "temperature": temperatura,
        "humidity": humedad,
        "damper_angle": angulo_compuerta,
    }
    info = client.publish(TOPIC_TELEMETRIA, json.dumps(payload), qos=1)
    print(f"[PUB] {payload} (mid={info.mid})")


# ---------- Callbacks MQTT ----------
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code.is_failure:
        print(f"[MQTT] Falló la conexión: {reason_code}")
        return
    print("[MQTT] Conectado a AWS IoT")
    client.subscribe(TOPIC_COMANDOS, qos=1)  # se re-suscribe en cada reconexión
    conectado.set()


def on_disconnect(client, userdata, flags, reason_code, properties):
    conectado.clear()
    print(f"[MQTT] Desconectado ({reason_code}), paho reintentará solo...")


def on_message(client, userdata, msg):
    try:
        comando = json.loads(msg.payload)
        print(f"[CMD] Recibido: {comando}")
        if "damper_angle" in comando:
            mover_compuerta(comando["damper_angle"])
            publicar_estado()  # confirmamos al instante, sin esperar el ciclo
    except (json.JSONDecodeError, ValueError, TypeError) as e:
        print(f"[CMD] Comando inválido: {msg.payload!r} ({e})")


# ---------- Cliente MQTT ----------
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=THING)
client.tls_set(
    ca_certs=str(CERTS / "AmazonRootCA1.pem"),
    certfile=str(CERTS / "device.pem.crt"),
    keyfile=str(CERTS / "private.pem.key"),
    tls_version=ssl.PROTOCOL_TLS_CLIENT,
)
client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_message = on_message
client.reconnect_delay_set(min_delay=1, max_delay=60)  # backoff exponencial


def main():
    global ultima_lectura

    mover_compuerta(0)  # arrancamos con la compuerta cerrada
    client.connect(ENDPOINT, 8883, keepalive=60)
    client.loop_start()  # hilo aparte: red, pings y reconexiones

    if not conectado.wait(timeout=30):
        raise SystemExit("No se pudo conectar a AWS IoT en 30 s")

    try:
        while True:
            lectura = leer_con_reintentos()
            if lectura:
                ultima_lectura = lectura
                publicar_estado()
            else:
                print("[DHT] No se pudo leer el sensor")
            time.sleep(INTERVALO)
    except KeyboardInterrupt:
        print("Saliendo...")
    finally:
        client.loop_stop()
        client.disconnect()
        sensor.cerrar()
        pi.set_servo_pulsewidth(SERVO_PIN, 0)
        pi.stop()


if __name__ == "__main__":
    main()
