#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador estático determinista (scripts/build_site.py) homologado al estándar
Clúster Copernicus Urbano 2.0.0-copernicus-2026 para urbano-pa-colon.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import os
import shutil
import sys
import urllib.parse
from pathlib import Path
from typing import Any

from markdown_lite import render_markdown
from site_common import (
    TEMPLATE_VERSION,
    THEME_VERSION,
    SiteContext,
    badge_html,
    compute_site_context,
    esc,
    format_spanish_date,
    render_hero_team,
    render_project_institutions_band,
    render_regional_institutional_band,
    render_team_section_html,
    render_upper_institutional_bar,
)

ROOT = Path(__file__).resolve().parent.parent

SPEC: dict[str, Any] = json.loads(r"""{
  "subpage_slug": "comparador",
  "subpage_nav": "Comparador 2018–2024",
  "subpage_title": "Comparador Multianual de Cobertura Urbana, Logística Portuaria y Expansión en Colón (2018–2024)",
  "subpage_badge": "Algoritmo Abierto GEO-URBANO · Sentinel-2 L2A (10 m) + Malla 250 m",
  "docx_file": "Metodologia_pa-colon.docx",
  "script_file": "geourbano_comparador_colon.js",
  "csv_file": "indicadores_cobertura_colon_2018_2024.csv",
  "atlas_pages": 15,
  "area_str": "24,696.2 ha terrestres (Isla Manzanillo, Cristóbal, Zona Libre, Cativá, Sabanitas y eje Transístmico)",
  "res_str": "10 m anual (2018–2024) + Malla continua de 2,003 celdas de 250 m",
  "copernicus_local_synergy": "Desarrollado en el contexto del Clúster Copernicus Urbano (reemplazando e integrando la arquitectura reproducible del comparador multitemporal sobre el Distrito de Colón, Panamá), este atlas combina las series anuales Copernicus Sentinel-2 L2A (10 m), radar Sentinel-1 SAR y relieve costero Copernicus DEM GLO-30 con la delimitación de corregimientos, recintos logístico-portuarios (Zona Libre de Colón, Cristóbal, Manzanillo, Coco Solo) y frentes habitacionales del corredor Transístmico, apoyando la planificación municipal, la logística portuaria sostenible y la protección de manglares caribeños.",
  "kpis": [
    [
      "+1,004.7 ha",
      "Expansión Construida Neta",
      "El tejido edificado total pasó de 5,034.3 ha en 2018 a 6,039.0 ha en 2024 (+20.0%)."
    ],
    [
      "3,085.8 ha",
      "Huella Logístico-Portuaria",
      "51.1% de la superficie construida corresponde a puertos, patios, galeras y Zona Libre (143 polos)."
    ],
    [
      "2,291.6 ha",
      "Asentamiento Denso",
      "191 núcleos compactos mapeados en el Casco Histórico de Colón, Cativá, Sabanitas y Puerto Pilón."
    ],
    [
      "-961.8 ha",
      "Pérdida Vegetal / Manglar",
      "Reducción de cobertura boscosa y humedales costeros entre 2018 (17,602.6 ha) y 2024 (16,640.7 ha)."
    ],
    [
      "2,003 celdas",
      "Malla Continua 250 m",
      "Cuadrícula estandarizada con porcentaje construido 2018/2024 y cambio neto por celda."
    ],
    [
      "7 cortes",
      "Comparador A|B + GEE",
      "Serie anual interactiva 2018–2024 con deslizador A|B, filtro por clase y generador GEE gratuito."
    ]
  ],
  "phases": [
    [
      "Fase 1 · Compuestos Secos Sentinel-2 L2A (Enero–Abril, 2018–2024)",
      "Filtrado estricto de nubosidad caribeña y extracción anual de reflectancia visible, NIR (NDVI) y SWIR1 a 10 m sobre las 24,696.2 ha terrestres del corredor."
    ],
    [
      "Fase 2 · Reglas Morfológicas y Espectrales GEO-URBANO",
      "Separación reproducible en 6 clases: Industrial/Portuario (parches ≥1.5 ha, alto brillo y SWIR1), Asentamiento denso (compacidad 60 m >68%), Urbanización mixta, Vegetación/manglar, Suelo desnudo y Agua."
    ],
    [
      "Fase 3 · Vectorización Estratégica y Malla de 250 m",
      "Generación de los 143 polígonos logísticos, 191 núcleos densos, 324 frentes de expansión 2018–2024 y agregación en 2,003 celdas de 250 m."
    ],
    [
      "Fase 4 · Despliegue en Geovisor, Atlas y Comparador A|B",
      "Integración simultánea en el Geovisor multicapa, el Atlas de 15 páginas y la herramienta interactiva /comparador/ replicable en cualquier municipio."
    ]
  ],
  "formulas": [
    "Industrial_Portuario = Built AND (Parche >= 1.5 ha) AND (Brillo_RGB > 0.17) AND (SWIR1 > 0.20) AND (NDVI < 0.22)",
    "Asentamiento_Denso = Built AND (NOT Industrial) AND (Densidad_60m > 0.68) AND (Textura_SD_30m > 0.032)",
    "Cambio_Construido_Celda_250m = Pct_Construido_2024 - Pct_Construido_2018   (sobre 2,003 celdas)"
  ],
  "table_title": "Evolución Anual Verificada de Clases de Cobertura GEO-URBANO en el Corredor de Colón (2018–2024)",
  "table_headers": [
    "Categoría Morfológica (10 m)",
    "Corte 2018 (ha)",
    "Corte 2021 (ha)",
    "Corte 2024 (ha)",
    "Variación Neta 2018–2024"
  ],
  "table_rows": [
    [
      "1 · Urbanización residencial y mixta (#D7263D)",
      "624.35 ha",
      "658.91 ha",
      "661.58 ha",
      "+37.23 ha (+6.0%)"
    ],
    [
      "2 · Asentamiento de alta densidad (#F28C28)",
      "2,577.17 ha",
      "2,756.30 ha",
      "2,291.60 ha",
      "-285.57 ha (reclasif. comercial/logística)"
    ],
    [
      "3 · Industrial, portuario y Zona Libre (#7B2CBF)",
      "1,832.79 ha",
      "1,612.81 ha",
      "3,085.83 ha",
      "+1,253.04 ha (+68.4% expansión logística)"
    ],
    [
      "Subtotal Tejido Construido (Clases 1+2+3)",
      "5,034.31 ha",
      "5,028.02 ha",
      "6,039.01 ha",
      "+1,004.70 ha (+20.0%)"
    ],
    [
      "4 · Vegetación, bosque húmedo y manglar (#2E8B57)",
      "17,602.55 ha",
      "17,645.16 ha",
      "16,640.71 ha",
      "-961.84 ha (-5.5%)"
    ],
    [
      "5 · Suelo desnudo / explanación (#C2B280)",
      "45.14 ha",
      "12.34 ha",
      "0.95 ha",
      "-44.19 ha (consolidado a edificado)"
    ]
  ],
  "fig_captions": [
    [
      "Figura 1 · Arquitectura Metodológica",
      "Algoritmo Abierto GEO-URBANO en GEE y Python para el Corredor Urbano-Portuario de Colón",
      "Flujo de trabajo reproducible que articula Sentinel-2 L2A, reglas morfológicas de compacidad/tamaño de nave y malla de 250 m."
    ],
    [
      "Figura 2 · Balance 2024 y Cambio Neto",
      "Superficie por Categoría GEO-URBANO y Peso del Nodo Logístico-Portuario Atlántico",
      "Liderazgo de las plataformas portuarias y Zona Libre (3,085.8 ha) junto a los núcleos densos residenciales (2,291.6 ha)."
    ],
    [
      "Figura 3 · Mapa Síntesis de Colón",
      "Distribución Espacial de Polos Logísticos, Núcleos Densos y Frentes de Expansión 2018–2024",
      "Contraste territorial entre Isla Manzanillo/Cristóbal/Coco Solo y el corredor Transístmico hacia Cativá y Sabanitas."
    ],
    [
      "Figura 4 · Serie Anual 2018–2024",
      "Evolución Interanual de la Huella Construida Total (ha) en los Siete Cortes Evaluados",
      "Aceleración del crecimiento construido en el trienio post-pandemia 2022–2024 hasta alcanzar 6,039.0 ha."
    ]
  ],
  "roadmap": [
    "Calibrar los umbrales espectrales y morfológicos con muestreo estratificado local sobre ortofotografía y catastro municipal de Colón, MIVIOT y ANATI.",
    "Fusionar coherencia y retrodispersión radar Copernicus Sentinel-1 SAR (VV/VH) para monitorear cambios constructivos durante la estación lluviosa caribeña.",
    "Cruzar los 324 frentes de expansión 2018–2024 con cotas bajas (<2.5 m s. n. m. en Copernicus DEM GLO-30) y polígonos de manglar protegido en Bahía de Manzanillo."
  ]
}""")

COMPARADOR_BODY = """
    <div class="callout callout-warn" style="margin-top:0;">
      <strong>Resultado indicativo, no oficial</strong>
      <span>Las cinco categorías se derivan de Dynamic World y reglas sobre Sentinel-2 (10 m) con umbrales iniciales <em>sin calibrar</em>.
      La separación entre <em>urbanización</em>, <em>asentamiento</em> e <em>industrial/comercial</em> es una aproximación que debe validarse con muestras locales antes de usar cifras en decisiones públicas.
      Ver <a href="__METODO_URL__">metodología</a>.</span>
    </div>

    <section class="section" id="area">
      <div class="section-header"><h2>1 · Define tu área</h2></div>
      <p>Escribe el <strong>centroide</strong> y el <strong>radio en km</strong> (o haz clic en el mapa para fijar el centroide). Un radio de 5 km genera un cuadrado de 10 × 10 km; de 10 km, uno de 20 × 20 km (máximo 30 km).</p>
      <form id="cmp-form" class="cmp-form" onsubmit="return false" aria-label="Parámetros del área de estudio">
        <div class="cmp-fields">
          <div class="filter-field"><label for="cmp-lat">Latitud (°)</label><input id="cmp-lat" data-cmp-input type="text" inputmode="decimal" value="__LAT__"></div>
          <div class="filter-field"><label for="cmp-lon">Longitud (°)</label><input id="cmp-lon" data-cmp-input type="text" inputmode="decimal" value="__LON__"></div>
          <div class="filter-field"><label for="cmp-radio">Radio (km)</label><input id="cmp-radio" data-cmp-input type="number" min="0.5" max="30" step="0.5" value="9"></div>
          <div class="filter-field"><label for="cmp-forma">Forma</label>
            <select id="cmp-forma" data-cmp-input><option value="cuadrado">Cuadrado (lado = 2 × radio)</option><option value="circulo">Círculo</option></select></div>
          <div class="filter-field"><label for="cmp-anio-ini">Año inicial</label><input id="cmp-anio-ini" data-cmp-input type="number" min="2017" max="2100" value="2018"></div>
          <div class="filter-field"><label for="cmp-anio-fin">Año final</label><input id="cmp-anio-fin" data-cmp-input type="number" min="2017" max="2100" value="__YEAR_END__"></div>
          <div class="filter-field"><label for="cmp-mes-ini">Mes inicial (temporada)</label><input id="cmp-mes-ini" data-cmp-input type="number" min="1" max="12" value="1"></div>
          <div class="filter-field"><label for="cmp-mes-fin">Mes final (temporada)</label><input id="cmp-mes-fin" data-cmp-input type="number" min="1" max="12" value="4"></div>
          <div class="filter-field"><label for="cmp-id">Identificador (opcional)</label><input id="cmp-id" data-cmp-input type="text" placeholder="p. ej. ciudad-guatemala" maxlength="48"></div>
        </div>
        <div class="cmp-actions">
          <button type="button" id="cmp-locate" class="btn btn-teal btn-xs">Ubicar en el mapa</button>
          <button type="button" id="cmp-use-project" class="btn btn-outline btn-xs">Usar centroide del proyecto</button>
        </div>
        <p id="cmp-form-error" class="cmp-error" role="alert" hidden></p>
        <p id="cmp-readout" class="cmp-readout" aria-live="polite"></p>
      </form>

      <div class="cmp-mapbar">
        <label>Izquierda (A) <select id="cmp-eox-a" aria-label="Año de la imagen A"></select></label>
        <label>Derecha (B) <select id="cmp-eox-b" aria-label="Año de la imagen B"></select></label>
        <span class="cmp-hint">Vista previa sin cuenta: mosaico anual Sentinel-2 cloudless (EOX). Es imagen, no clasificación.</span>
      </div>
      <div id="cmp-swipe" class="cmp-swipe">
        <div id="cmp-map-b" class="cmp-map"></div>
        <div id="cmp-map-a" class="cmp-map cmp-map-top"></div>
        <div id="cmp-divider" class="cmp-divider" aria-hidden="true"></div>
        <input id="cmp-slider" class="cmp-slider" type="range" min="0" max="100" value="50" step="0.5" aria-label="Deslizar entre año A y año B">
      </div>
      <p id="cmp-map-notice" class="callout callout-warn" hidden>No se pudo cargar la librería de mapas (MapLibre). Revisa tu conexión; el formulario y los comandos siguen funcionando.</p>
    </section>

    <section class="section" id="ejecutar">
      <div class="section-header"><h2>2 · Ejecuta el análisis completo (gratis)</h2></div>
      <p>Ambas rutas usan los valores del formulario. Earth Engine es gratuito para uso no comercial, de investigación y educativo con una cuenta de Google.</p>
      <div class="grid-2">
        <article class="card">
          <span class="badge badge-ok">Opción A · interactiva</span>
          <h3>Google Earth Engine Code Editor</h3>
          <ol class="cmp-steps">
            <li>Pulsa <strong>Copiar script con mis valores</strong>.</li>
            <li>Abre el <a href="https://code.earthengine.google.com/" target="_blank" rel="noopener noreferrer">Code Editor ↗</a>, crea un script nuevo y pega.</li>
            <li>Pulsa <strong>Run</strong>: verás cuadrícula por año, deslizador A | B, filtro de categorías, gráfico y estadísticas.</li>
          </ol>
          <div class="card-footer">
            <button type="button" id="cmp-copy-gee" class="btn btn-primary btn-xs">Copiar script con mis valores</button>
            <a class="btn btn-outline btn-xs" href="__GEE_URL__" download>Descargar script (.js)</a>
          </div>
          <p id="cmp-gee-status" class="cmp-status" role="status"></p>
        </article>
        <article class="card">
          <span class="badge badge-propuesta">Opción B · automática y publicada aquí</span>
          <h3>GitHub Actions → resultados en este sitio</h3>
          <ol class="cmp-steps">
            <li>Una sola vez: configura la cuenta de servicio (ver <a href="__DOC_URL__" target="_blank" rel="noopener noreferrer">guía</a>).</li>
            <li>Abre <strong>Actions → Comparador multianual → Run workflow</strong> y escribe los valores, o ejecuta el comando.</li>
            <li>Al terminar, el análisis aparece abajo, en «Resultados clasificados».</li>
          </ol>
          <pre class="cmp-code"><code id="cmp-gh-cmd"></code></pre>
          <div class="card-footer">
            <button type="button" id="cmp-copy-gh" class="btn btn-teal btn-xs">Copiar comando gh</button>
            <a id="cmp-actions-link" class="btn btn-outline btn-xs" href="__REPO_ACTIONS__" target="_blank" rel="noopener noreferrer">Abrir Actions ↗</a>
          </div>
          <p id="cmp-gh-status" class="cmp-status" role="status"></p>
        </article>
      </div>
    </section>

    <section class="section" id="resultados-clasificados">
      <div class="section-header"><h2>3 · Resultados clasificados por año</h2></div>
      <div id="cmp-viewer">
        <p id="cmp-empty" class="callout" hidden><strong>Aún no hay análisis publicados.</strong>
          <span>Ejecuta la opción B (GitHub Actions) y los resultados aparecerán aquí automáticamente. Con la opción A verás los mismos mapas dentro de Earth Engine.</span></p>
        <div id="cmp-viewer-body" hidden>
          <div class="cmp-toolbar">
            <label>Análisis <select id="cmp-analysis"></select></label>
            <div class="cmp-tabs" role="tablist" aria-label="Tipo de vista">
              <button type="button" role="tab" data-cmp-tab="grid" aria-selected="true">Cuadrícula por año</button>
              <button type="button" role="tab" data-cmp-tab="swipe" aria-selected="false">Deslizador A | B</button>
              <button type="button" role="tab" data-cmp-tab="stats" aria-selected="false">Estadísticas</button>
            </div>
            <span id="cmp-swipe-years" class="cmp-swipe-years" hidden>
              <label>A <select id="cmp-sw-a"></select></label> <label>B <select id="cmp-sw-b"></select></label>
            </span>
          </div>
          <p id="cmp-meta" class="cmp-meta"></p>
          <div class="cmp-layout">
            <aside class="cmp-side" aria-label="Categorías">
              <h3>Categorías a identificar</h3>
              <ul id="cmp-legend" class="cmp-legend"></ul>
              <label class="cmp-opt"><input type="checkbox" id="cmp-show-rgb" checked> Imagen Sentinel-2 de fondo</label>
              <label class="cmp-opt">Opacidad <input type="range" id="cmp-opacity" min="0.1" max="1" step="0.05" value="0.75"></label>
              <p class="cmp-hint">Marca o desmarca categorías, o usa «solo» para aislar una.</p>
            </aside>
            <div class="cmp-main">
              <div id="cmp-view"></div>
              <div id="cmp-pane-stats" hidden>
                <div id="cmp-chart" class="cmp-chart"></div>
                <div class="table-wrap"><table id="cmp-stats-table"></table></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <script id="comparador-config" type="application/json">__CONFIG__</script>
"""




def render_link_or_pending(
    url: str | None,
    active_label: str,
    pending_label: str,
    btn_class: str = "btn btn-outline",
    declared_only: bool = False,
) -> str:
    if url and url.startswith("https://"):
        suffix = " (referencia declarada)" if declared_only else " ↗"
        return (
            f'<a class="{btn_class}" href="{html.escape(url, quote=True)}" '
            f'target="_blank" rel="noopener noreferrer">{html.escape(active_label + suffix)}</a>'
        )
    return f'<span class="btn-disabled" role="status">{html.escape(pending_label)}</span>'


