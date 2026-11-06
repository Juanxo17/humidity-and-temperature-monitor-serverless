import time
import pigpio

SERVO_PIN = 18  # GPIO18 = pin físico 12 (cable naranja)

# El SG90 entiende pulsos de ~600 µs (0°) a ~2400 µs (180°)
PULSO_MIN = 600
PULSO_MAX = 2400


def angulo_a_pulso(angulo: float) -> int:
    """Convierte grados (0-180) a microsegundos de pulso."""
    angulo = max(0, min(180, angulo))  # evita valores fuera de rango
    return int(PULSO_MIN + (angulo / 180) * (PULSO_MAX - PULSO_MIN))


pi = pigpio.pi()  # se conecta al daemon pigpiod
if not pi.connected:
    raise SystemExit("No me pude conectar a pigpiod. ¿Está corriendo?")

try:
    for angulo in (0, 90, 180, 90, 0):
        print(f"Moviendo a {angulo}° ({angulo_a_pulso(angulo)} µs)")
        pi.set_servo_pulsewidth(SERVO_PIN, angulo_a_pulso(angulo))
        time.sleep(1)  # le damos tiempo al servo de llegar
finally:
    pi.set_servo_pulsewidth(SERVO_PIN, 0)  # 0 = dejar de mandar pulsos
    pi.stop()  # cerramos la conexión con el daemon
