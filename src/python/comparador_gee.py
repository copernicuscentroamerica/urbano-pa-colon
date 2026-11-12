#!/usr/bin/env python3
"""
GEO-URBANO · Comparador multianual (versión automatizable con la API de Earth Engine).

Equivale al script del Code Editor (src/gee/geourbano_comparador.js), pero en lugar de una
interfaz interactiva genera archivos estáticos que el sitio publica en GitHub Pages:

    comparador/resultados/<id>/meta.json          (parámetros, bbox, estadísticas por año)
    comparador/resultados/<id>/rgb_<año>.jpg|png  (Sentinel-2 color natural, temporada seca)
    comparador/resultados/<id>/clase_<año>.png    (categorías, transparente fuera del área)

Uso local (tras `pip install -r requirements-gee.txt` y `earthengine authenticate`):

    python3 src/python/comparador_gee.py --lat 14.62124 --lon -90.34751 --radio-km 5 \
        --anio-inicio 2018 --anio-fin 2025 --project TU_PROYECTO_CLOUD

En GitHub Actions lo invoca .github/workflows/comparador.yml con una cuenta de servicio
guardada como secreto (EE_SERVICE_ACCOUNT_JSON). Verifica sin Earth Engine con --dry-run.

Los umbrales son valores iniciales SIN calibrar (igual que en el script del Code Editor).
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,47}$")

# --- Umbrales (mantener sincronizados con src/gee/geourbano_comparador.js) -----------------
CS_UMBRAL = 0.6
UMBRAL_BRILLO_VIS = 0.17
UMBRAL_SWIR1 = 0.22
UMBRAL_NDVI_MAX_IND = 0.20
UMBRAL_PARCHE_PX = 150
RADIO_DENSIDAD_M = 60
UMBRAL_DENSIDAD = 0.70
RADIO_TEXTURA_M = 30
UMBRAL_TEXTURA = 0.035
ESCALA = 10


def cargar_clases() -> list[dict]:
    data = json.loads((ROOT / "comparador" / "clases.json").read_text(encoding="utf-8"))
    return data["clases"]


def slug_auto(lat: float, lon: float, radio: float) -> str:
    def f(v: float) -> str:
        s = f"{abs(v):.3f}".replace(".", "p")
        return ("m" if v < 0 else "") + s

    return f"lat{f(lat)}_lon{f(lon)}_r{str(radio).replace('.', 'p')}km"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Comparador multianual de cobertura urbana (Earth Engine).")
    p.add_argument("--lat", type=float, required=True, help="Latitud del centroide (WGS84, grados decimales).")
    p.add_argument("--lon", type=float, required=True, help="Longitud del centroide (WGS84, grados decimales).")
    p.add_argument("--radio-km", type=float, required=True, help="Radio en km (cuadrado: lado = 2 × radio).")
    p.add_argument("--forma", choices=["cuadrado", "circulo"], default="cuadrado")
    p.add_argument("--anio-inicio", type=int, default=2018)
    p.add_argument("--anio-fin", type=int, default=dt.date.today().year - 1)
    p.add_argument("--mes-inicio", type=int, default=1)
    p.add_argument("--mes-fin", type=int, default=4)
    p.add_argument("--dim", type=int, default=1024, help="Lado mayor de las miniaturas en píxeles (256-2048).")
    p.add_argument("--id", dest="slug", default=None, help="Identificador de la carpeta de salida (a-z, 0-9, _ y -).")
    p.add_argument("--nombre", default=None, help="Nombre legible del análisis.")
    p.add_argument("--out", default=str(ROOT / "comparador" / "resultados"), help="Carpeta base de salida.")
    p.add_argument("--project", default=os.environ.get("EE_PROJECT"), help="Proyecto de Google Cloud con Earth Engine.")
    p.add_argument("--dry-run", action="store_true", help="Solo valida parámetros y calcula el área; no usa Earth Engine.")
    a = p.parse_args(argv)

    if not (-90 <= a.lat <= 90) or not (-180 <= a.lon <= 180):
        p.error("Coordenadas fuera de rango: lat ∈ [-90, 90], lon ∈ [-180, 180].")
    if not (0 < a.radio_km <= 30):
        p.error("--radio-km debe estar entre 0 y 30.")
    if a.anio_inicio < 2017 or a.anio_fin < a.anio_inicio or a.anio_fin > dt.date.today().year:
        p.error("Años inválidos: se admite desde 2017 (Sentinel-2 SR + Dynamic World) y anio_fin >= anio_inicio.")
    if a.anio_fin - a.anio_inicio > 12:
        p.error("Máximo 13 años por análisis.")
    if not (1 <= a.mes_inicio <= 12 and 1 <= a.mes_fin <= 12 and a.mes_inicio <= a.mes_fin):
        p.error("Meses inválidos: 1-12 y mes_inicio <= mes_fin dentro del mismo año.")
    if not (256 <= a.dim <= 2048):
        p.error("--dim debe estar entre 256 y 2048.")
    a.slug = a.slug or slug_auto(a.lat, a.lon, a.radio_km)
    if not SLUG_RE.match(a.slug):
        p.error("--id solo admite minúsculas, dígitos, '_' y '-' (máx. 48 caracteres, sin empezar con símbolo).")
    return a


def init_ee(project: str | None):
    import ee  # noqa: WPS433 (importación diferida: --dry-run no la necesita)

    raw = os.environ.get("EE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw:
        info = json.loads(raw)
        key_file = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "ee-sa.json"
        key_file.write_text(raw, encoding="utf-8")
        os.chmod(key_file, 0o600)
        creds = ee.ServiceAccountCredentials(info["client_email"], str(key_file))
        ee.Initialize(credentials=creds, project=project or info.get("project_id"))
        key_file.unlink(missing_ok=True)
    else:
        ee.Initialize(project=project)
    return ee


def descargar(url: str, destino: Path, intentos: int = 4) -> None:
    ultimo: Exception | None = None
    for i in range(intentos):
        try:
            with urllib.request.urlopen(url, timeout=180) as r:
                destino.write_bytes(r.read())
            return
        except Exception as exc:  # noqa: BLE001
            ultimo = exc
            time.sleep(3 * (i + 1))
    raise RuntimeError(f"No se pudo descargar {destino.name}: {ultimo}")


def construir(ee, a, clases):
    centro = ee.Geometry.Point([a.lon, a.lat])
    buf = centro.buffer(a.radio_km * 1000)
    aoi = buf if a.forma == "circulo" else buf.bounds()
    region = aoi.bounds()

    def rango(anio):
        ini = ee.Date.fromYMD(anio, a.mes_inicio, 1)
        fin = ee.Date.fromYMD(anio, a.mes_fin, 1).advance(1, "month")
        return ini, fin

    def compuesto(anio):
        ini, fin = rango(anio)
        s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(aoi).filterDate(ini, fin)
        cs = ee.ImageCollection("GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED").filterBounds(aoi).filterDate(ini, fin)
        col = s2.linkCollection(cs, ["cs_cdf"]).map(
            lambda img: img.updateMask(img.select("cs_cdf").gte(CS_UMBRAL))
        )
        return col.select(["B2", "B3", "B4", "B8", "B11", "B12"]).median().divide(10000), s2.size()

    def base_dw(anio):
        ini, fin = rango(anio)
        bandas = ["water", "trees", "grass", "flooded_vegetation", "crops",
                  "shrub_and_scrub", "built", "bare", "snow_and_ice"]
        probs = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1").filterBounds(aoi).filterDate(ini, fin).select(bandas).mean()
        return probs.toArray().arrayArgmax().arrayGet([0]).rename("dw")

    def clasificar(anio):
        s2, n = compuesto(anio)
        dw = base_dw(anio)
        vis = s2.select(["B2", "B3", "B4"]).reduce(ee.Reducer.mean()).rename("vis")
        ndvi = s2.normalizedDifference(["B8", "B4"])
        swir = s2.select("B11")

        construido = dw.eq(6)
        vegetacion = dw.gte(1).And(dw.lte(5))
        suelo = dw.eq(7)
        agua = dw.eq(0).Or(dw.eq(8))

        densidad = construido.toFloat().focalMean(radius=RADIO_DENSIDAD_M, kernelType="circle", units="meters")
        textura = vis.reduceNeighborhood(
            reducer=ee.Reducer.stdDev(), kernel=ee.Kernel.circle(radius=RADIO_TEXTURA_M, units="meters")
        )
        parche = construido.selfMask().connectedPixelCount(256, True).unmask(0)

        brillante = vis.gt(UMBRAL_BRILLO_VIS).And(swir.gt(UMBRAL_SWIR1))
        industrial = (
            construido.And(parche.gte(UMBRAL_PARCHE_PX)).And(brillante).And(ndvi.lt(UMBRAL_NDVI_MAX_IND))
        )
        asentamiento = (
            construido.And(industrial.Not()).And(densidad.gt(UMBRAL_DENSIDAD)).And(textura.gt(UMBRAL_TEXTURA))
        )
        urbanizacion = construido.And(industrial.Not()).And(asentamiento.Not())

        clase = (
            ee.Image(0)
            .where(urbanizacion, 1)
            .where(asentamiento, 2)
            .where(industrial, 3)
            .where(vegetacion, 4)
            .where(suelo, 5)
            .where(agua, 6)
            .rename("clase")
            .clip(aoi)
        )
        return s2.clip(aoi), clase.selfMask(), n

    return aoi, region, clasificar


def main(argv: list[str] | None = None) -> int:
    a = parse_args(argv)
    clases = cargar_clases()
    lado_km = 2 * a.radio_km
    area_km2 = lado_km**2 if a.forma == "cuadrado" else math.pi * a.radio_km**2
    print(f"[info] id={a.slug} · centroide=({a.lat}, {a.lon}) · radio={a.radio_km} km · forma={a.forma} · área≈{area_km2:.1f} km²")
    if a.dry_run:
        print("[dry-run] Parámetros válidos. No se contactó a Earth Engine.")
        return 0

    ee = init_ee(a.project)
    aoi, region, clasificar = construir(ee, a, clases)
    anillo = region.coordinates().getInfo()[0]
    bbox = [
        round(min(p[0] for p in anillo), 6), round(min(p[1] for p in anillo), 6),
        round(max(p[0] for p in anillo), 6), round(max(p[1] for p in anillo), 6),
    ]  # [oeste, sur, este, norte]

    out = Path(a.out) / a.slug
    out.mkdir(parents=True, exist_ok=True)
    paleta = [c["color"].lstrip("#") for c in clases]
    ext_rgb = "png" if a.forma == "circulo" else "jpg"

    estadisticas: dict[str, dict[str, float]] = {}
    archivos: dict[str, dict[str, str]] = {}
    omitidos: list[dict[str, object]] = []

    for anio in range(a.anio_inicio, a.anio_fin + 1):
        s2, clase, n = clasificar(anio)
        n_img = int(n.getInfo())
        if n_img == 0:
            print(f"[aviso] {anio}: sin escenas Sentinel-2 en la temporada; se omite.")
            omitidos.append({"anio": anio, "motivo": "sin escenas Sentinel-2 en la temporada"})
            continue
        print(f"[{anio}] {n_img} escenas · calculando…")

        grupos = (
            ee.Image.pixelArea().divide(10000).addBands(clase.unmask(0))
            .reduceRegion(
                reducer=ee.Reducer.sum().group(groupField=1, groupName="clase"),
                geometry=aoi, scale=ESCALA, maxPixels=1e10, tileScale=4,
            ).get("groups").getInfo()
        )
        por_codigo = {int(g["clase"]): float(g["sum"]) for g in (grupos or [])}
        estadisticas[str(anio)] = {c["id"]: round(por_codigo.get(c["codigo"], 0.0), 2) for c in clases}

        rgb = s2.visualize(bands=["B4", "B3", "B2"], min=0.02, max=0.28, gamma=1.2)
        cls = clase.visualize(min=1, max=len(clases), palette=paleta)
        f_rgb, f_cls = f"rgb_{anio}.{ext_rgb}", f"clase_{anio}.png"
        common = {"region": region, "dimensions": a.dim}
        descargar(rgb.getThumbURL({**common, "format": ext_rgb}), out / f_rgb)
        descargar(cls.getThumbURL({**common, "format": "png"}), out / f_cls)
        archivos[str(anio)] = {"rgb": f_rgb, "clase": f_cls, "escenas": n_img}

    if not archivos:
        print("[error] Ningún año produjo resultados.", file=sys.stderr)
        return 2

    meta = {
        "schema_version": "1.0.0",
        "id": a.slug,
        "nombre": a.nombre or f"Análisis {a.slug}",
        "centroide": {"lat": a.lat, "lon": a.lon},
        "radio_km": a.radio_km,
        "forma": a.forma,
        "area_km2": round(area_km2, 2),
        "bbox": bbox,
        "temporada": {"mes_inicio": a.mes_inicio, "mes_fin": a.mes_fin},
        "anios": sorted(int(k) for k in archivos),
        "anios_omitidos": omitidos,
        "archivos": archivos,
        "estadisticas_ha": estadisticas,
        "escala_m": ESCALA,
        "generado_utc": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "fuentes": [
            "Copernicus Sentinel-2 SR Harmonized (ESA) + Cloud Score+ (Google)",
            "Dynamic World V1 (Google / World Resources Institute)",
        ],
        "umbrales": {
            "cs_umbral": CS_UMBRAL, "brillo_vis": UMBRAL_BRILLO_VIS, "swir1": UMBRAL_SWIR1,
            "ndvi_max_industrial": UMBRAL_NDVI_MAX_IND, "parche_px": UMBRAL_PARCHE_PX,
            "radio_densidad_m": RADIO_DENSIDAD_M, "densidad": UMBRAL_DENSIDAD,
            "radio_textura_m": RADIO_TEXTURA_M, "textura": UMBRAL_TEXTURA,
        },
        "aviso": "Indicativo. Umbrales sin calibrar; la separación urbanización/asentamiento/industrial_comercial requiere validación local.",
    }
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[OK] Resultados en {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