def render_status_strip(manifest: dict[str, Any]) -> str:
    st = manifest["status"]
    pmv = manifest["pmv"]
    tr = st["technical_review"]
    iv = st["institutional_validation"]
    ad = st["adoption"]
    return f"""
    <section class="status-strip" aria-label="Estados independientes de la iniciativa">
      <div class="status-cell"><div class="status-cell-label">Alcance del PMV</div><div>{badge_html(pmv.get("scope_status"))}</div></div>
      <div class="status-cell"><div class="status-cell-label">Desarrollo</div><div>{badge_html(st.get("development"))}</div></div>
      <div class="status-cell"><div class="status-cell-label">Demostración</div><div>{badge_html(st.get("demo"))}</div></div>
      <div class="status-cell"><div class="status-cell-label">Revisión técnica</div><div>{badge_html(tr.get("state"))}</div></div>
      <div class="status-cell"><div class="status-cell-label">Validación institucional</div><div>{badge_html(iv.get("state"))}</div></div>
      <div class="status-cell"><div class="status-cell-label">Adopción</div><div>{badge_html(ad.get("state"))}</div></div>
    </section>
    """


def render_shell(
    *,
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    page_title: str,
    active_nav: str,
    hero_html: str,
    body_html: str,
    include_maplibre: bool = False,
    page_script: str | None = None,
) -> str:
    pid = manifest["id"]
    short_title = repo_cfg.get("short_title") or manifest["title"]
    country_name = manifest["country"]["name"]
    country_code = manifest["country"]["code"]
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]

    robots_meta = (
        '<meta name="robots" content="noindex, nofollow">'
        if ctx.effective_mode != "canonical"
        else '<meta name="robots" content="index, follow">'
    )

    canonical_link_note = ""
    if manifest["links"].get("website"):
        w = html.escape(manifest["links"]["website"], quote=True)
        canonical_link_note = f' · <a href="{w}">Ir a la versión canónica publicada</a>'
    elif manifest["links"].get("repository"):
        r = html.escape(manifest["links"]["repository"], quote=True)
        canonical_link_note = f' · <a href="{r}" target="_blank" rel="noopener noreferrer">Repositorio canónico</a>'

    work_banner_html = ""
    if ctx.effective_mode != "canonical":
        mode_reason = (
            f" Vista generada desde {html.escape(ctx.github_repository)}."
            if ctx.github_repository
            else " Previsualización local o repositorio canónico pendiente de verificación."
        )
        work_banner_html = f"""
        <div class="work-banner" role="region" aria-label="Aviso de versión de trabajo">
          <div class="container">
            <span>Vista de trabajo (versión no canónica) · ID estable: <code>{esc(pid)}</code>.{mode_reason}</span>
            <span>Solo el repositorio canónico publica la referencia compartida del equipo{canonical_link_note}</span>
          </div>
        </div>
        """

    hub_link_html = (
        f'<a href="{html.escape(ctx.hub_url, quote=True)}">← Volver al Portal de la Comunidad Urbana</a>'
        if ctx.hub_url and ctx.hub_url.startswith("https://")
        else '<span>Portal regional: <code>clusterurbano</code> (enlace activo al publicar el hub)</span>'
    )

    upper_bar_html = render_upper_institutional_bar(
        ctx,
        hub_link_html,
        f"Comunidad Urbana Copernicus Centroamérica · <strong>{esc(country_name)} ({esc(country_code)})</strong> · ID: <code>{esc(pid)}</code>",
    )
    bottom_regional_band_html = render_regional_institutional_band(ctx, extra_class="is-footer-band")

    nav_items = [
        ("inicio", "Inicio", ctx.site_url("")),
        ("proyecto", "Proyecto", ctx.site_url("proyecto/")),
        ("aplicacion", "Geovisor (GeoLibre)", ctx.site_url("aplicacion/")),
        (sub_slug, sub_nav, ctx.site_url(f"{sub_slug}/")),
        ("metodologia", "Metodología", ctx.site_url("metodologia/")),
        ("resultados", "Atlas y Resultados", ctx.site_url("resultados/")),
        ("colaborar", "Datos y Código", ctx.site_url("colaborar/")),
    ]
    nav_lis = []
    for key, label, href in nav_items:
        cur = ' aria-current="page"' if key == active_nav else ""
        nav_lis.append(f'<li><a href="{html.escape(href, quote=True)}"{cur}>{html.escape(label)}</a></li>')

    maplibre_head = ""
    maplibre_scripts = ""
    if page_script:
        maplibre_head = '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" crossorigin="anonymous">'
        maplibre_scripts = (
            '<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js" crossorigin="anonymous"></script>\n'
            f'  <script src="{html.escape(ctx.site_url(page_script), quote=True)}?v=2.2.2"></script>'
        )
    elif include_maplibre:
        maplibre_head = '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" crossorigin="anonymous">'
        maplibre_scripts = (
            '<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js" crossorigin="anonymous"></script>\n'
            f'  <script src="{html.escape(ctx.site_url("assets/js/geovisor.js"), quote=True)}?v=2.2.2"></script>'
        )

    updated_raw = manifest["governance"].get("content_updated_at")
    updated_label = format_spanish_date(updated_raw, "Fecha de actualización no informada")

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{esc(page_title)} · {esc(short_title)}</title>
  <meta name="description" content="{esc(manifest['summary'])}">
  {robots_meta}
  <link rel="stylesheet" href="{html.escape(ctx.site_url('assets/css/styles.css'), quote=True)}?v=2.2.2">
  {maplibre_head}
</head>
<body data-baseurl="{html.escape(ctx.site_url(''), quote=True)}">
  <a class="skip-link" href="#contenido-principal">Saltar al contenido principal</a>
  {work_banner_html}
  {upper_bar_html}
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="{html.escape(ctx.site_url(''), quote=True)}">
        <span class="brand-mark" aria-hidden="true">{esc(country_code)}</span>
        <span class="brand-text">
          <span class="brand-title">{esc(short_title)}</span>
          <span class="brand-subtitle">Clúster de Asentamientos Humanos · Fase II</span>
        </span>
      </a>
      <button class="nav-toggle" type="button" data-nav-toggle aria-expanded="false" aria-controls="menu-proyecto">
        Menú ☰
      </button>
      <nav id="menu-proyecto" class="site-nav" data-site-nav aria-label="Navegación de la iniciativa">
        <ul>
          {"".join(nav_lis)}
        </ul>
      </nav>
    </div>
  </header>

  {hero_html}

  <main id="contenido-principal">
    <div class="container">
      {body_html}
    </div>
  </main>

  {bottom_regional_band_html}
  <footer class="site-footer">
    <div class="container footer-grid">
      <div>
        <p class="footer-title">{esc(manifest['title'])}</p>
        <p>Identificador estable: <code>{esc(pid)}</code> · Grupos de origen: {esc(", ".join(str(g) for g in manifest["source_groups"]))} · Tema común: <code>{esc(THEME_VERSION)}</code>.</p>
        <p>Última actualización del contenido por el equipo: <strong>{esc(updated_label)}</strong>.</p>
      </div>
      <div>
        <p class="footer-title">Navegación rápida</p>
        <p>
          <a href="{html.escape(ctx.site_url('aplicacion/'), quote=True)}">Geovisor Interactivo</a> ·
          <a href="{html.escape(ctx.site_url('resultados/'), quote=True)}">Atlas Interactivo y PDF</a> ·
          <a href="{html.escape(ctx.site_url(f'{sub_slug}/'), quote=True)}">{esc(sub_nav)}</a> ·
          <a href="{html.escape(ctx.site_url('metodologia/'), quote=True)}">Metodología</a> ·
          <a href="{html.escape(ctx.site_url('proyecto/'), quote=True)}">Ficha del proyecto</a> ·
          <a href="{html.escape(ctx.site_url('colaborar/'), quote=True)}">Datos y Código</a>
        </p>
      </div>
      <div>
        <p class="footer-title">Transparencia documental</p>
        <p>Este sitio distingue afirmaciones declaradas en el perfil, productos geoespaciales verificados y procesos en curso. La publicación técnica apoya la toma de decisiones sin sustituir la validación administrativa oficial.</p>
      </div>
    </div>
  </footer>

  <script src="{html.escape(ctx.site_url('assets/js/ui.js'), quote=True)}?v=2.2.0"></script>
  {maplibre_scripts}
