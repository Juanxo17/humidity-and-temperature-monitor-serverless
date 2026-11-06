"""API serverless del monitor de racks.

Rutas (API Gateway HTTP API, payload v2.0):
  GET  /readings?device_id=rack01&hours=1  -> lecturas desde DynamoDB
  POST /command  {"device_id": "rack01", "damper_angle": 90}  -> publica en IoT Core
"""
import json
import os
import re
import time
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ["TABLE_NAME"]
IOT_ENDPOINT = os.environ["IOT_ENDPOINT"]

table = boto3.resource("dynamodb").Table(TABLE_NAME)
iot = boto3.client("iot-data", endpoint_url=f"https://{IOT_ENDPOINT}")

DEVICE_RE = re.compile(r"^rack\d{2}$")  # solo nombres tipo rack01, rack02...


def _a_json(o):
    """DynamoDB devuelve números como Decimal: enteros -> int, resto -> float."""
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    return str(o)


def respuesta(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=_a_json),
    }


def get_readings(event):
    params = event.get("queryStringParameters") or {}
    device = params.get("device_id", "rack01")
    if not DEVICE_RE.match(device):
        return respuesta(400, {"error": "device_id inválido"})

    try:
        horas = min(float(params.get("hours", 1)), 168)  # máximo 7 días
    except ValueError:
        return respuesta(400, {"error": "hours inválido"})
    desde = int((time.time() - horas * 3600) * 1000)

    items, kwargs = [], {
        "KeyConditionExpression": Key("device_id").eq(device) & Key("ts").gte(desde)
    }
    while True:  # DynamoDB pagina los resultados: seguimos hasta traer todo
        resp = table.query(**kwargs)
        items.extend(resp["Items"])
        if "LastEvaluatedKey" not in resp or len(items) >= 20000:
            break
        kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]

    return respuesta(200, items)


def post_command(event):
    try:
        body = json.loads(event.get("body") or "{}")
        angulo = int(body["damper_angle"])
    except (ValueError, KeyError, TypeError):
        return respuesta(400, {"error": 'Se espera {"damper_angle": 0-180}'})

    device = body.get("device_id", "rack01")
    if not DEVICE_RE.match(device) or not 0 <= angulo <= 180:
        return respuesta(400, {"error": "device_id o ángulo inválido"})

    iot.publish(
        topic=f"datacenter/{device}/commands",
        qos=1,
        payload=json.dumps({"damper_angle": angulo}),
    )
    return respuesta(200, {"ok": True, "device_id": device, "damper_angle": angulo})


def lambda_handler(event, context):
    ruta = event.get("routeKey")  # ej: "GET /readings"
    if ruta == "GET /readings":
        return get_readings(event)
    if ruta == "POST /command":
        return post_command(event)
    return respuesta(404, {"error": f"Ruta no encontrada: {ruta}"})
