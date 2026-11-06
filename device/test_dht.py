import time
import pigpio

DHT_PIN = 4  # GPIO4 = pin físico 7


class DHT11:
    """Lee un DHT11 usando pigpio para medir pulsos con precisión de microsegundos."""

    def __init__(self, pi: pigpio.pi, gpio: int):
        self.pi = pi
        self.gpio = gpio
        self._altos: list[int] = []   # duración (µs) de cada pulso en alto
        self._ultimo_tick = 0
        self._escuchando = False
        pi.set_pull_up_down(gpio, pigpio.PUD_UP)
        # Cada vez que el cable cambie (subida o bajada), pigpio llama a _flanco
        self._cb = pi.callback(gpio, pigpio.EITHER_EDGE, self._flanco)

    def _flanco(self, gpio: int, nivel: int, tick: int) -> None:
        # tick = microsegundos medidos por el daemon (precisos)
        duracion = pigpio.tickDiff(self._ultimo_tick, tick)
        self._ultimo_tick = tick
        # Si el cable acaba de BAJAR (nivel 0), terminó un pulso en alto
        if self._escuchando and nivel == 0:
            self._altos.append(duracion)

    def leer(self) -> tuple[float, float] | None:
        self._altos = []
        self._escuchando = True
        self._ultimo_tick = self.pi.get_current_tick()

        # 1. Despertar al sensor: cable en bajo ~20 ms y luego soltarlo
        self.pi.set_mode(self.gpio, pigpio.OUTPUT)
        self.pi.write(self.gpio, 0)
        time.sleep(0.02)
        self.pi.set_mode(self.gpio, pigpio.INPUT)

        # 2. Esperar a que el sensor mande todo (~5 ms; damos margen)
        time.sleep(0.1)
        self._escuchando = False

        if len(self._altos) < 40:
            return None  # no llegaron todos los bits

        # 3. Los últimos 40 pulsos son los datos: largo = 1, corto = 0
        bits = [1 if d > 50 else 0 for d in self._altos[-40:]]

        # 4. Agrupar de a 8 bits -> 5 bytes
        datos = [int("".join(map(str, bits[i * 8:(i + 1) * 8])), 2) for i in range(5)]
        hum_ent, hum_dec, temp_ent, temp_dec, checksum = datos

        # 5. Validar: la suma de los 4 primeros bytes debe dar el checksum
        if (sum(datos[:4]) & 0xFF) != checksum:
            return None

        humedad = hum_ent + hum_dec / 10
        temperatura = temp_ent + (temp_dec & 0x7F) / 10
        if temp_dec & 0x80:  # el bit más alto indica temperatura negativa
            temperatura = -temperatura
        return temperatura, humedad

    def cerrar(self) -> None:
        self._cb.cancel()


pi = pigpio.pi()
if not pi.connected:
    raise SystemExit("No me pude conectar a pigpiod. ¿Está corriendo?")

sensor = DHT11(pi, DHT_PIN)
try:
    for _ in range(5):
        resultado = sensor.leer()
        if resultado is None:
            print("Lectura fallida (pasa a veces con el DHT11), reintento...")
        else:
            temperatura, humedad = resultado
            print(f"Temperatura: {temperatura:.1f} °C   Humedad: {humedad:.1f} %")
        time.sleep(2)  # el DHT11 necesita ~1-2 s entre lecturas
finally:
    sensor.cerrar()
    pi.stop()