</body>
</html>
"""


def make_geolibre_layer_style(raw_style: dict[str, Any] | None) -> dict[str, Any]:
    s = raw_style or {}
    raw_fc = s.get("fillColor") or s.get("fill_color")
    fill_color = raw_fc if isinstance(raw_fc, str) and raw_fc.startswith("#") else "#007F8B"
    raw_sc = s.get("lineColor") or s.get("strokeColor") or s.get("stroke_color")
    stroke_color = raw_sc if isinstance(raw_sc, str) and raw_sc.startswith("#") else "#14283F"
    raw_sw = s.get("lineWidth") or s.get("strokeWidth") or s.get("stroke_width") or 2
    stroke_width = float(raw_sw) if isinstance(raw_sw, (int, float)) else 2.0
    raw_fo = s.get("fillOpacity") if s.get("fillOpacity") is not None else s.get("fill_opacity")
    fill_opacity = float(raw_fo) if isinstance(raw_fo, (int, float)) else 0.45
    raw_cr = s.get("circleRadius") or s.get("circle_radius") or 6
    circle_radius = float(raw_cr) if isinstance(raw_cr, (int, float)) else 6.0
    raw_cc = s.get("circleColor")
    circle_color = raw_cc if isinstance(raw_cc, str) and raw_cc.startswith("#") else fill_color
    return {
        "minZoom": 0,
        "maxZoom": 24,
        "fillColor": fill_color,
        "strokeColor": stroke_color,
        "strokeWidth": stroke_width,
        "strokeWidthUnit": "pixels",
        "strokeOpacity": 1,
        "strokeDash": [],
        "strokeBlur": 0,
        "fillOpacity": fill_opacity,
        "circleRadius": circle_radius,
        "textColor": "#111827",
        "textHaloColor": "#ffffff",
        "textHaloWidth": 2,
        "textSize": 14,
        "labels": {
            "enabled": False,
            "field": "",
            "expression": "",
            "placement": "point",
            "pointPlacement": "above-right",
            "textSize": 12,
            "textColor": "#111827",
            "haloColor": "#ffffff",
            "haloWidth": 1.5,
            "minZoom": 0,
            "maxZoom": 24,
            "offsetX": 0,
            "offsetY": 0,
            "rotation": 0,
            "repeatDistance": 250,
            "allowOverlap": False,
            "wrapWidth": 10,
            "anchor": "center",
            "priority": 5,
            "background": False,
            "backgroundColor": "#ffffff",
            "backgroundBorderColor": "#d1d5db",
            "backgroundBorderWidth": 1,
            "backgroundPadding": 3,
            "backgroundRadius": 3,
            "leaderLine": False,
            "leaderLineColor": "#6b7280",
            "leaderLineWidth": 1,
            "formatNumber": False,
            "formatDecimals": 2,
            "formatPrefix": "",
            "formatSuffix": "",
            "formatThousands": True,
        },
        "vectorStyleMode": "single",
        "vectorStyleProperty": "",
        "vectorCategories": [],
        "vectorGraduatedMethod": "equal",
        "vectorGraduatedClasses": 5,
        "vectorColorRamp": "viridis",
        "vectorGraduatedStops": [],
        "vectorStyleStops": [
            {"value": 0, "color": "#dbeafe"},
            {"value": 1, "color": fill_color},
        ],
        "vectorStyleExpression": "",
        "vectorRules": [],
        "proportionalSizeEnabled": False,
        "proportionalSizeProperty": "",
        "proportionalSizeMinValue": 0,
        "proportionalSizeMaxValue": 100,
        "proportionalSizeMinRadius": 4,
        "proportionalSizeMaxRadius": 24,
        "fillPattern": "none",
        "fillPatternColor": stroke_color,
        "fillPatternSvg": "",
        "markerEnabled": False,
        "markerShape": "circle",
        "markerColor": circle_color,
        "markerSize": 18,
        "markerSvg": "",
        "simpleStyleEnabled": False,
        "diagramType": "none",
        "diagramFields": [],
        "diagramSizeMode": "fixed",
        "diagramSize": 30,
        "diagramSizeProperty": "",
        "diagramMinZoom": 0,
        "diagramDeclutter": False,
        "pointRenderer": "single",
        "heatmapRadius": 30,
        "heatmapIntensity": 1,
        "heatmapColorRamp": "turbo",
        "heatmapWeightProperty": "",
        "clusterRadius": 50,
        "clusterMaxZoom": 14,
        "invertedFillEnabled": False,
        "lineDecoration": "none",
        "lineDecorationColor": "",
        "lineDecorationSize": 12,
        "lineDecorationSpacing": 80,
        "geometryGenerator": "none",
        "geometryGeneratorBufferDistance": 1000,
        "geometryGeneratorBufferProperty": "",
        "geometryGeneratorFillColor": "#f59e0b",
        "geometryGeneratorStrokeColor": "#b45309",
        "geometryGeneratorStrokeWidth": 2,
        "geometryGeneratorOpacity": 0.4,
        "geometryGeneratorCircleRadius": 5,
        "geometryGeneratorSizeProperty": "",
        "geometryGeneratorSizeMinValue": 0,
        "geometryGeneratorSizeMaxValue": 100,
        "geometryGeneratorSizeMinRadius": 4,
        "geometryGeneratorSizeMaxRadius": 24,
        "rasterBrightnessMin": 0,
        "rasterBrightnessMax": 1,
        "rasterSaturation": 0,
        "rasterContrast": 0,
        "rasterHueRotate": 0,
        "blendMode": "normal",
    }


def build_geolibre_project_json(
    layers_cfg: dict[str, Any],
    manifest: dict[str, Any],
    ctx: SiteContext,
) -> dict[str, Any]:
    pid = manifest["id"]
    active_layers: list[dict[str, Any]] = []
    styles_map: dict[str, Any] = {}
    legend_order: list[str] = []

    for lyr in layers_cfg.get("layers", []):
        sp = lyr.get("source_path")
        st = lyr.get("status")
        if not sp or st not in ("publicado", "en_revision"):
            continue
        lid = lyr["id"]
        resolved = sp if str(sp).startswith("https://") else ctx.full_url(str(sp))
        fmt = str(lyr.get("format") or "geojson").lower()
        layer_type = "geojson" if fmt in ("geojson", "json", "kml") else ("cog" if fmt in ("tif", "tiff", "cog") else ("pmtiles" if fmt == "pmtiles" else "raster"))
        full_style = make_geolibre_layer_style(lyr.get("style"))
        styles_map[lid] = full_style
        legend_order.append(lid)

        embedded_geojson = None
        if not str(sp).startswith("https://") and fmt in ("geojson", "json"):
            local_file = ROOT / str(sp)
            if local_file.exists() and local_file.stat().st_size <= 512 * 1024:
                try:
                    parsed_gj = json.loads(local_file.read_text(encoding="utf-8"))
                    if isinstance(parsed_gj, dict) and parsed_gj.get("type") == "FeatureCollection":
                        embedded_geojson = parsed_gj
                except Exception:
                    embedded_geojson = None

        layer_entry: dict[str, Any] = {
            "id": lid,
            "name": lyr["title"],
            "type": layer_type,
            "source": {
                "type": "geojson" if layer_type == "geojson" else "raster",
                "url": resolved,
                "data": resolved if layer_type == "geojson" else None,
            },
            "visible": True,
            "opacity": 1,
            "style": full_style,
            "metadata": {
                "sourceUrl": resolved,
                "status": st,
                "resolution": lyr.get("resolution"),
                "caveat": lyr.get("caveat"),
            },
        }
        if embedded_geojson is not None:
            layer_entry["geojson"] = embedded_geojson
        active_layers.append(layer_entry)

    mv = layers_cfg.get("map_view", {})
    center = mv.get("center", [-84.0, 13.5])
    zoom = float(mv.get("zoom", 10))
    map_view_obj: dict[str, Any] = {
        "center": [float(center[0]), float(center[1])],
        "zoom": zoom,
        "bearing": 0,
        "pitch": 0,
    }
    if mv.get("bbox") and isinstance(mv["bbox"], list) and len(mv["bbox"]) == 4:
        map_view_obj["bbox"] = [float(x) for x in mv["bbox"]]

    return {
        "id": f"geolibre-{pid}",
        "version": "0.2.0",
        "name": f"{manifest['country']['name']} · {layers_cfg.get('title', manifest['title'])}",
        "mapView": map_view_obj,
        "basemapStyleUrl": "https://tiles.openfreemap.org/styles/positron",
        "basemapVisible": True,
        "basemapOpacity": 1,
        "blankBackgroundColor": None,
        "primaryRenderer": "maplibre",
        "layers": active_layers,
        "selectedLayerId": active_layers[0]["id"] if active_layers else None,
        "layerGroups": [],
        "styles": styles_map,
        "preferences": {
            "map": {
                "restrictBounds": False,
                "bounds": [-180, -85, 180, 85],
                "minZoom": 0,
                "maxZoom": 24,
                "maxPitch": 85,
                "renderWorldCopies": True,
                "projection": "mercator",
                "ellipsoidId": "earth",
                "scaleUnit": "metric",
                "showPointerElevation": False,
                "terrainEnabled": False,
                "coordinateFormat": "dd",
                "zoomToNewLayers": True,
            },
            "environmentVariables": [],
            "geocoding": {
                "providerId": "nominatim",
                "apiKeys": {},
            },
        },
        "legend": {
            "title": "Capas del proyecto",
            "groupByLayer": True,
            "order": legend_order,
            "overrides": {},
        },
        "comments": [],
        "metadata": {
            "project_id": pid,
            "description": manifest["summary"],
            "schema_version": manifest["schema_version"],
            "community": "Comunidad Urbana Copernicus Centroamérica",
            "referential_frame_only": len(active_layers) == 0,
            "note": mv.get("reference_note"),
            "planned_layers": [
                {
                    "id": lyr["id"],
                    "title": lyr["title"],
                    "status": lyr["status"],
                    "expected_file_hint": lyr.get("expected_file_hint"),
                    "caveat": lyr.get("caveat"),
                }
                for lyr in layers_cfg.get("layers", [])
            ],
        },
    }


def render_kpi_cards_html() -> str:
    cards = []
    for val, lbl, desc in SPEC["kpis"]:
        cards.append(
            f"""
            <article class="card" style="padding:0.95rem 1.05rem;border-top:3px solid var(--c-brand-teal);">
              <div style="font-size:1.45rem;font-weight:800;color:var(--c-brand-blue);line-height:1.15;">{esc(val)}</div>
              <div style="font-size:0.84rem;font-weight:700;color:var(--c-brand-teal);margin:0.2rem 0 0.3rem;">{esc(lbl)}</div>
              <p style="margin:0;font-size:0.81rem;color:var(--c-text-muted);line-height:1.4;">{esc(desc)}</p>
            </article>
            """
        )
    return '<div class="grid-3">' + "".join(cards) + "</div>"


def render_empirical_table_html() -> str:
    ths = "".join(f"<th>{esc(h)}</th>" for h in SPEC["table_headers"])
    trs = []
    for row in SPEC["table_rows"]:
        tds = "".join(
            f"<td><strong>{esc(cell)}</strong></td>" if idx == 0 else f"<td>{esc(cell)}</td>"
            for idx, cell in enumerate(row)
        )
        trs.append(f"<tr>{tds}</tr>")
    return f"""
    <div class="card">
      <span class="badge badge-ok">Resultados Cuantitativos Verificados</span>
      <h3 style="margin:0.35rem 0 0.65rem;">{esc(SPEC['table_title'])}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr>{ths}</tr></thead>
          <tbody>{"".join(trs)}</tbody>
        </table>
      </div>
    </div>
    """


def render_project_figures_grid(ctx: SiteContext) -> str:
    fig_names = [
        "01_arquitectura_metodologica.png",
        "02_metricas_principales.png",
        "03_mapa_sintesis_resultados.png",
        "04_comparativa_territorial.png",
    ]
    cards = []
    for fname, (badge_txt, title_txt, desc_txt) in zip(fig_names, SPEC["fig_captions"]):
        f_url = html.escape(ctx.site_url(f"assets/img/figuras/{fname}"), quote=True)
        cards.append(
            f"""
            <article class="card" style="display:flex;flex-direction:column;justify-content:space-between;">
              <div>
                <span class="badge badge-lime">{esc(badge_txt)}</span>
                <h3 style="margin:0.35rem 0 0.35rem;font-size:1.02rem;color:var(--c-brand-blue);">{esc(title_txt)}</h3>
                <p style="font-size:0.84rem;color:var(--c-text-muted);margin:0 0 0.65rem;">{esc(desc_txt)}</p>
              </div>
              <a href="{f_url}" target="_blank" rel="noopener noreferrer" style="display:block;border:1px solid var(--c-border);border-radius:8px;overflow:hidden;background:#FFFFFF;">
                <img src="{f_url}" alt="{esc(badge_txt)} — {esc(title_txt)}" style="width:100%;height:auto;display:block;" loading="lazy">
              </a>
            </article>
            """
        )
    return '<div class="grid-2">' + "".join(cards) + "</div>"


def build_home_page(
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    layers_cfg: dict[str, Any],
    branding: dict[str, Any],
) -> str:
    pid = manifest["id"]
    iu = manifest["institutional_use"]
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]
    atlas_pages = SPEC["atlas_pages"]
    institutions_li = "".join(f"<li>{esc(i)}</li>" for i in iu.get("institutions", [])) or "<li>Instituciones en proceso de confirmación</li>"
    limitations_li = "".join(f"<li>{esc(x)}</li>" for x in manifest.get("limitations", [])) or "<li>Sin limitaciones adicionales registradas.</li>"
    tags_spans = "".join(f'<span class="tag">{esc(t)}</span>' for t in manifest.get("thematic_tags", []))

    repo_btn = render_link_or_pending(
        manifest["links"].get("repository"),
        "Repositorio GitHub",
        "Repositorio pendiente",
        "btn btn-outline-light",
    )

    atlas_pdf_href = html.escape(ctx.site_url(f"assets/descargas/atlas_copernicus_pa-colon.pdf"), quote=True)
    docx_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['docx_file']}"), quote=True)
    script_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['script_file']}"), quote=True)
    csv_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['csv_file']}"), quote=True)
    gv_href = html.escape(ctx.site_url("aplicacion/"), quote=True)
    atlas_href = html.escape(ctx.site_url("resultados/"), quote=True)
    sub_href = html.escape(ctx.site_url(f"{sub_slug}/"), quote=True)

    active_layer_count = sum(
        1 for lyr in layers_cfg.get("layers", []) if lyr.get("source_path") and lyr.get("status") in ("publicado", "en_revision")
    )

    hero = f"""
    <section class="hero">
      <div class="container">
        <div class="hero-eyebrow">
          <span class="badge badge-country">{esc(manifest['country']['name'])} ({esc(manifest['country']['code'])})</span>
          <span class="badge badge-lime">ID estable: {esc(pid)}</span>
          <span class="badge badge-ok">{active_layer_count} capas activas · Atlas {atlas_pages} págs.</span>
        </div>
        <h1>{esc(manifest['title'])}</h1>
        <p class="hero-lead">{esc(manifest['summary'])}</p>
        {render_hero_team(manifest)}
        <div class="hero-actions">
          <a class="btn btn-primary" href="{gv_href}">🧭 Abrir Geovisor Interactivo</a>
          <a class="btn btn-teal" href="{atlas_href}">🗺️ Abrir Atlas Interactivo y Resultados</a>
          <a class="btn btn-outline-light" href="{atlas_pdf_href}" download="Atlas_Copernicus_{esc(pid)}.pdf">📥 Descargar Atlas PDF ({atlas_pages} Págs.)</a>
          <a class="btn btn-outline-light" href="{sub_href}">📊 {esc(sub_nav)} →</a>
          {repo_btn}
        </div>
      </div>
    </section>
    """

    mv = layers_cfg.get("map_view", {})
    colaborar_logos_href = ctx.site_url("colaborar/") + "#anadir-actualizar-logos"

    body = f"""
    {render_status_strip(manifest)}

    <section class="section" aria-label="Accesos directos al Geovisor, Atlas y Metodología">
      <div class="direct-access-strip">
        <article class="direct-access-card">
          <div>
            <span class="badge badge-ok">Visor Multicapa Interactivo</span>
            <h3>🧭 Geovisor del Proyecto ({esc(pid)})</h3>
            <p>Explora dinámicamente las {active_layer_count} capas geoespaciales verificadas en {esc(manifest['territory']['label'])}, simbología temática, leyendas interactivas y 23 mapas base Copernicus.</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
            <a class="btn btn-primary btn-xs" href="{gv_href}">Abrir Geovisor Interactivo →</a>
            <a class="btn btn-outline btn-xs" href="{html.escape(ctx.site_url('geovisor/proyecto.geolibre.json'), quote=True)}" download="proyecto-{esc(pid)}.geolibre.json">JSON GeoLibre</a>
          </div>
        </article>

        <article class="direct-access-card is-teal">
          <div>
            <span class="badge badge-lime">Parte I Proyecto + Parte II Copernicus</span>
            <h3>🗺️ Atlas Cartográfico Web y PDF ({atlas_pages} Págs.)</h3>
            <p>Consulta el Atlas interactivo encabezado por las láminas específicas desarrolladas en {esc(manifest['territory']['label'])} seguidas por las 10 series satelitales Copernicus, o descarga la edición editorial A4.</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
            <a class="btn btn-teal btn-xs" href="{atlas_href}">Abrir Atlas Interactivo →</a>
            <a class="btn btn-outline btn-xs" href="{atlas_pdf_href}" download="Atlas_Copernicus_{esc(pid)}.pdf">📥 Atlas PDF ({atlas_pages} Págs.)</a>
          </div>
        </article>

        <article class="direct-access-card is-gold">
          <div>
            <span class="badge badge-declarado">Memoria Técnica y Código Abierto</span>
            <h3>📊 {esc(sub_nav)}, Word y Script</h3>
            <p>Revisa la arquitectura metodológica de 4 fases, los resultados cuantitativos obtenidos, el documento Word (.docx), la tabla CSV de indicadores y el script reproducible.</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
            <a class="btn btn-primary btn-xs" href="{sub_href}">{esc(sub_nav)} →</a>
            <a class="btn btn-outline btn-xs" href="{docx_href}" download="{esc(SPEC['docx_file'])}">📥 Word (.docx)</a>
            <a class="btn btn-outline btn-xs" href="{script_href}" download="{esc(SPEC['script_file'])}">📜 Script</a>
            <a class="btn btn-outline btn-xs" href="{csv_href}" download="{esc(SPEC['csv_file'])}">📊 CSV</a>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-header">
        <div>
          <span class="badge badge-ok">Síntesis Cuantitativa de Resultados Obtenidos</span>
          <h2 style="margin:0.25rem 0 0;">Indicadores clave verificados en {esc(manifest['territory']['label'])}</h2>
        </div>
        <a class="btn btn-teal btn-xs" href="{sub_href}">Ver análisis metodológico completo →</a>
      </div>
      {render_kpi_cards_html()}
    </section>

    <section class="section">
      <div class="section-header">
        <h2>Contexto institucional y decisión pública que apoya</h2>
        <div class="tag-list">{tags_spans}</div>
      </div>
      <div class="grid-3">
        <article class="card">
          <span class="badge badge-declarado">Problema territorial</span>
          <h3>Desafío urbano abordado</h3>
          <p>{esc(iu.get('problem'))}</p>
          <p><strong>Ámbito:</strong> {esc(SPEC['area_str'])}</p>
        </article>
        <article class="card">
          <span class="badge badge-declarado">Contrapartes técnicas</span>
          <h3>Instituciones y usuario directo</h3>
          <ul>{institutions_li}</ul>
          <p><strong>Usuario principal:</strong> {esc(iu.get('primary_user'), 'Equipo técnico institucional')}</p>
        </article>
        <article class="card">
          <span class="badge badge-declarado">Aplicación operativa</span>
          <h3>Decisión pública respaldada</h3>
          <p>{esc(iu.get('decision_supported'))}</p>
          <p><strong>Valor agregado:</strong> {esc(iu.get('expected_benefit'))}</p>
        </article>
      </div>
    </section>

    {render_team_section_html(manifest)}

    <section class="section">
      <div class="grid-2">
        <article class="card">
          <span class="badge badge-ok">Alcance Técnico Implementado</span>
          <h3>Producto Mínimo Viable (PMV) y Escala de Análisis</h3>
          <p>{esc(manifest['pmv'].get('description'))}</p>
          <div class="callout callout-muted">
            <strong>Resolución y unidad espacial</strong>
            <span>{esc(SPEC['res_str'])}</span>
          </div>
          <div class="card-footer">
            <a class="btn btn-teal" href="{html.escape(ctx.site_url('proyecto/'), quote=True)}">Ficha del proyecto y criterios ({len(manifest['pmv'].get('acceptance_criteria', []))})</a>
            <a class="btn btn-outline" href="{html.escape(ctx.site_url('metodologia/'), quote=True)}">Fuentes de datos y método</a>
          </div>
        </article>

        <article class="card">
          <span class="badge badge-lime">Ecosistema Geoespacial Integrado</span>
          <h3>Geovisor GeoLibre + Atlas Editorial Copernicus</h3>
          <p>Todas las capas publicadas en <code>geovisor/capas/</code> alimentan de manera coherente el visor web MapLibre GL JS, el archivo estándar <code>proyecto.geolibre.json</code> (v0.2.0) y las láminas de la Parte I del Atlas Cartográfico.</p>
          <p><strong>Estado actual del catálogo:</strong> {active_layer_count} capas geoespaciales publicadas y verificadas sin datos personales sensibles.</p>
          <div class="card-footer">
            <a class="btn btn-primary" href="{gv_href}">🧭 Explorar Geovisor →</a>
            <a class="btn btn-teal" href="{atlas_href}">🗺️ Explorar Atlas Web y PDF →</a>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="callout callout-warn">
        <strong>Alcance técnico, supuestos y cautelas de interpretación</strong>
        <ul>{limitations_li}</ul>
      </div>
    </section>

    {render_project_institutions_band(ctx, branding, manifest, colaborar_href=colaborar_logos_href)}
    """

    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title="Inicio",
        active_nav="inicio",
        hero_html=hero,
        body_html=body,
    )


def build_proyecto_page(
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    project_md: str,
    pmv_md: str,
    branding: dict[str, Any],
) -> str:
    pid = manifest["id"]
    ac_rows = []
    for ac in manifest["pmv"].get("acceptance_criteria", []):
        ac_rows.append(
            f"<tr><td><code>{esc(ac['id'])}</code></td>"
            f"<td>{esc(ac['description'])}</td>"
            f"<td>{badge_html(ac['status'])}</td>"
            f"<td>{esc(ac.get('evidence_required'))}</td></tr>"
        )
    ac_table = (
        '<div class="table-wrap"><table><thead><tr>'
        "<th>ID</th><th>Criterio técnico</th><th>Estado</th><th>Evidencia verificable</th>"
        "</tr></thead><tbody>" + "".join(ac_rows) + "</tbody></table></div>"
        if ac_rows
        else "<p>Criterios técnicos en documentación.</p>"
    )

    src_rows = []
    for s in manifest["provenance"]["sources"]:
        url_cell = (
            f'<a href="{html.escape(s["url"], quote=True)}" target="_blank" rel="noopener noreferrer">Abrir referencia externa ↗</a>'
            if s.get("url")
            else "Insumo técnico documentado en el repositorio"
        )
        src_rows.append(f"<tr><td><strong>{esc(s['label'])}</strong></td><td>{url_cell}</td></tr>")

    gov = manifest.get("governance", {})
    updated_label = format_spanish_date(gov.get("content_updated_at"), "2026")
    colaborar_logos_href = ctx.site_url("colaborar/") + "#anadir-actualizar-logos"
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]

    hero = f"""
    <section class="hero">
      <div class="container">
        <div class="hero-eyebrow">
          <span class="badge badge-lime">Ficha institucional y técnica</span>
          <span class="badge badge-country">{esc(pid)}</span>
        </div>
        <h1>{esc(manifest['title'])}</h1>
        <p class="hero-lead">Delimitación territorial en {esc(manifest['territory']['label'])}, objetivos operativos, criterios del Producto Mínimo Viable e instituciones contraparte.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="{html.escape(ctx.site_url('aplicacion/'), quote=True)}">🧭 Ir al Geovisor</a>
          <a class="btn btn-teal" href="{html.escape(ctx.site_url('resultados/'), quote=True)}">🗺️ Ir al Atlas y Resultados</a>
          <a class="btn btn-outline-light" href="{html.escape(ctx.site_url(f'{sub_slug}/'), quote=True)}">📊 {esc(sub_nav)} →</a>
        </div>
      </div>
    </section>
    """

    body = f"""
    {render_status_strip(manifest)}

    <section class="section">
      <div class="card">
        <h3>Coordinación técnica, gobernanza de datos y entregables activos</h3>
        <div class="grid-3">
          <div>
            <p><strong>Instituciones vinculadas:</strong><br>{esc(", ".join(manifest["institutional_use"].get("institutions", [])), "Contrapartes locales")}</p>
            <p><strong>Ámbito geográfico:</strong><br>{esc(SPEC['area_str'])}</p>
          </div>
          <div>
            <p><strong>Productos publicados:</strong><br>Capas en <code>geovisor/capas/</code>, Atlas de {SPEC['atlas_pages']} páginas y memoria metodológica en Word.</p>
            <p><strong>Última actualización:</strong><br><strong>{esc(updated_label)}</strong></p>
          </div>
          <div>
            <p><strong>Reproducibilidad abierta:</strong><br>Script de procesamiento, indicadores CSV y metadatos JSON validados bajo esquema común.</p>
            <p><a class="btn btn-teal btn-xs" href="{html.escape(ctx.site_url('colaborar/'), quote=True)}">Descargar datos y código →</a></p>
          </div>
        </div>
      </div>
    </section>

    {render_team_section_html(manifest)}

    <section class="section">
      <div class="prose">
        {render_markdown(project_md)}
      </div>
    </section>

    <section class="section">
      <h2>Criterios técnicos verificables del PMV</h2>
      {ac_table}
    </section>

    <section class="section">
      <div class="prose">
        {render_markdown(pmv_md)}
      </div>
    </section>

    <section class="section">
      <h2>Referencias e insumos documentales</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Insumo o documento de referencia</th><th>Disponibilidad</th></tr></thead>
          <tbody>{"".join(src_rows)}</tbody>
        </table>
      </div>
    </section>

    {render_project_institutions_band(ctx, branding, manifest, colaborar_href=colaborar_logos_href)}
    """

    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title="Ficha del proyecto",
        active_nav="proyecto",
        hero_html=hero,
        body_html=body,
    )


def build_aplicacion_page(
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    layers_cfg: dict[str, Any],
    branding: dict[str, Any],
) -> str:
    pid = manifest["id"]
    mv = layers_cfg.get("map_view", {})
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]
    atlas_pages = SPEC["atlas_pages"]

    grouped: dict[str, list[dict[str, Any]]] = {}
    for lyr in layers_cfg.get("layers", []):
        grp = lyr.get("group", "Capas del proyecto")
        grouped.setdefault(grp, []).append(lyr)

    groups_html: list[str] = []
    for grp_name, items in grouped.items():
        items_html: list[str] = []
        for lyr in items:
            lid = lyr["id"]
            is_ready = bool(lyr.get("source_path")) and lyr.get("status") in ("publicado", "en_revision")
            vis_default = not (isinstance(lyr.get("style"), dict) and lyr["style"].get("visible_by_default") is False)
            disabled_attr = "" if is_ready else " disabled"
            checked_attr = " checked" if (is_ready and vis_default) else ""
            caveat_html = f'<div class="layer-item-caveat">{esc(lyr.get("caveat"))}</div>' if lyr.get("caveat") else ""
            items_html.append(
                f"""
                <div class="layer-item">
                  <div class="layer-item-head">
                    <label class="layer-item-title">
                      <input type="checkbox" data-layer-toggle="{esc(lid)}"{checked_attr}{disabled_attr}>
                      <span>{esc(lyr['title'])}</span>
                    </label>
                    {badge_html(lyr.get('status', 'publicado'))}
                  </div>
                  <div class="layer-item-meta">Formato: <code>{esc(lyr.get('format'))}</code> · Escala/resolución: {esc(lyr.get('resolution'), 'Ver metadatos')}</div>
                  <div class="layer-item-meta" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.35rem;">
                    <label for="op-{esc(lid)}">Opacidad:</label>
                    <input id="op-{esc(lid)}" type="range" min="0.1" max="1" step="0.05" value="0.78" data-layer-opacity="{esc(lid)}"{disabled_attr}>
                  </div>
                  <div data-layer-swatches="{esc(lid)}" style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-top:0.35rem;"></div>
                  {caveat_html}
                </div>
                """
            )
        groups_html.append(f'<div class="layer-group-title">{esc(grp_name)}</div>' + "".join(items_html))

    controls_li = "".join(f"<li>{esc(c)}</li>" for c in layers_cfg.get("planned_controls", []))
    effective_repo_slug = (
        ctx.github_repository
        if ctx.github_repository
        else (ctx.canonical_repository if ctx.effective_mode == "canonical" else None)
    )
    runtime_cfg = dict(layers_cfg)
    runtime_cfg["site_base_url"] = ctx.site_url("")
    runtime_cfg["repository_slug"] = effective_repo_slug
    runtime_cfg["canonical_repository_slug"] = ctx.canonical_repository
    runtime_cfg["effective_mode"] = ctx.effective_mode
    runtime_cfg["repository_branch"] = "main"
    safe_json_cfg = json.dumps(runtime_cfg, ensure_ascii=False).replace("</", "<\\/")

    repo_capas_gh_btn = ""
    target_gh_slug = effective_repo_slug or ctx.canonical_repository
    if target_gh_slug:
        gh_capas_url = f"https://github.com/{target_gh_slug}/tree/main/geovisor/capas"
        repo_capas_gh_btn = (
            f'<a class="btn btn-outline btn-xs" href="{html.escape(gh_capas_url, quote=True)}" '
            f'target="_blank" rel="noopener noreferrer">Abrir geovisor/capas/ en GitHub ↗</a>'
        )

    sub_href = html.escape(ctx.site_url(f"{sub_slug}/"), quote=True)
    atlas_href = html.escape(ctx.site_url("resultados/"), quote=True)
    atlas_pdf_href = html.escape(ctx.site_url(f"assets/descargas/atlas_copernicus_pa-colon.pdf"), quote=True)
    docx_dl_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['docx_file']}"), quote=True)
    script_dl_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['script_file']}"), quote=True)

    hero = f"""
    <section class="hero hero-compact">
      <div class="container">
        <div class="hero-eyebrow" style="margin-bottom:0.45rem;">
          <span class="badge badge-lime">Geovisor basado en GeoLibre</span>
          <span class="badge badge-country">{esc(pid)} · {esc(manifest['territory']['label'])}</span>
          {badge_html(manifest['status']['demo'], 'Estado Demo')}
        </div>
        <h1>{esc(layers_cfg.get('title', manifest['title']))}</h1>
        <p class="hero-lead">Explora las capas vectoriales y rásters georreferenciados desarrollados en {esc(manifest['territory']['label'])}, combinados con 23 capas satelitales abiertas del Programa Copernicus.</p>
        <div class="hero-actions" style="margin-top:0.65rem;">
          <a class="btn btn-primary" href="{sub_href}">📊 {esc(sub_nav)}: Metodología y Resultados →</a>
          <a class="btn btn-teal" href="{atlas_href}">🗺️ Abrir Atlas Interactivo →</a>
          <a class="btn btn-outline-light" href="{atlas_pdf_href}" download="Atlas_Copernicus_{esc(pid)}.pdf">📥 Atlas PDF ({atlas_pages} Págs.)</a>
          <a class="btn btn-outline-light" href="{docx_dl_href}" download="{esc(SPEC['docx_file'])}">📥 Metodología (.docx)</a>
          <a class="btn btn-outline-light" href="{script_dl_href}" download="{esc(SPEC['script_file'])}">📜 Script</a>
        </div>
      </div>
    </section>
    """

    geolibre_json_href = html.escape(ctx.site_url("geovisor/proyecto.geolibre.json"), quote=True)
    geolibre_full_url = ctx.full_url("geovisor/proyecto.geolibre.json")
    studio_open_href = (
        f"https://web.geolibre.app/?url={urllib.parse.quote(geolibre_full_url, safe='')}"
        if geolibre_full_url.startswith("https://")
        else "https://web.geolibre.app/"
    )
    colaborar_logos_href = ctx.site_url("colaborar/") + "#anadir-actualizar-logos"

    body = f"""
    <div class="callout" style="margin-top:0;margin-bottom:1rem;padding:0.75rem 1rem;">
      <strong>Nota cartográfica ({esc(mv.get('scale_label', SPEC['res_str']))})</strong>
      <span>{esc(mv.get('reference_note', SPEC['area_str']))} Haz clic sobre cualquier polígono o elemento activo en el mapa para consultar sus indicadores verificados.</span>
    </div>

    <section class="section" id="geovisor-app">
      <div class="geovisor-shell">
        <aside class="geovisor-sidebar" aria-label="Controles y capas del geovisor">
          <div class="geovisor-tabs" role="tablist">
            <button type="button" class="geovisor-tab is-active" data-gv-tab="layers">Capas ({len(layers_cfg.get('layers', []))})</button>
            <button type="button" class="geovisor-tab" data-gv-tab="repo-folder">Carpeta repo</button>
            <button type="button" class="geovisor-tab" data-gv-tab="local">Archivo local</button>
            <button type="button" class="geovisor-tab" data-gv-tab="embed">GeoLibre</button>
          </div>

          <div class="geovisor-panel is-active" data-gv-panel="layers">
            <div style="margin-bottom:0.65rem;padding:0.6rem 0.65rem;background:linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%);color:#FFFFFF;border-radius:8px;border:1px solid #334155;">
              <div style="font-size:0.73rem;font-weight:700;color:#FDE047;margin-bottom:0.22rem;">🛰️ ANÁLISIS ESPECÍFICO DEL PROYECTO ({esc(pid.upper())})</div>
              <p style="font-size:0.72rem;color:#E2E8F0;margin:0 0 0.45rem 0;line-height:1.35;">
                Consulta la memoria metodológica en Word, las ecuaciones, tablas empíricas, figuras 300 DPI y el script reproducible que generó estas capas:
              </p>
              <a class="btn btn-primary btn-xs" style="width:100%;justify-content:center;font-weight:700;" href="{sub_href}">
                📊 Abrir {esc(sub_nav)} →
              </a>
            </div>

            <div class="filter-field" style="margin-bottom:0.5rem;">
              <label for="gv-basemap-select">Catálogo de Mapas Base Copernicus y Derivados (23 capas abiertas)</label>
              <select id="gv-basemap-select">
                <optgroup label="1. Modelo Digital de Elevación Oficial Copernicus DEM (GLO-30 · 30 m)">
                  <option value="copernicus-dem-glo30">Copernicus DEM GLO-30 (30 m · Elevación Hipsométrica + Sombreado)</option>
                  <option value="copernicus-dem-hillshade">Copernicus DEM GLO-30 (30 m · Sombreado de Relieve / Hillshade)</option>
                  <option value="copernicus-dem-viridis">Copernicus DEM GLO-30 (30 m · Hipsometría Viridis + Curvas de Nivel)</option>
                </optgroup>
                <optgroup label="2. Cobertura Terrestre y Mancha Urbana 10 m (Sentinel-1 + Sentinel-2)">
                  <option value="esa-worldcover-2021">ESA WorldCover 10 m (2021 v200 · Mancha Urbana y Cobertura)</option>
                  <option value="esa-worldcover-2020">ESA WorldCover 10 m (2020 v100 · Mancha Urbana y Cobertura)</option>
                  <option value="s2-lulc-2023">Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2023 · 9 clases)</option>
                  <option value="s2-lulc-2022">Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2022 · 9 clases)</option>
                  <option value="s2-lulc-2021">Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2021 · 9 clases)</option>
                  <option value="s2-lulc-2020">Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2020 · 9 clases)</option>
                  <option value="s2-lulc-2019">Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2019 · 9 clases)</option>
                  <option value="s2-lulc-2018">Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2018 · 9 clases)</option>
                  <option value="s2-lulc-2017">Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2017 · Línea base)</option>
                </optgroup>
                <optgroup label="3. Índices Espectrales y Bandas Copernicus Sentinel-2 L2A (10 m / 20 m)">
                  <option value="s2-l2a-ndvi">Sentinel-2 L2A · Índice de Vegetación Urbana (NDVI · 10 m)</option>
                  <option value="s2-l2a-ndbi">Sentinel-2 L2A · Índice de Edificación / Área Construida (NDBI · 20 m)</option>
                  <option value="s2-l2a-ndwi">Sentinel-2 L2A · Índice de Humedad Superficial (NDWI · 20 m)</option>
                  <option value="s2-l2a-falsecolor">Sentinel-2 L2A · Falso Color Infrarrojo (B08-B04-B03 · 10 m)</option>
                  <option value="s2-l2a-swir">Sentinel-2 L2A · SWIR Urbano (B12-B8A-B04 · 20 m)</option>
                </optgroup>
                <optgroup label="4. Radar de Apertura Sintética Copernicus Sentinel-1 SAR RTC (10 m · Sin Nubes)">
                  <option value="s1-rtc-falsecolor">Copernicus Sentinel-1 SAR RTC (10 m · Compuesto Urbano VV+VH)</option>
                  <option value="s1-rtc-vv">Copernicus Sentinel-1 SAR RTC (10 m · Polarización VV Escala de Grises)</option>
                </optgroup>
                <optgroup label="5. Agua Superficial e Inundaciones (JRC Comisión Europea / Copernicus)">
                  <option value="jrc-gsw-occurrence">JRC Agua Superficial · Ocurrencia Histórica e Inundación (1984–2021)</option>
                  <option value="jrc-gsw-extent">JRC Agua Superficial · Extensión Máxima de Agua / Inundación</option>
                </optgroup>
                <optgroup label="6. Mosaicos Anuales Ópticos Copernicus Sentinel-2 Cloudless (2018–2024)">
                  <option value="sentinel2-2024">Copernicus Sentinel-2 Cloudless (Mosaico 2024 · EOX)</option>
                  <option value="sentinel2-2023">Copernicus Sentinel-2 Cloudless (Mosaico 2023 · EOX)</option>
                  <option value="sentinel2-2022">Copernicus Sentinel-2 Cloudless (Mosaico 2022 · EOX)</option>
                  <option value="sentinel2-2021">Copernicus Sentinel-2 Cloudless (Mosaico 2021 · EOX)</option>
                  <option value="sentinel2-2020">Copernicus Sentinel-2 Cloudless (Mosaico 2020 · EOX)</option>
                  <option value="sentinel2-2019">Copernicus Sentinel-2 Cloudless (Mosaico 2019 · EOX)</option>
                  <option value="sentinel2-2018">Copernicus Sentinel-2 Cloudless (Mosaico 2018 · EOX)</option>
                </optgroup>
                <optgroup label="7. Mapas Base Vectoriales y Referencia Cartográfica">
                  <option value="carto-positron" selected>Mapa Claro Vectorial (OpenFreeMap)</option>
                  <option value="osm-standard">OpenStreetMap Estándar</option>
                  <option value="carto-dark">Modo Oscuro Vectorial (OpenFreeMap)</option>
                  <option value="esri-imagery">Imagen Satelital de Alta Resolución (Esri)</option>
                </optgroup>
              </select>
            </div>

            <div style="margin-bottom:0.75rem;background:#F3F6FD;border:1px solid var(--c-border);border-radius:6px;padding:0.5rem 0.6rem;">
              <div style="font-size:0.74rem;font-weight:700;color:var(--c-brand-blue);margin-bottom:0.38rem;">🛰️ Acceso directo por familia Copernicus (Sin API Key):</div>
              <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="copernicus-dem-glo30" title="Copernicus DEM GLO-30 (30 m · Elevación Hipsométrica + Sombreado)">⛰️ DEM GLO-30</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="copernicus-dem-hillshade" title="Copernicus DEM GLO-30 (30 m · Sombreado de Relieve / Hillshade)">⛰️ Hillshade</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="esa-worldcover-2021" title="ESA WorldCover 10 m (Mancha urbana y cobertura derivada de Sentinel-1 y Sentinel-2)">🏙️ WorldCover 10m</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="s2-lulc-2023" title="Uso y Cobertura del Suelo Sentinel-2 10 m (2023)">🏙️ LULC 2023</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="s2-l2a-ndvi" title="Sentinel-2 L2A Índice de Vegetación Urbana (NDVI · 10 m)">🌿 NDVI</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="s2-l2a-ndbi" title="Sentinel-2 L2A Índice de Edificación / Área Construida (NDBI · 20 m)">🏗️ NDBI</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="s1-rtc-falsecolor" title="Radar de Apertura Sintética Copernicus Sentinel-1 SAR RTC (10 m · VV+VH)">📡 Radar S1</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="jrc-gsw-occurrence" title="JRC Agua Superficial e Inundación (Comisión Europea)">🌊 JRC Agua</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="sentinel2-2024" title="Mosaico anual abierto Copernicus Sentinel-2 Cloudless 2024">🛰️ S2 2024</button>
                <button type="button" class="btn btn-outline btn-xs" data-basemap-quick="sentinel2-2018" title="Mosaico anual abierto Copernicus Sentinel-2 Cloudless 2018">🛰️ S2 2018</button>
                <button type="button" class="btn btn-teal btn-xs" data-basemap-quick="carto-positron" title="Mapa Claro Vectorial de Referencia">🗺️ Vectorial</button>
              </div>
              <div id="gv-basemap-legend" style="margin-top:0.42rem;padding-top:0.35rem;border-top:1px dashed var(--c-border);font-size:0.73rem;color:var(--c-text-muted);line-height:1.35;">
                🗺️ Mapa base vectorial de referencia cartográfica (OpenFreeMap / OpenStreetMap)
              </div>
            </div>

            <div style="margin-bottom:0.65rem;padding:0.45rem 0.6rem;background:#FFFDF5;border:1px solid #E5D48A;border-radius:6px;">
              <label style="display:flex;align-items:center;gap:0.45rem;font-size:0.8rem;font-weight:700;color:var(--c-brand-blue);">
                <input type="checkbox" id="gv-toggle-mask" checked>
                <span>Enmascarar fuera del límite de zona de estudio</span>
              </label>
              <div style="display:flex;align-items:center;gap:0.45rem;margin-top:0.3rem;font-size:0.74rem;color:var(--c-text-muted);">
                <span>Opacidad máscara:</span>
                <input type="range" id="gv-mask-opacity" min="0" max="1" step="0.05" value="0.88" style="flex:1;" aria-label="Opacidad de máscara exterior">
              </div>
            </div>

            <label style="display:flex;align-items:center;gap:0.45rem;font-size:0.83rem;font-weight:600;margin-bottom:0.6rem;">
              <input type="checkbox" id="gv-toggle-ref-marker" checked>
              <span>Mostrar marcador de centroide referencial</span>
            </label>
            {"".join(groups_html)}
          </div>

          <div class="geovisor-panel" data-gv-panel="repo-folder">
            <h3 style="margin-top:0;font-size:1rem;color:var(--c-brand-blue);">Cargar capa desde carpeta del repositorio</h3>
            <p style="font-size:0.82rem;">Lee los archivos publicados en <code>geovisor/capas/</code> de esta vista.</p>
            <div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.75rem;">
              <button type="button" id="gv-refresh-repo-folder" class="btn btn-teal btn-xs">Leer / Refrescar carpeta</button>
              {repo_capas_gh_btn}
            </div>
            <p id="gv-repo-folder-status" style="font-size:0.8rem;color:var(--c-brand-blue);font-weight:600;margin-bottom:0.6rem;">Consultando carpeta geovisor/capas/...</p>
            <div id="gv-repo-folder-list"></div>
          </div>

          <div class="geovisor-panel" data-gv-panel="local">
            <h3 style="margin-top:0;font-size:1rem;color:var(--c-brand-blue);">Inspeccionar archivo local (.geojson / .kml)</h3>
            <p style="font-size:0.84rem;">Arrastra un archivo desde tu equipo para superponerlo temporalmente en el navegador sin subir datos al servidor.</p>
            <div class="dropzone" id="gv-dropzone" tabindex="0" role="button" aria-label="Seleccionar archivo GeoJSON o KML local">
              <strong>Haz clic o arrastra aquí un .geojson / .kml</strong>
              <div style="font-size:0.78rem;margin-top:0.25rem;">WGS84 (EPSG:4326) recomendado</div>
            </div>
            <input type="file" id="gv-local-geojson-input" accept=".geojson,.json,.kml,application/geo+json,application/json" class="hidden">
            <p id="gv-local-status" style="font-size:0.82rem;color:var(--c-brand-blue);font-weight:600;">Ningún archivo temporal cargado.</p>
            <button type="button" id="gv-clear-local" class="btn btn-outline btn-xs hidden">Quitar capa temporal</button>
          </div>

          <div class="geovisor-panel" data-gv-panel="embed">
            <h3 style="margin-top:0;font-size:1rem;color:var(--c-brand-blue);">Integración con GeoLibre Studio</h3>
            <p id="geolibre-embed-notice" style="font-size:0.83rem;">Abre el proyecto completo estandarizado (<code>geovisor/proyecto.geolibre.json</code> v0.2.0) directamente en GeoLibre Studio.</p>
            <div style="display:flex;flex-direction:column;gap:0.55rem;margin-top:0.85rem;">
              <a class="btn btn-primary" href="{html.escape(studio_open_href, quote=True)}" target="_blank" rel="noopener noreferrer">Abrir proyecto en GeoLibre Studio ↗</a>
              <a class="btn btn-teal" href="{geolibre_json_href}" download="proyecto-{esc(pid)}.geolibre.json">Descargar proyecto.geolibre.json</a>
            </div>
          </div>
        </aside>

        <div class="geovisor-stage">
          <div class="geovisor-toolbar">
            <div><strong>{esc(layers_cfg.get('title', manifest['title']))}</strong> · Motor MapLibre / GeoLibre</div>
            <div class="geovisor-toolbar-actions">
              <a class="btn btn-primary btn-xs" style="background:#D97706;border-color:#B45309;color:#FFFFFF;font-weight:700;" href="{sub_href}">📊 {esc(sub_nav)} →</a>
              <a class="btn btn-outline-light btn-xs" href="{atlas_href}">🗺️ Atlas Web</a>
              <a class="btn btn-outline-light btn-xs" href="{docx_dl_href}" download="{esc(SPEC['docx_file'])}">📥 Metodología Word</a>
              <a class="btn btn-outline-light btn-xs" href="{atlas_pdf_href}" download="Atlas_Copernicus_{esc(pid)}.pdf">📥 Atlas PDF ({atlas_pages}p)</a>
              <button type="button" id="gv-toggle-fullscreen" class="btn btn-teal btn-xs">⛶ Pantalla completa</button>
              <button type="button" id="gv-toggle-sidebar" class="btn btn-outline-light btn-xs">⇄ Panel lateral</button>
              <button type="button" id="gv-reset-view" class="btn btn-outline-light btn-xs">Encuadre inicial</button>
              <a class="btn btn-outline-light btn-xs" href="{geolibre_json_href}">JSON GeoLibre</a>
              <a id="btn-open-geolibre-studio" class="btn btn-primary btn-xs" href="{html.escape(studio_open_href, quote=True)}" target="_blank" rel="noopener noreferrer">GeoLibre Studio ↗</a>
            </div>
          </div>
          <div id="geovisor-map-canvas" class="geovisor-canvas" role="region" aria-label="Mapa interactivo del proyecto">
            <div id="gv-floating-legend" class="geovisor-map-legend" aria-live="polite">
              <div class="gv-legend-header">
                <span class="gv-legend-title" id="gv-legend-title">🗺️ Leyenda del mapa</span>
                <button type="button" id="gv-legend-toggle" class="gv-legend-toggle-btn" aria-label="Minimizar leyenda" title="Minimizar o expandir leyenda">−</button>
              </div>
              <div id="gv-legend-body" class="gv-legend-body">
                <div style="font-size:0.72rem;color:var(--c-text-muted);">Cargando simbología...</div>
              </div>
            </div>
          </div>
          <iframe id="geolibre-embed-iframe" class="geovisor-iframe" title="Visor GeoLibre embebido" allowfullscreen loading="lazy"></iframe>
          <div class="geovisor-statusbar">
            <span id="gv-coords-readout">Encuadre inicial: Lat {mv.get('center', [0, 0])[1]:.4f} · Lon {mv.get('center', [0, 0])[0]:.4f}</span>
            <span>Capas verificadas de {esc(pid)} · Simbología temática sincronizada</span>
          </div>
        </div>
      </div>
      <script id="geovisor-config-data" type="application/json">{safe_json_cfg}</script>
    </section>

    <section class="section">
      <div class="grid-2">
        <div class="card">
          <span class="badge badge-declarado">Interoperabilidad abierta</span>
          <h2>Formatos disponibles en <code>geovisor/capas/</code></h2>
          <p>Todas las capas activas se distribuyen en <code>EPSG:4326</code> (GeoJSON optimizado y GeoTIFF Cloud-Optimized COG con vistas previas georreferenciadas), listas para descarga directa o apertura en QGIS y GeoLibre Studio.</p>
        </div>
        <div class="card">
          <span class="badge badge-ok"> Capacidades analíticas del visor</span>
          <h2>Funciones integradas en este proyecto</h2>
          <ul>{controls_li or '<li>Superposición multicapa, control de opacidad, máscara territorial y consulta de atributos por clic.</li>'}</ul>
        </div>
      </div>
    </section>

    {render_project_institutions_band(ctx, branding, manifest, colaborar_href=colaborar_logos_href)}
    """

    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title="Geovisor GeoLibre y Aplicación",
        active_nav="aplicacion",
        hero_html=hero,
        body_html=body,
        include_maplibre=True,
    )


def build_subpagina_page(
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    layers_cfg: dict[str, Any],
    branding: dict[str, Any],
    clases_cmp: list[dict[str, Any]] | None = None,
) -> str:
    pid = manifest["id"]
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]
    atlas_pages = SPEC["atlas_pages"]

    gv_href = html.escape(ctx.site_url("aplicacion/"), quote=True)
    atlas_href = html.escape(ctx.site_url("resultados/"), quote=True)
    atlas_pdf_href = html.escape(ctx.site_url(f"assets/descargas/atlas_copernicus_pa-colon.pdf"), quote=True)
    docx_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['docx_file']}"), quote=True)
    script_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['script_file']}"), quote=True)
    csv_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['csv_file']}"), quote=True)

    script_disk = ROOT / "web" / "assets" / "descargas" / SPEC["script_file"]
    script_code = script_disk.read_text(encoding="utf-8") if script_disk.exists() else "# Script disponible en src/"
    if len(script_code.splitlines()) > 160:
        preview_lines = script_code.splitlines()[:160]
        script_preview = "\n".join(preview_lines) + "\n\n# ... [Descarga el archivo completo desde el botón superior para inspeccionar todas las líneas] ..."
    else:
        script_preview = script_code

    phases_cards = []
    for p_title, p_desc in SPEC["phases"]:
        phases_cards.append(
            f"""
            <article class="card" style="border-left:4px solid var(--c-brand-blue);">
              <h3 style="margin:0 0 0.35rem;font-size:1.02rem;color:var(--c-brand-blue);">{esc(p_title)}</h3>
              <p style="margin:0;font-size:0.88rem;color:var(--c-text-muted);line-height:1.5;">{esc(p_desc)}</p>
            </article>
            """
        )

    formulas_block = "\n".join(SPEC["formulas"])
    roadmap_li = "".join(f"<li style='margin-bottom:0.45rem;'>{esc(item)}</li>" for item in SPEC["roadmap"])

    comparador_interactive_section = ""
    page_script_arg: str | None = None
    if pid == "pa-colon" and clases_cmp is not None:
        mv = layers_cfg.get("map_view", {})
        center = mv.get("center") or [-79.865, 9.335]
        slug = ctx.github_repository or ctx.canonical_repository or "copernicuscentroamerica/urbano-pa-colon"
        repo_actions = f"https://github.com/{slug}/actions/workflows/comparador.yml"
        doc_url = f"https://github.com/{slug}/blob/main/docs/comparador-multitemporal.md"
        cfg_cmp = {
            "base": ctx.site_url(""),
            "clases": clases_cmp,
            "default_center": [float(center[0]), float(center[1])],
            "repo_slug": slug,
            "eox_years": list(range(2016, 2025)),
        }
        safe_cfg = json.dumps(cfg_cmp, ensure_ascii=False).replace("</", "<\\/")
        comparador_interactive_section = (
            globals()["COMPARADOR_BODY"]
            .replace("__METODO_URL__", html.escape(ctx.site_url("metodologia/"), quote=True))
            .replace("__DOC_URL__", html.escape(doc_url, quote=True))
            .replace("__GEE_URL__", html.escape(ctx.site_url("comparador/geourbano_comparador.js"), quote=True))
            .replace("__REPO_ACTIONS__", html.escape(repo_actions, quote=True))
            .replace("__LAT__", f"{float(center[1]):.5f}")
            .replace("__LON__", f"{float(center[0]):.5f}")
            .replace("__YEAR_END__", "2024")
            .replace("__CONFIG__", safe_cfg)
        )
        page_script_arg = "assets/js/comparador.js"

    hero = f"""
    <section class="hero">
      <div class="container">
        <div class="hero-eyebrow">
          <span class="badge badge-lime">{esc(SPEC['subpage_badge'])}</span>
          <span class="badge badge-country">{esc(pid)} · {esc(manifest['country']['name'])}</span>
        </div>
        <h1>{esc(SPEC['subpage_title'])}</h1>
        <p class="hero-lead">Ámbito: {esc(SPEC['area_str'])} · Escala: {esc(SPEC['res_str'])}. Metodología aplicada, evaluación empírica de primeros resultados, código abierto y hoja de ruta de refinamiento.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="{gv_href}">🧭 Explorar Capas en el Geovisor</a>
          <a class="btn btn-teal" href="{atlas_href}">🗺️ Ver en Atlas Interactivo</a>
          <a class="btn btn-outline-light" href="{docx_href}" download="{esc(SPEC['docx_file'])}">📥 Memoria Metodológica (.docx)</a>
          <a class="btn btn-outline-light" href="{atlas_pdf_href}" download="Atlas_Copernicus_{esc(pid)}.pdf">📘 Atlas PDF ({atlas_pages} Págs.)</a>
          <a class="btn btn-outline-light" href="{script_href}" download="{esc(SPEC['script_file'])}">📜 Script ({esc(SPEC['script_file'])})</a>
          <a class="btn btn-outline-light" href="{csv_href}" download="{esc(SPEC['csv_file'])}">📊 Indicadores (.csv)</a>
        </div>
      </div>
    </section>
    """

    colaborar_logos_href = ctx.site_url("colaborar/") + "#anadir-actualizar-logos"

    body = f"""
    {comparador_interactive_section}

    <section class="section" id="sintesis-resultados">
      <div class="section-header">
        <div>
          <span class="badge badge-ok">Primeros Resultados Obtenidos</span>
          <h2 style="margin:0.25rem 0 0;">Indicadores empíricos derivados de las capas activas</h2>
        </div>
      </div>
      {render_kpi_cards_html()}
    </section>

    <section class="section" id="arquitectura-metodologica">
      <div class="section-header">
        <div>
          <span class="badge badge-lime">Secuencia Técnica Reproducible</span>
          <h2 style="margin:0.25rem 0 0;">Metodología aplicada en cuatro fases</h2>
        </div>
        <a class="btn btn-primary btn-xs" href="{docx_href}" download="{esc(SPEC['docx_file'])}">📥 Descargar Documento Word Completo (.docx)</a>
      </div>
      <div class="grid-2">
        {"".join(phases_cards)}
      </div>
      <div class="card" style="margin-top:1rem;background:#0F172A;color:#F8FAFC;border:1px solid #334155;">
        <div style="font-size:0.78rem;font-weight:700;color:#38BDF8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.4rem;">Formulación Analítica y Reglas de Decisión Espacial</div>
        <pre style="margin:0;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:0.84rem;color:#E2E8F0;white-space:pre-wrap;line-height:1.55;"><code>{html.escape(formulas_block)}</code></pre>
      </div>
    </section>

    <section class="section" id="tabla-resultados">
      {render_empirical_table_html()}
    </section>

    <section class="section" id="figuras-analiticas">
      <div class="section-header">
        <div>
          <span class="badge badge-ok">Cartografía Estadística 300 DPI</span>
          <h2 style="margin:0.25rem 0 0;">Figuras de síntesis metodológica y territorial</h2>
        </div>
      </div>
      {render_project_figures_grid(ctx)}
    </section>

    <section class="section" id="codigo-reproducible">
      <div class="card">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.65rem;margin-bottom:0.65rem;">
          <div>
            <span class="badge badge-declarado">Código Abierto Reproducible</span>
            <h2 style="margin:0.25rem 0 0;font-size:1.2rem;">Script de procesamiento: <code>{esc(SPEC['script_file'])}</code></h2>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
            <button type="button" class="btn btn-teal btn-xs" data-copy-target="code-proyecto-script">Copiar código</button>
            <a class="btn btn-primary btn-xs" href="{script_href}" download="{esc(SPEC['script_file'])}">📥 Descargar {esc(SPEC['script_file'])}</a>
            <a class="btn btn-outline btn-xs" href="{csv_href}" download="{esc(SPEC['csv_file'])}">📊 Descargar {esc(SPEC['csv_file'])}</a>
          </div>
        </div>
        <pre id="code-proyecto-script" class="code-block" style="max-height:420px;overflow:auto;"><code>{html.escape(script_preview)}</code></pre>
      </div>
    </section>

    <section class="section" id="mejoras-fase-ii">
      <article class="card" style="border-left:5px solid #D97706;background:linear-gradient(90deg,#FFFBEB 0%,#FFFFFF 100%);">
        <span class="badge badge-warn">Hoja de Ruta · Calibración y Escalamiento Fase II</span>
        <h2 style="margin:0.35rem 0 0.5rem;">Cómo afinar y mejorar la metodología en siguientes iteraciones</h2>
        <ul style="margin:0 0 0.85rem;padding-left:1.25rem;line-height:1.6;">
          {roadmap_li}
        </ul>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
          <a class="btn btn-primary btn-xs" href="{gv_href}">🧭 Inspeccionar capas en Geovisor →</a>
          <a class="btn btn-teal btn-xs" href="{atlas_href}">🗺️ Abrir Atlas Temático →</a>
          <a class="btn btn-outline btn-xs" href="{docx_href}" download="{esc(SPEC['docx_file'])}">📥 Documento Metodológico (.docx)</a>
        </div>
      </article>
    </section>

    {render_project_institutions_band(ctx, branding, manifest, colaborar_href=colaborar_logos_href)}
    """

    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title=sub_nav,
        active_nav=sub_slug,
        hero_html=hero,
        body_html=body,
        page_script=page_script_arg,
    )


def build_metodologia_page(
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    metodologia_md: str,
    branding: dict[str, Any],
) -> str:
    pid = manifest["id"]
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]
    ds_rows = []
    for ds in manifest.get("data_sources", []):
        url_part = (
            f'<br><a href="{html.escape(ds["url"], quote=True)}" target="_blank" rel="noopener noreferrer">{esc(ds["url"])}</a>'
            if ds.get("url")
            else ""
        )
        ds_rows.append(
            f"<tr><td><strong>{esc(ds['title'])}</strong>{url_part}</td>"
            f"<td>{esc(ds.get('provider'), 'Contraparte técnica')}</td>"
            f"<td><code>{esc(ds.get('access'))}</code></td>"
            f"<td>{badge_html(ds.get('status'))}</td>"
            f"<td>{esc(ds.get('description'), '—')}</td></tr>"
        )
    ds_table = (
        '<div class="table-wrap"><table><thead><tr>'
        "<th>Fuente o producto</th><th>Proveedor</th><th>Acceso</th><th>Estado</th><th>Descripción técnica</th>"
        "</tr></thead><tbody>" + "".join(ds_rows) + "</tbody></table></div>"
        if ds_rows
        else "<p>Fuentes de datos documentadas en la memoria técnica.</p>"
    )

    lim_li = "".join(f"<li>{esc(l)}</li>" for l in manifest.get("limitations", [])) or "<li>Sin limitaciones adicionales registradas.</li>"
    colaborar_logos_href = ctx.site_url("colaborar/") + "#anadir-actualizar-logos"
    sub_href = html.escape(ctx.site_url(f"{sub_slug}/"), quote=True)
    docx_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['docx_file']}"), quote=True)
    script_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['script_file']}"), quote=True)

    hero = f"""
    <section class="hero">
      <div class="container">
        <div class="hero-eyebrow">
          <span class="badge badge-lime">Datos, flujo técnico y reproducibilidad</span>
          <span class="badge badge-country">{esc(pid)}</span>
        </div>
        <h1>Metodología, fuentes de datos y limitaciones</h1>
        <p class="hero-lead">Integración de observación satelital abierta Copernicus con cartografía e insumos locales en {esc(manifest['territory']['label'])}.</p>
      </div>
    </section>
    """

    body = f"""
    <section class="section">
      <div class="card" style="border-left:4px solid var(--c-brand-blue);background:#F8FAFC;">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;">
          <div>
            <span class="badge badge-lime">Memoria Técnica Completa y Script Reproducible</span>
            <h2 style="margin:0.3rem 0 0.2rem;font-size:1.2rem;">{esc(SPEC['subpage_title'])}</h2>
            <p style="margin:0;font-size:0.9rem;color:var(--c-text-muted);">Accede a la subpágina analítica con ecuaciones, métricas verificadas, código fuente y documento Word descargable.</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
            <a class="btn btn-primary btn-xs" href="{sub_href}">📊 Abrir {esc(sub_nav)} →</a>
            <a class="btn btn-teal btn-xs" href="{docx_href}" download="{esc(SPEC['docx_file'])}">📥 Descargar Word (.docx)</a>
            <a class="btn btn-outline btn-xs" href="{script_href}" download="{esc(SPEC['script_file'])}">📜 Descargar Script</a>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Fuentes de datos satelitales y locales integradas</h2>
      {ds_table}
    </section>

    <section class="section">
      <div class="prose">
        {render_markdown(metodologia_md)}
      </div>
    </section>

    <section class="section">
      <h2>Figuras metodológicas y resultados gráficos</h2>
      {render_project_figures_grid(ctx)}
    </section>

    <section class="section">
      <div class="callout callout-warn">
        <strong>Supuestos técnicos y cautelas de uso</strong>
        <ul>{lim_li}</ul>
      </div>
    </section>

    {render_project_institutions_band(ctx, branding, manifest, colaborar_href=colaborar_logos_href)}
    """

    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title="Metodología y datos",
        active_nav="metodologia",
        hero_html=hero,
        body_html=body,
    )


def render_copernicus_study_area_atlas_section(
    territory_label: str,
    initial_center: list[float],
    initial_zoom: float,
    ctx: SiteContext,
    pid: str,
) -> str:
    center_attr = html.escape(json.dumps(initial_center), quote=True)
    atlas_pages = SPEC["atlas_pages"]
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]
    pdf_href = html.escape(ctx.site_url(f"assets/descargas/atlas_copernicus_pa-colon.pdf"), quote=True)
    pdf_dl_name = f"Atlas_Copernicus_pa-colon.pdf"
    geovisor_href = html.escape(ctx.site_url("aplicacion/"), quote=True)
    sub_href = html.escape(ctx.site_url(f"{sub_slug}/"), quote=True)
    canonical_gv_url = f"https://copernicuscentroamerica.github.io/urbano-pa-colon/aplicacion/"

    plates_meta = [
        (
            "sentinel2-cloudless",
            "Lámina 1",
            "🛰️ 1. Mosaicos Anuales Sentinel-2 (2018–2024)",
            "Mosaicos Anuales sin Nubes Copernicus Sentinel-2 Cloudless (Serie 2018–2024 · 10 m)",
            "Compuestos ópticos anuales en color verdadero libres de nubes para comparar visualmente la evolución física urbana entre 2018 y 2024.",
            [
                ("sentinel2-2024", "2024"),
                ("sentinel2-2023", "2023"),
                ("sentinel2-2022", "2022"),
                ("sentinel2-2021", "2021"),
                ("sentinel2-2020", "2020"),
                ("sentinel2-2019", "2019"),
                ("sentinel2-2018", "2018 (Base)"),
            ],
            [
                ("#E8ECEF", "Blanco / Gris brillante", "Techos industriales, comerciales, concreto nuevo y cubiertas metálicas."),
                ("#9BA3AE", "Gris medio / Trama urbana", "Tejido residencial consolidado y red vial pavimentada."),
                ("#D29D6A", "Ocre / Terracota / Marrón", "Suelo desnudo en apertura urbana, taludes o techos de teja/lámina."),
                ("#1E5631", "Verde bosque oscuro", "Dosel arbóreo denso, bosques de galería en cañones y manglares."),
                ("#76B041", "Verde claro / Herbáceo", "Parques urbanos, pastizales y cultivos periurbanos."),
                ("#0F3A5D", "Azul marino / Turquesa", "Ríos principales, lagos, embalses y aguas costeras."),
            ],
        ),
        (
            "copernicus-dem-glo30",
            "Lámina 2",
            "⛰️ 2. Geomorfología y Pendientes (DEM 30 m)",
            "Copernicus DEM GLO-30 (30 m · Hipsometría, Hillshade y Curvas de Nivel)",
            "Identifica valles, terrazas aluviales, mesetas y cañones escarpados donde la expansión urbana enfrenta susceptibilidad a deslizamientos o escorrentía concentrada.",
            [
                ("copernicus-dem-glo30", "Hipsometría + Hillshade"),
                ("copernicus-dem-hillshade", "Solo Hillshade 30 m"),
                ("copernicus-dem-viridis", "Viridis + Curvas de Nivel"),
            ],
            [
                ("#336699", "0 – 150 m s. n. m.", "Planicies bajas, zonas costeras y llanuras de inundación."),
                ("#56A862", "150 – 500 m s. n. m.", "Terrazas aluviales y valles intramontanos de pendiente suave."),
                ("#E6C267", "500 – 1200 m s. n. m.", "Piedemonte, mesetas intermedias y laderas moderadas."),
                ("#A66A43", "> 1200 m s. n. m.", "Escarpes pronunciados, cordilleras y divisorias de cuenca."),
                ("#3A3F4B", "Sombreado Hillshade 30 m", "Barrancos, taludes y laderas de fuerte pendiente (>25%)."),
            ],
        ),
        (
            "esa-worldcover-2021",
            "Lámina 3",
            "🏙️ 3. Cobertura y Mancha Urbana 10 m (WorldCover)",
            "ESA WorldCover 10 m (Fusión Sentinel-1 + Sentinel-2 · Ediciones 2021 y 2020)",
            "Separa con resolución de 10 m la huella edificada e impermeable (#FA0000) de los bosques urbanos, pastizales, cultivos, manglares y cuerpos de agua.",
            [
                ("esa-worldcover-2021", "Año 2021 (v200)"),
                ("esa-worldcover-2020", "Año 2020 (v100)"),
            ],
            [
                ("#FA0000", "Edificado / Mancha Urbana", "Techos, pavimento vial, concreto y tejido urbano consolidado."),
                ("#006400", "Cobertura Arbórea", "Bosques urbanos, parques, bosques de galería y arbolado denso."),
                ("#FFBB22", "Arbustos y Matorral", "Vegetación leñosa baja y laderas en regeneración."),
                ("#FFFF4C", "Pastizales y Herbáceas", "Áreas verdes abiertas, lotes baldíos con pasto y praderas."),
                ("#F096FF", "Cultivos Agrícolas", "Borde agrourbano sujeto a presión por expansión residencial."),
                ("#B4B4B4", "Suelo Desnudo / Expuesto", "Terrenos en movimiento de tierra, taludes o trazados en apertura."),
                ("#0064C8", "Agua Permanente y Manglar", "Ríos, lagos, esteros (#0064C8) y manglares costeros (#00CF75)."),
            ],
        ),
        (
            "s2-lulc-2023",
            "Lámina 4",
            "📈 4. Uso del Suelo Anual 10 m (LULC 2017–2023)",
            "Serie Anual de Uso del Suelo y Expansión Urbana Sentinel-2 10 m (2017–2023)",
            "Permite medir año por año (2017 a 2023) el crecimiento del área construida consolidada (#C4281B) sobre suelos agrícolas, pastizales y bosques periurbanos.",
            [
                ("s2-lulc-2023", "2023"),
                ("s2-lulc-2022", "2022"),
                ("s2-lulc-2021", "2021"),
                ("s2-lulc-2020", "2020"),
                ("s2-lulc-2019", "2019"),
                ("s2-lulc-2018", "2018"),
                ("s2-lulc-2017", "2017 (Base)"),
            ],
            [
                ("#C4281B", "Área Construida (Built Area)", "Asentamientos humanos, tejido residencial, comercial e industrial."),
                ("#397D49", "Árboles y Bosque Denso", "Remanentes forestales y reservas ecológicas periurbanas."),
                ("#E49635", "Cultivos", "Superficie agrícola en transición urbano-rural."),
                ("#DFC35A", "Matorral / Rangeland", "Vegetación arbustiva y herbácea abierta."),
                ("#A59B8F", "Suelo Desnudo", "Superficies sin cobertura vegetal o en explanación."),
                ("#419BDF", "Agua y Humedales", "Cuerpos de agua (#419BDF) y vegetación inundable (#88B053)."),
            ],
        ),
        (
            "s2-l2a-ndvi",
            "Lámina 5",
            "🌿 5. Vegetación Urbana e Islas Verdes (NDVI)",
            "Copernicus Sentinel-2 L2A · Índice NDVI 10 m (Serie Multitemporal)",
            "Mide el vigor fotosintético ((B08-B04)/(B08+B04)) para localizar el déficit de áreas verdes intraurbanas y los corredores biológicos que mitigan islas de calor.",
            [
                ("s2-l2a-ndvi", "Reciente"),
                ("s2-l2a-ndvi-2024", "2024"),
                ("s2-l2a-ndvi-2023", "2023"),
                ("s2-l2a-ndvi-2022", "2022"),
                ("s2-l2a-ndvi-2021", "2021"),
                ("s2-l2a-ndvi-2020", "2020"),
                ("s2-l2a-ndvi-2019", "2019"),
                ("s2-l2a-ndvi-2018", "2018"),
            ],
            [
                ("#A50026", "NDVI < 0.05 (Rojo intenso)", "Techos, asfalto, concreto sellado o cuerpos de agua."),
                ("#F46D43", "NDVI 0.05 – 0.20 (Naranja)", "Tejido urbano denso con escaso o nulo arbolado viario."),
                ("#FEE08B", "NDVI 0.20 – 0.38 (Amarillo)", "Zonas residenciales mixtas con jardines dispersos o pasto seco."),
                ("#66BD63", "NDVI 0.38 – 0.60 (Verde claro)", "Parques urbanos, bulevares arbolados y huertos periurbanos."),
                ("#006837", "NDVI > 0.60 (Verde oscuro)", "Dosel forestal denso en cañones, riberas y áreas protegidas."),
            ],
        ),
        (
            "s2-l2a-ndbi",
            "Lámina 6",
            "🏗️ 6. Densidad Edificada e Impermeabilización (NDBI)",
            "Copernicus Sentinel-2 L2A · Índice NDBI 20 m (Serie Multitemporal)",
            "Evalúa la reflectancia en el infrarrojo de onda corta ((B11-B08)/(B11+B08)) para resaltar techos densos, concreto y suelo compactado.",
            [
                ("s2-l2a-ndbi", "Reciente"),
                ("s2-l2a-ndbi-2024", "2024"),
                ("s2-l2a-ndbi-2023", "2023"),
                ("s2-l2a-ndbi-2022", "2022"),
                ("s2-l2a-ndbi-2021", "2021"),
                ("s2-l2a-ndbi-2020", "2020"),
                ("s2-l2a-ndbi-2019", "2019"),
                ("s2-l2a-ndbi-2018", "2018"),
            ],
            [
                ("#FCFFA4", "NDBI > +0.15 (Amarillo claro)", "Alta concentración de techos metálicos/concreto, naves o suelo expuesto."),
                ("#F98E09", "NDBI 0.00 a +0.15 (Naranja)", "Tejido urbano consolidado con alta impermeabilización."),
                ("#AC2F5E", "NDBI -0.15 a 0.00 (Magenta)", "Zonas residenciales de densidad media con patios arborizados."),
                ("#1B0C41", "NDBI < -0.15 (Violeta/Negro)", "Cobertura vegetal densa y cuerpos de agua permeables."),
            ],
        ),
        (
            "s2-l2a-ndwi",
            "Lámina 7",
            "💧 7. Humedad Superficial y Estrés Térmico (NDWI)",
            "Copernicus Sentinel-2 L2A · Índice NDWI 20 m (Serie Multitemporal)",
            "Contrasta las zonas de retención hídrica y enfriamiento evaporativo (azul) frente a las superficies urbanas secas y calientes (rojo).",
            [
                ("s2-l2a-ndwi", "Reciente"),
                ("s2-l2a-ndwi-2024", "2024"),
                ("s2-l2a-ndwi-2023", "2023"),
                ("s2-l2a-ndwi-2022", "2022"),
                ("s2-l2a-ndwi-2021", "2021"),
                ("s2-l2a-ndwi-2020", "2020"),
                ("s2-l2a-ndwi-2019", "2019"),
                ("s2-l2a-ndwi-2018", "2018"),
            ],
            [
                ("#053061", "NDWI > +0.25 (Azul marino)", "Cuerpos de agua, humedales y riberas con alta humedad."),
                ("#4393C3", "NDWI +0.05 a +0.25 (Azul)", "Vegetación hidratada y suelos húmedos."),
                ("#F7F7F7", "NDWI -0.05 a +0.05 (Blanco)", "Humedad superficial intermedia."),
                ("#D6604D", "NDWI -0.20 a -0.05 (Salmón)", "Zonas urbanizadas secas o vegetación con estrés hídrico."),
                ("#67001F", "NDWI < -0.20 (Rojo oscuro)", "Superficies urbanas impermeables y secas con alta carga térmica."),
            ],
        ),
        (
            "s2-l2a-composites",
            "Lámina 8",
            "🔬 8. Falso Color Infrarrojo y SWIR Urbano (S2 L2A)",
            "Compuestos Multiespectrales Infrarrojo (B08-B04-B03) y SWIR Urbano (B12-B8A-B04)",
            "Combina las bandas VNIR y SWIR de Sentinel-2 L2A para discriminar techos, concreto y suelo expuesto frente al vigor vegetal y cuerpos de agua.",
            [
                ("s2-l2a-falsecolor", "IR B08-B04-B03 (Reciente)"),
                ("s2-l2a-falsecolor-2024", "IR 2024"),
                ("s2-l2a-falsecolor-2022", "IR 2022"),
                ("s2-l2a-falsecolor-2020", "IR 2020"),
                ("s2-l2a-swir", "SWIR Urbano (Reciente)"),
                ("s2-l2a-swir-2024", "SWIR 2024"),
                ("s2-l2a-swir-2022", "SWIR 2022"),
                ("s2-l2a-swir-2020", "SWIR 2020"),
            ],
            [
                ("#D32F2F", "Rojo escarlata (En modo IR)", "Vegetación vigorosa y bosques urbanos con alta reflectancia NIR (B08)."),
                ("#90CAF9", "Azul cian / Gris (En modo IR)", "Tejido urbano denso, techos, pavimento vial y concreto."),
                ("#BA68C8", "Magenta / Púrpura (En modo SWIR)", "Huella urbana consolidada y materiales de construcción en onda corta (B12)."),
                ("#2E7D32", "Verde esmeralda (En modo SWIR)", "Cobertura vegetal densa e hidratada."),
            ],
        ),
        (
            "s1-rtc-falsecolor",
            "Lámina 9",
            "📡 9. Morfología Urbana por Radar (Sentinel-1 SAR)",
            "Copernicus Sentinel-1 SAR RTC (10 m · Compuesto VV+VH y Polarización VV)",
            "Observación radar todo-tiempo (sin nubes): detecta construcciones por rebote doble (double-bounce) y distingue vegetación de láminas de agua.",
            [
                ("s1-rtc-falsecolor", "VV+VH Urbano (Reciente)"),
                ("s1-rtc-falsecolor-2024", "VV+VH 2024"),
                ("s1-rtc-falsecolor-2022", "VV+VH 2022"),
                ("s1-rtc-falsecolor-2020", "VV+VH 2020"),
                ("s1-rtc-vv", "Polarización VV (Grises)"),
                ("s1-rtc-vv-2024", "VV Grises 2024"),
                ("s1-rtc-vv-2020", "VV Grises 2020"),
            ],
            [
                ("#FFF59D", "Amarillo / Blanco brillante", "Rebote doble intenso: edificaciones densas, estructuras y taludes."),
                ("#4CAF50", "Verde intenso (Alto VH)", "Dispersión volumétrica en dosel arbóreo y vegetación rugosa."),
                ("#5C6BC0", "Azul / Añil intermedio", "Suelos agrícolas, pastizales bajos o superficies semirrugosas."),
                ("#0D1B2A", "Azul oscuro / Negro", "Espejos de agua calma (ríos, lagos, mar) o zonas urbanas anegadas."),
            ],
        ),
        (
            "jrc-gsw-occurrence",
            "Lámina 10",
            "🌊 10. Agua Superficial e Inundación (JRC)",
            "EC JRC / Copernicus Global Surface Water (Ocurrencia y Extensión Máxima)",
            "Muestra la frecuencia histórica de agua superficial e inundaciones (1984–2021) y la huella máxima de desbordamiento.",
            [
                ("jrc-gsw-occurrence", "Ocurrencia Histórica (0–100%)"),
                ("jrc-gsw-extent", "Extensión Máxima de Inundación"),
            ],
            [
                ("#0000FF", "80% – 100% Ocurrencia (Azul)", "Cauces permanentes de ríos, lagos, embalses y línea de costa."),
                ("#8844CC", "25% – 80% Ocurrencia (Violeta)", "Cuerpos de agua estacionales, esteros y barras fluviales."),
                ("#FF3366", "1% – 25% Ocurrencia (Rosa)", "Llanuras de inundación episódica durante eventos hidrometeorológicos."),
                ("#D9DFEA", "Relieve base emergido", "Terreno sin lámina de agua detectada a escala satelital."),
            ],
        ),
    ]

    proj_plates_path = ROOT / "geovisor" / "data" / "atlas_parte1_plates.json"
    proj_plates_list: list[dict[str, Any]] = []
    proj_plates_raw = "[]"
    if proj_plates_path.exists():
        raw_txt = proj_plates_path.read_text(encoding="utf-8")
        proj_plates_list = json.loads(raw_txt)
        proj_plates_raw = raw_txt.replace("</", "<\\/")

    default_plate_key = proj_plates_list[0]["key"] if proj_plates_list else "sentinel2-cloudless"
    first_proj = proj_plates_list[0] if proj_plates_list else {
        "number": "Parte I · P1",
        "shortTitle": "📌 P1. Síntesis del Proyecto",
        "title": SPEC["subpage_title"],
        "sensor": "Integración Copernicus + Datos Locales",
        "formula": SPEC["res_str"],
        "reading": SPEC["copernicus_local_synergy"],
    }

    p1_tabs_html = []
    p1_cards_html = []
    for pl in proj_plates_list:
        pk = pl["key"]
        var_key = f"{pk}-v1"
        active_cls = " is-active" if pk == default_plate_key else ""
        p1_tabs_html.append(
            f'<button type="button" class="atlas-plate-tab is-project-plate{active_cls}" data-atlas-plate="{esc(pk)}">{esc(pl["shortTitle"])}</button>'
        )
        sw_rows = "".join(
            f'<li class="atlas-swatch-item">'
            f'<span class="atlas-swatch-chip" style="background:{esc(sw["color"])};"></span>'
            f'<span class="atlas-swatch-label">{esc(sw["label"])}</span>'
            f'<span class="atlas-swatch-desc">{esc(sw.get("desc", ""))}</span>'
            f"</li>"
            for sw in pl.get("swatches", [])
        )
        img_href = html.escape(ctx.site_url(pl["imageRel"]), quote=True)
        p1_cards_html.append(
            f"""
            <article class="card" style="border-top:4px solid #D97706;background:linear-gradient(180deg,#FFFBEB 0%,#FFFFFF 28%);display:flex;flex-direction:column;justify-content:space-between;">
              <div>
                <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">
                  <div style="display:flex;flex-wrap:wrap;gap:0.35rem;align-items:center;">
                    <span class="badge badge-ok">{esc(pl.get('number', 'Parte I'))} · Trabajo del Proyecto</span>
                  </div>
                  <button type="button" class="btn btn-primary btn-xs" data-atlas-plate-select="{esc(pk)}" data-atlas-variant-select="{esc(var_key)}">Cargar en el Atlas ↑</button>
                </div>
                <h3 style="margin:0.2rem 0 0.4rem;font-size:1.02rem;color:var(--c-brand-blue);">{esc(pl['title'])}</h3>
                <p style="font-size:0.85rem;color:var(--c-text-muted);margin-bottom:0.55rem;">{esc(pl.get('reading', ''))}</p>
                <div style="margin-bottom:0.6rem;border:1px solid var(--c-border);border-radius:6px;overflow:hidden;background:#0F172A;max-height:190px;display:flex;align-items:center;justify-content:center;">
                  <img src="{img_href}" alt="Vista previa cartográfica de {esc(pl['title'])}" style="width:100%;max-height:190px;object-fit:contain;display:block;" loading="lazy">
                </div>
                <ul class="atlas-swatch-list">{sw_rows}</ul>
              </div>
            </article>
            """
        )

    eo_tabs_html = []
    eo_cards_html = []
    for pk, pnum, pshort, ptitle, preading, pvariants, pswatches in plates_meta:
        active_cls = " is-active" if pk == default_plate_key else ""
        eo_tabs_html.append(
            f'<button type="button" class="atlas-plate-tab{active_cls}" data-atlas-plate="{esc(pk)}">{esc(pshort)}</button>'
        )
        var_pills = "".join(
            f'<button type="button" class="atlas-variant-pill" data-atlas-plate-select="{esc(pk)}" data-atlas-variant-select="{esc(vk)}">{esc(vlbl)}</button>'
            for vk, vlbl in pvariants
        )
        sw_rows = "".join(
            f'<li class="atlas-swatch-item">'
            f'<span class="atlas-swatch-chip" style="background:{esc(c)};"></span>'
            f'<span class="atlas-swatch-label">{esc(lbl)}</span>'
            f'<span class="atlas-swatch-desc">{esc(d)}</span>'
            f"</li>"
            for c, lbl, d in pswatches
        )
        eo_cards_html.append(
            f"""
            <article class="card" style="border-top:4px solid var(--c-brand-blue);display:flex;flex-direction:column;justify-content:space-between;">
              <div>
                <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">
                  <span class="badge badge-lime">Parte II · {esc(pnum)} ({len(pvariants)} modos)</span>
                  <button type="button" class="btn btn-teal btn-xs" data-atlas-plate-select="{esc(pk)}">Ver lámina en el mapa ↑</button>
                </div>
                <h3 style="margin:0.2rem 0 0.4rem;font-size:1.02rem;color:var(--c-brand-blue);">{esc(ptitle)}</h3>
                <p style="font-size:0.86rem;color:var(--c-text-muted);margin-bottom:0.55rem;">{esc(preading)}</p>
                <div class="atlas-variant-box" style="margin-bottom:0.65rem;">
                  <div class="atlas-variant-box-label"><span>🎛️ Años / variantes disponibles:</span></div>
                  <div class="atlas-variant-pills">{var_pills}</div>
                </div>
                <ul class="atlas-swatch-list">{sw_rows}</ul>
              </div>
            </article>
            """
        )

    tabs_html = (
        [f'<div class="atlas-tabs-group-label">📌 Parte I · Trabajo Específico Desarrollado en el Proyecto {esc(pid.upper())} (Láminas P1–P{len(proj_plates_list)})</div>']
        + p1_tabs_html
        + ['<div class="atlas-tabs-group-label">🛰️ Parte II · Capas Base y Series Multitemporales Derivadas de Copernicus (Láminas 1–10)</div>']
        + eo_tabs_html
    )
    cards_html = p1_cards_html + eo_cards_html
    total_plates = len(proj_plates_list) + len(plates_meta)

    return f"""
    <section class="section" id="atlas-copernicus-zona" aria-labelledby="titulo-atlas-copernicus">
      <div class="atlas-intro-institutional" role="region" aria-label="Introducción institucional del Atlas del Clúster Copernicus Urbano">
        <div style="display:flex;flex-wrap:wrap;gap:0.45rem;margin-bottom:0.45rem;">
          <span class="badge badge-country">Clúster Copernicus Urbano · Centroamérica y el Caribe</span>
          <span class="badge badge-lime">Parte I: Trabajo Específico del Proyecto · Parte II: Series Copernicus</span>
        </div>
        <h2>Introducción Institucional: Datos Derivados de Copernicus + Información Local para la Toma de Decisiones</h2>
        <p>El presente Atlas ha sido desarrollado en el contexto del <strong>Clúster Copernicus Urbano (Clúster de Asentamientos Humanos de la Comunidad Urbana Copernicus Centroamérica)</strong>. Siguiendo la estructura editorial homologada del portafolio regional, la <strong>portada y las primeras páginas (Parte I)</strong> corresponden a los trabajos técnicos específicos desarrollados en el proyecto <strong>{esc(pid)}</strong> sobre {esc(territory_label)}, seguidos en la <strong>Parte II</strong> por las diez láminas satelitales base y series multitemporales derivadas del Programa Copernicus.</p>
        <p>{esc(SPEC['copernicus_local_synergy'])}</p>
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.65rem;padding-top:0.45rem;border-top:1px solid #CBD5E1;">
          <span style="font-size:0.88rem;color:#0F172A;"><strong>🧭 Acceso directo al Geovisor Interactivo:</strong> También puedes explorar, superponer y consultar dinámicamente todas las capas del estudio en <a href="{geovisor_href}"><strong>{esc(canonical_gv_url)}</strong></a></span>
          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;">
            <a class="btn btn-primary btn-xs" href="{geovisor_href}">🧭 Abrir Geovisor Interactivo →</a>
            <a class="btn btn-teal btn-xs" href="{pdf_href}" download="{esc(pdf_dl_name)}">📥 Descargar Atlas PDF ({atlas_pages} Págs.)</a>
            <a class="btn btn-outline btn-xs" href="{sub_href}">📊 {esc(sub_nav)} →</a>
          </div>
        </div>
      </div>

      <div class="section-header" style="margin-bottom:0.75rem;">
        <div>
          <span class="badge badge-lime">Cartografía Temática Enmascarada · {total_plates} Láminas Interactivas (Parte I Proyecto + Parte II Copernicus)</span>
          <h2 id="titulo-atlas-copernicus" style="margin:0.3rem 0 0.2rem;">Atlas Cartográfico del Proyecto y Series Copernicus ({esc(territory_label)})</h2>
          <p style="margin:0;color:var(--c-text-muted);font-size:0.93rem;">Explora en primer lugar las <strong>láminas analíticas específicas generadas en {esc(territory_label)} (Parte I)</strong> y, a continuación, las <strong>10 láminas satelitales multitemporales Copernicus (Parte II)</strong> recortadas al perímetro oficial de estudio.</p>
        </div>
      </div>

      <div class="atlas-pdf-banner" role="region" aria-label="Descarga del Atlas Institucional en PDF">
        <div class="atlas-pdf-banner-inner">
          <div class="atlas-pdf-banner-text">
            <span class="atlas-pdf-banner-eyebrow">📘 Edición Editorial Homologada A4 Horizontal · Identidad Institucional 2.0.0-copernicus-2026</span>
            <h3 class="atlas-pdf-banner-title">Atlas Oficial de {esc(territory_label)}: Parte I (Resultados del Proyecto) + Parte II (Capas Copernicus)</h3>
            <p class="atlas-pdf-banner-desc">Documento editorial completo de <strong>{atlas_pages} páginas en formato A4 horizontal</strong> con portada institucional, introducción de soporte a decisiones públicas del Clúster Copernicus Urbano, enlace directo al Geovisor, láminas de resultados propios en las primeras páginas y compendio multitemporal Copernicus.</p>
          </div>
          <div class="atlas-pdf-banner-actions">
            <a class="btn btn-primary" href="{pdf_href}" download="{esc(pdf_dl_name)}">📥 Descargar Atlas Institucional Completo (PDF · {atlas_pages} Págs.)</a>
            <a class="btn btn-teal" href="{geovisor_href}">🧭 Explorar en Geovisor Interactivo →</a>
            <button type="button" class="btn btn-outline-light btn-xs" data-atlas-export-pdf>🖨️ Exportar lámina activa a PDF</button>
            <a class="btn btn-outline-light btn-xs" href="{pdf_href}" target="_blank" rel="noopener noreferrer">Abrir PDF en pestaña ↗</a>
          </div>
        </div>
      </div>

      <script id="atlas-project-plates-json" type="application/json">{proj_plates_raw}</script>
      <div class="atlas-plate-tabs" role="tablist" aria-label="Láminas temáticas del Atlas">
        {"".join(tabs_html)}
      </div>

      <div class="atlas-copernicus-shell">
        <div class="atlas-copernicus-map-col">
          <div class="geovisor-toolbar" style="border-radius:0;">
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem;">
              <strong id="atlas-toolbar-plate-label" style="font-size:0.82rem;color:var(--c-accent-yellow);">{esc(first_proj['shortTitle'])}</strong>
              <label style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.76rem;color:#FFFFFF;">
                <span>Año / Capa:</span>
                <select id="atlas-toolbar-variant-select" class="atlas-toolbar-select" aria-label="Seleccionar año o variante de la lámina"></select>
              </label>
              <button type="button" id="atlas-toolbar-play-btn" class="atlas-play-btn">▶ Reproducir serie</button>
              <label style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.76rem;background:rgba(255,255,255,0.12);padding:0.2rem 0.48rem;border-radius:4px;cursor:pointer;">
                <input type="checkbox" id="atlas-toggle-mask" checked>
                <span>Enmascarar límite</span>
              </label>
              <label style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.74rem;">
                <span>Opacidad:</span>
                <input type="range" id="atlas-mask-opacity" min="0" max="1" step="0.05" value="0.88" style="width:68px;" aria-label="Opacidad de la máscara del límite">
              </label>
            </div>
            <div class="geovisor-toolbar-actions">
              <a class="btn btn-primary btn-xs" href="{pdf_href}" download="{esc(pdf_dl_name)}">📥 Atlas PDF ({atlas_pages}p)</a>
              <button type="button" class="btn btn-outline-light btn-xs" data-atlas-export-pdf>🖨️ Lámina a PDF</button>
              <button type="button" id="atlas-fit-bounds" class="btn btn-outline-light btn-xs">Encuadrar límite</button>
              <button type="button" id="atlas-toggle-fullscreen" class="btn btn-outline-light btn-xs">⛶ Pantalla completa</button>
            </div>
          </div>
          <div class="atlas-map-stage">
            <div id="atlas-map-year-badge" class="atlas-map-year-badge" aria-live="polite">
              <span id="atlas-map-year-top" class="atlas-map-year-badge-top">{esc(first_proj.get('number', 'PARTE I'))}</span>
              <span id="atlas-map-year-main" class="atlas-map-year-badge-main">{esc(first_proj['title'])}</span>
            </div>
            <div id="atlas-copernicus-map" class="atlas-copernicus-canvas" data-center="{center_attr}" data-zoom="{initial_zoom}" data-default-plate="{esc(default_plate_key)}" role="region" aria-label="Mapa del Atlas Temático enmascarado con la zona de estudio"></div>
          </div>
        </div>

        <div class="atlas-copernicus-info-col" id="atlas-plate-detail">
          <div>
            <span id="atlas-plate-badge" class="badge badge-lime">{esc(first_proj.get('number', 'Parte I'))}</span>
            <h3 id="atlas-plate-title" style="margin:0.35rem 0 0.25rem;font-size:1.1rem;color:var(--c-brand-blue);">{esc(first_proj['title'])}</h3>
            <p style="margin:0;font-size:0.8rem;color:var(--c-text-muted);"><strong>Sensor / Fuente:</strong> <span id="atlas-plate-sensor">{esc(first_proj.get('sensor', ''))}</span></p>
            <p style="margin:0.15rem 0 0;font-size:0.78rem;color:var(--c-text-muted);"><strong>Parámetro / Expresión:</strong> <code id="atlas-plate-formula">{esc(first_proj.get('formula', ''))}</code></p>
          </div>

          <div class="atlas-variant-box">
            <label for="atlas-panel-variant-select" id="atlas-variant-selector-label" class="atlas-variant-box-label">📌 Seleccionar lámina o variante:</label>
            <select id="atlas-panel-variant-select" class="atlas-variant-select" aria-label="Selector desplegable de año o capa del tema"></select>
            <div id="atlas-variant-pills" class="atlas-variant-pills" role="group" aria-label="Botones rápidos de año o variante"></div>
            <div id="atlas-timeline-controls" class="atlas-timeline-controls" aria-label="Controles de animación multitemporal">
              <div class="atlas-timeline-row">
                <button type="button" id="atlas-panel-play-btn" class="atlas-play-btn">▶ Reproducir secuencia</button>
                <button type="button" id="atlas-step-prev" class="atlas-step-btn">⏮ Ant.</button>
                <button type="button" id="atlas-step-next" class="atlas-step-btn">Sig. ⏭</button>
                <select id="atlas-play-speed" class="atlas-speed-select" aria-label="Velocidad de la animación">
                  <option value="2800">Lento (2.8 s)</option>
                  <option value="1800" selected>Normal (1.8 s)</option>
                  <option value="1000">Rápido (1.0 s)</option>
                </select>
              </div>
              <div class="atlas-timeline-row" style="gap:0.5rem;">
                <input type="range" id="atlas-timeline-slider" min="0" max="6" step="1" value="0" style="flex:1;" aria-label="Deslizador de línea de tiempo">
                <span id="atlas-timeline-counter" style="font-size:0.74rem;font-weight:700;color:var(--c-brand-blue);min-width:44px;text-align:right;">1 / 1</span>
              </div>
            </div>
          </div>

          <div style="background:#F3F6FD;border-left:3px solid var(--c-brand-blue);padding:0.65rem 0.8rem;border-radius:4px;font-size:0.85rem;line-height:1.45;">
            <strong style="color:var(--c-brand-blue);display:block;margin-bottom:0.2rem;">Lectura e interpretación para toma de decisiones en {esc(territory_label)}:</strong>
            <span id="atlas-plate-reading">{esc(first_proj.get('reading', ''))}</span>
          </div>

          <div>
            <h4 style="margin:0 0 0.45rem;font-size:0.86rem;text-transform:uppercase;letter-spacing:0.03em;color:var(--c-brand-blue);">Simbología de la lámina activa</h4>
            <ul id="atlas-plate-swatches" class="atlas-swatch-list"></ul>
          </div>

          <div style="display:flex;flex-wrap:wrap;gap:0.45rem;padding-top:0.5rem;border-top:1px solid var(--c-border);">
            <a class="btn btn-primary btn-xs" href="{pdf_href}" download="{esc(pdf_dl_name)}">📥 Atlas Completo ({atlas_pages} Págs.)</a>
            <a class="btn btn-teal btn-xs" href="{geovisor_href}">🧭 Ir al Geovisor →</a>
            <button type="button" class="btn btn-outline btn-xs" data-atlas-export-pdf>🖨️ Exportar lámina activa</button>
          </div>
        </div>
      </div>

      <div style="margin-top:1.4rem;">
        <h3 style="margin:0 0 0.4rem;color:var(--c-brand-blue);">Catálogo Completo de Láminas: Parte I (Trabajo del Proyecto) + Parte II (Series Copernicus)</h3>
        <p style="margin:0 0 0.9rem;font-size:0.88rem;color:var(--c-text-muted);">Las primeras tarjetas corresponden a los productos específicos generados para {esc(territory_label)}, seguidas por las 10 láminas satelitales Copernicus:</p>
        <div class="grid-2">
          {"".join(cards_html)}
        </div>
      </div>
    </section>
    """


def localize_project_url(ctx: SiteContext, pid: str, raw_url: str | None) -> str | None:
    if not raw_url:
        return None
    prefix = f"https://copernicuscentroamerica.github.io/urbano-pa-colon/"
    if raw_url.startswith(prefix):
        rel = raw_url[len(prefix):]
        return ctx.site_url(rel)
    return raw_url


def build_resultados_page(
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    atlas_products: list[dict[str, Any]],
    continuidad_md: str,
    branding: dict[str, Any],
    layers_cfg: dict[str, Any] | None = None,
) -> str:
    pid = manifest["id"]
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]
    atlas_pages = SPEC["atlas_pages"]
    mv = (layers_cfg or {}).get("map_view", {})
    center = mv.get("center") or [-84.0, 12.0]
    zoom = float(mv.get("zoom") or 11.5)

    atlas_cards = []
    for ap in atlas_products:
        outs = ap.get("outputs", {})
        v_url = localize_project_url(ctx, pid, outs.get("viewer_url")) or ctx.site_url("aplicacion/")
        d_url = localize_project_url(ctx, pid, outs.get("download_url"))
        doc_url = localize_project_url(ctx, pid, outs.get("documentation_url")) or ctx.site_url(f"{sub_slug}/")
        thumb_url = localize_project_url(ctx, pid, outs.get("thumbnail_url")) or ctx.site_url("assets/img/figuras/03_mapa_sintesis_resultados.png")
        atlas_cards.append(
            f"""
            <article class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
                <span class="badge badge-ok">Ficha registrada en Atlas Regional</span>
                <code>{esc(ap.get('id'))}</code>
              </div>
              <h3>{esc(ap.get('title'))}</h3>
              <p>{esc(ap.get('summary'))}</p>
              <div style="margin:0.65rem 0;border:1px solid var(--c-border);border-radius:8px;overflow:hidden;background:#FFFFFF;max-height:220px;display:flex;align-items:center;justify-content:center;">
                <img src="{html.escape(thumb_url, quote=True)}" alt="Vista previa de {esc(ap.get('title'))}" style="width:100%;max-height:220px;object-fit:contain;display:block;" loading="lazy">
              </div>
              <div class="card-footer">
                <a class="btn btn-primary btn-xs" href="{html.escape(v_url, quote=True)}">🧭 Abrir en Geovisor</a>
                <a class="btn btn-teal btn-xs" href="{html.escape(doc_url, quote=True)}">📊 {esc(sub_nav)}</a>
                {f'<a class="btn btn-outline btn-xs" href="{html.escape(d_url, quote=True)}" download>📥 Descargar capa principal</a>' if d_url else ''}
              </div>
            </article>
            """
        )

    gv_href = html.escape(ctx.site_url("aplicacion/"), quote=True)
    sub_href = html.escape(ctx.site_url(f"{sub_slug}/"), quote=True)
    pdf_href = html.escape(ctx.site_url(f"assets/descargas/atlas_copernicus_pa-colon.pdf"), quote=True)
    docx_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['docx_file']}"), quote=True)
    colaborar_logos_href = ctx.site_url("colaborar/") + "#anadir-actualizar-logos"

    hero = f"""
    <section class="hero hero-compact">
      <div class="container">
        <div class="hero-eyebrow">
          <span class="badge badge-lime">Atlas Cartográfico y Resultados Verificados</span>
          <span class="badge badge-country">{esc(pid)} · {atlas_pages} páginas A4</span>
        </div>
        <h1>Atlas Temático y Resultados de {esc(manifest['territory']['label'])}</h1>
        <p class="hero-lead">Parte I con los productos analíticos desarrollados en el proyecto + Parte II con las series satelitales Copernicus, integrados con acceso directo al Geovisor interactivo.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="{pdf_href}" download="Atlas_Copernicus_{esc(pid)}.pdf">📥 Descargar Atlas PDF ({atlas_pages} Págs.)</a>
          <a class="btn btn-teal" href="{gv_href}">🧭 Abrir Geovisor Interactivo →</a>
          <a class="btn btn-outline-light" href="{sub_href}">📊 {esc(sub_nav)} →</a>
          <a class="btn btn-outline-light" href="{docx_href}" download="{esc(SPEC['docx_file'])}">📥 Metodología (.docx)</a>
        </div>
      </div>
    </section>
    """

    body = f"""
    {render_copernicus_study_area_atlas_section(manifest['territory']['label'], center, zoom, ctx, pid)}

    <section class="section">
      {render_empirical_table_html()}
    </section>

    <section class="section">
      <h2>Productos geoespaciales catalogados para el Atlas Regional</h2>
      <div class="grid-2">{"".join(atlas_cards) if atlas_cards else '<p>Productos integrados en la Parte I del Atlas.</p>'}</div>
    </section>

    <section class="section">
      <div class="prose">
        {render_markdown(continuidad_md)}
      </div>
    </section>

    {render_project_institutions_band(ctx, branding, manifest, colaborar_href=colaborar_logos_href)}
    """

    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title="Atlas y Resultados",
        active_nav="resultados",
        hero_html=hero,
        body_html=body,
        include_maplibre=True,
    )


def build_colaborar_page(
    ctx: SiteContext,
    manifest: dict[str, Any],
    repo_cfg: dict[str, Any],
    branding: dict[str, Any],
) -> str:
    pid = manifest["id"]
    sub_slug = SPEC["subpage_slug"]
    sub_nav = SPEC["subpage_nav"]
    atlas_pages = SPEC["atlas_pages"]
    proposed_owner = repo_cfg.get("proposed_owner", "copernicuscentroamerica")
    proposed_repo = repo_cfg.get("proposed_repository", f"urbano-pa-colon")
    canonical_slug = ctx.canonical_repository or f"{proposed_owner}/{proposed_repo}"
    effective_slug = ctx.github_repository or canonical_slug
    effective_repo_url = f"https://github.com/{effective_slug}"
    gh_logos_dir_url = f"{effective_repo_url}/tree/main/branding/logos"
    gh_branding_json_url = f"{effective_repo_url}/blob/main/branding/project-branding.json"

    validate_cmds = """python scripts/validate.py --source
python scripts/build_site.py --output site
python scripts/validate.py --site site"""

    pdf_href = html.escape(ctx.site_url(f"assets/descargas/atlas_copernicus_pa-colon.pdf"), quote=True)
    docx_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['docx_file']}"), quote=True)
    script_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['script_file']}"), quote=True)
    csv_href = html.escape(ctx.site_url(f"assets/descargas/{SPEC['csv_file']}"), quote=True)
    geolibre_href = html.escape(ctx.site_url("geovisor/proyecto.geolibre.json"), quote=True)

    hero = f"""
    <section class="hero">
      <div class="container">
        <div class="hero-eyebrow">
          <span class="badge badge-lime">Datos Abiertos, Scripts y Gobernanza GitHub</span>
          <span class="badge badge-country">{esc(pid)}</span>
        </div>
        <h1>Datos abiertos, código reproducible e identidad institucional</h1>
        <p class="hero-lead">Descarga directa de los artefactos técnicos generados en {esc(manifest['territory']['label'])} y guía de actualización mediante ramas y Pull Requests sobre <code>{esc(canonical_slug)}</code>.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="{html.escape(ctx.site_url(f'{sub_slug}/'), quote=True)}">📊 Ir a {esc(sub_nav)}</a>
          <a class="btn btn-teal" href="{html.escape(ctx.site_url('aplicacion/'), quote=True)}">🧭 Abrir Geovisor</a>
          <a class="btn btn-outline-light" href="#anadir-actualizar-logos">Identidad y logos</a>
        </div>
      </div>
    </section>
    """

    body = f"""
    <section class="section" id="descargas-abiertas">
      <div class="card">
        <span class="badge badge-ok">Paquete Reproducible del Proyecto</span>
        <h2 style="margin:0.3rem 0 0.6rem;">Descarga directa de documentos, código e indicadores</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Recurso técnico</th><th>Formato</th><th>Contenido</th><th>Acción</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>Atlas Cartográfico Institucional</strong></td>
                <td><code>PDF ({atlas_pages} págs.)</code></td>
                <td>Portada, introducción Clúster Copernicus Urbano, Parte I de resultados propios y Parte II Copernicus.</td>
                <td><a class="btn btn-primary btn-xs" href="{pdf_href}" download="Atlas_Copernicus_{esc(pid)}.pdf">📥 Descargar PDF</a></td>
              </tr>
              <tr>
                <td><strong>Documento Metodológico y Análisis</strong></td>
                <td><code>Word (.docx)</code></td>
                <td>Arquitectura metodológica, formulación matemática, interpretación de resultados y mejoras Fase II.</td>
                <td><a class="btn btn-teal btn-xs" href="{docx_href}" download="{esc(SPEC['docx_file'])}">📥 Descargar .docx</a></td>
              </tr>
              <tr>
                <td><strong>Script de Procesamiento Espacial</strong></td>
                <td><code>{esc(Path(SPEC['script_file']).suffix)}</code></td>
                <td>Flujo reproducible utilizado para generar las capas e indicadores del proyecto.</td>
                <td><a class="btn btn-outline btn-xs" href="{script_href}" download="{esc(SPEC['script_file'])}">📜 Descargar script</a></td>
              </tr>
              <tr>
                <td><strong>Tabla de Indicadores Cuantitativos</strong></td>
                <td><code>CSV (UTF-8)</code></td>
                <td>Métricas tabulares verificadas a partir de las capas publicadas en el Geovisor.</td>
                <td><a class="btn btn-outline btn-xs" href="{csv_href}" download="{esc(SPEC['csv_file'])}">📊 Descargar CSV</a></td>
              </tr>
              <tr>
                <td><strong>Proyecto Estándar GeoLibre Studio</strong></td>
                <td><code>JSON v0.2.0</code></td>
                <td>Configuración completa de encuadre, capas activas y simbología para GeoLibre Studio.</td>
                <td><a class="btn btn-outline btn-xs" href="{geolibre_href}" download="proyecto-{esc(pid)}.geolibre.json">🗺️ Descargar JSON</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section" id="anadir-actualizar-logos">
      <article class="card" style="border-top:4px solid var(--c-accent-yellow);">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:0.75rem;">
          <div>
            <span class="badge badge-lime">Identidad institucional</span>
            <h2 style="margin:0.35rem 0 0.2rem;color:var(--c-brand-blue);">Añadir o actualizar logos institucionales</h2>
            <p style="margin:0;font-size:0.9rem;color:var(--c-text-muted);">Coloca archivos oficiales <code>.svg</code> o <code>.png</code> en <code>branding/logos/</code>, regístralos en <code>branding/project-branding.json</code> y ejecuta la validación local antes de abrir Pull Request.</p>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
            <a class="btn btn-teal btn-xs" href="{html.escape(gh_logos_dir_url, quote=True)}" target="_blank" rel="noopener noreferrer">Carpeta branding/logos/ ↗</a>
            <a class="btn btn-outline btn-xs" href="{html.escape(gh_branding_json_url, quote=True)}" target="_blank" rel="noopener noreferrer">project-branding.json ↗</a>
          </div>
        </div>
        <div style="margin-top:0.85rem;">
          <pre id="cmd-val" class="code-block"><code>{html.escape(validate_cmds)}</code></pre>
        </div>
      </article>
    </section>

    {render_project_institutions_band(ctx, branding, manifest)}
    """

    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title="Datos y Código",
        active_nav="colaborar",
        hero_html=hero,
        body_html=body,
    )


def build_404_page(ctx: SiteContext, manifest: dict[str, Any], repo_cfg: dict[str, Any]) -> str:
    hero = f"""
    <section class="hero">
      <div class="container">
        <h1>Página no encontrada (404)</h1>
        <p class="hero-lead">La ruta solicitada no existe dentro del sitio de <strong>{esc(manifest['title'])}</strong>.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="{html.escape(ctx.site_url(''), quote=True)}">Volver al Inicio</a>
          <a class="btn btn-teal" href="{html.escape(ctx.site_url('aplicacion/'), quote=True)}">Ir al Geovisor</a>
          <a class="btn btn-outline-light" href="{html.escape(ctx.site_url('resultados/'), quote=True)}">Ir al Atlas</a>
        </div>
      </div>
    </section>
    """
    body = "<section class='section'><p>Utiliza el menú superior para navegar hacia el Geovisor, el Atlas Cartográfico, la subpágina metodológica o las descargas abiertas.</p></section>"
    return render_shell(
        ctx=ctx,
        manifest=manifest,
        repo_cfg=repo_cfg,
        page_title="404 Página no encontrada",
        active_nav="",
        hero_html=hero,
        body_html=body,
    )


def load_comparador_clases() -> list[dict[str, Any]]:
    p = ROOT / "comparador" / "clases.json"
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8")).get("clases", [])


def collect_comparador_results(out_dir: Path) -> list[dict[str, Any]]:
    src_root = ROOT / "comparador" / "resultados"
    items: list[dict[str, Any]] = []
    if not src_root.exists():
        return items
    allowed = {".png", ".jpg", ".jpeg", ".json", ".csv"}
    for d in sorted(p for p in src_root.iterdir() if p.is_dir()):
        meta_file = d / "meta.json"
        if not meta_file.exists():
            continue
        meta = json.loads(meta_file.read_text(encoding="utf-8"))
        if meta.get("id") != d.name or not meta.get("anios") or not meta.get("archivos"):
            continue
        dest = out_dir / "comparador" / "resultados" / d.name
        dest.mkdir(parents=True, exist_ok=True)
        for f in sorted(d.iterdir()):
            if f.is_file() and f.suffix.lower() in allowed:
                shutil.copy2(f, dest / f.name)
        items.append(meta)
    items.sort(key=lambda m: str(m.get("generado_utc", "")), reverse=True)
    return items


def write_deterministic(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Construye el sitio estático homologado de la iniciativa.")
    parser.add_argument("--output", type=str, default="site", help="Directorio de salida (por defecto: site).")
    parser.add_argument("--base-path", type=str, default=None, help="Prefijo explícito de ruta base.")
    parser.add_argument("--origin", type=str, default=None, help="Origen explícito HTTPS.")
    args = parser.parse_args()

    if (ROOT / "data" / "projects.registry.json").exists():
        print("Error: directorio ambiguo (contiene data/projects.registry.json).", file=sys.stderr)
        return 1

    repo_cfg = json.loads((ROOT / "repo.config.json").read_text(encoding="utf-8"))
    manifest = json.loads((ROOT / "project.json").read_text(encoding="utf-8"))
    layers_cfg = json.loads((ROOT / "geovisor" / "layers.json").read_text(encoding="utf-8"))
    branding_path = ROOT / "branding" / "project-branding.json"
    if branding_path.exists():
        branding = json.loads(branding_path.read_text(encoding="utf-8"))
    else:
        branding = {
            "schema_version": "1.0.0",
            "project_id": manifest["id"],
            "theme_version": THEME_VERSION,
            "updated_at": "2026-11-12",
            "project_logo": None,
            "institutions": [],
        }

    project_md = (ROOT / "content" / "project.md").read_text(encoding="utf-8")
    metodologia_md = (ROOT / "content" / "metodologia.md").read_text(encoding="utf-8")
    pmv_md = (ROOT / "content" / "pmv.md").read_text(encoding="utf-8")
    continuidad_md = (ROOT / "content" / "continuidad.md").read_text(encoding="utf-8")

    atlas_products: list[dict[str, Any]] = []
    atlas_dir = ROOT / "atlas" / "products"
    if atlas_dir.exists():
        for ap_file in sorted(atlas_dir.glob("*.json")):
            atlas_products.append(json.loads(ap_file.read_text(encoding="utf-8")))

    explicit_bp = args.base_path if args.base_path is not None else os.environ.get("SITE_BASE_PATH")
    ctx = compute_site_context(
        canonical_repo_url_or_slug=manifest["links"].get("repository"),
        explicit_base_path=explicit_bp,
        explicit_origin=args.origin,
        hub_url=repo_cfg.get("hub_url"),
    )

    out_dir = (ROOT / args.output).resolve()
    if out_dir == ROOT:
        print("Error: --output no puede ser la raíz del repositorio.", file=sys.stderr)
        return 1
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    shutil.copytree(ROOT / "web" / "assets", out_dir / "assets")

    logos_src_dir = ROOT / "branding" / "logos"
    logos_out_dir = out_dir / "branding" / "logos"
    logos_out_dir.mkdir(parents=True, exist_ok=True)
    allowed_logo_exts = {".svg", ".png", ".webp", ".jpg", ".jpeg"}
    if logos_src_dir.exists():
        for lf in sorted(logos_src_dir.iterdir()):
            if lf.is_file() and lf.suffix.lower() in allowed_logo_exts:
                shutil.copy2(lf, logos_out_dir / lf.name)

    geolibre_obj = build_geolibre_project_json(layers_cfg, manifest, ctx)
    write_deterministic(out_dir / "geovisor" / "layers.json", json.dumps(layers_cfg, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    write_deterministic(out_dir / "geovisor" / "proyecto.geolibre.json", json.dumps(geolibre_obj, ensure_ascii=False, indent=2, sort_keys=True) + "\n")

    data_layers_dir = ROOT / "geovisor" / "data"
    if data_layers_dir.exists():
        (out_dir / "geovisor" / "data").mkdir(parents=True, exist_ok=True)
        for f in sorted(data_layers_dir.iterdir()):
            if f.is_file() and f.name != ".gitkeep":
                shutil.copy2(f, out_dir / "geovisor" / "data" / f.name)

    geolibre_exts = {".geojson", ".json", ".kml", ".pmtiles", ".fgb", ".tif", ".tiff", ".parquet", ".geoparquet", ".webp", ".png"}
    capas_src_dir = ROOT / "geovisor" / "capas"
    capas_out_dir = out_dir / "geovisor" / "capas"
    capas_out_dir.mkdir(parents=True, exist_ok=True)
    indexed_files: list[dict[str, Any]] = []
    if capas_src_dir.exists():
        for f in sorted(capas_src_dir.iterdir()):
            if not f.is_file() or f.name in (".gitkeep", "README.md", "index.json"):
                continue
            if f.suffix.lower() in geolibre_exts or f.name.lower().endswith(".geolibre.json"):
                shutil.copy2(f, capas_out_dir / f.name)
                if f.suffix.lower() not in (".webp", ".png"):
                    indexed_files.append(
                        {
                            "name": f.name,
                            "path": f"geovisor/capas/{f.name}",
                            "format": "geolibre" if f.name.lower().endswith(".geolibre.json") else f.suffix.lower().lstrip("."),
                            "size_bytes": f.stat().st_size,
                        }
                    )

    effective_repo_slug = (
        ctx.github_repository
        if ctx.github_repository
        else (ctx.canonical_repository if ctx.effective_mode == "canonical" else None)
    )
    write_deterministic(
        capas_out_dir / "index.json",
        json.dumps(
            {
                "folder": "geovisor/capas",
                "project_id": manifest["id"],
                "repository": effective_repo_slug,
                "canonical_repository": ctx.canonical_repository,
                "effective_mode": ctx.effective_mode,
                "files": indexed_files,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
    )

    write_deterministic(out_dir / "data" / "project.json", json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    write_deterministic(out_dir / "data" / "project-branding.json", json.dumps(branding, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    write_deterministic(out_dir / "data" / "atlas-products.json", json.dumps(atlas_products, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    build_meta = {
        "project_id": manifest["id"],
        "schema_version": manifest["schema_version"],
        "template_version": TEMPLATE_VERSION,
        "theme_version": THEME_VERSION,
        "repo_kind": repo_cfg.get("repo_kind"),
        "base_path": ctx.base_path,
        "origin": ctx.origin,
        "effective_mode": ctx.effective_mode,
        "canonical_repository": ctx.canonical_repository,
    }
    write_deterministic(out_dir / "data" / "build-meta.json", json.dumps(build_meta, ensure_ascii=False, indent=2, sort_keys=True) + "\n")

    clases_cmp: list[dict[str, Any]] | None = None
    if manifest["id"] == "pa-colon":
        clases_cmp = load_comparador_clases()
        cmp_out = out_dir / "comparador"
        cmp_out.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / "src" / "gee" / "geourbano_comparador.js", cmp_out / "geourbano_comparador.js")
        shutil.copy2(ROOT / "comparador" / "clases.json", cmp_out / "clases.json")
        cmp_items = collect_comparador_results(out_dir)
        write_deterministic(
            cmp_out / "index.json",
            json.dumps({"schema_version": "1.0.0", "analisis": cmp_items}, ensure_ascii=False, indent=2) + "\n",
        )

    sub_slug = SPEC["subpage_slug"]
    write_deterministic(out_dir / "index.html", build_home_page(ctx, manifest, repo_cfg, layers_cfg, branding))
    write_deterministic(out_dir / "proyecto" / "index.html", build_proyecto_page(ctx, manifest, repo_cfg, project_md, pmv_md, branding))
    write_deterministic(out_dir / "aplicacion" / "index.html", build_aplicacion_page(ctx, manifest, repo_cfg, layers_cfg, branding))
    write_deterministic(out_dir / sub_slug / "index.html", build_subpagina_page(ctx, manifest, repo_cfg, layers_cfg, branding, clases_cmp))
    write_deterministic(out_dir / "metodologia" / "index.html", build_metodologia_page(ctx, manifest, repo_cfg, metodologia_md, branding))
    write_deterministic(out_dir / "resultados" / "index.html", build_resultados_page(ctx, manifest, repo_cfg, atlas_products, continuidad_md, branding, layers_cfg))
    write_deterministic(out_dir / "colaborar" / "index.html", build_colaborar_page(ctx, manifest, repo_cfg, branding))
    write_deterministic(out_dir / "404.html", build_404_page(ctx, manifest, repo_cfg))

    print(
        f"[OK] Sitio construido para '{manifest['id']}' en {out_dir} "
        f"(base_path='{ctx.base_path}', modo='{ctx.effective_mode}', tema='{THEME_VERSION}')."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
