/* ==========================================================================
   Controlador del Geovisor basado en GeoLibre / MapLibre GL JS
   - Soporta:
     1) Capas declaradas en geovisor/layers.json (activas con popups y opacidad).
     2) Opción "Cargar capa desde carpeta" (lee geovisor/capas/ del respectivo
        repositorio vía index.json estático + API pública de GitHub en vivo para
        detectar archivos subidos recientemente en formatos compatibles con GeoLibre).
     3) Vista previa local temporal (.geojson / .kml desde el equipo del usuario).
     4) Integración directa con GeoLibre Web (web.geolibre.app).
     5) Mapa regional referencial en el Portal Comunitario.
   ========================================================================== */
(function () {
  "use strict";

  var BASEMAPS = {
    // 1. Modelo Digital de Elevación Oficial Copernicus DEM (GLO-30 · 30 m)
    "copernicus-dem-glo30": {
      name: "Copernicus DEM GLO-30 (30 m · Elevación Hipsométrica + Sombreado)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/f458a174b766f6ff265474a520d48884/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=cop-dem-glo-30&assets=data&rescale=-100,2600&colormap_name=terrain"
      ],
      overlayTiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/f458a174b766f6ff265474a520d48884/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=cop-dem-glo-30&assets=data&colormap_name=gray&algorithm=hillshade&buffer=3&algorithm_params=%7B%22azimuth%22%3A315%2C%22angle_altitude%22%3A45%7D"
      ],
      overlayOpacity: 0.36,
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "⛰️ Copernicus DEM GLO-30 (30 m · ESA/UE): Azul/Verde (0–400 m) · Amarillo/Ocre (400–1500 m) · Marrón/Blanco (>1500 m) + Hillshade 30 m",
      attribution: "&copy; <a href='https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model' target='_blank' rel='noopener'>Copernicus DEM GLO-30 (30 m · European Union / ESA)</a>"
    },
    "copernicus-dem-hillshade": {
      name: "Copernicus DEM GLO-30 (30 m · Sombreado de Relieve / Hillshade)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/f458a174b766f6ff265474a520d48884/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=cop-dem-glo-30&assets=data&colormap_name=gray&algorithm=hillshade&buffer=3&algorithm_params=%7B%22azimuth%22%3A315%2C%22angle_altitude%22%3A45%7D"
      ],
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "⛰️ Copernicus DEM GLO-30 Hillshade (30 m): Sombreado analítico de pendientes y laderas (Acimut 315° · Altitud solar 45°)",
      attribution: "&copy; <a href='https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model' target='_blank' rel='noopener'>Copernicus DEM GLO-30 Hillshade (30 m · European Union / ESA)</a>"
    },
    "copernicus-dem-viridis": {
      name: "Copernicus DEM GLO-30 (30 m · Hipsometría Viridis + Curvas de Nivel)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/f458a174b766f6ff265474a520d48884/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=cop-dem-glo-30&assets=data&rescale=0,2500&colormap_name=viridis"
      ],
      overlayTiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/f458a174b766f6ff265474a520d48884/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=cop-dem-glo-30&assets=data&algorithm=contours&buffer=3&algorithm_params=%7B%22minz%22%3A0%2C%22maxz%22%3A3500%2C%22thickness%22%3A6%7D"
      ],
      overlayOpacity: 0.55,
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "⛰️ Copernicus DEM GLO-30 Viridis + Curvas de nivel dinámicas: Violeta (0 m) → Verde (1000 m) → Amarillo (2500 m s. n. m.)",
      attribution: "&copy; <a href='https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model' target='_blank' rel='noopener'>Copernicus DEM GLO-30 (30 m · European Union / ESA)</a>"
    },
    "copernicus-terrain": {
      name: "Copernicus DEM GLO-30 (30 m · Elevación Hipsométrica + Sombreado)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/f458a174b766f6ff265474a520d48884/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=cop-dem-glo-30&assets=data&rescale=-100,2600&colormap_name=terrain"
      ],
      overlayTiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/f458a174b766f6ff265474a520d48884/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=cop-dem-glo-30&assets=data&colormap_name=gray&algorithm=hillshade&buffer=3&algorithm_params=%7B%22azimuth%22%3A315%2C%22angle_altitude%22%3A45%7D"
      ],
      overlayOpacity: 0.36,
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "⛰️ Copernicus DEM GLO-30 (30 m · ESA/UE): Elevación hipsométrica + sombreado de relieve de 30 m",
      attribution: "&copy; <a href='https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model' target='_blank' rel='noopener'>Copernicus DEM GLO-30 (30 m · European Union / ESA)</a>"
    },

    // 2. Cobertura Terrestre y Mancha Urbana a 10 m derivada de Sentinel-1 y Sentinel-2
    "esa-worldcover-2021": {
      name: "ESA WorldCover 10 m (2021 v200 · Derivado de Sentinel-1 y Sentinel-2)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/287434fc0e0024667464141a8cb3f231/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=esa-worldcover&assets=map&colormap_name=esa-worldcover"
      ],
      pcRegister: {
        collections: ["esa-worldcover"],
        "filter-lang": "cql2-json",
        filter: { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2021-01-01T00:00:00Z", "2021-12-31T23:59:59Z"] }] }
      },
      pcQuery: "collection=esa-worldcover&assets=map&colormap_name=esa-worldcover",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🏙️ ESA WorldCover 10 m (2021): 🟥 Edificado/Mancha Urbana · 🟩 Árboles · 🟨 Pastizal/Arbustos · 🟪 Cultivos · 🟦 Agua Permanente · 🟩 Manglar",
      attribution: "&copy; <a href='https://esa-worldcover.org' target='_blank' rel='noopener'>ESA WorldCover 10 m 2021 (Copernicus Sentinel-1 &amp; Sentinel-2)</a>"
    },
    "esa-worldcover-2020": {
      name: "ESA WorldCover 10 m (2020 v100 · Derivado de Sentinel-1 y Sentinel-2)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/287434fc0e0024667464141a8cb3f231/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=esa-worldcover&assets=map&colormap_name=esa-worldcover"
      ],
      pcRegister: {
        collections: ["esa-worldcover"],
        "filter-lang": "cql2-json",
        filter: { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2020-01-01T00:00:00Z", "2020-12-31T23:59:59Z"] }] }
      },
      pcQuery: "collection=esa-worldcover&assets=map&colormap_name=esa-worldcover",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🏙️ ESA WorldCover 10 m (2020): 🟥 Edificado/Mancha Urbana · 🟩 Árboles · 🟨 Pastizal/Arbustos · 🟪 Cultivos · 🟦 Agua Permanente · 🟩 Manglar",
      attribution: "&copy; <a href='https://esa-worldcover.org' target='_blank' rel='noopener'>ESA WorldCover 10 m 2020 (Copernicus Sentinel-1 &amp; Sentinel-2)</a>"
    },
    "s2-lulc-2023": {
      name: "Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2023 · Mancha Urbana)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/27352be54f5b70ae6eb491be7c2db331/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class"
      ],
      pcRegister: {
        collections: ["io-lulc-annual-v02"],
        "filter-lang": "cql2-json",
        filter: { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2023-01-01T00:00:00Z", "2023-12-31T23:59:59Z"] }] }
      },
      pcQuery: "collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🏙️ Sentinel-2 LULC 10 m (2023): 🟥 Área Construida (Built Area) · 🟩 Árboles · 🟨 Pastizal · 🟧 Cultivos · 🟦 Agua · ⬜ Suelo Desnudo",
      attribution: "&copy; Impact Observatory / Esri / <a href='https://spacedata.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 10m LULC (2023)</a>"
    },
    "s2-lulc-2020": {
      name: "Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2020 · Mancha Urbana)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/27352be54f5b70ae6eb491be7c2db331/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class"
      ],
      pcRegister: {
        collections: ["io-lulc-annual-v02"],
        "filter-lang": "cql2-json",
        filter: { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2020-01-01T00:00:00Z", "2020-12-31T23:59:59Z"] }] }
      },
      pcQuery: "collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🏙️ Sentinel-2 LULC 10 m (2020): 🟥 Área Construida (Built Area) · 🟩 Árboles · 🟨 Pastizal · 🟧 Cultivos · 🟦 Agua",
      attribution: "&copy; Impact Observatory / Esri / <a href='https://spacedata.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 10m LULC (2020)</a>"
    },
    "s2-lulc-2017": {
      name: "Uso y Cobertura del Suelo Sentinel-2 10 m (Año 2017 · Línea Base)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/27352be54f5b70ae6eb491be7c2db331/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class"
      ],
      pcRegister: {
        collections: ["io-lulc-annual-v02"],
        "filter-lang": "cql2-json",
        filter: { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2017-01-01T00:00:00Z", "2017-12-31T23:59:59Z"] }] }
      },
      pcQuery: "collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2018_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🏙️ Sentinel-2 LULC 10 m (2017 · Línea base histórica): 🟥 Área Construida · 🟩 Árboles · 🟨 Pastizal · 🟧 Cultivos · 🟦 Agua",
      attribution: "&copy; Impact Observatory / Esri / <a href='https://spacedata.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 10m LULC (2017)</a>"
    },

    // 3. Índices Espectrales y Bandas Copernicus Sentinel-2 L2A (10 m / 20 m · Baja nubosidad con relleno continuo entre celdas MGRS)
    "s2-l2a-ndvi": {
      name: "Copernicus Sentinel-2 L2A · Índice de Vegetación Urbana (NDVI · 10 m)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/832da05b42678505676241b4bc269dda/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-2-l2a&nodata=0&expression=(B08-B04)/(B08%2BB04)&rescale=-0.3,0.85&colormap_name=rdylgn&asset_as_band=true"
      ],
      pcRegister: {
        collections: ["sentinel-2-l2a"],
        bbox: [-92.5, 7.0, -68.0, 20.0],
        "filter-lang": "cql2-json",
        filter: {
          op: "and",
          args: [
            { op: "<=", args: [{ property: "eo:cloud_cover" }, 45] },
            { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2025-01-01T00:00:00Z", "2026-12-31T23:59:59Z"] }] }
          ]
        },
        sortby: [{ field: "eo:cloud_cover", direction: "asc" }]
      },
      pcQuery: "collection=sentinel-2-l2a&nodata=0&expression=(B08-B04)/(B08%2BB04)&rescale=-0.3,0.85&colormap_name=rdylgn&asset_as_band=true",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🌿 Sentinel-2 L2A NDVI ((B08-B04)/(B08+B04)): 🟥/🟨 Superficie Impermeable / Urbana (<0.2) · 🟩 Vegetación Urbana Densa (>0.5)",
      attribution: "&copy; <a href='https://dataspace.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 L2A (NDVI 10 m · European Union / ESA)</a>"
    },
    "s2-l2a-ndbi": {
      name: "Copernicus Sentinel-2 L2A · Índice de Edificación / Área Construida (NDBI · 20 m)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/832da05b42678505676241b4bc269dda/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-2-l2a&nodata=0&expression=(B11-B08)/(B11%2BB08)&rescale=-0.45,0.45&colormap_name=inferno&asset_as_band=true"
      ],
      pcRegister: {
        collections: ["sentinel-2-l2a"],
        bbox: [-92.5, 7.0, -68.0, 20.0],
        "filter-lang": "cql2-json",
        filter: {
          op: "and",
          args: [
            { op: "<=", args: [{ property: "eo:cloud_cover" }, 45] },
            { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2025-01-01T00:00:00Z", "2026-12-31T23:59:59Z"] }] }
          ]
        },
        sortby: [{ field: "eo:cloud_cover", direction: "asc" }]
      },
      pcQuery: "collection=sentinel-2-l2a&nodata=0&expression=(B11-B08)/(B11%2BB08)&rescale=-0.45,0.45&colormap_name=inferno&asset_as_band=true",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🏗️ Sentinel-2 L2A NDBI ((B11-B08)/(B11+B08)): 🟨/🟧 Alta densidad edificada, techos y suelo impermeable · 🟪/⬛ Vegetación y agua",
      attribution: "&copy; <a href='https://dataspace.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 L2A (NDBI 20 m · European Union / ESA)</a>"
    },
    "s2-l2a-ndwi": {
      name: "Copernicus Sentinel-2 L2A · Índice de Humedad Superficial (NDWI · 20 m)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/832da05b42678505676241b4bc269dda/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-2-l2a&nodata=0&expression=(B8A-B11)/(B8A%2BB11)&rescale=-0.5,0.5&colormap_name=rdbu&asset_as_band=true"
      ],
      pcRegister: {
        collections: ["sentinel-2-l2a"],
        bbox: [-92.5, 7.0, -68.0, 20.0],
        "filter-lang": "cql2-json",
        filter: {
          op: "and",
          args: [
            { op: "<=", args: [{ property: "eo:cloud_cover" }, 45] },
            { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2025-01-01T00:00:00Z", "2026-12-31T23:59:59Z"] }] }
          ]
        },
        sortby: [{ field: "eo:cloud_cover", direction: "asc" }]
      },
      pcQuery: "collection=sentinel-2-l2a&nodata=0&expression=(B8A-B11)/(B8A%2BB11)&rescale=-0.5,0.5&colormap_name=rdbu&asset_as_band=true",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "💧 Sentinel-2 L2A NDWI ((B8A-B11)/(B8A+B11)): 🟦 Alta humedad / cuerpos de agua · 🟥 Superficies secas / islas de calor urbano",
      attribution: "&copy; <a href='https://dataspace.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 L2A (NDWI · European Union / ESA)</a>"
    },
    "s2-l2a-falsecolor": {
      name: "Copernicus Sentinel-2 L2A · Falso Color Infrarrojo (B08-B04-B03 · 10 m)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/832da05b42678505676241b4bc269dda/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-2-l2a&assets=B08&assets=B04&assets=B03&nodata=0&color_formula=Gamma+RGB+3.7+Saturation+1.5+Sigmoidal+RGB+15+0.35"
      ],
      pcRegister: {
        collections: ["sentinel-2-l2a"],
        bbox: [-92.5, 7.0, -68.0, 20.0],
        "filter-lang": "cql2-json",
        filter: {
          op: "and",
          args: [
            { op: "<=", args: [{ property: "eo:cloud_cover" }, 45] },
            { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2025-01-01T00:00:00Z", "2026-12-31T23:59:59Z"] }] }
          ]
        },
        sortby: [{ field: "eo:cloud_cover", direction: "asc" }]
      },
      pcQuery: "collection=sentinel-2-l2a&assets=B08&assets=B04&assets=B03&nodata=0&color_formula=Gamma+RGB+3.7+Saturation+1.5+Sigmoidal+RGB+15+0.35",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🛰️ Sentinel-2 L2A Falso Color Infrarrojo (B08-B04-B03): 🟥 Vegetación vigorosa · 🟦/⬜ Tejido urbano denso, techos y vías",
      attribution: "&copy; <a href='https://dataspace.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 L2A Infrarrojo (European Union / ESA)</a>"
    },
    "s2-l2a-swir": {
      name: "Copernicus Sentinel-2 L2A · SWIR Urbano (B12-B8A-B04 · 20 m)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/832da05b42678505676241b4bc269dda/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-2-l2a&assets=B12&assets=B8A&assets=B04&nodata=0&color_formula=Gamma+RGB+3.7+Saturation+1.5+Sigmoidal+RGB+15+0.35"
      ],
      pcRegister: {
        collections: ["sentinel-2-l2a"],
        bbox: [-92.5, 7.0, -68.0, 20.0],
        "filter-lang": "cql2-json",
        filter: {
          op: "and",
          args: [
            { op: "<=", args: [{ property: "eo:cloud_cover" }, 45] },
            { op: "anyinteracts", args: [{ property: "datetime" }, { interval: ["2025-01-01T00:00:00Z", "2026-12-31T23:59:59Z"] }] }
          ]
        },
        sortby: [{ field: "eo:cloud_cover", direction: "asc" }]
      },
      pcQuery: "collection=sentinel-2-l2a&assets=B12&assets=B8A&assets=B04&nodata=0&color_formula=Gamma+RGB+3.7+Saturation+1.5+Sigmoidal+RGB+15+0.35",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🛰️ Sentinel-2 L2A SWIR (B12-B8A-B04): 🟪/🟥 Zonas urbanizadas y suelo expuesto · 🟩 Vegetación · ⬛/🟦 Cuerpos de agua",
      attribution: "&copy; <a href='https://dataspace.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 L2A SWIR (European Union / ESA)</a>"
    },

    // 4. Radar de Apertura Sintética Copernicus Sentinel-1 SAR RTC (10 m · Todo Tiempo)
    "s1-rtc-falsecolor": {
      name: "Copernicus Sentinel-1 SAR RTC (10 m · Compuesto Urbano VV+VH)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/59ff986916cfb3462ca00af73594ca06/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-1-rtc&expression=0.03%2Blog(0.001-log(0.05/(0.02%2B2*vv)));0.05%2Bexp(0.25*(log(0.01%2B2*vv)%2Blog(0.02%2B5*vh)));1-log(0.05/(0.045-0.9*vv))&rescale=0,.8000&rescale=0,1.000&rescale=0,1.000&asset_as_band=true"
      ],
      pcRegister: {
        collections: ["sentinel-1-rtc"],
        bbox: [-92.5, 7.0, -68.0, 20.0],
        "filter-lang": "cql2-json",
        filter: { op: "=", args: [{ property: "sar:polarizations" }, ["VV", "VH"]] },
        sortby: [{ field: "datetime", direction: "desc" }]
      },
      pcQuery: "collection=sentinel-1-rtc&expression=0.03%2Blog(0.001-log(0.05/(0.02%2B2*vv)));0.05%2Bexp(0.25*(log(0.01%2B2*vv)%2Blog(0.02%2B5*vh)));1-log(0.05/(0.045-0.9*vv))&rescale=0,.8000&rescale=0,1.000&rescale=0,1.000&asset_as_band=true",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "📡 Radar Copernicus Sentinel-1 SAR (VV+VH · Penetra nubes): 🟨/⬜ Rebote urbano intenso (edificaciones) · 🟩 Vegetación · 🟦/⬛ Agua e inundación",
      attribution: "&copy; <a href='https://dataspace.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-1 SAR RTC (10 m · European Union / ESA)</a>"
    },
    "s1-rtc-vv": {
      name: "Copernicus Sentinel-1 SAR RTC (10 m · Polarización VV Escala de Grises)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/59ff986916cfb3462ca00af73594ca06/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=sentinel-1-rtc&assets=vv&rescale=0,0.25&colormap_name=gray"
      ],
      pcRegister: {
        collections: ["sentinel-1-rtc"],
        bbox: [-92.5, 7.0, -68.0, 20.0],
        "filter-lang": "cql2-json",
        filter: { op: "=", args: [{ property: "sar:polarizations" }, ["VV", "VH"]] },
        sortby: [{ field: "datetime", direction: "desc" }]
      },
      pcQuery: "collection=sentinel-1-rtc&assets=vv&rescale=0,0.25&colormap_name=gray",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "📡 Radar Copernicus Sentinel-1 SAR VV (10 m): ⬜ Alta retrodispersión (infraestructura y laderas) · ⬛ Superficies de agua calma / inundación",
      attribution: "&copy; <a href='https://dataspace.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-1 SAR RTC VV (10 m · European Union / ESA)</a>"
    },

    // 5. Agua Superficial e Inundaciones (JRC Global Surface Water · Comisión Europea / Copernicus)
    "jrc-gsw-occurrence": {
      name: "JRC Agua Superficial e Inundación · Ocurrencia Histórica (Comisión Europea)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/83034470b0c048a98eea4583845e3a45/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=jrc-gsw&assets=occurrence&colormap_name=jrc-occurrence&nodata=0"
      ],
      pcRegister: {
        collections: ["jrc-gsw"]
      },
      pcQuery: "collection=jrc-gsw&assets=occurrence&colormap_name=jrc-occurrence&nodata=0",
      underlayTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      underlayOpacity: 0.42,
      legend: "🌊 JRC Global Surface Water (Comisión Europea): 🟦 Agua permanente (100% ocurrencia) · 🟪/🟥 Zonas de inundación estacional o episódica",
      attribution: "&copy; <a href='https://global-surface-water.appspot.com' target='_blank' rel='noopener'>EC JRC / Copernicus Global Surface Water</a>"
    },
    "jrc-gsw-extent": {
      name: "JRC Agua Superficial · Extensión Máxima de Agua / Inundación (Comisión Europea)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/83034470b0c048a98eea4583845e3a45/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=jrc-gsw&assets=extent&colormap_name=jrc-extent&nodata=0"
      ],
      pcRegister: {
        collections: ["jrc-gsw"]
      },
      pcQuery: "collection=jrc-gsw&assets=extent&colormap_name=jrc-extent&nodata=0",
      underlayTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      underlayOpacity: 0.42,
      legend: "🌊 JRC Extensión Máxima de Agua (Comisión Europea): 🟦 Huella máxima histórica de cuerpos de agua y eventos de inundación detectados",
      attribution: "&copy; <a href='https://global-surface-water.appspot.com' target='_blank' rel='noopener'>EC JRC / Copernicus Global Surface Water</a>"
    },

    // 6. Mosaicos Anuales Ópticos Copernicus Sentinel-2 Cloudless (2018–2024 · EOX)
    "sentinel2-2024": {
      name: "Copernicus Sentinel-2 Cloudless (Mosaico 2024 · EOX)",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"],
      legend: "🛰️ Mosaico anual sin nubes Copernicus Sentinel-2 Cloudless (Año 2024 · Color verdadero)",
      attribution: "Sentinel-2 cloudless 2024 by <a href='https://s2maps.eu' target='_blank' rel='noopener'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2024)"
    },
    "sentinel2-2023": {
      name: "Copernicus Sentinel-2 Cloudless (Mosaico 2023 · EOX)",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"],
      legend: "🛰️ Mosaico anual sin nubes Copernicus Sentinel-2 Cloudless (Año 2023 · Color verdadero)",
      attribution: "Sentinel-2 cloudless 2023 by <a href='https://s2maps.eu' target='_blank' rel='noopener'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2023)"
    },
    "sentinel2-2022": {
      name: "Copernicus Sentinel-2 Cloudless (Mosaico 2022 · EOX)",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2022_3857/default/g/{z}/{y}/{x}.jpg"],
      legend: "🛰️ Mosaico anual sin nubes Copernicus Sentinel-2 Cloudless (Año 2022 · Color verdadero)",
      attribution: "Sentinel-2 cloudless 2022 by <a href='https://s2maps.eu' target='_blank' rel='noopener'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2022)"
    },
    "sentinel2-2021": {
      name: "Copernicus Sentinel-2 Cloudless (Mosaico 2021 · EOX)",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg"],
      legend: "🛰️ Mosaico anual sin nubes Copernicus Sentinel-2 Cloudless (Año 2021 · Color verdadero)",
      attribution: "Sentinel-2 cloudless 2021 by <a href='https://s2maps.eu' target='_blank' rel='noopener'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2021)"
    },
    "sentinel2-2020": {
      name: "Copernicus Sentinel-2 Cloudless (Mosaico 2020 · EOX)",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg"],
      legend: "🛰️ Mosaico anual sin nubes Copernicus Sentinel-2 Cloudless (Año 2020 · Color verdadero)",
      attribution: "Sentinel-2 cloudless 2020 by <a href='https://s2maps.eu' target='_blank' rel='noopener'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2020)"
    },
    "sentinel2-2019": {
      name: "Copernicus Sentinel-2 Cloudless (Mosaico 2019 · EOX)",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2019_3857/default/g/{z}/{y}/{x}.jpg"],
      legend: "🛰️ Mosaico anual sin nubes Copernicus Sentinel-2 Cloudless (Año 2019 · Color verdadero)",
      attribution: "Sentinel-2 cloudless 2019 by <a href='https://s2maps.eu' target='_blank' rel='noopener'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2019)"
    },
    "sentinel2-2018": {
      name: "Copernicus Sentinel-2 Cloudless (Mosaico 2018 · EOX)",
      tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2018_3857/default/g/{z}/{y}/{x}.jpg"],
      legend: "🛰️ Mosaico anual sin nubes Copernicus Sentinel-2 Cloudless (Año 2018 · Color verdadero)",
      attribution: "Sentinel-2 cloudless 2018 by <a href='https://s2maps.eu' target='_blank' rel='noopener'>EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2018)"
    },

    // 7. Mapas Base Vectoriales y Referencia
    "carto-positron": {
      name: "Mapa Claro Vectorial (OpenFreeMap)",
      styleUrl: "https://tiles.openfreemap.org/styles/positron",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      legend: "🗺️ Mapa base vectorial de referencia cartográfica (OpenFreeMap / OpenStreetMap)",
      attribution: "&copy; OpenStreetMap contributors &copy; OpenFreeMap"
    },
    "osm-standard": {
      name: "OpenStreetMap Estándar",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      legend: "🗺️ Cartografía colaborativa OpenStreetMap Estándar",
      attribution: "&copy; OpenStreetMap contributors"
    },
    "carto-dark": {
      name: "Modo Oscuro Vectorial (OpenFreeMap)",
      styleUrl: "https://tiles.openfreemap.org/styles/dark",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      legend: "🗺️ Mapa base vectorial en modo oscuro para alto contraste de capas",
      attribution: "&copy; OpenStreetMap contributors &copy; OpenFreeMap"
    },
    "esri-imagery": {
      name: "Imagen Satelital de Alta Resolución (Esri)",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      legend: "🛰️ Mosaico satelital óptico de alta resolución espacial (Esri World Imagery)",
      attribution: "Tiles &copy; Esri &mdash; Referencia visual orientativa"
    }
  };

  // Generación automática de series anuales completas para el Atlas y el Geovisor:
  // 1) Sentinel-2 10m LULC anual (2017–2023)
  [2023, 2022, 2021, 2020, 2019, 2018, 2017].forEach(function (yr) {
    var key = "s2-lulc-" + yr;
    var s2FallbackYear = yr < 2018 ? 2018 : yr;
    BASEMAPS[key] = {
      name: "Uso y Cobertura del Suelo Sentinel-2 10 m (Año " + yr + " · 9 clases)",
      tiles: [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/27352be54f5b70ae6eb491be7c2db331/tiles/WebMercatorQuad/{z}/{x}/{y}?collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class"
      ],
      pcRegister: {
        collections: ["io-lulc-annual-v02"],
        "filter-lang": "cql2-json",
        filter: { op: "anyinteracts", args: [{ property: "datetime" }, { interval: [yr + "-01-01T00:00:00Z", yr + "-12-31T23:59:59Z"] }] }
      },
      pcQuery: "collection=io-lulc-annual-v02&assets=data&colormap_name=io-lulc-9-class",
      lowZoomFallbackTiles: [
        "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-" + s2FallbackYear + "_3857/default/g/{z}/{y}/{x}.jpg"
      ],
      legend: "🏙️ Sentinel-2 LULC 10 m (Año " + yr + "): 🟥 Área Construida (Built Area) · 🟩 Árboles · 🟨 Pastizal · 🟧 Cultivos · 🟦 Agua · ⬜ Suelo Desnudo",
      attribution: "&copy; Impact Observatory / Esri / <a href='https://spacedata.copernicus.eu' target='_blank' rel='noopener'>Copernicus Sentinel-2 10m LULC (" + yr + ")</a>"
    };
  });

  // 2) Series anuales Sentinel-2 L2A (NDVI, NDBI, NDWI, Falso Color Infrarrojo, SWIR Urbano) para 2018–2024
  ["s2-l2a-ndvi", "s2-l2a-ndbi", "s2-l2a-ndwi", "s2-l2a-falsecolor", "s2-l2a-swir"].forEach(function (baseKey) {
    var tpl = BASEMAPS[baseKey];
    if (!tpl) return;
    [2024, 2023, 2022, 2021, 2020, 2019, 2018].forEach(function (yr) {
      BASEMAPS[baseKey + "-" + yr] = {
        name: tpl.name + " · Año " + yr,
        tiles: tpl.tiles.slice(),
        pcRegister: {
          collections: ["sentinel-2-l2a"],
          bbox: [-92.5, 7.0, -68.0, 20.0],
          "filter-lang": "cql2-json",
          filter: {
            op: "and",
            args: [
              { op: "<=", args: [{ property: "eo:cloud_cover" }, 50] },
              { op: "anyinteracts", args: [{ property: "datetime" }, { interval: [yr + "-01-01T00:00:00Z", yr + "-12-31T23:59:59Z"] }] }
            ]
          },
          sortby: [{ field: "eo:cloud_cover", direction: "asc" }]
        },
        pcQuery: tpl.pcQuery,
        lowZoomFallbackTiles: [
          "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-" + yr + "_3857/default/g/{z}/{y}/{x}.jpg"
        ],
        legend: tpl.legend + " (Compuesto anual " + yr + ")",
        attribution: tpl.attribution
      };
    });
  });

  // 3) Series anuales Sentinel-1 SAR RTC (Compuesto VV+VH y Polarización VV) para 2018–2024
  ["s1-rtc-falsecolor", "s1-rtc-vv"].forEach(function (baseKey) {
    var tpl = BASEMAPS[baseKey];
    if (!tpl) return;
    [2024, 2023, 2022, 2021, 2020, 2019, 2018].forEach(function (yr) {
      BASEMAPS[baseKey + "-" + yr] = {
        name: tpl.name + " · Año " + yr,
        tiles: tpl.tiles.slice(),
        pcRegister: {
          collections: ["sentinel-1-rtc"],
          bbox: [-92.5, 7.0, -68.0, 20.0],
          "filter-lang": "cql2-json",
          filter: {
            op: "and",
            args: [
              { op: "=", args: [{ property: "sar:polarizations" }, ["VV", "VH"]] },
              { op: "anyinteracts", args: [{ property: "datetime" }, { interval: [yr + "-01-01T00:00:00Z", yr + "-12-31T23:59:59Z"] }] }
            ]
          },
          sortby: [{ field: "datetime", direction: "desc" }]
        },
        pcQuery: tpl.pcQuery,
        lowZoomFallbackTiles: tpl.lowZoomFallbackTiles,
        legend: tpl.legend + " (Año " + yr + ")",
        attribution: tpl.attribution
      };
    });
  });


  var pcSearchIdCache = {};

  function resolveBasemapTiles(basemapKey, callback) {
    var bm = BASEMAPS[basemapKey] || BASEMAPS["osm-standard"];
    if (!bm.pcRegister || !bm.pcQuery) {
      callback();
      return;
    }
    var cacheKey = JSON.stringify(bm.pcRegister);
    if (pcSearchIdCache[cacheKey]) {
      bm.tiles = [
        "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/" +
          pcSearchIdCache[cacheKey] +
          "/tiles/WebMercatorQuad/{z}/{x}/{y}?" +
          bm.pcQuery
      ];
      callback();
      return;
    }
    fetch("https://planetarycomputer.microsoft.com/api/data/v1/mosaic/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: cacheKey
    })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (data && data.searchid) {
          pcSearchIdCache[cacheKey] = data.searchid;
          bm.tiles = [
            "https://planetarycomputer.microsoft.com/api/data/v1/mosaic/" +
              data.searchid +
              "/tiles/WebMercatorQuad/{z}/{x}/{y}?" +
              bm.pcQuery
          ];
        }
        callback();
      })
      .catch(function () {
        callback();
      });
  }

  var FOLDER_PALETTE = [
    "#007F8B",
    "#D95F02",
    "#7570B3",
    "#E7298A",
    "#66A61E",
    "#E6AB02",
    "#1F78B4"
  ];

  var GEOLIBRE_EXT_RE = /\.(geojson|json|kml|pmtiles|fgb|tif|tiff|parquet|geoparquet)$/i;

  function makeStyle(basemapKey) {
    var bm = BASEMAPS[basemapKey] || BASEMAPS["osm-standard"];
    if (bm.styleUrl) {
      return bm.styleUrl;
    }
    var sources = {};
    var layers = [
      {
        id: "base-bg-layer",
        type: "background",
        paint: { "background-color": "#141E38" }
      }
    ];

    if (bm.underlayTiles) {
      sources["base-underlay-tiles"] = {
        type: "raster",
        tiles: bm.underlayTiles,
        tileSize: 256
      };
      layers.push({
        id: "base-underlay-tiles-layer",
        type: "raster",
        source: "base-underlay-tiles",
        minzoom: 0,
        maxzoom: 19,
        paint: {
          "raster-opacity": typeof bm.underlayOpacity === "number" ? bm.underlayOpacity : 1
        }
      });
    } else if (bm.lowZoomFallbackTiles) {
      sources["base-fallback-tiles"] = {
        type: "raster",
        tiles: bm.lowZoomFallbackTiles,
        tileSize: 256
      };
      layers.push({
        id: "base-fallback-tiles-layer",
        type: "raster",
        source: "base-fallback-tiles",
        minzoom: 0,
        maxzoom: 7
      });
    }

    sources["base-tiles"] = {
      type: "raster",
      tiles: bm.tiles,
      tileSize: 256,
      attribution: bm.attribution
    };
    layers.push({
      id: "base-tiles-layer",
      type: "raster",
      source: "base-tiles",
      minzoom: bm.lowZoomFallbackTiles ? 6 : 0,
      maxzoom: 19
    });

    if (bm.overlayTiles) {
      sources["base-overlay-tiles"] = {
        type: "raster",
        tiles: bm.overlayTiles,
        tileSize: 256
      };
      layers.push({
        id: "base-overlay-tiles-layer",
        type: "raster",
        source: "base-overlay-tiles",
        minzoom: bm.lowZoomFallbackTiles ? 6 : 0,
        maxzoom: 19,
        paint: {
          "raster-opacity": typeof bm.overlayOpacity === "number" ? bm.overlayOpacity : 0.4
        }
      });
    }

    return {
      version: 8,
      sources: sources,
      layers: layers
    };
  }

  function createSafePopupElement(titleText, rows, badgeText) {
    var wrap = document.createElement("div");
    wrap.style.maxWidth = "290px";
    wrap.style.fontFamily = "system-ui, sans-serif";
    wrap.style.fontSize = "12.5px";

    if (badgeText) {
      var badge = document.createElement("div");
      badge.textContent = badgeText;
      badge.style.fontSize = "11px";
      badge.style.fontWeight = "700";
      badge.style.color = "#005F68";
      badge.style.marginBottom = "4px";
      wrap.appendChild(badge);
    }

    var h = document.createElement("strong");
    h.textContent = titleText;
    h.style.display = "block";
    h.style.color = "#14283F";
    h.style.marginBottom = "6px";
    wrap.appendChild(h);

    rows.forEach(function (pair) {
      var row = document.createElement("div");
      row.style.marginBottom = "3px";
      var k = document.createElement("span");
      k.style.fontWeight = "600";
      k.textContent = pair[0] + ": ";
      var v = document.createElement("span");
      v.textContent = pair[1];
      row.appendChild(k);
      row.appendChild(v);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function computeGeoJsonBounds(geojson) {
    var bounds = [Infinity, Infinity, -Infinity, -Infinity];
    function visitCoords(coords) {
      if (!Array.isArray(coords) || coords.length === 0) return;
      if (typeof coords[0] === "number" && typeof coords[1] === "number") {
        var lon = coords[0];
        var lat = coords[1];
        if (lon < bounds[0]) bounds[0] = lon;
        if (lat < bounds[1]) bounds[1] = lat;
        if (lon > bounds[2]) bounds[2] = lon;
        if (lat > bounds[3]) bounds[3] = lat;
      } else {
        coords.forEach(visitCoords);
      }
    }
    function visitGeom(g) {
      if (!g) return;
      if (g.type === "GeometryCollection" && Array.isArray(g.geometries)) {
        g.geometries.forEach(visitGeom);
      } else if (g.coordinates) {
        visitCoords(g.coordinates);
      }
    }
    if (!geojson) return null;
    if (geojson.type === "FeatureCollection" && Array.isArray(geojson.features)) {
      geojson.features.forEach(function (f) {
        if (f && f.geometry) visitGeom(f.geometry);
      });
    } else if (geojson.type === "Feature" && geojson.geometry) {
      visitGeom(geojson.geometry);
    } else {
      visitGeom(geojson);
    }
    if (!isFinite(bounds[0])) return null;
    return [[bounds[0], bounds[1]], [bounds[2], bounds[3]]];
  }

  function buildInvertedMaskGeoJson(perimeterGeoJson) {
    if (!perimeterGeoJson) return null;
    var holes = [];
    function collectOuterRings(geom) {
      if (!geom) return;
      if (geom.type === "Polygon" && Array.isArray(geom.coordinates) && geom.coordinates.length > 0) {
        holes.push(geom.coordinates[0]);
      } else if (geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
        geom.coordinates.forEach(function (poly) {
          if (Array.isArray(poly) && poly.length > 0) {
            holes.push(poly[0]);
          }
        });
      } else if (geom.type === "GeometryCollection" && Array.isArray(geom.geometries)) {
        geom.geometries.forEach(collectOuterRings);
      }
    }
    if (perimeterGeoJson.type === "FeatureCollection" && Array.isArray(perimeterGeoJson.features)) {
      perimeterGeoJson.features.forEach(function (f) {
        if (f && f.geometry) collectOuterRings(f.geometry);
      });
    } else if (perimeterGeoJson.type === "Feature" && perimeterGeoJson.geometry) {
      collectOuterRings(perimeterGeoJson.geometry);
    } else {
      collectOuterRings(perimeterGeoJson);
    }
    if (!holes.length) return null;
    var worldOuter = [
      [-179.9, -85.0],
      [179.9, -85.0],
      [179.9, 85.0],
      [-179.9, 85.0],
      [-179.9, -85.0]
    ];
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { role: "inverted_study_area_mask" },
          geometry: {
            type: "Polygon",
            coordinates: [worldOuter].concat(holes)
          }
        }
      ]
    };
  }

  function applyStudyAreaMaskToMap(targetMap, perimeterGeoJson, maskEnabled, maskOpacity) {
    if (!targetMap || !perimeterGeoJson) return;
    var inverted = buildInvertedMaskGeoJson(perimeterGeoJson);
    if (!inverted) return;
    var op = typeof maskOpacity === "number" ? maskOpacity : 0.88;
    var vis = maskEnabled ? "visible" : "none";

    ["study-area-mask-fill", "study-area-perimeter-glow", "study-area-perimeter-stroke"].forEach(function (lid) {
      if (targetMap.getLayer(lid)) targetMap.removeLayer(lid);
    });
    if (targetMap.getSource("study-area-mask-src")) targetMap.removeSource("study-area-mask-src");
    if (targetMap.getSource("study-area-perim-src")) targetMap.removeSource("study-area-perim-src");

    targetMap.addSource("study-area-mask-src", { type: "geojson", data: inverted });
    targetMap.addSource("study-area-perim-src", { type: "geojson", data: perimeterGeoJson });

    targetMap.addLayer({
      id: "study-area-mask-fill",
      type: "fill",
      source: "study-area-mask-src",
      layout: { visibility: vis },
      paint: {
        "fill-color": "#070D24",
        "fill-opacity": op
      }
    });
    targetMap.addLayer({
      id: "study-area-perimeter-glow",
      type: "line",
      source: "study-area-perim-src",
      paint: {
        "line-color": "#FFCC00",
        "line-width": 3.4,
        "line-opacity": 0.92
      }
    });
    targetMap.addLayer({
      id: "study-area-perimeter-stroke",
      type: "line",
      source: "study-area-perim-src",
      paint: {
        "line-color": "#FFFFFF",
        "line-width": 1.3
      }
    });
  }

  function parseKmlToGeoJson(kmlText) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(kmlText, "text/xml");
    var placemarks = Array.prototype.slice.call(xml.getElementsByTagName("Placemark"));
    var features = [];

    function parseCoordList(raw) {
      return (raw || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(function (tok) {
          var p = tok.split(",");
          return [parseFloat(p[0]), parseFloat(p[1])];
        })
        .filter(function (pt) {
          return !isNaN(pt[0]) && !isNaN(pt[1]);
        });
    }

    placemarks.forEach(function (pm, idx) {
      var nameEl = pm.getElementsByTagName("name")[0];
      var descEl = pm.getElementsByTagName("description")[0];
      var props = {
        nombre: nameEl ? nameEl.textContent.trim() : "Elemento KML " + (idx + 1)
      };
      if (descEl && descEl.textContent.trim()) {
        props.descripcion = descEl.textContent.trim();
      }

      var poly = pm.getElementsByTagName("Polygon")[0];
      var line = pm.getElementsByTagName("LineString")[0];
      var point = pm.getElementsByTagName("Point")[0];

      if (poly) {
        var coordsEl = poly.getElementsByTagName("coordinates")[0];
        var ring = parseCoordList(coordsEl ? coordsEl.textContent : "");
        if (ring.length >= 3) {
          if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
            ring.push([ring[0][0], ring[0][1]]);
          }
          features.push({ type: "Feature", properties: props, geometry: { type: "Polygon", coordinates: [ring] } });
        }
      } else if (line) {
        var lCoords = parseCoordList((line.getElementsByTagName("coordinates")[0] || {}).textContent);
        if (lCoords.length >= 2) {
          features.push({ type: "Feature", properties: props, geometry: { type: "LineString", coordinates: lCoords } });
        }
      } else if (point) {
        var pCoords = parseCoordList((point.getElementsByTagName("coordinates")[0] || {}).textContent);
        if (pCoords.length >= 1) {
          features.push({ type: "Feature", properties: props, geometry: { type: "Point", coordinates: pCoords[0] } });
        }
      }
    });

    return { type: "FeatureCollection", features: features };
  }

  function detectFormat(filename) {
    var lower = (filename || "").toLowerCase();
    if (lower.endsWith(".geolibre.json")) return "geolibre";
    if (lower.endsWith(".geojson") || lower.endsWith(".json")) return "geojson";
    if (lower.endsWith(".kml")) return "kml";
    if (lower.endsWith(".pmtiles")) return "pmtiles";
    if (lower.endsWith(".fgb")) return "flatgeobuf";
    if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "cog";
    if (lower.endsWith(".parquet") || lower.endsWith(".geoparquet")) return "geoparquet";
    return "otro";
  }

  function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function isWebGLSupported() {
    try {
      var testCanvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (testCanvas.getContext("webgl2") || testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl"))
      );
    } catch (e) {
      return false;
    }
  }

  function renderProjectWebGLFallback(canvas, cfg, baseUrl, geolibreResolvedUrl) {
    canvas.innerHTML = "";
    var box = document.createElement("div");
    box.className = "callout callout-warn";
    box.style.margin = "1.25rem";
    var center = (cfg.map_view && cfg.map_view.center) || [-84.0, 13.5];
    var h = document.createElement("strong");
    h.textContent = " aceleración gráfica WebGL no disponible en esta sesión del navegador";
    box.appendChild(h);
    var p = document.createElement("p");
    p.style.margin = "0.5rem 0";
    p.textContent =
      "El lienzo interactivo 2D/3D requiere WebGL habilitado. Aun sin aceleración gráfica, puedes consultar y descargar todas las capas activas del proyecto o abrir el archivo de proyecto GeoLibre:";
    box.appendChild(p);
    var meta = document.createElement("p");
    meta.style.fontSize = "0.85rem";
    meta.textContent =
      "Centroide referencial: Lat " + Number(center[1]).toFixed(4) + ", Lon " + Number(center[0]).toFixed(4) +
      " · Escala: " + ((cfg.map_view && cfg.map_view.scale_label) || "Documentada en ficha");
    box.appendChild(meta);

    var ul = document.createElement("ul");
    ul.style.margin = "0.5rem 0 0.75rem 1.2rem";
    (cfg.layers || []).forEach(function (lyr) {
      if (!lyr.source_path) return;
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = /^https?:\/\//i.test(lyr.source_path)
        ? lyr.source_path
        : new URL(lyr.source_path, window.location.origin + baseUrl).href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = lyr.title + " (" + (lyr.format || "geojson") + ") ↗";
      li.appendChild(a);
      ul.appendChild(li);
    });
    box.appendChild(ul);

    var btn = document.createElement("a");
    btn.className = "btn btn-teal btn-xs";
    btn.href = geolibreResolvedUrl;
    btn.textContent = "Descargar proyecto.geolibre.json";
    box.appendChild(btn);
    canvas.appendChild(box);
  }

  // =========================================================================
  // A. Inicializador del Geovisor de Proyecto (aplicacion/index.html)
  // =========================================================================
  function initProjectGeovisor() {
    var cfgScript = document.getElementById("geovisor-config-data");
    var canvas = document.getElementById("geovisor-map-canvas");
    if (!cfgScript || !canvas) return;

    var cfg;
    try {
      cfg = JSON.parse(cfgScript.textContent || "{}");
    } catch (err) {
      return;
    }

    var baseUrl = cfg.site_base_url || "./";
    var repoSlug = cfg.repository_slug || null;
    var repoBranch = cfg.repository_branch || "main";
    var geolibreRelPath = (cfg.geolibre_integration && cfg.geolibre_integration.project_file) || "geovisor/proyecto.geolibre.json";
    var geolibreResolvedUrl = new URL(geolibreRelPath, window.location.origin + baseUrl).href;
    var isHttpsPublic = window.location.protocol === "https:";
    var isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    // Aislamiento estricto para forks y vistas previas:
    // Si estamos en <owner>.github.io/<repo>/, usar siempre <owner>/<repo> de la URL actual.
    // Si estamos en localhost, no consultar la API del repositorio canónico remoto para no mezclar capas.
    if (window.location.hostname.endsWith(".github.io")) {
      var hostOwner = window.location.hostname.replace(/\.github\.io$/i, "");
      var pathSeg = window.location.pathname.split("/").filter(Boolean)[0];
      if (hostOwner && pathSeg) {
        repoSlug = hostOwner + "/" + pathSeg;
      }
    } else if (isLocalhost) {
      repoSlug = null;
    }

    var studioBtn = document.getElementById("btn-open-geolibre-studio");
    if (studioBtn) {
      studioBtn.href = isHttpsPublic
        ? "https://web.geolibre.app/?url=" + encodeURIComponent(geolibreResolvedUrl)
        : "https://web.geolibre.app/";
    }

    var mapInstance = null;

    // Pestañas del panel lateral + acceso rápido desde barra superior
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-gv-tab]"));
    var panels = Array.prototype.slice.call(document.querySelectorAll("[data-gv-panel]"));
    var iframeEl = document.getElementById("geolibre-embed-iframe");
    var embedNoticeEl = document.getElementById("geolibre-embed-notice");

    function activateTab(mode) {
      tabs.forEach(function (t) {
        t.classList.toggle("is-active", t.getAttribute("data-gv-tab") === mode);
      });
      panels.forEach(function (p) {
        p.classList.toggle("is-active", p.getAttribute("data-gv-panel") === mode);
      });

      if (mode === "embed") {
        if (isHttpsPublic && iframeEl) {
          canvas.style.display = "none";
          iframeEl.style.display = "block";
          var embedSrc = "https://web.geolibre.app/?url=" + encodeURIComponent(geolibreResolvedUrl) + "&maponly";
          if (iframeEl.getAttribute("src") !== embedSrc) {
            iframeEl.setAttribute("src", embedSrc);
          }
          if (embedNoticeEl) embedNoticeEl.textContent = "Cargando proyecto .geolibre.json (v0.2.0) publicado con CORS sobre GeoLibre Studio.";
        } else {
          canvas.style.display = "block";
          if (iframeEl) iframeEl.style.display = "none";
          if (embedNoticeEl) {
            embedNoticeEl.textContent = "En modo local (" + window.location.host + "), usa el visor integrado o descarga proyecto.geolibre.json para abrirlo en web.geolibre.app. Al publicarse en HTTPS (GitHub Pages), la apertura directa con ?url= se activa automáticamente.";
          }
        }
      } else {
        canvas.style.display = "block";
        if (iframeEl) iframeEl.style.display = "none";
        if (mapInstance) mapInstance.resize();
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        activateTab(tab.getAttribute("data-gv-tab"));
      });
    });

    var quickFolderBtn = document.getElementById("gv-open-folder-tab");
    if (quickFolderBtn) {
      quickFolderBtn.addEventListener("click", function () {
        activateTab("repo-folder");
        discoverRepositoryFolderLayers();
      });
    }

    var center = (cfg.map_view && cfg.map_view.center) || [-84.0, 13.5];
    var zoom = (cfg.map_view && cfg.map_view.zoom) || 10;

    if (typeof window.maplibregl === "undefined" || !isWebGLSupported()) {
      renderProjectWebGLFallback(canvas, cfg, baseUrl, geolibreResolvedUrl);
    } else {
      try {
        mapInstance = new window.maplibregl.Map({
          container: canvas,
          style: makeStyle("carto-positron"),
          center: center,
          zoom: zoom,
          attributionControl: true,
          canvasContextAttributes: { preserveDrawingBuffer: true }
        });
      } catch (err) {
        mapInstance = null;
        renderProjectWebGLFallback(canvas, cfg, baseUrl, geolibreResolvedUrl);
      }
    }

    if (mapInstance) {
      var shellEl = document.querySelector(".geovisor-shell") || canvas;
      mapInstance.addControl(new window.maplibregl.NavigationControl(), "top-right");
      if (window.maplibregl.FullscreenControl) {
        mapInstance.addControl(new window.maplibregl.FullscreenControl({ container: shellEl }), "top-right");
      }
      mapInstance.addControl(new window.maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-right");

      // Botón dedicado de Pantalla Completa en barra superior + plegado de panel lateral
      var fsBtn = document.getElementById("gv-toggle-fullscreen");
      var sbBtn = document.getElementById("gv-toggle-sidebar");
      function syncFullscreenButtonState() {
        var isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement || shellEl.classList.contains("is-fullscreen"));
        if (fsBtn) {
          fsBtn.textContent = isFs ? "✕ Salir de pantalla completa" : "⛶ Pantalla completa";
        }
        setTimeout(function () {
          if (mapInstance) mapInstance.resize();
        }, 120);
      }
      if (fsBtn) {
        fsBtn.addEventListener("click", function () {
          var nativeFsEl = document.fullscreenElement || document.webkitFullscreenElement;
          if (nativeFsEl) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            shellEl.classList.remove("is-fullscreen");
          } else if (shellEl.classList.contains("is-fullscreen")) {
            shellEl.classList.remove("is-fullscreen");
          } else {
            shellEl.classList.add("is-fullscreen");
            if (shellEl.requestFullscreen) {
              shellEl.requestFullscreen().catch(function () {});
            } else if (shellEl.webkitRequestFullscreen) {
              shellEl.webkitRequestFullscreen();
            }
          }
          syncFullscreenButtonState();
        });
      }
      document.addEventListener("fullscreenchange", function () {
        if (!document.fullscreenElement) {
          shellEl.classList.remove("is-fullscreen");
        }
        syncFullscreenButtonState();
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape" && shellEl.classList.contains("is-fullscreen")) {
          shellEl.classList.remove("is-fullscreen");
          syncFullscreenButtonState();
        }
      });
      if (sbBtn) {
        sbBtn.addEventListener("click", function () {
          var collapsed = shellEl.classList.toggle("is-sidebar-collapsed");
          sbBtn.textContent = collapsed ? "⇥ Mostrar panel" : "⇄ Panel lateral";
          setTimeout(function () {
            if (mapInstance) mapInstance.resize();
          }, 120);
        });
      }

      // Marcador de centroide referencial
      var refCentroid = (cfg.map_view && cfg.map_view.declared_centroid) || center;
      var popupNode = createSafePopupElement(
        cfg.title || cfg.project_id,
        [
          ["Coordenada referencial", refCentroid[1].toFixed(5) + ", " + refCentroid[0].toFixed(5)],
          ["Escala", (cfg.map_view && cfg.map_view.scale_label) || "Documentada en ficha"],
          ["Nota", (cfg.map_view && cfg.map_view.reference_note) || "Ubicación referencial"]
        ],
        "PUNTO DE REFERENCIA DEL PERFIL"
      );
      var refMarker = new window.maplibregl.Marker({ color: "#007F8B" })
        .setLngLat(refCentroid)
        .setPopup(new window.maplibregl.Popup({ offset: 24 }).setDOMContent(popupNode))
        .addTo(mapInstance);

      var toggleRefCheck = document.getElementById("gv-toggle-ref-marker");
      if (toggleRefCheck) {
        toggleRefCheck.addEventListener("change", function () {
          if (toggleRefCheck.checked) refMarker.addTo(mapInstance);
          else refMarker.remove();
        });
      }

      var coordsStatus = document.getElementById("gv-coords-readout");
      mapInstance.on("mousemove", function (e) {
        if (coordsStatus) {
          coordsStatus.textContent = "Lat: " + e.lngLat.lat.toFixed(5) + " · Lon: " + e.lngLat.lng.toFixed(5) + " · Zoom: " + mapInstance.getZoom().toFixed(1);
        }
      });

      var resetViewBtn = document.getElementById("gv-reset-view");
      if (resetViewBtn) {
        resetViewBtn.addEventListener("click", function () {
          mapInstance.flyTo({ center: center, zoom: zoom, essential: true });
        });
      }
    }

    // Registro de capas cargadas dinámicamente desde geovisor/capas/ o desde archivo local
    var dynamicFolderLayers = {}; // key: fileName -> { geojson, color, visible }
    var loadedProjectGeoJsons = {}; // cache en memoria para evitar re-descargar GeoJSON al cambiar mapa base
    var localGeoJsonCache = null;
    var initialBoundsFitted = false;

    function findReferenceOverlayLayerId(forBoundaryLayer) {
      var candidates = [];
      if (!forBoundaryLayer && Array.isArray(cfg.layers)) {
        cfg.layers.forEach(function (l) {
          if (l && l.id && l.style && l.style.interactive_fill === false) {
            candidates.push(l.id + "-fill");
            candidates.push(l.id + "-line");
          }
        });
      }
      if (!forBoundaryLayer) {
        candidates.push(
          "sv-amss-perimetro-distritos-fill",
          "sv-amss-perimetro-distritos-line",
          "sv-amss-perimetro-metropolitano-fill",
          "sv-amss-perimetro-metropolitano-line"
        );
      }
      candidates.push("study-area-mask-fill", "study-area-mask-outline");
      for (var i = 0; i < candidates.length; i++) {
        if (mapInstance && mapInstance.getLayer(candidates[i])) {
          return candidates[i];
        }
      }
      return undefined;
    }

    function attachFeatureClickPopup(layerId, badgeTitle, defaultTitle) {
      mapInstance.on("click", layerId, function (e) {
        if (e.originalEvent && e.originalEvent._gvPopupHandled) return;
        if (!e.features || !e.features.length) return;
        if (e.originalEvent) e.originalEvent._gvPopupHandled = true;
        var props = e.features[0].properties || {};
        var nameVal = props.nombre || props.NAME_UPD || props.name || props.NAM || defaultTitle;
        var rows = [];
        if (props.ID_CELDA !== undefined && props.ID_CELDA !== null) {
          nameVal = "Celda " + String(props.ID_CELDA) + (props.DISTRITO ? " · " + String(props.DISTRITO) : "");
          rows.push(["Valor estimado (Media celda)", "$" + Number(props.VAL_EST_M2 || 0).toFixed(2) + " USD/m²"]);
          rows.push([
            "Mediana / Potencial celda",
            "$" + Number(props.VAL_MED_M2 || 0).toFixed(2) + " / $" + Number(props.VAL_POT_M2 || 0).toFixed(2) + " USD/m²"
          ]);
          rows.push(["Dispersión intra-celda (DE)", "± $" + Number(props.VAL_STD_M2 || 0).toFixed(2) + " USD/m²"]);
          rows.push(["Tipología morfológica GEE", String(props.TIPO_SUELO || "—").replace(/_/g, " ")]);
          var pctEd = props.PCT_EDIF !== undefined && props.PCT_EDIF !== null
            ? Number(props.PCT_EDIF)
            : Number(props.FRAC_EDIF || 0) * 100;
          rows.push(["Fracción construida (10 m)", pctEd.toFixed(1) + "%"]);
          rows.push(["Altura media 2.5D (Open Buildings)", Number(props.ALT_EDIF_M || 0).toFixed(2) + " m"]);
          rows.push(["Pendiente media (GLO-30)", Number(props.PEND_DEG || 0).toFixed(1) + "°"]);
          rows.push(["Distrito / Superficie", (props.DISTRITO || "AMSS") + " · " + Number(props.AREA_HA || 0).toFixed(2) + " ha"]);
        } else if (props.ORIGEN_FIN !== undefined && props.ORIGEN_FIN !== null) {
          nameVal = (props.NAME_UPD || ("UPD #" + (props.OBJECTID || ""))) + (props.DISTRITO ? " · " + String(props.DISTRITO) : "");
          rows.push(["Valor integrado 2025 (VAL_FIN_M2)", "$" + Number(props.VAL_FIN_M2 || 0).toFixed(2) + " USD/m²"]);
          rows.push([
            "Fuente de consolidación",
            props.ORIGEN_FIN === "OBSERVADO" ? "Observado / Calibrado 2025" : "Imputado por Modelo Satelital GEE"
          ]);
          rows.push(["Predicción satelital GEE (VAL_MOD_M2)", "$" + Number(props.VAL_MOD_M2 || 0).toFixed(2) + " USD/m²"]);
          if (props.ORIGEN_FIN === "OBSERVADO" && props.DIF_MOD_M2 !== undefined && props.DIF_MOD_M2 !== null && props.DIF_MOD_M2 !== "") {
            var difNum = Number(props.DIF_MOD_M2);
            if (!isNaN(difNum)) {
              rows.push(["Residual (Modelo − Observado)", (difNum >= 0 ? "+" : "") + "$" + difNum.toFixed(2) + " USD/m²"]);
            }
          }
          rows.push(["Tipología UPD / Superficie", (props.TIPO || "—") + " · " + Number(props.AREA_HA || 0).toFixed(2) + " ha"]);
          rows.push(["Distrito / Municipio", (props.DISTRITO || "—") + (props.MUNICIPIO ? " · " + props.MUNICIPIO : "")]);
        } else if (props.promedio_2025 !== undefined && props.promedio_2025 !== null) {
          rows.push(["Precio promedio 2025 (Web Scraping)", "$" + Number(props.promedio_2025).toFixed(2) + " USD"]);
          if (props.rango_2025) rows.push(["Rango homologado 2025", String(props.rango_2025)]);
          if (props.cuadrante_) rows.push(["Cuadrante LISA (Moran)", String(props.cuadrante_)]);
          if (props.cluster_p05) rows.push(["Significancia LISA (p≤0.05)", String(props.cluster_p05)]);
          if (props.moran_loca !== undefined) rows.push(["I de Moran Local", String(props.moran_loca) + " (p=" + props.p_perm_loc + ")"]);
          if (props.z_precio !== undefined) rows.push(["Z-Score / Log Precio", "Z=" + props.z_precio + " · ln=" + props.log_precio]);
          if (props.nomb_distr) rows.push(["Distrito / Municipio", props.nomb_distr + " · " + (props.nomb_mun || "")]);
        } else if (props.NAME_UPD !== undefined && (props.P1_N !== undefined || props.P2_N !== undefined)) {
          var p1Txt = (props.P1_PROM !== undefined && props.P1_PROM !== null && Number(props.P1_N) > 0)
            ? "$" + Number(props.P1_PROM).toFixed(2) + " USD (Mediana: $" + Number(props.P1_MED || 0).toFixed(2) + " · n=" + props.P1_N + ")"
            : "Sin permisos (n=0)";
          var p2Txt = (props.P2_PROM !== undefined && props.P2_PROM !== null && Number(props.P2_N) > 0)
            ? "$" + Number(props.P2_PROM).toFixed(2) + " USD (Mediana: $" + Number(props.P2_MED || 0).toFixed(2) + " · n=" + props.P2_N + ")"
            : "Sin permisos (n=0)";
          rows.push(["Valor suelo 2007–2019 (P1_PROM)", p1Txt]);
          rows.push(["Valor suelo 2020–2026 (P2_PROM)", p2Txt]);
          if (props.TENDENCIA) {
            var varTxt = props.TENDENCIA;
            if (props.PCT_VAR !== undefined && props.PCT_VAR !== null) {
              varTxt += " (" + (Number(props.PCT_VAR) > 0 ? "+" : "") + Number(props.PCT_VAR).toFixed(1) + "%)";
            }
            rows.push(["Tendencia 2007–19 vs 2020–26", varTxt]);
          }
          rows.push(["Permisos OPAMSS (Total)", String(props.PC_TOT || 0) + " (2007–19: " + (props.PC_07_19 || 0) + " · 2020–26: " + (props.PC_20_26 || 0) + ")"]);
          rows.push(["Distrito / Tipología", (props.nomb_distr || "") + " (" + (props.TYPE || "") + " · " + (props.HA || 0) + " ha)"]);
          rows.push(["Población / Vivienda UVIP", "Hab: " + (props.HAB_TOTAL || 0) + " · UVIP: " + (props.UVIP || 0)]);
        } else {
          var titleCand = props.nombre || props.NAME_UPD || props.name || props.NAM || props.corregimiento || props.distrito || props.id_celda || props.codigo_ae || props.clase_lbl || props.categoria;
          if (titleCand) nameVal = String(titleCand);
          Object.keys(props).forEach(function (k) {
            if (k === "nombre" || k === "name" || k.charAt(0) === "_") return;
            var rawV = props[k];
            if (rawV === null || rawV === undefined || String(rawV).trim() === "") return;
            var dispV = String(rawV);
            if (typeof rawV === "number" && !isNaN(rawV)) {
              dispV = Math.abs(rawV - Math.round(rawV)) < 1e-6 ? String(Math.round(rawV)) : Number(rawV).toFixed(2);
            }
            var prettyKey = k.replace(/_/g, " ");
            rows.push([prettyKey.charAt(0).toUpperCase() + prettyKey.slice(1), dispV]);
          });
        }
        if (!rows.length) rows.push(["Estado", "Capa vectorial cargada"]);
        var dom = createSafePopupElement(String(nameVal), rows.slice(0, 10), badgeTitle);
        new window.maplibregl.Popup({ maxWidth: "360px" }).setLngLat(e.lngLat).setDOMContent(dom).addTo(mapInstance);
      });
      mapInstance.on("mouseenter", layerId, function () {
        mapInstance.getCanvas().style.cursor = "pointer";
      });
      mapInstance.on("mouseleave", layerId, function () {
        mapInstance.getCanvas().style.cursor = "";
      });
    }

    function makeNumericStepExpr(propName, breaks, colors, noDataColor) {
      var stepArr = ["step", ["coalesce", ["to-number", ["get", propName]], 0], colors[0]];
      for (var i = 0; i < breaks.length; i++) {
        stepArr.push(breaks[i], colors[i + 1]);
      }
      return [
        "case",
        ["all", ["has", propName], ["!=", ["get", propName], null], [">", ["to-number", ["get", propName]], 0]],
        stepArr,
        noDataColor || "#CBD5E1"
      ];
    }

    function makeNumericStepZeroOkExpr(propName, breaks, colors, noDataColor) {
      var stepArr = ["step", ["coalesce", ["to-number", ["get", propName]], 0], colors[0]];
      for (var i = 0; i < breaks.length; i++) {
        stepArr.push(breaks[i], colors[i + 1]);
      }
      return [
        "case",
        ["all", ["has", propName], ["!=", ["get", propName], null], [">=", ["to-number", ["get", propName]], 0]],
        stepArr,
        noDataColor || "#CBD5E1"
      ];
    }

    var THEMATIC_SCHEMES = {
      "auto_gee_malla_250m": {
        "homologated": {
          label: "Opción 1 · Escala Homologada de Valor del Suelo (USD/m² · VAL_EST_M2)",
          expr: makeNumericStepExpr("VAL_EST_M2", [30, 50, 100, 175, 300], ["#FEF0D9", "#FDD49E", "#FDBB84", "#FC8D59", "#E34A33", "#990000"], "#CBD5E1"),
          items: [
            { color: "#FEF0D9", label: "Reserva / Rural (≤ $30 · 8,557 celdas)" },
            { color: "#FDD49E", label: "Periurbano Bajo ($30–$50 · 11,225 celdas)" },
            { color: "#FDBB84", label: "Transición ($50–$100 · 2,215 celdas)" },
            { color: "#FC8D59", label: "Urbano Medio ($100–$175 · 1,218 celdas)" },
            { color: "#E34A33", label: "Urbano Alto ($175–$300 · 836 celdas)" },
            { color: "#990000", label: "Nodos Prime (> $300 · 241 celdas)" }
          ]
        },
        "quantiles": {
          label: "Opción 2 · Quintiles Metropolitanos 250 m (P20, P40, P60, P80 · 4,858 celdas/clase)",
          expr: makeNumericStepExpr("VAL_EST_M2", [27.46, 30.73, 34.73, 46.33], ["#FDE725", "#5EC962", "#21918C", "#3B528B", "#440154"], "#CBD5E1"),
          items: [
            { color: "#FDE725", label: "Q1 (≤ $27.46/m²)" },
            { color: "#5EC962", label: "Q2 ($27.47–$30.73/m²)" },
            { color: "#21918C", label: "Q3 ($30.74–$34.73/m²)" },
            { color: "#3B528B", label: "Q4 ($34.74–$46.33/m²)" },
            { color: "#440154", label: "Q5 (> $46.33 hasta $375.90/m²)" }
          ]
        },
        "median": {
          label: "Opción 3 · Mediana Intra-Celda a 20 m (VAL_MED_M2 · resistente a bordes)",
          expr: makeNumericStepExpr("VAL_MED_M2", [30, 50, 100, 175, 300], ["#FEF0D9", "#FDD49E", "#FDBB84", "#FC8D59", "#E34A33", "#990000"], "#CBD5E1"),
          items: [
            { color: "#FEF0D9", label: "Mediana ≤ $30/m²" },
            { color: "#FDD49E", label: "Mediana $30–$50/m²" },
            { color: "#FDBB84", label: "Mediana $50–$100/m²" },
            { color: "#FC8D59", label: "Mediana $100–$175/m²" },
            { color: "#E34A33", label: "Mediana $175–$300/m²" },
            { color: "#990000", label: "Mediana > $300/m²" }
          ]
        },
        "tipologia": {
          label: "Opción 4 · Régimen Morfológico Territorial (TIPO_SUELO)",
          expr: [
            "match",
            ["get", "TIPO_SUELO"],
            "URBANO_CONSOLIDADO", "#B91C1C",
            "PERIURBANO_TRANSICION", "#F59E0B",
            "RURAL_RESERVA", "#0F766E",
            "#CBD5E1"
          ],
          items: [
            { color: "#B91C1C", label: "Urbano Consolidado (2,215 celdas · Media $187.3/m²)" },
            { color: "#F59E0B", label: "Periurbano en Transición (1,571 celdas · Media $74.4/m²)" },
            { color: "#0F766E", label: "Rural / Reserva Ambiental (20,506 celdas · Media $33.4/m²)" }
          ]
        },
        "edificacion": {
          label: "Opción 5 · Intensidad de Huella Construida a 10 m (PCT_EDIF %)",
          expr: makeNumericStepZeroOkExpr("PCT_EDIF", [5, 20, 45, 75], ["#F1F5F9", "#BAE6FD", "#38BDF8", "#0284C7", "#1E3A8A"], "#F1F5F9"),
          items: [
            { color: "#F1F5F9", label: "Sin urbanizar (< 5%)" },
            { color: "#BAE6FD", label: "Disperso (5%–20%)" },
            { color: "#38BDF8", label: "Periurbano (20%–45%)" },
            { color: "#0284C7", label: "Consolidado (45%–75%)" },
            { color: "#1E3A8A", label: "Alta compacidad (> 75%)" }
          ]
        },
        "incertidumbre": {
          label: "Opción 6 · Heterogeneidad Intra-Celda (Desviación Estándar VAL_STD_M2)",
          expr: makeNumericStepZeroOkExpr("VAL_STD_M2", [4, 7, 15, 30], ["#F8FAFC", "#DDD6FE", "#A78BFA", "#7C3AED", "#4C1D95"], "#F8FAFC"),
          items: [
            { color: "#F8FAFC", label: "Muy homogénea (≤ $4/m²)" },
            { color: "#DDD6FE", label: "Baja dispersión ($4–$7/m²)" },
            { color: "#A78BFA", label: "Transición ($7–$15/m²)" },
            { color: "#7C3AED", label: "Gradiente marcado ($15–$30/m²)" },
            { color: "#4C1D95", label: "Borde de alto contraste (> $30/m²)" }
          ]
        }
      },
      "auto_gee_upd_425": {
        "homologated": {
          label: "Opción 1 · Valor Integrado 2025 sin Vacíos (425 UPDs · VAL_FIN_M2)",
          expr: makeNumericStepExpr("VAL_FIN_M2", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#CBD5E1"),
          items: [
            { color: "#FEF0D9", label: "Bajo (≤ $50/m² · 177 UPD)" },
            { color: "#FDCC8A", label: "Medio-Bajo ($50–$100/m² · 91 UPD)" },
            { color: "#FC8D59", label: "Medio ($100–$175/m² · 67 UPD)" },
            { color: "#E34A33", label: "Medio-Alto ($175–$300/m² · 53 UPD)" },
            { color: "#B30000", label: "Alto (> $300/m² · 37 UPD)" }
          ]
        },
        "origen": {
          label: "Opción 2 · Cobertura Empírica vs. Imputación Satelital GEE (ORIGEN_FIN)",
          expr: [
            "match",
            ["get", "ORIGEN_FIN"],
            "OBSERVADO", "#0F766E",
            "IMPUTADO_MODELO_GEE", "#F59E0B",
            "#94A3B8"
          ],
          items: [
            { color: "#0F766E", label: "Observado / Calibrado 2025 (281 UPD · 66.1%)" },
            { color: "#F59E0B", label: "Imputado por Modelo GEE (144 UPD · 33.9% · 57,648 ha)" }
          ]
        },
        "modelo_puro": {
          label: "Opción 3 · Predicción Satelital Pura GEE en las 425 UPDs (VAL_MOD_M2)",
          expr: makeNumericStepExpr("VAL_MOD_M2", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#CBD5E1"),
          items: [
            { color: "#FEF0D9", label: "Modelo ≤ $50/m²" },
            { color: "#FDCC8A", label: "Modelo $50–$100/m²" },
            { color: "#FC8D59", label: "Modelo $100–$175/m²" },
            { color: "#E34A33", label: "Modelo $175–$300/m²" },
            { color: "#B30000", label: "Modelo > $300/m²" }
          ]
        },
        "quantiles": {
          label: "Opción 4 · Quintiles de las 425 UPDs Completas (P20, P40, P60, P80)",
          expr: makeNumericStepExpr("VAL_FIN_M2", [26.37, 48.67, 89.40, 189.98], ["#FDE725", "#5EC962", "#21918C", "#3B528B", "#440154"], "#CBD5E1"),
          items: [
            { color: "#FDE725", label: "Q1 (≤ $26.37/m² · 85 UPD)" },
            { color: "#5EC962", label: "Q2 ($26.38–$48.67/m² · 85 UPD)" },
            { color: "#21918C", label: "Q3 ($48.68–$89.40/m² · 85 UPD)" },
            { color: "#3B528B", label: "Q4 ($89.41–$189.98/m² · 85 UPD)" },
            { color: "#440154", label: "Q5 (> $189.98/m² · 85 UPD)" }
          ]
        }
      },
      "auto_gee_pixel_20m": {
        "urbano_desarrollable": {
          label: "Opción 1 · Superficie Píxel 20 m — Suelo Urbano y Desarrollable (Pendiente < 35°)",
          expr: "#E34A33",
          items: [
            { color: "#FEF0D9", label: "≤ $30/m² (Reserva / Rural)" },
            { color: "#FDD49E", label: "$30–$50/m² (Periurbano)" },
            { color: "#FDBB84", label: "$50–$100/m² (Transición)" },
            { color: "#FC8D59", label: "$100–$175/m² (Urbano Medio)" },
            { color: "#E34A33", label: "$175–$300/m² (Urbano Alto)" },
            { color: "#B30000", label: "$300–$420/m² (Ejes Centrales)" },
            { color: "#67001F", label: "> $420/m² (Máx. $471.13/m²)" }
          ]
        },
        "potencial_continuo": {
          label: "Opción 2 · Superficie Píxel 20 m — Potencial Continuo Completo (Sin máscara topográfica)",
          expr: "#E34A33",
          items: [
            { color: "#FEF0D9", label: "≤ $30/m² (Fondo montañoso/rural)" },
            { color: "#FDD49E", label: "$30–$50/m²" },
            { color: "#FDBB84", label: "$50–$100/m²" },
            { color: "#FC8D59", label: "$100–$175/m²" },
            { color: "#E34A33", label: "$175–$300/m²" },
            { color: "#B30000", label: "$300–$420/m²" },
            { color: "#67001F", label: "> $420/m² (Nodos Prime)" }
          ]
        }
      },
      "auto_lisa_2025": {
        "homologated": {
          label: "Opción 1 · Escala Homologada Comparable (5 rangos fijos USD)",
          expr: makeNumericStepExpr("promedio_2025", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#CBD5E1"),
          items: [
            { color: "#FEF0D9", label: "Bajo (≤ $50 · 79 UPD)" },
            { color: "#FDCC8A", label: "Medio-Bajo ($50–$100 · 55 UPD)" },
            { color: "#FC8D59", label: "Medio ($100–$175 · 53 UPD)" },
            { color: "#E34A33", label: "Medio-Alto ($175–$300 · 42 UPD)" },
            { color: "#B30000", label: "Alto (> $300 · 36 UPD)" }
          ]
        },
        "quantiles": {
          label: "Opción 2 · Quintiles de Mercado 2025 (P20, P40, P60, P80 · 53 UPD/clase)",
          expr: makeNumericStepExpr("promedio_2025", [29.61, 72.71, 125.41, 238.27], ["#FDE725", "#5EC962", "#21918C", "#3B528B", "#440154"], "#CBD5E1"),
          items: [
            { color: "#FDE725", label: "Q1 (≤ $29.61)" },
            { color: "#5EC962", label: "Q2 ($29.62–$72.71)" },
            { color: "#21918C", label: "Q3 ($72.72–$125.41)" },
            { color: "#3B528B", label: "Q4 ($125.42–$238.27)" },
            { color: "#440154", label: "Q5 (> $238.27 hasta $677.30)" }
          ]
        },
        "jenks": {
          label: "Opción 3 · Rupturas Naturales (Jenks 5 clases · promedio_2025)",
          expr: makeNumericStepExpr("promedio_2025", [43.15, 101.84, 186.49, 328.02], ["#FCFBFD", "#BCBDDC", "#807DBA", "#54278F", "#2D004B"], "#CBD5E1"),
          items: [
            { color: "#FCFBFD", label: "$0.64 – $43.15" },
            { color: "#BCBDDC", label: "$43.16 – $101.84" },
            { color: "#807DBA", label: "$101.85 – $186.49" },
            { color: "#54278F", label: "$186.50 – $328.02" },
            { color: "#2D004B", label: "$328.03 – $677.30" }
          ]
        },
        "lisa_quadrants": {
          label: "Opción 4 · Cuadrantes de Autocorrelación Espacial LISA (cuadrante_)",
          expr: [
            "match",
            ["get", "cuadrante_"],
            "Alto-Alto", "#D7191C",
            "Bajo-Bajo", "#2C7BB6",
            "Bajo-Alto", "#ABD9E9",
            "Alto-Bajo", "#FDAE61",
            "#CBD5E1"
          ],
          items: [
            { color: "#D7191C", label: "Alto-Alto · Hotspot (122 UPD)" },
            { color: "#2C7BB6", label: "Bajo-Bajo · Coldspot (78 UPD)" },
            { color: "#ABD9E9", label: "Bajo-Alto · Isla menor valor (33 UPD)" },
            { color: "#FDAE61", label: "Alto-Bajo · Polo aislado (32 UPD)" }
          ]
        },
        "lisa_sig": {
          label: "Opción 5 · Clusters LISA Estadísticamente Significativos (p_perm_loc ≤ 0.05)",
          expr: [
            "match",
            ["get", "cluster_p05"],
            "Cluster Alto-Alto (p≤0.05)", "#B91C1C",
            "Cluster Bajo-Bajo (p≤0.05)", "#1D4ED8",
            "Cluster Bajo-Alto (p≤0.05)", "#0284C7",
            "Cluster Alto-Bajo (p≤0.05)", "#EA580C",
            "#E2E8F0"
          ],
          items: [
            { color: "#B91C1C", label: "Hotspot Alto-Alto p≤0.05 (35 UPD)" },
            { color: "#1D4ED8", label: "Coldspot Bajo-Bajo p≤0.05 (24 UPD)" },
            { color: "#0284C7", label: "Atípico Bajo-Alto p≤0.05 (1 UPD)" },
            { color: "#E2E8F0", label: "No significativo p>0.05 (205 UPD)" }
          ]
        }
      },
      "auto_upd_2020_2026": {
        "homologated": {
          label: "Opción 1 · Escala Homologada Comparable (5 rangos fijos USD · P2_PROM)",
          expr: makeNumericStepExpr("P2_PROM", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#E2E8F0"),
          items: [
            { color: "#FEF0D9", label: "Bajo (≤ $50 · 27 UPD)" },
            { color: "#FDCC8A", label: "Medio-Bajo ($50–$100 · 36 UPD)" },
            { color: "#FC8D59", label: "Medio ($100–$175 · 44 UPD)" },
            { color: "#E34A33", label: "Medio-Alto ($175–$300 · 26 UPD)" },
            { color: "#B30000", label: "Alto (> $300 · 12 UPD)" },
            { color: "#E2E8F0", label: "Sin trámites 2020–2026 (281 UPD)" }
          ]
        },
        "quantiles": {
          label: "Opción 2 · Quintiles 2020–2026 (P20, P40, P60, P80 · P2_PROM)",
          expr: makeNumericStepExpr("P2_PROM", [51.48, 89.01, 139.70, 193.30], ["#EFF3FF", "#BDD7E7", "#6BAED6", "#3182BD", "#08519C"], "#E2E8F0"),
          items: [
            { color: "#EFF3FF", label: "Q1 (≤ $51.48)" },
            { color: "#BDD7E7", label: "Q2 ($51.49–$89.01)" },
            { color: "#6BAED6", label: "Q3 ($89.02–$139.70)" },
            { color: "#3182BD", label: "Q4 ($139.71–$193.30)" },
            { color: "#08519C", label: "Q5 (> $193.30 hasta $709.32)" },
            { color: "#E2E8F0", label: "Sin datos (281 UPD)" }
          ]
        },
        "jenks": {
          label: "Opción 3 · Rupturas Naturales (Jenks 5 clases · P2_PROM)",
          expr: makeNumericStepExpr("P2_PROM", [59.10, 124.67, 219.42, 407.03], ["#EDF8E9", "#BAE4B3", "#74C476", "#31A354", "#006D2C"], "#E2E8F0"),
          items: [
            { color: "#EDF8E9", label: "$1.15 – $59.10" },
            { color: "#BAE4B3", label: "$59.11 – $124.67" },
            { color: "#74C476", label: "$124.68 – $219.42" },
            { color: "#31A354", label: "$219.43 – $407.03" },
            { color: "#006D2C", label: "$407.04 – $709.32" },
            { color: "#E2E8F0", label: "Sin datos (281 UPD)" }
          ]
        },
        "median": {
          label: "Opción 4 · Mediana Robusta 2020–2026 (P2_MED · resistente a atípicos)",
          expr: makeNumericStepExpr("P2_MED", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#E2E8F0"),
          items: [
            { color: "#FEF0D9", label: "Mediana ≤ $50" },
            { color: "#FDCC8A", label: "Mediana $50–$100" },
            { color: "#FC8D59", label: "Mediana $100–$175" },
            { color: "#E34A33", label: "Mediana $175–$300" },
            { color: "#B30000", label: "Mediana > $300" },
            { color: "#E2E8F0", label: "Sin datos (281 UPD)" }
          ]
        }
      },
      "auto_upd_2007_2019": {
        "homologated": {
          label: "Opción 1 · Escala Homologada Comparable (5 rangos fijos USD · P1_PROM)",
          expr: makeNumericStepExpr("P1_PROM", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#E2E8F0"),
          items: [
            { color: "#FEF0D9", label: "Bajo (≤ $50 · 55 UPD)" },
            { color: "#FDCC8A", label: "Medio-Bajo ($50–$100 · 37 UPD)" },
            { color: "#FC8D59", label: "Medio ($100–$175 · 41 UPD)" },
            { color: "#E34A33", label: "Medio-Alto ($175–$300 · 16 UPD)" },
            { color: "#B30000", label: "Alto (> $300 · 8 UPD)" },
            { color: "#E2E8F0", label: "Sin trámites 2007–2019 (269 UPD)" }
          ]
        },
        "quantiles": {
          label: "Opción 2 · Quintiles 2007–2019 (P20, P40, P60, P80 · P1_PROM)",
          expr: makeNumericStepExpr("P1_PROM", [32.51, 55.32, 104.38, 144.92], ["#EFF3FF", "#BDD7E7", "#6BAED6", "#3182BD", "#08519C"], "#E2E8F0"),
          items: [
            { color: "#EFF3FF", label: "Q1 (≤ $32.51)" },
            { color: "#BDD7E7", label: "Q2 ($32.52–$55.32)" },
            { color: "#6BAED6", label: "Q3 ($55.33–$104.38)" },
            { color: "#3182BD", label: "Q4 ($104.39–$144.92)" },
            { color: "#08519C", label: "Q5 (> $144.92)" },
            { color: "#E2E8F0", label: "Sin datos (269 UPD)" }
          ]
        },
        "jenks": {
          label: "Opción 3 · Rupturas Naturales con Control de Outliers (Jenks · P1_PROM)",
          expr: makeNumericStepExpr("P1_PROM", [35.72, 90.47, 186.16, 467.41], ["#EDF8E9", "#BAE4B3", "#74C476", "#31A354", "#006D2C"], "#E2E8F0"),
          items: [
            { color: "#EDF8E9", label: "$0.03 – $35.72" },
            { color: "#BAE4B3", label: "$35.73 – $90.47" },
            { color: "#74C476", label: "$90.48 – $186.16" },
            { color: "#31A354", label: "$186.17 – $467.41" },
            { color: "#006D2C", label: "> $467.41 (incluye 4 atípicos)" },
            { color: "#E2E8F0", label: "Sin datos (269 UPD)" }
          ]
        },
        "median": {
          label: "Opción 4 · Mediana Robusta 2007–2019 (P1_MED · corrige los 4 outliers >$7.000)",
          expr: makeNumericStepExpr("P1_MED", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#E2E8F0"),
          items: [
            { color: "#FEF0D9", label: "Mediana ≤ $50 (71 UPD)" },
            { color: "#FDCC8A", label: "Mediana $50–$100 (43 UPD)" },
            { color: "#FC8D59", label: "Mediana $100–$175 (36 UPD)" },
            { color: "#E34A33", label: "Mediana $175–$300 (4 UPD)" },
            { color: "#B30000", label: "Mediana > $300 (3 UPD)" },
            { color: "#E2E8F0", label: "Sin datos (269 UPD)" }
          ]
        }
      },
      "auto_upd_tendencia": {
        "diverging": {
          label: "Opción 1 · Categorías de Tendencia Interperíodo (TENDENCIA)",
          expr: [
            "match",
            ["get", "TENDENCIA"],
            "Aumento", "#16A34A",
            "Disminución", "#DC2626",
            "Solo 2020-2026", "#0284C7",
            "Solo 2007-2019", "#D97706",
            "#E2E8F0"
          ],
          items: [
            { color: "#16A34A", label: "Aumento 2020–26 vs 2007–19 (79 UPD)" },
            { color: "#DC2626", label: "Disminución (37 UPD)" },
            { color: "#0284C7", label: "Nuevas zonas solo 2020–2026 (30 UPD)" },
            { color: "#D97706", label: "Registro solo 2007–2019 (41 UPD)" },
            { color: "#E2E8F0", label: "Sin datos (239 UPD)" }
          ]
        },
        "pct_var": {
          label: "Opción 2 · Tasa de Variación Porcentual Divergente (PCT_VAR %)",
          expr: [
            "case",
            ["all", ["has", "PCT_VAR"], ["!=", ["get", "PCT_VAR"], null]],
            [
              "step",
              ["to-number", ["get", "PCT_VAR"]],
              "#B91C1C",
              -20, "#FCA5A5",
              0, "#BBF7D0",
              50, "#22C55E",
              150, "#15803D"
            ],
            "#E2E8F0"
          ],
          items: [
            { color: "#B91C1C", label: "Caída fuerte (≤ -20%)" },
            { color: "#FCA5A5", label: "Ajuste moderado (-20% a 0%)" },
            { color: "#BBF7D0", label: "Plusvalía moderada (0% a +50%)" },
            { color: "#22C55E", label: "Plusvalía alta (+50% a +150%)" },
            { color: "#15803D", label: "Plusvalía muy alta (> +150%)" },
            { color: "#E2E8F0", label: "Sin par comparable (310 UPD)" }
          ]
        }
      }
    };

    var AUTO_RIESGO_EXPR = [
      "match",
      ["to-string", ["coalesce", ["get", "nivel_riesgo"], ""]],
      "Muy Alto", "#DC2626",
      "Alto", "#F97316",
      "Medio", "#FACC15",
      "Bajo", "#16A34A",
      "#94A3B8"
    ];

    var AUTO_RIESGO_ITEMS = [
      { color: "#DC2626", label: "Muy Alto" },
      { color: "#F97316", label: "Alto" },
      { color: "#FACC15", label: "Medio" },
      { color: "#16A34A", label: "Bajo" }
    ];

    function buildCategoriesMatchExpr(attrName, categories, fallbackHex) {
      var arr = ["match", ["to-string", ["coalesce", ["get", attrName], ""]]];
      var seen = {};
      (categories || []).forEach(function (cat) {
        if (!cat) return;
        var k = String(cat.value);
        if (!seen[k]) {
          seen[k] = true;
          arr.push(k, cat.color || "#007F8B");
        }
      });
      arr.push(fallbackHex || "#94A3B8");
      return arr.length >= 5 ? arr : (fallbackHex || "#007F8B");
    }

    function parseExpressionLegendItems(expr) {
      if (!Array.isArray(expr) || !expr.length) return [];
      var op = expr[0];
      var out = [];
      if (op === "case" && Array.isArray(expr[2])) {
        return parseExpressionLegendItems(expr[2]);
      }
      if (op === "match" && expr.length >= 5) {
        for (var i = 2; i < expr.length - 1; i += 2) {
          var valLbl = Array.isArray(expr[i]) ? expr[i].join(", ") : String(expr[i]);
          var col = expr[i + 1];
          if (typeof col === "string" && col.charAt(0) === "#") {
            out.push({ color: col, label: valLbl });
          }
        }
      } else if (op === "step" && expr.length >= 5) {
        if (typeof expr[2] === "string" && expr[2].charAt(0) === "#") {
          out.push({ color: expr[2], label: "< " + expr[3] });
        }
        for (var j = 3; j < expr.length - 1; j += 2) {
          var brk = expr[j];
          var nextBrk = j + 2 < expr.length ? expr[j + 2] : null;
          var cHex = expr[j + 1];
          if (typeof cHex === "string" && cHex.charAt(0) === "#") {
            out.push({ color: cHex, label: nextBrk !== null ? (brk + " – " + nextBrk) : ("≥ " + brk) });
          }
        }
      } else if (op === "interpolate" && expr.length >= 7) {
        for (var m = 3; m < expr.length - 1; m += 2) {
          var stopVal = expr[m];
          var stopCol = expr[m + 1];
          if (typeof stopCol === "string" && stopCol.charAt(0) === "#") {
            out.push({ color: stopCol, label: String(stopVal) });
          }
        }
      }
      return out;
    }

    function resolveThematicFillExpr(colorSpec, schemeKey, styleOpts) {
      var opts = styleOpts || {};
      if (typeof colorSpec === "string" && THEMATIC_SCHEMES[colorSpec]) {
        var group = THEMATIC_SCHEMES[colorSpec];
        var chosen = (schemeKey && group[schemeKey]) || group[Object.keys(group)[0]];
        return chosen ? chosen.expr : "#007F8B";
      }
      if (colorSpec === "auto_riesgo") {
        return AUTO_RIESGO_EXPR;
      }
      if (Array.isArray(opts.fill_color_expression)) {
        return opts.fill_color_expression;
      }
      if (Array.isArray(colorSpec)) {
        return colorSpec;
      }
      var catAttr = opts.fill_color_attribute || opts.fill_color_property;
      if (catAttr && Array.isArray(opts.fill_color_categories) && opts.fill_color_categories.length) {
        var fb = opts.fill_color_fallback || (typeof colorSpec === "string" && colorSpec.charAt(0) === "#" ? colorSpec : "#94A3B8");
        return buildCategoriesMatchExpr(catAttr, opts.fill_color_categories, fb);
      }
      return colorSpec || "#007F8B";
    }

    function resolveThematicStrokeExpr(strokeSpec, styleOpts) {
      var opts = styleOpts || {};
      if (Array.isArray(opts.stroke_color_expression)) {
        return opts.stroke_color_expression;
      }
      if (strokeSpec === "auto_riesgo") {
        return AUTO_RIESGO_EXPR;
      }
      if (Array.isArray(strokeSpec)) {
        return strokeSpec;
      }
      return strokeSpec || "#14283F";
    }

    function extractLayerLegendMeta(lyr) {
      var styleOpts = (lyr && lyr.style) || {};
      var fillColor = styleOpts.fill_color;
      var strokeColor = styleOpts.stroke_color || "#14283F";
      if (typeof fillColor === "string" && THEMATIC_SCHEMES[fillColor]) {
        var group = THEMATIC_SCHEMES[fillColor];
        var curScheme = styleOpts.active_scheme || styleOpts.default_scheme || Object.keys(group)[0];
        var schemeObj = group[curScheme] || group[Object.keys(group)[0]];
        if (schemeObj) {
          var parts = schemeObj.label.split("·");
          return {
            badge: parts.length > 1 ? parts[0].trim() : "Opción",
            subtitle: parts[1] ? parts.slice(1).join("·").trim() : schemeObj.label,
            items: schemeObj.items || []
          };
        }
      }
      if (Array.isArray(styleOpts.fill_color_categories) && styleOpts.fill_color_categories.length) {
        return {
          badge: lyr.format === "xyz_or_cog" ? "Clases ráster" : "Categorías",
          subtitle: styleOpts.legend_subtitle || "",
          items: styleOpts.fill_color_categories.map(function (c) {
            return { color: c.color || "#007F8B", label: String(c.label !== undefined ? c.label : c.value) };
          })
        };
      }
      if (Array.isArray(styleOpts.legend) && styleOpts.legend.length) {
        return {
          badge: "Escala temática",
          subtitle: "",
          items: styleOpts.legend.map(function (c) {
            return { color: c.color || "#007F8B", label: String(c.label || c.value || "") };
          })
        };
      }
      if (fillColor === "auto_riesgo" || strokeColor === "auto_riesgo") {
        return { badge: "Nivel de riesgo", subtitle: "Clasificación de amenaza/exposición", items: AUTO_RIESGO_ITEMS };
      }
      var exprItems = parseExpressionLegendItems(styleOpts.fill_color_expression || fillColor || styleOpts.stroke_color_expression);
      if (exprItems.length) {
        return { badge: "Escala continua", subtitle: "", items: exprItems };
      }
      if (lyr.format === "xyz_or_cog" || lyr.format === "image_overlay") {
        return {
          badge: "Ráster georreferenciado",
          subtitle: "",
          items: [{ color: typeof fillColor === "string" && fillColor.charAt(0) === "#" ? fillColor : "#0EA5E9", label: lyr.title }]
        };
      }
      if (styleOpts.fill_opacity === 0 || styleOpts.interactive_fill === false) {
        return {
          badge: "Límite",
          subtitle: "",
          items: [{ color: typeof strokeColor === "string" ? strokeColor : "#14283F", label: "Límite territorial / referencia", isOutline: true }]
        };
      }
      return {
        badge: "Vectorial",
        subtitle: "",
        items: [{ color: typeof fillColor === "string" ? fillColor : "#007F8B", label: lyr.title }]
      };
    }

    function populateSwatchesBoxDom(containerEl, items) {
      if (!containerEl || !Array.isArray(items) || !items.length) return;
      containerEl.innerHTML = "";
      items.forEach(function (it) {
        var chip = document.createElement("span");
        chip.style.display = "inline-flex";
        chip.style.alignItems = "center";
        chip.style.gap = "0.28rem";
        chip.style.fontSize = "0.71rem";
        chip.style.padding = "0.12rem 0.38rem";
        chip.style.background = "#FFFFFF";
        chip.style.border = "1px solid #CBD5E1";
        chip.style.borderRadius = "4px";
        var sw = document.createElement("span");
        sw.style.display = "inline-block";
        sw.style.width = "10px";
        sw.style.height = "10px";
        sw.style.borderRadius = "2px";
        if (it.isOutline) {
          sw.style.background = "transparent";
          sw.style.border = "2px solid " + (it.color || "#14283F");
        } else {
          sw.style.background = it.color || "#007F8B";
          sw.style.border = "1px solid rgba(15,23,42,0.25)";
        }
        var txt = document.createElement("span");
        txt.textContent = it.label;
        chip.appendChild(sw);
        chip.appendChild(txt);
        containerEl.appendChild(chip);
      });
    }

    function renderLegendSwatchesDom(containerEl, colorSpec, schemeKey, lyrObj) {
      if (!containerEl) return;
      if (typeof colorSpec === "string" && THEMATIC_SCHEMES[colorSpec]) {
        var group = THEMATIC_SCHEMES[colorSpec];
        var chosen = (schemeKey && group[schemeKey]) || group[Object.keys(group)[0]];
        if (chosen && Array.isArray(chosen.items)) {
          populateSwatchesBoxDom(containerEl, chosen.items);
        }
        return;
      }
      if (lyrObj) {
        var meta = extractLayerLegendMeta(lyrObj);
        populateSwatchesBoxDom(containerEl, meta.items);
      }
    }

    function setLayerThematicScheme(layerId, newScheme) {
      var lyr = (cfg.layers || []).find(function (l) { return l.id === layerId; });
      if (!lyr) return;
      var styleOpts = lyr.style || {};
      var fillColor = styleOpts.fill_color;
      if (!THEMATIC_SCHEMES[fillColor]) return;

      styleOpts.active_scheme = newScheme;
      if (lyr.style) lyr.style.active_scheme = newScheme;

      var schemeSelect = document.querySelector('[data-layer-scheme="' + layerId + '"]');
      if (schemeSelect && schemeSelect.value !== newScheme) {
        schemeSelect.value = newScheme;
      }

      var pillBox = document.querySelector('[data-pill-layer="' + layerId + '"]');
      if (pillBox) {
        var pills = pillBox.querySelectorAll(".gv-scheme-pill");
        pills.forEach(function (p) {
          if (p.getAttribute("data-scheme-val") === newScheme) {
            p.classList.add("is-active");
          } else {
            p.classList.remove("is-active");
          }
        });
      }

      var swatchBox = document.querySelector('[data-layer-swatches="' + layerId + '"]');
      if (swatchBox) {
        renderLegendSwatchesDom(swatchBox, fillColor, newScheme);
      }

      if (lyr.format === "image_overlay" && mapInstance && mapInstance.getSource("src-" + layerId)) {
        var targetRel = (newScheme === "potencial_continuo" && lyr.alt_source_path) ? lyr.alt_source_path : lyr.source_path;
        var resolvedImg = /^https?:\/\//i.test(targetRel)
          ? targetRel
          : new URL(targetRel, window.location.origin + baseUrl).href;
        var bds = Array.isArray(lyr.bounds) && lyr.bounds.length === 4 ? lyr.bounds : null;
        var srcObj = mapInstance.getSource("src-" + layerId);
        if (srcObj && typeof srcObj.updateImage === "function" && bds) {
          srcObj.updateImage({
            url: resolvedImg,
            coordinates: [
              [bds[0], bds[3]],
              [bds[2], bds[3]],
              [bds[2], bds[1]],
              [bds[0], bds[1]]
            ]
          });
        }
      } else if (mapInstance && mapInstance.getLayer(layerId + "-fill")) {
        mapInstance.setPaintProperty(layerId + "-fill", "fill-color", resolveThematicFillExpr(fillColor, newScheme));
      }

      updateFloatingMapLegend();
    }

    function updateFloatingMapLegend() {
      var legendBody = document.getElementById("gv-legend-body");
      if (!legendBody) return;
      var activeHtml = [];

      (cfg.layers || []).forEach(function (lyr) {
        if (!lyr.source_path) return;
        var chk = document.querySelector('[data-layer-toggle="' + lyr.id + '"]');
        var isVisible = chk ? chk.checked : (lyr.style && lyr.style.visible_by_default !== false);
        if (!isVisible) return;

        var meta = extractLayerLegendMeta(lyr);
        var swatchesHtml = (meta.items || []).map(function (it) {
          var boxStyle = it.isOutline
            ? ('background:transparent;border:2px solid ' + (it.color || '#14283F') + ';')
            : ('background:' + (it.color || '#007F8B') + ';');
          return '<div class="gv-legend-chip">' +
            '<span class="gv-legend-color-box" style="' + boxStyle + '"></span>' +
            '<span class="gv-legend-chip-label">' + it.label + '</span>' +
          '</div>';
        }).join("");

        activeHtml.push(
          '<div class="gv-legend-layer-card">' +
            '<div class="gv-legend-layer-head">' +
              '<span class="gv-legend-layer-name">' + lyr.title + '</span>' +
              '<span class="gv-legend-scheme-badge">' + (meta.badge || "Capa") + '</span>' +
            '</div>' +
            (meta.subtitle ? '<div style="font-size:0.69rem;color:#475569;margin-bottom:0.25rem;">' + meta.subtitle + '</div>' : '') +
            '<div class="gv-legend-swatches-grid">' + swatchesHtml + '</div>' +
          '</div>'
        );
      });

      if (activeHtml.length === 0) {
        legendBody.innerHTML = '<div style="font-size:0.73rem;color:var(--c-text-muted);font-style:italic;padding:0.25rem 0;">No hay capas temáticas activas. Activa una capa en el panel izquierdo para ver su simbología.</div>';
      } else {
        legendBody.innerHTML = activeHtml.join("");
      }
    }

    var SCENARIO_DEFS = {
      "gee-malla-250m": {
        activeLayers: ["sv-amss-gee-malla-250m"],
        schemes: { "sv-amss-gee-malla-250m": "homologated" }
      },
      "gee-malla-tipologia": {
        activeLayers: ["sv-amss-gee-malla-250m"],
        schemes: { "sv-amss-gee-malla-250m": "tipologia" }
      },
      "gee-upd-425": {
        activeLayers: ["sv-amss-gee-upd-425"],
        schemes: { "sv-amss-gee-upd-425": "homologated" }
      },
      "gee-pixel-20m": {
        activeLayers: ["sv-amss-gee-pixel-20m"],
        schemes: { "sv-amss-gee-pixel-20m": "urbano_desarrollable" }
      },
      "mercado-2025-homol": {
        activeLayers: ["sv-amss-lisa-precios-2025"],
        schemes: { "sv-amss-lisa-precios-2025": "homologated" }
      },
      "mercado-2025-lisa": {
        activeLayers: ["sv-amss-lisa-precios-2025"],
        schemes: { "sv-amss-lisa-precios-2025": "lisa_sig" }
      },
      "opamss-p2-homol": {
        activeLayers: ["sv-amss-upd-2020-2026"],
        schemes: { "sv-amss-upd-2020-2026": "homologated" }
      },
      "opamss-p1-homol": {
        activeLayers: ["sv-amss-upd-2007-2019"],
        schemes: { "sv-amss-upd-2007-2019": "homologated" }
      },
      "opamss-tendencia": {
        activeLayers: ["sv-amss-upd-tendencia"],
        schemes: { "sv-amss-upd-tendencia": "diverging" }
      }
    };

    function applyScenario(scenarioKey) {
      var def = SCENARIO_DEFS[scenarioKey];
      if (!def) return;

      var scenarioBtns = document.querySelectorAll(".gv-scenario-btn");
      scenarioBtns.forEach(function (btn) {
        if (btn.getAttribute("data-gv-scenario") === scenarioKey) {
          btn.classList.add("is-active", "btn-primary");
          btn.classList.remove("btn-outline");
        } else {
          btn.classList.remove("is-active", "btn-primary");
          btn.classList.add("btn-outline");
        }
      });

      var soilLayerIds = [
        "sv-amss-gee-malla-250m",
        "sv-amss-gee-upd-425",
        "sv-amss-gee-pixel-20m",
        "sv-amss-lisa-precios-2025",
        "sv-amss-upd-2020-2026",
        "sv-amss-upd-2007-2019",
        "sv-amss-upd-tendencia"
      ];

      soilLayerIds.forEach(function (lid) {
        var shouldShow = def.activeLayers.indexOf(lid) !== -1;
        var chk = document.querySelector('[data-layer-toggle="' + lid + '"]');
        if (chk) {
          chk.setAttribute("data-user-modified", "true");
          chk.checked = shouldShow;
        }
        if (mapInstance) {
          var vis = shouldShow ? "visible" : "none";
          ["-fill", "-line", "-pt", "-raster"].forEach(function (suf) {
            if (mapInstance.getLayer(lid + suf)) {
              mapInstance.setLayoutProperty(lid + suf, "visibility", vis);
            }
          });
        }
        if (def.schemes && def.schemes[lid]) {
          setLayerThematicScheme(lid, def.schemes[lid]);
        }
      });

      updateFloatingMapLegend();
    }

    function renderGeoJsonSourceLayers(srcId, prefixId, dataOrUrl, fillColor, fillOpacity, strokeColor, strokeWidth, badgeLabel, layerTitle, styleOpts) {
      var opts = styleOpts || {};
      var chkEl = document.querySelector('[data-layer-toggle="' + prefixId + '"]');
      var initVis = chkEl ? (chkEl.checked ? "visible" : "none") : (opts.visible_by_default === false ? "none" : "visible");
      var effectiveFill = resolveThematicFillExpr(fillColor, opts.active_scheme || opts.default_scheme, opts);
      var effectiveStroke = resolveThematicStrokeExpr(strokeColor, opts);
      if (mapInstance.getLayer(prefixId + "-fill")) mapInstance.removeLayer(prefixId + "-fill");
      if (mapInstance.getLayer(prefixId + "-line")) mapInstance.removeLayer(prefixId + "-line");
      if (mapInstance.getLayer(prefixId + "-pt")) mapInstance.removeLayer(prefixId + "-pt");
      if (mapInstance.getSource(srcId)) mapInstance.removeSource(srcId);

      var isBoundary = opts.interactive_fill === false;
      var beforeLayerId = findReferenceOverlayLayerId(isBoundary);
      var linePaint = strokeWidth <= 0.35
        ? {
            "line-color": effectiveStroke,
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.04, 11.5, 0.14, 13.5, 0.35, 16, 0.85],
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.18, 12, 0.38, 15, 0.65]
          }
        : { "line-color": effectiveStroke, "line-width": strokeWidth };
      if (Array.isArray(opts.line_dasharray) && opts.line_dasharray.length >= 2) {
        linePaint["line-dasharray"] = opts.line_dasharray;
      }

      mapInstance.addSource(srcId, { type: "geojson", data: dataOrUrl });
      mapInstance.addLayer({
        id: prefixId + "-fill",
        type: "fill",
        source: srcId,
        filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
        layout: { visibility: initVis },
        paint: { "fill-color": effectiveFill, "fill-opacity": fillOpacity }
      }, beforeLayerId);
      mapInstance.addLayer({
        id: prefixId + "-line",
        type: "line",
        source: srcId,
        layout: { visibility: initVis },
        paint: linePaint
      }, beforeLayerId);
      mapInstance.addLayer({
        id: prefixId + "-pt",
        type: "circle",
        source: srcId,
        filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
        layout: { visibility: initVis },
        paint: {
          "circle-radius": opts.circle_radius || 6,
          "circle-color": effectiveFill,
          "circle-stroke-color": typeof effectiveStroke === "string" ? effectiveStroke : "#14283F",
          "circle-stroke-width": 1.8
        }
      }, beforeLayerId);

      if (fillOpacity > 0.01 && opts.interactive_fill !== false) {
        attachFeatureClickPopup(prefixId + "-fill", badgeLabel, layerTitle);
      }
      if (strokeWidth > 1.2 && fillOpacity <= 0.01 && opts.interactive_fill !== false) {
        attachFeatureClickPopup(prefixId + "-line", badgeLabel, layerTitle);
      }
      attachFeatureClickPopup(prefixId + "-pt", badgeLabel, layerTitle);
    }

    function wireThematicControlsForLayer(lyr, fillColor, styleOpts) {
      var swatchBox = document.querySelector('[data-layer-swatches="' + lyr.id + '"]');
      if (typeof fillColor !== "string" || !THEMATIC_SCHEMES[fillColor]) {
        renderLegendSwatchesDom(swatchBox, fillColor, null, lyr);
        return;
      }
      var schemeSelect = document.querySelector('[data-layer-scheme="' + lyr.id + '"]');
      var initScheme = (styleOpts.active_scheme || styleOpts.default_scheme || Object.keys(THEMATIC_SCHEMES[fillColor])[0]);
      renderLegendSwatchesDom(swatchBox, fillColor, initScheme, lyr);
      if (schemeSelect) {
        schemeSelect.value = initScheme;
        schemeSelect.onchange = function () {
          setLayerThematicScheme(lyr.id, schemeSelect.value);
        };
      }
      var pillBox = document.querySelector('[data-pill-layer="' + lyr.id + '"]');
      if (pillBox) {
        var pills = pillBox.querySelectorAll(".gv-scheme-pill");
        pills.forEach(function (pill) {
          if (pill.getAttribute("data-scheme-val") === initScheme) {
            pill.classList.add("is-active");
          } else {
            pill.classList.remove("is-active");
          }
          pill.onclick = function () {
            var sVal = pill.getAttribute("data-scheme-val");
            if (sVal) setLayerThematicScheme(lyr.id, sVal);
          };
        });
      }
    }

    function addActiveProjectLayers() {
      var layers = Array.isArray(cfg.layers) ? cfg.layers : [];
      var combinedBounds = null;

      layers.forEach(function (lyr) {
        if (!lyr.source_path) return;
        if (lyr.status !== "publicado" && lyr.status !== "en_revision") return;

        var srcId = "src-" + lyr.id;
        var resolvedSource = /^https?:\/\//i.test(lyr.source_path)
          ? lyr.source_path
          : new URL(lyr.source_path, window.location.origin + baseUrl).href;

        if (lyr.format === "geojson") {
          var fillColor = (lyr.style && lyr.style.fill_color) || "#007F8B";
          var fillOpacity = (lyr.style && lyr.style.fill_opacity) !== undefined ? lyr.style.fill_opacity : 0.22;
          var strokeColor = (lyr.style && lyr.style.stroke_color) || "#14283F";
          var strokeWidth = (lyr.style && lyr.style.stroke_width) !== undefined ? lyr.style.stroke_width : 2;
          var isVisibleByDefault = !(lyr.style && lyr.style.visible_by_default === false);
          var styleOpts = Object.assign({}, lyr.style || {});

          var mountGeoJson = function (gj) {
            if (!gj) return;
            loadedProjectGeoJsons[lyr.id] = gj;
            renderGeoJsonSourceLayers(
              srcId,
              lyr.id,
              gj,
              fillColor,
              fillOpacity,
              strokeColor,
              strokeWidth,
              "CAPA DEL PROYECTO · " + (lyr.status || "").toUpperCase(),
              lyr.title,
              styleOpts
            );
            if (!initialBoundsFitted && isVisibleByDefault) {
              var b = computeGeoJsonBounds(gj);
              if (b) {
                if (!combinedBounds) {
                  combinedBounds = [[b[0][0], b[0][1]], [b[1][0], b[1][1]]];
                } else {
                  combinedBounds[0][0] = Math.min(combinedBounds[0][0], b[0][0]);
                  combinedBounds[0][1] = Math.min(combinedBounds[0][1], b[0][1]);
                  combinedBounds[1][0] = Math.max(combinedBounds[1][0], b[1][0]);
                  combinedBounds[1][1] = Math.max(combinedBounds[1][1], b[1][1]);
                }
                mapInstance.fitBounds(combinedBounds, { padding: 42, maxZoom: 15.2, duration: 0 });
              }
            }
          };

          if (loadedProjectGeoJsons[lyr.id]) {
            mountGeoJson(loadedProjectGeoJsons[lyr.id]);
          } else {
            fetch(resolvedSource)
              .then(function (r) {
                return r.ok ? r.json() : null;
              })
              .then(mountGeoJson)
              .catch(function (err) {
                if (window.console && console.warn) console.warn("Error al cargar capa del geovisor:", lyr.id, err);
              });
          }

          var chk = document.querySelector('[data-layer-toggle="' + lyr.id + '"]');
          if (chk) {
            chk.disabled = false;
            if (!chk.hasAttribute("data-user-modified")) {
              chk.checked = isVisibleByDefault;
            }
            chk.onchange = function () {
              chk.setAttribute("data-user-modified", "true");
              var vis = chk.checked ? "visible" : "none";
              ["-fill", "-line", "-pt"].forEach(function (suf) {
                if (mapInstance.getLayer(lyr.id + suf)) {
                  mapInstance.setLayoutProperty(lyr.id + suf, "visibility", vis);
                }
              });
              updateFloatingMapLegend();
            };
          }
          var slider = document.querySelector('[data-layer-opacity="' + lyr.id + '"]');
          if (slider) {
            slider.disabled = false;
            slider.value = String(fillOpacity);
            slider.oninput = function () {
              var op = parseFloat(slider.value);
              if (mapInstance.getLayer(lyr.id + "-fill")) {
                mapInstance.setPaintProperty(lyr.id + "-fill", "fill-opacity", op);
              }
            };
          }

          wireThematicControlsForLayer(lyr, fillColor, styleOpts);
        } else if (lyr.format === "image_overlay" && Array.isArray(lyr.bounds) && lyr.bounds.length === 4) {
          var imgFillColor = (lyr.style && lyr.style.fill_color) || "auto_gee_pixel_20m";
          var imgOpacity = (lyr.style && lyr.style.fill_opacity) !== undefined ? lyr.style.fill_opacity : 0.85;
          var imgVisDefault = !(lyr.style && lyr.style.visible_by_default === false);
          var imgStyleOpts = Object.assign({}, lyr.style || {});
          var activeImgScheme = imgStyleOpts.active_scheme || imgStyleOpts.default_scheme || "urbano_desarrollable";
          var targetImgRel = (activeImgScheme === "potencial_continuo" && lyr.alt_source_path) ? lyr.alt_source_path : lyr.source_path;
          var resolvedImgUrl = /^https?:\/\//i.test(targetImgRel)
            ? targetImgRel
            : new URL(targetImgRel, window.location.origin + baseUrl).href;

          var chkImg = document.querySelector('[data-layer-toggle="' + lyr.id + '"]');
          if (chkImg) {
            chkImg.disabled = false;
            if (!chkImg.hasAttribute("data-user-modified")) {
              chkImg.checked = imgVisDefault;
            }
            chkImg.onchange = function () {
              chkImg.setAttribute("data-user-modified", "true");
              var vis = chkImg.checked ? "visible" : "none";
              if (mapInstance.getLayer(lyr.id + "-raster")) {
                mapInstance.setLayoutProperty(lyr.id + "-raster", "visibility", vis);
              }
              updateFloatingMapLegend();
            };
          }
          var initImgVis = chkImg ? (chkImg.checked ? "visible" : "none") : (imgVisDefault ? "visible" : "none");
          var b = lyr.bounds; // [west, south, east, north]
          var quad = [
            [b[0], b[3]],
            [b[2], b[3]],
            [b[2], b[1]],
            [b[0], b[1]]
          ];

          if (mapInstance.getLayer(lyr.id + "-raster")) mapInstance.removeLayer(lyr.id + "-raster");
          if (mapInstance.getSource(srcId)) mapInstance.removeSource(srcId);
          mapInstance.addSource(srcId, {
            type: "image",
            url: resolvedImgUrl,
            coordinates: quad
          });
          mapInstance.addLayer({
            id: lyr.id + "-raster",
            type: "raster",
            source: srcId,
            layout: { visibility: initImgVis },
            paint: { "raster-opacity": imgOpacity, "raster-resampling": "linear" }
          }, findReferenceOverlayLayerId(false));

          var sliderImg = document.querySelector('[data-layer-opacity="' + lyr.id + '"]');
          if (sliderImg) {
            sliderImg.disabled = false;
            sliderImg.value = String(imgOpacity);
            sliderImg.oninput = function () {
              var op = parseFloat(sliderImg.value);
              if (mapInstance.getLayer(lyr.id + "-raster")) {
                mapInstance.setPaintProperty(lyr.id + "-raster", "raster-opacity", op);
              }
            };
          }

          wireThematicControlsForLayer(lyr, imgFillColor, imgStyleOpts);
        } else if (
          lyr.format === "xyz_or_cog" &&
          lyr.preview_image_path &&
          ((Array.isArray(lyr.image_coordinates) && lyr.image_coordinates.length === 4) ||
            (Array.isArray(lyr.bounds) && lyr.bounds.length === 4))
        ) {
          var cogStyle = Object.assign({}, lyr.style || {});
          var cogOpacity = cogStyle.raster_opacity !== undefined
            ? cogStyle.raster_opacity
            : (cogStyle.fill_opacity !== undefined ? cogStyle.fill_opacity : 0.85);
          var cogVisDefault = !(cogStyle.visible_by_default === false);
          var resolvedCogPreview = /^https?:\/\//i.test(lyr.preview_image_path)
            ? lyr.preview_image_path
            : new URL(lyr.preview_image_path, window.location.origin + baseUrl).href;

          var chkCog = document.querySelector('[data-layer-toggle="' + lyr.id + '"]');
          if (chkCog) {
            chkCog.disabled = false;
            if (!chkCog.hasAttribute("data-user-modified")) {
              chkCog.checked = cogVisDefault;
            }
            chkCog.onchange = function () {
              chkCog.setAttribute("data-user-modified", "true");
              var vis = chkCog.checked ? "visible" : "none";
              if (mapInstance.getLayer(lyr.id + "-raster")) {
                mapInstance.setLayoutProperty(lyr.id + "-raster", "visibility", vis);
              }
              updateFloatingMapLegend();
            };
          }
          var initCogVis = chkCog ? (chkCog.checked ? "visible" : "none") : (cogVisDefault ? "visible" : "none");
          var cogQuad = Array.isArray(lyr.image_coordinates) && lyr.image_coordinates.length === 4
            ? lyr.image_coordinates
            : [
                [lyr.bounds[0], lyr.bounds[3]],
                [lyr.bounds[2], lyr.bounds[3]],
                [lyr.bounds[2], lyr.bounds[1]],
                [lyr.bounds[0], lyr.bounds[1]]
              ];

          if (mapInstance.getLayer(lyr.id + "-raster")) mapInstance.removeLayer(lyr.id + "-raster");
          if (mapInstance.getSource(srcId)) mapInstance.removeSource(srcId);
          mapInstance.addSource(srcId, {
            type: "image",
            url: resolvedCogPreview,
            coordinates: cogQuad
          });
          mapInstance.addLayer({
            id: lyr.id + "-raster",
            type: "raster",
            source: srcId,
            layout: { visibility: initCogVis },
            paint: { "raster-opacity": cogOpacity, "raster-resampling": "linear" }
          }, findReferenceOverlayLayerId(false));

          var sliderCog = document.querySelector('[data-layer-opacity="' + lyr.id + '"]');
          if (sliderCog) {
            sliderCog.disabled = false;
            sliderCog.value = String(cogOpacity);
            sliderCog.oninput = function () {
              var op = parseFloat(sliderCog.value);
              if (mapInstance.getLayer(lyr.id + "-raster")) {
                mapInstance.setPaintProperty(lyr.id + "-raster", "raster-opacity", op);
              }
            };
          }
          wireThematicControlsForLayer(lyr, cogStyle.fill_color, cogStyle);
        } else if (lyr.format === "xyz_or_cog" && resolvedSource.indexOf("{z}") !== -1) {
          mapInstance.addSource(srcId, { type: "raster", tiles: [resolvedSource], tileSize: 256 });
          mapInstance.addLayer({ id: lyr.id + "-raster", type: "raster", source: srcId, paint: { "raster-opacity": 0.8 } });
        }
      });

      // Re-renderizar capas cargadas dinámicamente desde geovisor/capas/
      Object.keys(dynamicFolderLayers).forEach(function (fname) {
        var entry = dynamicFolderLayers[fname];
        if (entry && entry.visible && entry.geojson) {
          var safeId = "folder-" + fname.replace(/[^a-zA-Z0-9_-]/g, "_");
          renderGeoJsonSourceLayers(
            "src-" + safeId,
            safeId,
            entry.geojson,
            entry.color,
            0.38,
            "#14283F",
            2.2,
            "CARPETA REPOSITORIO (geovisor/capas/)",
            fname
          );
        }
      });

      if (localGeoJsonCache) {
        renderGeoJsonSourceLayers(
          "local-preview-src",
          "local-preview",
          localGeoJsonCache,
          "#007F8B",
          0.42,
          "#14283F",
          2.2,
          "VISTA PREVIA LOCAL TEMPORAL",
          "Archivo local"
        );
      }

      if (projectPerimeterGeoJson) {
        var maskToggleEl = document.getElementById("gv-toggle-mask");
        var maskOpEl = document.getElementById("gv-mask-opacity");
        var maskEnabled = maskToggleEl ? maskToggleEl.checked : true;
        var maskOp = maskOpEl ? parseFloat(maskOpEl.value) : 0.88;
        applyStudyAreaMaskToMap(mapInstance, projectPerimeterGeoJson, maskEnabled, maskOp);
      }

      updateFloatingMapLegend();
    }

    var projectPerimeterGeoJson = null;

    if (mapInstance) {
      var perimCandidates = [];
      if (cfg.perimeter_path) perimCandidates.push(cfg.perimeter_path);
      perimCandidates.push("geovisor/capas/perimetro_zona_estudio.geojson");
      (cfg.layers || []).forEach(function (l) {
        if (!l || !l.source_path || l.format !== "geojson") return;
        if ((l.style && l.style.interactive_fill === false) || /(perimetro|area_estudio|municipio_one|conchagua_la_union)/i.test(l.source_path)) {
          if (perimCandidates.indexOf(l.source_path) === -1) perimCandidates.push(l.source_path);
        }
      });

      function tryFetchPerimeterAt(idx) {
        if (idx >= perimCandidates.length) return;
        var pUrl = /^https?:\/\//i.test(perimCandidates[idx])
          ? perimCandidates[idx]
          : new URL(perimCandidates[idx], window.location.origin + baseUrl).href;
        fetch(pUrl)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (perimGj) {
            if (perimGj && perimGj.type) {
              projectPerimeterGeoJson = perimGj;
              var maskToggleEl = document.getElementById("gv-toggle-mask");
              var maskOpEl = document.getElementById("gv-mask-opacity");
              var maskEnabled = maskToggleEl ? maskToggleEl.checked : true;
              var maskOp = maskOpEl ? parseFloat(maskOpEl.value) : 0.88;
              if (mapInstance.isStyleLoaded()) {
                applyStudyAreaMaskToMap(mapInstance, projectPerimeterGeoJson, maskEnabled, maskOp);
              }
            } else {
              tryFetchPerimeterAt(idx + 1);
            }
          })
          .catch(function () {
            tryFetchPerimeterAt(idx + 1);
          });
      }
      tryFetchPerimeterAt(0);

      var gvMaskToggle = document.getElementById("gv-toggle-mask");
      var gvMaskOpacity = document.getElementById("gv-mask-opacity");
      if (gvMaskToggle) {
        gvMaskToggle.addEventListener("change", function () {
          if (mapInstance.getLayer("study-area-mask-fill")) {
            mapInstance.setLayoutProperty("study-area-mask-fill", "visibility", gvMaskToggle.checked ? "visible" : "none");
          } else if (projectPerimeterGeoJson) {
            applyStudyAreaMaskToMap(mapInstance, projectPerimeterGeoJson, gvMaskToggle.checked, gvMaskOpacity ? parseFloat(gvMaskOpacity.value) : 0.88);
          }
        });
      }
      if (gvMaskOpacity) {
        gvMaskOpacity.addEventListener("input", function () {
          if (mapInstance.getLayer("study-area-mask-fill")) {
            mapInstance.setPaintProperty("study-area-mask-fill", "fill-opacity", parseFloat(gvMaskOpacity.value));
          }
        });
      }

      mapInstance.on("load", function () {
        addActiveProjectLayers();
        setTimeout(function () {
          initialBoundsFitted = true;
        }, 2500);
      });

      var basemapSelect = document.getElementById("gv-basemap-select");
      var basemapLegendEl = document.getElementById("gv-basemap-legend");
      var quickBasemapBtns = Array.prototype.slice.call(document.querySelectorAll("[data-basemap-quick]"));

      function applyBasemapKey(bmKey) {
        if (!bmKey || !BASEMAPS[bmKey]) return;
        if (basemapSelect && basemapSelect.value !== bmKey) {
          basemapSelect.value = bmKey;
        }
        quickBasemapBtns.forEach(function (btn) {
          var isMatch = btn.getAttribute("data-basemap-quick") === bmKey;
          btn.className = isMatch ? "btn btn-teal btn-xs" : "btn btn-outline btn-xs";
        });
        if (basemapLegendEl) {
          basemapLegendEl.textContent = BASEMAPS[bmKey].legend || BASEMAPS[bmKey].name || "";
        }
        resolveBasemapTiles(bmKey, function () {
          mapInstance.setStyle(makeStyle(bmKey));
          mapInstance.once("styledata", function () {
            addActiveProjectLayers();
          });
        });
      }

      if (basemapSelect) {
        basemapSelect.addEventListener("change", function () {
          applyBasemapKey(basemapSelect.value);
        });
      }
      quickBasemapBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          applyBasemapKey(btn.getAttribute("data-basemap-quick"));
        });
      });

      var scenarioBtns = document.querySelectorAll(".gv-scenario-btn");
      scenarioBtns.forEach(function (btn) {
        btn.onclick = function () {
          var scKey = btn.getAttribute("data-gv-scenario");
          if (scKey) applyScenario(scKey);
        };
      });

      var legendToggleBtn = document.getElementById("gv-legend-toggle");
      var floatingLegendEl = document.getElementById("gv-floating-legend");
      if (legendToggleBtn && floatingLegendEl) {
        legendToggleBtn.onclick = function () {
          var isCol = floatingLegendEl.classList.toggle("is-collapsed");
          legendToggleBtn.textContent = isCol ? "+" : "−";
          legendToggleBtn.title = isCol ? "Expandir leyenda" : "Minimizar leyenda";
        };
      }
    }

    // =======================================================================
    // Opción: CARGAR CAPA DESDE CARPETA DEL REPOSITORIO (geovisor/capas/)
    // =======================================================================
    var folderListEl = document.getElementById("gv-repo-folder-list");
    var folderStatusEl = document.getElementById("gv-repo-folder-status");
    var refreshFolderBtn = document.getElementById("gv-refresh-repo-folder");

    // Pre-identificar archivos que ya están cargados por defecto desde layers.json
    var preloadedFiles = {};
    (cfg.layers || []).forEach(function (lyr) {
      if (lyr.source_path && (lyr.status === "publicado" || lyr.status === "en_revision")) {
        var baseName = lyr.source_path.split("/").pop();
        if (baseName) preloadedFiles[baseName] = lyr.id;
      }
    });

    function loadLayerFromRepoFolder(fileObj, colorIndex, btnEl) {
      var fname = fileObj.name;
      var fmt = detectFormat(fname);
      var safeId = "folder-" + fname.replace(/[^a-zA-Z0-9_-]/g, "_");

      // Formatos de proyecto GeoLibre (.geolibre.json) -> ?url=
      if (fmt === "geolibre") {
        window.open("https://web.geolibre.app/?url=" + encodeURIComponent(fileObj.url), "_blank", "noopener");
        return;
      }
      // Formatos cloud-native avanzados (PMTiles, COG, FlatGeobuf, GeoParquet) -> ?data=
      if (fmt === "pmtiles" || fmt === "cog" || fmt === "flatgeobuf" || fmt === "geoparquet") {
        if (folderStatusEl) {
          folderStatusEl.textContent = "Abriendo capa " + fname + " (" + fmt.toUpperCase() + ") en GeoLibre Studio mediante ?data=...";
        }
        window.open("https://web.geolibre.app/?data=" + encodeURIComponent(fileObj.url), "_blank", "noopener");
        return;
      }

      if (!mapInstance) {
        window.open("https://web.geolibre.app/?data=" + encodeURIComponent(fileObj.url), "_blank", "noopener");
        return;
      }

      // Si ya estaba activa dinámicamente, alternar visibilidad (quitar)
      if (dynamicFolderLayers[fname] && dynamicFolderLayers[fname].visible) {
        dynamicFolderLayers[fname].visible = false;
        ["-fill", "-line", "-pt"].forEach(function (suf) {
          if (mapInstance.getLayer(safeId + suf)) mapInstance.removeLayer(safeId + suf);
        });
        if (mapInstance.getSource("src-" + safeId)) mapInstance.removeSource("src-" + safeId);
        btnEl.textContent = "Cargar en mapa";
        btnEl.className = "btn btn-teal btn-xs";
        return;
      }

      btnEl.disabled = true;
      btnEl.textContent = "Cargando...";

      fetch(fileObj.url)
        .then(function (resp) {
          if (!resp.ok) throw new Error("HTTP " + resp.status);
          return resp.text();
        })
        .then(function (rawText) {
          var gj = fmt === "kml" ? parseKmlToGeoJson(rawText) : JSON.parse(rawText);
          if (!gj || !gj.type) throw new Error("Estructura geoespacial inválida");
          var chosenColor = FOLDER_PALETTE[colorIndex % FOLDER_PALETTE.length];
          dynamicFolderLayers[fname] = { geojson: gj, color: chosenColor, visible: true };

          renderGeoJsonSourceLayers(
            "src-" + safeId,
            safeId,
            gj,
            chosenColor,
            0.38,
            "#14283F",
            2.2,
            "CARPETA REPOSITORIO (geovisor/capas/)",
            fname
          );
          var bbox = computeGeoJsonBounds(gj);
          if (bbox) {
            mapInstance.fitBounds(bbox, { padding: 48, maxZoom: 15.5 });
          }
          btnEl.disabled = false;
          btnEl.textContent = "Quitar del mapa";
          btnEl.className = "btn btn-outline btn-xs";
          if (folderStatusEl) {
            folderStatusEl.textContent = "Capa cargada desde carpeta del repositorio: " + fname;
          }
        })
        .catch(function (err) {
          btnEl.disabled = false;
          btnEl.textContent = "Reintentar";
          if (folderStatusEl) {
            folderStatusEl.textContent = "No se pudo leer " + fname + ": " + (err.message || "error");
          }
        });
    }

    function renderFolderItems(filesList, sourceLabel) {
      if (!folderListEl) return;
      folderListEl.innerHTML = "";
      if (folderStatusEl) {
        folderStatusEl.textContent = filesList.length
          ? filesList.length + " archivo(s) compatibles en geovisor/capas/ (" + sourceLabel + ")."
          : "La carpeta geovisor/capas/ de esta vista aún no tiene capas adicionales. Sube archivos .geojson, .kml, .tif (COG), .pmtiles, .fgb o .geolibre.json.";
      }

      filesList.forEach(function (fileObj, idx) {
        var item = document.createElement("div");
        item.className = "layer-item";

        var head = document.createElement("div");
        head.className = "layer-item-head";

        var titleEl = document.createElement("div");
        titleEl.className = "layer-item-title";
        titleEl.style.minWidth = "0";
        titleEl.style.overflowWrap = "anywhere";
        titleEl.textContent = fileObj.name;

        var badge = document.createElement("span");
        var fmt = detectFormat(fileObj.name);
        badge.className = "badge badge-declarado";
        badge.style.flexShrink = "0";
        badge.textContent = fmt.toUpperCase();

        head.appendChild(titleEl);
        head.appendChild(badge);
        item.appendChild(head);

        var meta = document.createElement("div");
        meta.className = "layer-item-meta";
        var sizeTxt = formatBytes(fileObj.size_bytes);
        var whereTxt =
          fmt === "geolibre"
            ? "Proyecto GeoLibre Studio (?url=)"
            : fmt === "geojson" || fmt === "kml"
              ? "Visor integrado (MapLibre) + GeoLibre Studio"
              : "GeoLibre Studio cloud-native (?data=)";
        meta.textContent = "Ruta: geovisor/capas/" + fileObj.name + (sizeTxt ? " · " + sizeTxt : "") + " · " + whereTxt;
        item.appendChild(meta);

        var actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.flexWrap = "wrap";
        actions.style.gap = "0.4rem";
        actions.style.marginTop = "0.5rem";

        var isCloudNativeOnly = fmt === "pmtiles" || fmt === "cog" || fmt === "flatgeobuf" || fmt === "geoparquet";

        if (preloadedFiles[fileObj.name] && !isCloudNativeOnly && fmt !== "geolibre") {
          var alreadyBadge = document.createElement("span");
          alreadyBadge.className = "badge badge-ok";
          alreadyBadge.textContent = "Activa en pestaña Capas";
          actions.appendChild(alreadyBadge);

          if (mapInstance) {
            var zoomBtn = document.createElement("button");
            zoomBtn.type = "button";
            zoomBtn.className = "btn btn-outline btn-xs";
            zoomBtn.textContent = "Encuadrar capa";
            zoomBtn.addEventListener("click", function () {
              fetch(fileObj.url)
                .then(function (r) { return r.json(); })
                .then(function (gj) {
                  var b = computeGeoJsonBounds(gj);
                  if (b) mapInstance.fitBounds(b, { padding: 45, maxZoom: 15.5 });
                });
            });
            actions.appendChild(zoomBtn);
          }
        } else {
          var loadBtn = document.createElement("button");
          loadBtn.type = "button";
          var isLoaded = dynamicFolderLayers[fileObj.name] && dynamicFolderLayers[fileObj.name].visible;
          loadBtn.className = isLoaded ? "btn btn-outline btn-xs" : "btn btn-teal btn-xs";
          loadBtn.textContent =
            fmt === "geolibre"
              ? "Abrir proyecto en GeoLibre Studio ↗"
              : isCloudNativeOnly
                ? "Abrir capa en GeoLibre Studio ↗"
                : isLoaded
                  ? "Quitar del mapa"
                  : "Cargar en mapa";
          loadBtn.addEventListener("click", function () {
            loadLayerFromRepoFolder(fileObj, idx, loadBtn);
          });
          actions.appendChild(loadBtn);
        }

        if (fmt !== "geolibre" && !isCloudNativeOnly) {
          var openInStudioLink = document.createElement("a");
          openInStudioLink.className = "btn btn-outline btn-xs";
          openInStudioLink.href = "https://web.geolibre.app/?data=" + encodeURIComponent(fileObj.url);
          openInStudioLink.target = "_blank";
          openInStudioLink.rel = "noopener noreferrer";
          openInStudioLink.textContent = "GeoLibre Studio ↗";
          actions.appendChild(openInStudioLink);
        }

        var dlLink = document.createElement("a");
        dlLink.className = "btn btn-outline btn-xs";
        dlLink.href = fileObj.url;
        dlLink.target = "_blank";
        dlLink.rel = "noopener noreferrer";
        dlLink.textContent = "Ver archivo ↗";
        actions.appendChild(dlLink);

        item.appendChild(actions);
        folderListEl.appendChild(item);
      });
    }

    function discoverRepositoryFolderLayers() {
      if (folderStatusEl) {
        folderStatusEl.textContent = "Consultando carpeta geovisor/capas/ de esta vista...";
      }
      var indexUrl = new URL("geovisor/capas/index.json", window.location.origin + baseUrl).href;
      var byName = {};

      var localPromise = fetch(indexUrl, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (idxDoc) {
          if (!idxDoc || !Array.isArray(idxDoc.files)) return;
          idxDoc.files.forEach(function (f) {
            if (!f.name || f.name === "index.json" || !GEOLIBRE_EXT_RE.test(f.name)) return;
            byName[f.name] = {
              name: f.name,
              size_bytes: f.size_bytes || null,
              url: new URL("geovisor/capas/" + encodeURIComponent(f.name), window.location.origin + baseUrl).href
            };
          });
        })
        .catch(function () {});

      // Consulta complementaria en vivo a la API pública de GitHub SOLO del repositorio efectivo de esta vista
      // (nunca mezcla con el repositorio canónico si se está viendo desde un fork o desde localhost).
      var ghPromise = Promise.resolve();
      var sourceUsed = isLocalhost ? "índice local de trabajo (localhost)" : "índice publicado de esta vista";
      if (repoSlug) {
        var ghApiUrl = "https://api.github.com/repos/" + repoSlug + "/contents/geovisor/capas?ref=" + encodeURIComponent(repoBranch);
        ghPromise = fetch(ghApiUrl, { headers: { Accept: "application/vnd.github+json" } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (entries) {
            if (!Array.isArray(entries)) return;
            sourceUsed = "repositorio de esta vista (" + repoSlug + ")";
            entries.forEach(function (ent) {
              if (!ent || ent.type !== "file" || !ent.name) return;
              if (ent.name === "index.json" || !GEOLIBRE_EXT_RE.test(ent.name)) return;
              if (!byName[ent.name]) {
                byName[ent.name] = {
                  name: ent.name,
                  size_bytes: ent.size || null,
                  url: ent.download_url || ("https://raw.githubusercontent.com/" + repoSlug + "/" + repoBranch + "/geovisor/capas/" + encodeURIComponent(ent.name))
                };
              }
            });
          })
          .catch(function () {});
      }

      Promise.all([localPromise, ghPromise]).then(function () {
        var list = Object.keys(byName)
          .sort()
          .map(function (k) { return byName[k]; });
        renderFolderItems(list, sourceUsed);
      });
    }

    if (refreshFolderBtn) {
      refreshFolderBtn.addEventListener("click", discoverRepositoryFolderLayers);
    }
    discoverRepositoryFolderLayers();

    // =======================================================================
    // Cargador de prueba desde equipo local (.geojson / .kml)
    // =======================================================================
    var fileInput = document.getElementById("gv-local-geojson-input");
    var dropzone = document.getElementById("gv-dropzone");
    var localStatus = document.getElementById("gv-local-status");
    var clearLocalBtn = document.getElementById("gv-clear-local");

    function handleLocalFile(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var raw = String(reader.result || "");
          var parsed = file.name.toLowerCase().endsWith(".kml") ? parseKmlToGeoJson(raw) : JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || !parsed.type) {
            throw new Error("El archivo no tiene estructura GeoJSON o KML válida.");
          }
          localGeoJsonCache = parsed;
          if (mapInstance) {
            renderGeoJsonSourceLayers(
              "local-preview-src",
              "local-preview",
              parsed,
              "#007F8B",
              0.42,
              "#14283F",
              2.2,
              "VISTA PREVIA LOCAL TEMPORAL",
              file.name
            );
            var bbox = computeGeoJsonBounds(parsed);
            if (bbox) {
              mapInstance.fitBounds(bbox, { padding: 48, maxZoom: 16 });
            }
          }
          var count = parsed.type === "FeatureCollection" && Array.isArray(parsed.features) ? parsed.features.length : 1;
          if (localStatus) {
            localStatus.textContent = "Capa temporal leída: " + file.name + " (" + count + " geometría(s)). Súbela a geovisor/capas/ en tu repositorio para compartirla.";
          }
          if (clearLocalBtn) clearLocalBtn.classList.remove("hidden");
        } catch (err) {
          if (localStatus) {
            localStatus.textContent = "Error al leer archivo: " + (err && err.message ? err.message : "formato inválido");
          }
        }
      };
      reader.readAsText(file, "utf-8");
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files[0]) handleLocalFile(fileInput.files[0]);
      });
    }
    if (dropzone && fileInput) {
      dropzone.addEventListener("click", function () { fileInput.click(); });
      dropzone.addEventListener("dragover", function (e) { e.preventDefault(); });
      dropzone.addEventListener("drop", function (e) {
        e.preventDefault();
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleLocalFile(e.dataTransfer.files[0]);
        }
      });
    }
    if (clearLocalBtn) {
      clearLocalBtn.addEventListener("click", function () {
        localGeoJsonCache = null;
        if (mapInstance) {
          ["local-preview-fill", "local-preview-line", "local-preview-pt"].forEach(function (lid) {
            if (mapInstance.getLayer(lid)) mapInstance.removeLayer(lid);
          });
          if (mapInstance.getSource("local-preview-src")) mapInstance.removeSource("local-preview-src");
        }
        clearLocalBtn.classList.add("hidden");
        if (localStatus) localStatus.textContent = "Vista previa local limpiada.";
      });
    }
  }

  // =========================================================================
  // B. Inicializador del Mapa Regional Referencial del Hub (index.html)
  // =========================================================================
  function initHubRegionalMap() {
    var dataScript = document.getElementById("hub-map-points");
    var container = document.getElementById("hub-regional-map");
    if (!dataScript || !container) return;

    var points;
    try {
      points = JSON.parse(dataScript.textContent || "[]");
    } catch (err) {
      return;
    }

    function renderHubFallback() {
      container.innerHTML = "";
      var box = document.createElement("div");
      box.className = "callout callout-warn";
      box.style.margin = "1rem";
      var h = document.createElement("strong");
      h.textContent = "Vista accesible de ubicaciones referenciales (WebGL no activo en este navegador)";
      box.appendChild(h);
      var ul = document.createElement("ul");
      ul.style.marginTop = "0.5rem";
      points.forEach(function (pt) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = pt.detail_url || "#";
        a.textContent = pt.country_name + " · " + pt.short_name + " (" + pt.territory_label + ")";
        li.appendChild(a);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      container.appendChild(box);
    }

    if (typeof window.maplibregl === "undefined" || !isWebGLSupported()) {
      renderHubFallback();
      return;
    }

    var map;
    try {
      map = new window.maplibregl.Map({
        container: container,
        style: makeStyle("carto-positron"),
        center: [-82.2, 14.1],
        zoom: 4.35,
        attributionControl: true,
        canvasContextAttributes: { preserveDrawingBuffer: true }
      });
    } catch (err) {
      renderHubFallback();
      return;
    }
    map.addControl(new window.maplibregl.NavigationControl(), "top-right");
    var hubCardEl = container.closest(".hub-map-card") || container;
    if (window.maplibregl.FullscreenControl) {
      map.addControl(new window.maplibregl.FullscreenControl({ container: hubCardEl }), "top-right");
    }

    var hubBasemapSelect = document.getElementById("hub-basemap-select");
    var hubBasemapLegendEl = document.getElementById("hub-basemap-legend");
    var hubQuickBtns = Array.prototype.slice.call(document.querySelectorAll("[data-hub-basemap-quick]"));
    function applyHubBasemap(bmKey) {
      if (!bmKey || !BASEMAPS[bmKey]) return;
      if (hubBasemapSelect && hubBasemapSelect.value !== bmKey) {
        hubBasemapSelect.value = bmKey;
      }
      hubQuickBtns.forEach(function (btn) {
        var isMatch = btn.getAttribute("data-hub-basemap-quick") === bmKey;
        btn.className = isMatch ? "btn btn-teal btn-xs" : "btn btn-outline-light btn-xs";
      });
      if (hubBasemapLegendEl) {
        hubBasemapLegendEl.textContent = BASEMAPS[bmKey].legend || BASEMAPS[bmKey].name || "";
      }
      resolveBasemapTiles(bmKey, function () {
        map.setStyle(makeStyle(bmKey));
      });
    }
    if (hubBasemapSelect) {
      hubBasemapSelect.addEventListener("change", function () {
        applyHubBasemap(hubBasemapSelect.value);
      });
    }
    hubQuickBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyHubBasemap(btn.getAttribute("data-hub-basemap-quick"));
      });
    });

    var hubFsBtn = document.getElementById("hub-toggle-fullscreen");
    if (hubFsBtn && hubCardEl) {
      hubFsBtn.addEventListener("click", function () {
        var isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement || hubCardEl.classList.contains("is-fullscreen"));
        if (!isFs) {
          if (hubCardEl.requestFullscreen) {
            hubCardEl.requestFullscreen().catch(function () {
              hubCardEl.classList.add("is-fullscreen");
            });
          } else {
            hubCardEl.classList.add("is-fullscreen");
          }
          hubFsBtn.textContent = "✕ Salir de pantalla completa";
        } else {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(function () {});
          }
          hubCardEl.classList.remove("is-fullscreen");
          hubFsBtn.textContent = "⛶ Pantalla completa";
        }
        setTimeout(function () {
          map.resize();
        }, 120);
      });
    }

    function buildHubPopupDom(pt) {
      var wrap = createSafePopupElement(
        (pt.country_name || "") + " · " + (pt.short_name || pt.id || ""),
        [
          ["Zona de estudio", pt.territory_label || "—"],
          ["Institución", pt.institution || "Clúster Copernicus Urbano"],
          ["Capas activas", pt.layers_summary || "Capas satelitales Copernicus + datos locales calibrados"]
        ],
        "CLÚSTER COPERNICUS URBANO · " + (pt.country_code || "")
      );
      var btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.flexWrap = "wrap";
      btnRow.style.gap = "6px";
      btnRow.style.marginTop = "8px";

      function addPopupBtn(href, label, bg, fg, isExternal) {
        if (!href) return;
        var a = document.createElement("a");
        a.href = href;
        a.textContent = label;
        a.style.display = "inline-block";
        a.style.padding = "4px 8px";
        a.style.borderRadius = "5px";
        a.style.fontSize = "0.75rem";
        a.style.fontWeight = "700";
        a.style.textDecoration = "none";
        a.style.background = bg;
        a.style.color = fg;
        if (isExternal) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        btnRow.appendChild(a);
      }

      addPopupBtn(pt.geovisor_url, "🗺️ Geovisor", "#000A62", "#FFFFFF", /^https?:/i.test(pt.geovisor_url || ""));
      addPopupBtn(pt.atlas_url, "📚 Atlas Web", "#007F8B", "#FFFFFF", /^https?:/i.test(pt.atlas_url || ""));
      addPopupBtn(pt.atlas_pdf_url, "📥 Atlas PDF", "#FFC800", "#000A62", true);
      addPopupBtn(pt.detail_url, "📄 Ficha →", "#EEF2FA", "#000A62", false);
      wrap.appendChild(btnRow);
      return wrap;
    }

    var pointsById = {};
    points.forEach(function (pt) {
      if (pt.id) pointsById[pt.id] = pt;
      var wrap = buildHubPopupDom(pt);
      new window.maplibregl.Marker({ color: "#000A62" })
        .setLngLat(pt.center)
        .setPopup(new window.maplibregl.Popup({ offset: 22, maxWidth: "340px" }).setDOMContent(wrap))
        .addTo(map);
    });

    var hubBaseUrl = document.body.getAttribute("data-baseurl") || container.getAttribute("data-baseurl") || "";
    if (!hubBaseUrl) {
      var gvScripts = document.querySelectorAll('script[src*="assets/js/geovisor.js"]');
      if (gvScripts.length) {
        try {
          var sPath = new URL(gvScripts[gvScripts.length - 1].src, window.location.href).pathname;
          hubBaseUrl = sPath.replace(/assets\/js\/geovisor\.js.*$/i, "") || "/";
        } catch (e) {
          hubBaseUrl = "/";
        }
      } else {
        hubBaseUrl = "/";
      }
    }
    if (hubBaseUrl.charAt(0) !== "/") hubBaseUrl = "/" + hubBaseUrl;
    if (hubBaseUrl.charAt(hubBaseUrl.length - 1) !== "/") hubBaseUrl = hubBaseUrl + "/";

    var hubPerimetersCache = null;
    function mountHubPerimeters() {
      if (!hubPerimetersCache || !map || !map.isStyleLoaded()) return;
      if (map.getLayer("hub-perimeters-line")) map.removeLayer("hub-perimeters-line");
      if (map.getLayer("hub-perimeters-fill")) map.removeLayer("hub-perimeters-fill");
      if (map.getLayer("hub-perimeters-glow")) map.removeLayer("hub-perimeters-glow");
      if (map.getSource("hub-perimeters-src")) map.removeSource("hub-perimeters-src");

      map.addSource("hub-perimeters-src", { type: "geojson", data: hubPerimetersCache });
      map.addLayer({
        id: "hub-perimeters-glow",
        type: "line",
        source: "hub-perimeters-src",
        paint: { "line-color": "#00E5FF", "line-width": 6, "line-opacity": 0.42 }
      });
      map.addLayer({
        id: "hub-perimeters-fill",
        type: "fill",
        source: "hub-perimeters-src",
        paint: { "fill-color": "#FFC800", "fill-opacity": 0.24 }
      });
      map.addLayer({
        id: "hub-perimeters-line",
        type: "line",
        source: "hub-perimeters-src",
        paint: { "line-color": "#000A62", "line-width": 2.2 }
      });
    }

    var perimHubUrl = new URL("assets/data/perimetros_proyectos.geojson", window.location.origin + hubBaseUrl).href;
    fetch(perimHubUrl)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (gj) {
        if (!gj) return;
        hubPerimetersCache = gj;
        if (map.isStyleLoaded()) mountHubPerimeters();
        else map.once("load", mountHubPerimeters);
      })
      .catch(function () {});

    map.on("styledata", function () {
      if (hubPerimetersCache && !map.getSource("hub-perimeters-src")) {
        mountHubPerimeters();
      }
    });

    map.on("click", "hub-perimeters-fill", function (e) {
      if (!e.features || !e.features.length) return;
      var pr = e.features[0].properties || {};
      var ptMatch = pointsById[pr.id] || pr;
      var dom = buildHubPopupDom(ptMatch);
      new window.maplibregl.Popup({ maxWidth: "340px" }).setLngLat(e.lngLat).setDOMContent(dom).addTo(map);
    });
    map.on("mouseenter", "hub-perimeters-fill", function () { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "hub-perimeters-fill", function () { map.getCanvas().style.cursor = ""; });
  }

  // =========================================================================
  // C. Atlas Temático Copernicus de la Zona de Estudio (resultados/ y atlas/)
  //    Incluye las 10 láminas temáticas completas con selectores de Año y Modo
  //    para cubrir el 100% de las capas satelitales y mosaicos anuales Copernicus.
  // =========================================================================
  var ATLAS_PLATES = {
    "sentinel2-cloudless": {
      id: "sentinel2-cloudless",
      number: "Lámina 1",
      shortTitle: "🛰️ 1. Mosaicos Anuales Sentinel-2 (2018–2024)",
      title: "Mosaicos Anuales sin Nubes Copernicus Sentinel-2 Cloudless (Serie Multitemporal 2018–2024 · 10 m)",
      sensor: "Copernicus Sentinel-2 MSI Nivel L2A/L1C · Mosaicos anuales libres de nubes (EOX IT Services / Unión Europea · 10 m)",
      formula: "Compuesto anual óptico en Color Verdadero RGB (B04 Rojo · B03 Verde · B02 Azul) a 10 m de resolución espacial",
      selectorLabel: "📅 Seleccionar año del mosaico satelital Sentinel-2 Cloudless (Serie 2018–2024):",
      defaultVariant: "sentinel2-2024",
      variants: [
        { key: "sentinel2-2024", pill: "2024", label: "Año 2024 · Mosaico Anual Copernicus Sentinel-2 Cloudless (10 m)", title: "Mosaico Anual sin Nubes Copernicus Sentinel-2 Cloudless · Año 2024 (10 m)" },
        { key: "sentinel2-2023", pill: "2023", label: "Año 2023 · Mosaico Anual Copernicus Sentinel-2 Cloudless (10 m)", title: "Mosaico Anual sin Nubes Copernicus Sentinel-2 Cloudless · Año 2023 (10 m)" },
        { key: "sentinel2-2022", pill: "2022", label: "Año 2022 · Mosaico Anual Copernicus Sentinel-2 Cloudless (10 m)", title: "Mosaico Anual sin Nubes Copernicus Sentinel-2 Cloudless · Año 2022 (10 m)" },
        { key: "sentinel2-2021", pill: "2021", label: "Año 2021 · Mosaico Anual Copernicus Sentinel-2 Cloudless (10 m)", title: "Mosaico Anual sin Nubes Copernicus Sentinel-2 Cloudless · Año 2021 (10 m)" },
        { key: "sentinel2-2020", pill: "2020", label: "Año 2020 · Mosaico Anual Copernicus Sentinel-2 Cloudless (10 m)", title: "Mosaico Anual sin Nubes Copernicus Sentinel-2 Cloudless · Año 2020 (10 m)" },
        { key: "sentinel2-2019", pill: "2019", label: "Año 2019 · Mosaico Anual Copernicus Sentinel-2 Cloudless (10 m)", title: "Mosaico Anual sin Nubes Copernicus Sentinel-2 Cloudless · Año 2019 (10 m)" },
        { key: "sentinel2-2018", pill: "2018 (Base)", label: "Año 2018 (Línea base) · Mosaico Anual Copernicus Sentinel-2 Cloudless (10 m)", title: "Mosaico Anual sin Nubes Copernicus Sentinel-2 Cloudless · Año 2018 Línea Base (10 m)" }
      ],
      reading:
        "Permite inspeccionar visualmente la evolución física real del territorio año por año entre 2018 y 2024 sin interferencia de nubosidad. Al alternar entre los 7 años en el selector se observa la apertura de nuevas urbanizaciones, obras de infraestructura, deforestación periurbana y cambios en riberas dentro del perímetro de estudio.",
      swatches: [
        { color: "#E8ECEF", label: "Blanco / Gris brillante", desc: "Techos industriales y comerciales de gran superficie, concreto nuevo, cubiertas metálicas y equipamiento logístico." },
        { color: "#9BA3AE", label: "Gris medio / Trama reticular", desc: "Tejido residencial urbano consolidado, red vial pavimentada y manzanas de alta densidad constructiva." },
        { color: "#D29D6A", label: "Ocre / Terracota / Marrón claro", desc: "Suelo desnudo en movimiento de tierra (nuevos desarrollos), laderas expuestas o techos de teja y lámina oxidada." },
        { color: "#1E5631", label: "Verde bosque oscuro", desc: "Cobertura arbórea densa, bosques riparios en cañones fluviales, reservas urbanas y manglares." },
        { color: "#76B041", label: "Verde claro / Amarillo verdoso", desc: "Parques urbanos, pastizales, campos deportivos y parcelas agrícolas periurbanas." },
        { color: "#0F3A5D", label: "Azul marino / Turquesa oscuro", desc: "Cuerpos de agua permanentes: ríos principales, lagos, embalses, esteros y litoral marino." }
      ]
    },
    "copernicus-dem-glo30": {
      id: "copernicus-dem-glo30",
      number: "Lámina 2",
      shortTitle: "⛰️ 2. Geomorfología y Pendientes (DEM 30 m)",
      title: "Geomorfología, Altitud y Pendientes Urbanas (Copernicus DEM GLO-30 · 30 m)",
      sensor: "Copernicus Digital Elevation Model (GLO-30 · 30 m · Agencia Espacial Europea / Unión Europea)",
      formula: "Elevación hipsométrica (-100 a 2600 m s. n. m.) + Sombreado analítico Hillshade (Acimut 315°, Altitud 45°)",
      selectorLabel: "🎛️ Seleccionar representación topográfica de Copernicus DEM GLO-30 (3 capas disponibles):",
      defaultVariant: "copernicus-dem-glo30",
      variants: [
        {
          key: "copernicus-dem-glo30",
          pill: "Hipsometría + Hillshade",
          label: "Copernicus DEM GLO-30 · Elevación Hipsométrica + Sombreado Hillshade (30 m)",
          title: "Geomorfología, Altitud y Pendientes Urbanas (Copernicus DEM GLO-30 · Hipsometría + Hillshade 30 m)",
          formula: "Elevación hipsométrica (-100 a 2600 m s. n. m.) + Sombreado analítico Hillshade (Acimut 315°, Altitud 45°)"
        },
        {
          key: "copernicus-dem-hillshade",
          pill: "Solo Hillshade 30 m",
          label: "Copernicus DEM GLO-30 · Sombreado Analítico de Relieve y Cañones (Hillshade 30 m)",
          title: "Sombreado Analítico de Pendientes, Barrancos y Morfología Fluvial (Copernicus DEM GLO-30 Hillshade · 30 m)",
          formula: "Algoritmo Hillshade analítico sobre el DEM oficial de 30 m (Acimut solar 315° · Altitud 45° · Buffer 3 px)",
          swatches: [
            { color: "#F2F4F7", label: "Gris muy claro / Blanco (Iluminación directa)", desc: "Laderas orientadas al noroeste (barlovento solar) y crestas topográficas expuestas." },
            { color: "#B8C0CC", label: "Gris neutro uniforme", desc: "Planicies aluviales, terrazas fluviales y mesetas urbanas de baja pendiente (<5%)." },
            { color: "#68707E", label: "Gris medio texturizado", desc: "Piedemonte y laderas de pendiente moderada (10% – 25%) con disección superficial." },
            { color: "#1F242D", label: "Gris carbón / Negro (Sombra de escarpe)", desc: "Cañones profundos, barrancos urbanos, taludes inestables (>25%) y fallas morfológicas críticas." }
          ]
        },
        {
          key: "copernicus-dem-viridis",
          pill: "Viridis + Curvas de Nivel",
          label: "Copernicus DEM GLO-30 · Hipsometría Continua Viridis + Curvas de Nivel Dinámicas (30 m)",
          title: "Hipsometría Perceptualmente Uniforme y Curvas de Nivel (Copernicus DEM GLO-30 Viridis · 30 m)",
          formula: "Rampa continua Viridis (0 a 2500 m s. n. m.) + Generación dinámica de isolíneas topográficas (Contours)",
          swatches: [
            { color: "#440154", label: "0 – 200 m s. n. m. (Violeta profundo)", desc: "Planicies costeras, desembocaduras, esteros y fondos de valle más bajos de la cuenca." },
            { color: "#31688E", label: "200 – 700 m s. n. m. (Azul petróleo)", desc: "Valles intramontanos bajos y terrazas fluviales intermedias." },
            { color: "#35B779", label: "700 – 1400 m s. n. m. (Verde esmeralda)", desc: "Mesetas metropolitanas intermedias (Valle Central, Guatemala, San Salvador, Tegucigalpa)." },
            { color: "#FDE725", label: "> 1400 m s. n. m. (Amarillo brillante)", desc: "Cumbres volcánicas, cerros tutelares y divisorias altas de recarga hídrica." },
            { color: "#14283F", label: "Isolíneas oscuras (Curvas de nivel)", desc: "Mayor cercanía entre curvas indica fuerte gradiente de pendiente y restricción constructiva." }
          ]
        }
      ],
      reading:
        "Permite identificar la configuración topográfica sobre la cual se asienta la mancha urbana: valles fluviales, abanicos aluviales, terrazas intermedias y laderas escarpadas o cañones donde el crecimiento informal presenta mayor exposición a deslizamientos y escorrentía concentrada.",
      swatches: [
        { color: "#336699", label: "0 – 150 m s. n. m. (Azul/Verde bajo)", desc: "Planicies costeras, llanuras de inundación y fondos de valle bajos susceptibles a anegamiento." },
        { color: "#56A862", label: "150 – 500 m s. n. m. (Verde medio)", desc: "Terrazas aluviales y valles intramontanos de pendiente suave con alta aptitud para urbanización consolidada." },
        { color: "#E6C267", label: "500 – 1200 m s. n. m. (Amarillo / Ocre)", desc: "Piedemonte, mesetas intermedias (ej. Valle Central, Guatemala, San Salvador, Tegucigalpa) y laderas moderadas." },
        { color: "#A66A43", label: "> 1200 m s. n. m. (Marrón / Blanco)", desc: "Escarpes pronunciados, cordilleras volcánicas y divisorias de cuenca de alta fragilidad morfodinámica." },
        { color: "#3A3F4B", label: "Sombreado oscuro (Hillshade 30 m)", desc: "Barrancos, cañones fluviales y taludes de fuerte pendiente (>25%) donde debe restringirse o mitigarse la densificación." }
      ]
    },
    "esa-worldcover-2021": {
      id: "esa-worldcover-2021",
      number: "Lámina 3",
      shortTitle: "🏙️ 3. Cobertura y Mancha Urbana 10 m (WorldCover)",
      title: "Cobertura Terrestre y Huella Urbana a 10 m (ESA WorldCover · Sentinel-1 + Sentinel-2)",
      sensor: "ESA WorldCover 10 m (Fusión óptica-radar Copernicus Sentinel-2 L2A + Sentinel-1 SAR)",
      formula: "Clasificación global supervisada de 11 clases de cobertura terrestre a 10 metros de resolución espacial",
      selectorLabel: "📅 Seleccionar año oficial publicado de ESA WorldCover (10 m):",
      defaultVariant: "esa-worldcover-2021",
      variants: [
        { key: "esa-worldcover-2021", pill: "Año 2021 (v200)", label: "Año 2021 (v200) · ESA WorldCover 10 m (Sentinel-1 + Sentinel-2)", title: "Cobertura Terrestre y Huella Urbana a 10 m · Año 2021 (ESA WorldCover v200)" },
        { key: "esa-worldcover-2020", pill: "Año 2020 (v100)", label: "Año 2020 (v100) · ESA WorldCover 10 m (Sentinel-1 + Sentinel-2)", title: "Cobertura Terrestre y Huella Urbana a 10 m · Año 2020 (ESA WorldCover v100)" }
      ],
      reading:
        "Delimita con precisión de 10 m la huella edificada e impermeable (en rojo intenso #FA0000) frente a la infraestructura verde urbana, bosques de galería, cinturones agrícolas, manglares y cuerpos de agua dentro del límite de la zona de estudio, permitiendo comparar las ediciones 2020 (v100) y 2021 (v200).",
      swatches: [
        { color: "#FA0000", label: "Edificado / Mancha Urbana (#FA0000)", desc: "Superficie construida consolidada: edificaciones residenciales, industriales, techos, pavimento vial y concreto." },
        { color: "#006400", label: "Cobertura Arbórea (#006400)", desc: "Bosques urbanos, parques metropolitanos, bosques riparios en cañones y arbolado denso (>10% de dosel)." },
        { color: "#FFBB22", label: "Arbustos y Matorral (#FFBB22)", desc: "Vegetación leñosa baja, laderas en regeneración o bordes periurbanos no consolidados." },
        { color: "#FFFF4C", label: "Pastizales y Herbáceas (#FFFF4C)", desc: "Praderas, áreas verdes abiertas, lotes baldíos con cobertura herbácea y zonas de amortiguamiento." },
        { color: "#F096FF", label: "Cultivos Agrícolas (#F096FF)", desc: "Tierras de cultivo en la periferia urbano-rural sujetas a presión por cambio de uso del suelo." },
        { color: "#B4B4B4", label: "Suelo Desnudo / Expuesto (#B4B4B4)", desc: "Terrenos en movimiento de tierra (nuevas urbanizaciones), canteras, playones fluviales o taludes erosionados." },
        { color: "#0064C8", label: "Agua Permanente y Manglar (#0064C8 / #00CF75)", desc: "Ríos principales, lagos, embalses, esteros costeros y ecosistemas de manglar (#00CF75)." }
      ]
    },
    "s2-lulc-2023": {
      id: "s2-lulc-2023",
      number: "Lámina 4",
      shortTitle: "📈 4. Uso del Suelo Anual 10 m (LULC 2017–2023)",
      title: "Serie Multitemporal de Uso del Suelo y Expansión Urbana a 10 m (Sentinel-2 LULC · 2017–2023)",
      sensor: "Copernicus Sentinel-2 L2A · Clasificación Anual IA de 9 Clases (Impact Observatory / Esri · 10 m)",
      formula: "Segmentación semántica profunda sobre compuestos anuales Sentinel-2 L2A (Serie histórica anual 2017–2023)",
      selectorLabel: "📅 Seleccionar año de la serie anual de Uso del Suelo (7 años disponibles: 2017–2023):",
      defaultVariant: "s2-lulc-2023",
      variants: [
        { key: "s2-lulc-2023", pill: "2023", label: "Año 2023 · Uso y Cobertura del Suelo Sentinel-2 10 m (9 clases)", title: "Uso del Suelo y Expansión del Área Construida a 10 m · Año 2023 (Sentinel-2 LULC)" },
        { key: "s2-lulc-2022", pill: "2022", label: "Año 2022 · Uso y Cobertura del Suelo Sentinel-2 10 m (9 clases)", title: "Uso del Suelo y Expansión del Área Construida a 10 m · Año 2022 (Sentinel-2 LULC)" },
        { key: "s2-lulc-2021", pill: "2021", label: "Año 2021 · Uso y Cobertura del Suelo Sentinel-2 10 m (9 clases)", title: "Uso del Suelo y Expansión del Área Construida a 10 m · Año 2021 (Sentinel-2 LULC)" },
        { key: "s2-lulc-2020", pill: "2020", label: "Año 2020 · Uso y Cobertura del Suelo Sentinel-2 10 m (9 clases)", title: "Uso del Suelo y Expansión del Área Construida a 10 m · Año 2020 (Sentinel-2 LULC)" },
        { key: "s2-lulc-2019", pill: "2019", label: "Año 2019 · Uso y Cobertura del Suelo Sentinel-2 10 m (9 clases)", title: "Uso del Suelo y Expansión del Área Construida a 10 m · Año 2019 (Sentinel-2 LULC)" },
        { key: "s2-lulc-2018", pill: "2018", label: "Año 2018 · Uso y Cobertura del Suelo Sentinel-2 10 m (9 clases)", title: "Uso del Suelo y Expansión del Área Construida a 10 m · Año 2018 (Sentinel-2 LULC)" },
        { key: "s2-lulc-2017", pill: "2017 (Base)", label: "Año 2017 (Línea base) · Uso y Cobertura del Suelo Sentinel-2 10 m", title: "Uso del Suelo y Expansión del Área Construida a 10 m · Año 2017 Línea Base (Sentinel-2 LULC)" }
      ],
      reading:
        "Permite evaluar año por año (desde la línea base 2017 hasta 2023) la expansión de la mancha construida (#C4281B) sobre antiguos terrenos agrícolas (#E49635), pastizales (#DFC35A) o bordes forestales (#397D49) dentro de la zona de estudio.",
      swatches: [
        { color: "#C4281B", label: "Área Construida / Built Area (#C4281B)", desc: "Tejido urbano consolidado, asentamientos humanos, infraestructura vial y zonas industriales." },
        { color: "#397D49", label: "Árboles y Bosque Denso (#397D49)", desc: "Masas forestales densas, reservas ecológicas urbanas y cortinas rompe-vientos." },
        { color: "#E49635", label: "Cultivos (#E49635)", desc: "Áreas agrícolas periurbanas en contacto directo con los frentes de expansión urbana." },
        { color: "#DFC35A", label: "Matorral / Rangeland (#DFC35A)", desc: "Terrenos abiertos con arbustos dispersos y pastizales de transición." },
        { color: "#A59B8F", label: "Suelo Desnudo (#A59B8F)", desc: "Superficie sin vegetación, trazados viales en apertura o áreas extractivas." },
        { color: "#419BDF", label: "Agua y Humedales (#419BDF / #88B053)", desc: "Cuerpos de agua superficiales (#419BDF) y vegetación inundable o ribereña (#88B053)." }
      ]
    },
    "s2-l2a-ndvi": {
      id: "s2-l2a-ndvi",
      number: "Lámina 5",
      shortTitle: "🌿 5. Vegetación Urbana e Islas Verdes (NDVI)",
      title: "Índice de Vegetación de Diferencia Normalizada (Copernicus Sentinel-2 L2A · NDVI 10 m)",
      sensor: "Copernicus Sentinel-2 L2A (Bandas B08 Infrarrojo Cercano y B04 Rojo a 10 m de resolución)",
      formula: "NDVI = (B08 - B04) / (B08 + B04) · Escala [-0.30 a +0.85] · Rampa RdYlGn",
      selectorLabel: "📅 Seleccionar compuesto óptimo o año del índice NDVI (Sentinel-2 L2A · 10 m):",
      defaultVariant: "s2-l2a-ndvi",
      variants: [
        { key: "s2-l2a-ndvi", pill: "Reciente (<10% nubes)", label: "Compuesto Reciente Óptimo (<10% nubosidad) · NDVI 10 m", title: "Índice de Vegetación Urbana NDVI (Sentinel-2 L2A · Compuesto Reciente 10 m)" },
        { key: "s2-l2a-ndvi-2024", pill: "2024", label: "Año 2024 · NDVI Anual Sentinel-2 L2A (10 m)", title: "Índice de Vegetación Urbana NDVI · Año 2024 (Sentinel-2 L2A · 10 m)" },
        { key: "s2-l2a-ndvi-2023", pill: "2023", label: "Año 2023 · NDVI Anual Sentinel-2 L2A (10 m)", title: "Índice de Vegetación Urbana NDVI · Año 2023 (Sentinel-2 L2A · 10 m)" },
        { key: "s2-l2a-ndvi-2022", pill: "2022", label: "Año 2022 · NDVI Anual Sentinel-2 L2A (10 m)", title: "Índice de Vegetación Urbana NDVI · Año 2022 (Sentinel-2 L2A · 10 m)" },
        { key: "s2-l2a-ndvi-2021", pill: "2021", label: "Año 2021 · NDVI Anual Sentinel-2 L2A (10 m)", title: "Índice de Vegetación Urbana NDVI · Año 2021 (Sentinel-2 L2A · 10 m)" },
        { key: "s2-l2a-ndvi-2020", pill: "2020", label: "Año 2020 · NDVI Anual Sentinel-2 L2A (10 m)", title: "Índice de Vegetación Urbana NDVI · Año 2020 (Sentinel-2 L2A · 10 m)" },
        { key: "s2-l2a-ndvi-2019", pill: "2019", label: "Año 2019 · NDVI Anual Sentinel-2 L2A (10 m)", title: "Índice de Vegetación Urbana NDVI · Año 2019 (Sentinel-2 L2A · 10 m)" },
        { key: "s2-l2a-ndvi-2018", pill: "2018", label: "Año 2018 · NDVI Anual Sentinel-2 L2A (10 m)", title: "Índice de Vegetación Urbana NDVI · Año 2018 (Sentinel-2 L2A · 10 m)" }
      ],
      reading:
        "Evalúa la actividad fotosintética y la dotación de biomasa vegetal dentro del perímetro urbano. Es el indicador clave para localizar el déficit de áreas verdes por barrio, fragmentación de corredores ecológicos y zonas críticas de isla de calor a través de los años.",
      swatches: [
        { color: "#A50026", label: "NDVI < 0.05 (Rojo intenso)", desc: "Cuerpos de agua, techos metálicos o de concreto, asfalto vial y superficies 100% impermeables sin vegetación." },
        { color: "#F46D43", label: "NDVI 0.05 – 0.20 (Naranja)", desc: "Tejido urbano altamente densificado, centros históricos o asentamientos compactos con nulo arbolado viario." },
        { color: "#FEE08B", label: "NDVI 0.20 – 0.38 (Amarillo pálido)", desc: "Zonas residenciales de densidad media con jardines dispersos, pastizales secos o suelo parcialmente expuesto." },
        { color: "#66BD63", label: "NDVI 0.38 – 0.60 (Verde claro)", desc: "Parques urbanos, bulevares arbolados, áreas periurbanas arborizadas y cultivos activos." },
        { color: "#006837", label: "NDVI > 0.60 (Verde bosque oscuro)", desc: "Dosel forestal denso y vigoroso en cañones, áreas protegidas y riberas que actúan como sumideros térmicos." }
      ]
    },
    "s2-l2a-ndbi": {
      id: "s2-l2a-ndbi",
      number: "Lámina 6",
      shortTitle: "🏗️ 6. Densidad Edificada e Impermeabilización (NDBI)",
      title: "Índice de Edificación y Área Construida (Copernicus Sentinel-2 L2A · NDBI 20 m)",
      sensor: "Copernicus Sentinel-2 L2A (Bandas B11 Infrarrojo de Onda Corta SWIR y B08 NIR)",
      formula: "NDBI = (B11 - B08) / (B11 + B08) · Escala [-0.45 a +0.45] · Rampa Inferno",
      selectorLabel: "📅 Seleccionar compuesto óptimo o año del índice NDBI (Sentinel-2 L2A · 20 m):",
      defaultVariant: "s2-l2a-ndbi",
      variants: [
        { key: "s2-l2a-ndbi", pill: "Reciente (<10% nubes)", label: "Compuesto Reciente Óptimo (<10% nubosidad) · NDBI 20 m", title: "Índice de Edificación e Impermeabilización NDBI (Sentinel-2 L2A · Reciente 20 m)" },
        { key: "s2-l2a-ndbi-2024", pill: "2024", label: "Año 2024 · NDBI Anual Sentinel-2 L2A (20 m)", title: "Índice de Edificación e Impermeabilización NDBI · Año 2024 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndbi-2023", pill: "2023", label: "Año 2023 · NDBI Anual Sentinel-2 L2A (20 m)", title: "Índice de Edificación e Impermeabilización NDBI · Año 2023 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndbi-2022", pill: "2022", label: "Año 2022 · NDBI Anual Sentinel-2 L2A (20 m)", title: "Índice de Edificación e Impermeabilización NDBI · Año 2022 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndbi-2021", pill: "2021", label: "Año 2021 · NDBI Anual Sentinel-2 L2A (20 m)", title: "Índice de Edificación e Impermeabilización NDBI · Año 2021 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndbi-2020", pill: "2020", label: "Año 2020 · NDBI Anual Sentinel-2 L2A (20 m)", title: "Índice de Edificación e Impermeabilización NDBI · Año 2020 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndbi-2019", pill: "2019", label: "Año 2019 · NDBI Anual Sentinel-2 L2A (20 m)", title: "Índice de Edificación e Impermeabilización NDBI · Año 2019 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndbi-2018", pill: "2018", label: "Año 2018 · NDBI Anual Sentinel-2 L2A (20 m)", title: "Índice de Edificación e Impermeabilización NDBI · Año 2018 (Sentinel-2 L2A · 20 m)" }
      ],
      reading:
        "Aprovecha la fuerte reflectancia de los materiales de construcción (techos de zinc, fibrocemento, hormigón, asfalto y suelo compactado) en el infrarrojo de onda corta (SWIR B11) para medir el grado de sellado e impermeabilización del suelo y su evolución multitemporal.",
      swatches: [
        { color: "#FCFFA4", label: "NDBI > +0.15 (Amarillo brillante)", desc: "Máxima intensidad edificada: techos industriales/comerciales continuos, asentamientos muy compactos o suelo en explanación." },
        { color: "#F98E09", label: "NDBI 0.00 a +0.15 (Naranja intenso)", desc: "Tejido urbano consolidado con predominio de superficies impermeables y alta generación de escorrentía pluvial." },
        { color: "#AC2F5E", label: "NDBI -0.15 a 0.00 (Magenta / Púrpura)", desc: "Tejido residencial mixto o periurbano donde alternan viviendas con patios y vegetación." },
        { color: "#1B0C41", label: "NDBI < -0.15 (Violeta oscuro / Negro)", desc: "Superficies naturales permeables: bosques, áreas verdes densas y cuerpos de agua que absorben radiación SWIR." }
      ]
    },
    "s2-l2a-ndwi": {
      id: "s2-l2a-ndwi",
      number: "Lámina 7",
      shortTitle: "💧 7. Humedad Superficial y Estrés Térmico (NDWI)",
      title: "Índice de Humedad Superficial y Estrés Hídrico (Copernicus Sentinel-2 L2A · NDWI 20 m)",
      sensor: "Copernicus Sentinel-2 L2A (Bandas B8A NIR Estrecho y B11 SWIR a 20 m)",
      formula: "NDWI = (B8A - B11) / (B8A + B11) · Escala [-0.50 a +0.50] · Rampa RdBu",
      selectorLabel: "📅 Seleccionar compuesto óptimo o año del índice NDWI (Sentinel-2 L2A · 20 m):",
      defaultVariant: "s2-l2a-ndwi",
      variants: [
        { key: "s2-l2a-ndwi", pill: "Reciente (<10% nubes)", label: "Compuesto Reciente Óptimo (<10% nubosidad) · NDWI 20 m", title: "Índice de Humedad Superficial NDWI (Sentinel-2 L2A · Compuesto Reciente 20 m)" },
        { key: "s2-l2a-ndwi-2024", pill: "2024", label: "Año 2024 · NDWI Anual Sentinel-2 L2A (20 m)", title: "Índice de Humedad Superficial NDWI · Año 2024 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndwi-2023", pill: "2023", label: "Año 2023 · NDWI Anual Sentinel-2 L2A (20 m)", title: "Índice de Humedad Superficial NDWI · Año 2023 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndwi-2022", pill: "2022", label: "Año 2022 · NDWI Anual Sentinel-2 L2A (20 m)", title: "Índice de Humedad Superficial NDWI · Año 2022 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndwi-2021", pill: "2021", label: "Año 2021 · NDWI Anual Sentinel-2 L2A (20 m)", title: "Índice de Humedad Superficial NDWI · Año 2021 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndwi-2020", pill: "2020", label: "Año 2020 · NDWI Anual Sentinel-2 L2A (20 m)", title: "Índice de Humedad Superficial NDWI · Año 2020 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndwi-2019", pill: "2019", label: "Año 2019 · NDWI Anual Sentinel-2 L2A (20 m)", title: "Índice de Humedad Superficial NDWI · Año 2019 (Sentinel-2 L2A · 20 m)" },
        { key: "s2-l2a-ndwi-2018", pill: "2018", label: "Año 2018 · NDWI Anual Sentinel-2 L2A (20 m)", title: "Índice de Humedad Superficial NDWI · Año 2018 (Sentinel-2 L2A · 20 m)" }
      ],
      reading:
        "Mide el contenido de agua líquida en el dosel vegetal y la humedad superficial del suelo. Permite contrastar los corredores húmedos y frescos (en azul) frente a las islas de sequedad e impermeabilización urbana (en rojo).",
      swatches: [
        { color: "#053061", label: "NDWI > +0.25 (Azul marino intenso)", desc: "Cuerpos de agua abiertos, humedales saturados y bosques de galería con alta retención de humedad." },
        { color: "#4393C3", label: "NDWI +0.05 a +0.25 (Azul claro)", desc: "Vegetación saludable bien hidratada y suelos húmedos con capacidad de enfriamiento evaporativo." },
        { color: "#F7F7F7", label: "NDWI -0.05 a +0.05 (Blanco neutro)", desc: "Zonas de transición periurbana con humedad superficial moderada." },
        { color: "#D6604D", label: "NDWI -0.20 a -0.05 (Rojo salmón)", desc: "Áreas urbanizadas secas o vegetación con déficit hídrico estacional." },
        { color: "#67001F", label: "NDWI < -0.20 (Rojo granate oscuro)", desc: "Superficies urbanas totalmente impermeables, techos calientes y suelos áridos con máxima carga térmica." }
      ]
    },
    "s2-l2a-composites": {
      id: "s2-l2a-composites",
      number: "Lámina 8",
      shortTitle: "🔬 8. Falso Color Infrarrojo y SWIR Urbano (S2 L2A)",
      title: "Compuestos Multiespectrales Infrarrojo Cercano (VNIR) y Onda Corta (SWIR) (Sentinel-2 L2A)",
      sensor: "Copernicus Sentinel-2 L2A · Combinaciones de bandas VNIR (B08-B04-B03 a 10 m) y SWIR (B12-B8A-B04 a 20 m)",
      formula: "Falso Color Infrarrojo RGB=(B08, B04, B03) a 10 m · Compuesto SWIR Urbano RGB=(B12, B8A, B04) a 20 m",
      selectorLabel: "🎛️ Seleccionar combinación multiespectral (Infrarrojo VNIR o SWIR Urbano) y año:",
      defaultVariant: "s2-l2a-falsecolor",
      variants: [
        {
          key: "s2-l2a-falsecolor",
          pill: "IR B08-B04-B03 (Reciente)",
          label: "Falso Color Infrarrojo (B08-B04-B03 · 10 m) · Compuesto Reciente",
          title: "Compuesto Falso Color Infrarrojo Cercano (Sentinel-2 L2A · B08-B04-B03 · 10 m Reciente)",
          formula: "RGB = (B08 Infrarrojo Cercano, B04 Rojo, B03 Verde) a 10 m · Realce Gamma 3.7"
        },
        {
          key: "s2-l2a-falsecolor-2024",
          pill: "IR 2024",
          label: "Falso Color Infrarrojo (B08-B04-B03 · 10 m) · Año 2024",
          title: "Compuesto Falso Color Infrarrojo Cercano · Año 2024 (Sentinel-2 L2A · B08-B04-B03 · 10 m)",
          formula: "RGB = (B08 Infrarrojo Cercano, B04 Rojo, B03 Verde) a 10 m · Compuesto Anual 2024"
        },
        {
          key: "s2-l2a-falsecolor-2022",
          pill: "IR 2022",
          label: "Falso Color Infrarrojo (B08-B04-B03 · 10 m) · Año 2022",
          title: "Compuesto Falso Color Infrarrojo Cercano · Año 2022 (Sentinel-2 L2A · B08-B04-B03 · 10 m)",
          formula: "RGB = (B08 Infrarrojo Cercano, B04 Rojo, B03 Verde) a 10 m · Compuesto Anual 2022"
        },
        {
          key: "s2-l2a-falsecolor-2020",
          pill: "IR 2020",
          label: "Falso Color Infrarrojo (B08-B04-B03 · 10 m) · Año 2020",
          title: "Compuesto Falso Color Infrarrojo Cercano · Año 2020 (Sentinel-2 L2A · B08-B04-B03 · 10 m)",
          formula: "RGB = (B08 Infrarrojo Cercano, B04 Rojo, B03 Verde) a 10 m · Compuesto Anual 2020"
        },
        {
          key: "s2-l2a-swir",
          pill: "SWIR Urbano (Reciente)",
          label: "SWIR Urbano (B12-B8A-B04 · 20 m) · Compuesto Reciente",
          title: "Compuesto Infrarrojo de Onda Corta SWIR Urbano (Sentinel-2 L2A · B12-B8A-B04 · 20 m Reciente)",
          formula: "RGB = (B12 SWIR 2190 nm, B8A NIR Estrecho 865 nm, B04 Rojo 665 nm) a 20 m",
          swatches: [
            { color: "#BA68C8", label: "Magenta / Púrpura brillante (Alto B12 + B04)", desc: "Huella urbana consolidada, techos metálicos/concreto, pavimento vial y zonas industriales." },
            { color: "#D7CCC8", label: "Rosado claro / Ocre rojizo", desc: "Suelo desnudo expuesto, terrenos en urbanización, canteras o pastizales secos." },
            { color: "#2E7D32", label: "Verde intenso / Esmeralda (Alto B8A)", desc: "Vegetación vigorosa y bosques urbanos (fuerte reflectancia en B8A y absorción en SWIR)." },
            { color: "#091526", label: "Azul marino muy oscuro / Negro", desc: "Cuerpos de agua (ríos, lagos, esteros) que absorben casi totalmente el infrarrojo de onda corta." }
          ]
        },
        {
          key: "s2-l2a-swir-2024",
          pill: "SWIR 2024",
          label: "SWIR Urbano (B12-B8A-B04 · 20 m) · Año 2024",
          title: "Compuesto Infrarrojo de Onda Corta SWIR Urbano · Año 2024 (Sentinel-2 L2A · 20 m)",
          formula: "RGB = (B12 SWIR, B8A NIR, B04 Rojo) a 20 m · Compuesto Anual 2024",
          swatches: [
            { color: "#BA68C8", label: "Magenta / Púrpura brillante (Alto B12 + B04)", desc: "Huella urbana consolidada, techos metálicos/concreto, pavimento vial y zonas industriales." },
            { color: "#D7CCC8", label: "Rosado claro / Ocre rojizo", desc: "Suelo desnudo expuesto, terrenos en urbanización, canteras o pastizales secos." },
            { color: "#2E7D32", label: "Verde intenso / Esmeralda (Alto B8A)", desc: "Vegetación vigorosa y bosques urbanos (fuerte reflectancia en B8A y absorción en SWIR)." },
            { color: "#091526", label: "Azul marino muy oscuro / Negro", desc: "Cuerpos de agua (ríos, lagos, esteros) que absorben casi totalmente el infrarrojo de onda corta." }
          ]
        },
        {
          key: "s2-l2a-swir-2022",
          pill: "SWIR 2022",
          label: "SWIR Urbano (B12-B8A-B04 · 20 m) · Año 2022",
          title: "Compuesto Infrarrojo de Onda Corta SWIR Urbano · Año 2022 (Sentinel-2 L2A · 20 m)",
          formula: "RGB = (B12 SWIR, B8A NIR, B04 Rojo) a 20 m · Compuesto Anual 2022",
          swatches: [
            { color: "#BA68C8", label: "Magenta / Púrpura brillante (Alto B12 + B04)", desc: "Huella urbana consolidada, techos metálicos/concreto, pavimento vial y zonas industriales." },
            { color: "#D7CCC8", label: "Rosado claro / Ocre rojizo", desc: "Suelo desnudo expuesto, terrenos en urbanización, canteras o pastizales secos." },
            { color: "#2E7D32", label: "Verde intenso / Esmeralda (Alto B8A)", desc: "Vegetación vigorosa y bosques urbanos (fuerte reflectancia en B8A y absorción en SWIR)." },
            { color: "#091526", label: "Azul marino muy oscuro / Negro", desc: "Cuerpos de agua (ríos, lagos, esteros) que absorben casi totalmente el infrarrojo de onda corta." }
          ]
        },
        {
          key: "s2-l2a-swir-2020",
          pill: "SWIR 2020",
          label: "SWIR Urbano (B12-B8A-B04 · 20 m) · Año 2020",
          title: "Compuesto Infrarrojo de Onda Corta SWIR Urbano · Año 2020 (Sentinel-2 L2A · 20 m)",
          formula: "RGB = (B12 SWIR, B8A NIR, B04 Rojo) a 20 m · Compuesto Anual 2020",
          swatches: [
            { color: "#BA68C8", label: "Magenta / Púrpura brillante (Alto B12 + B04)", desc: "Huella urbana consolidada, techos metálicos/concreto, pavimento vial y zonas industriales." },
            { color: "#D7CCC8", label: "Rosado claro / Ocre rojizo", desc: "Suelo desnudo expuesto, terrenos en urbanización, canteras o pastizales secos." },
            { color: "#2E7D32", label: "Verde intenso / Esmeralda (Alto B8A)", desc: "Vegetación vigorosa y bosques urbanos (fuerte reflectancia en B8A y absorción en SWIR)." },
            { color: "#091526", label: "Azul marino muy oscuro / Negro", desc: "Cuerpos de agua (ríos, lagos, esteros) que absorben casi totalmente el infrarrojo de onda corta." }
          ]
        }
      ],
      reading:
        "Combina las bandas del infrarrojo cercano (B08/B8A) y de onda corta (B12 SWIR) de Sentinel-2 L2A para separar nítidamente los materiales artificiales de construcción respecto de la vegetación activa y los suelos desnudos en apertura.",
      swatches: [
        { color: "#D32F2F", label: "Rojo escarlata intenso (Alto B08 NIR)", desc: "Dosel arbóreo denso, bosques de galería y vegetación fotosintéticamente muy activa." },
        { color: "#F48FB1", label: "Rosa claro / Coral", desc: "Parques urbanos con césped, vegetación herbácea, cultivos periurbanos o jardines residenciales." },
        { color: "#90CAF9", label: "Azul cian / Gris azulado brillante", desc: "Tejido urbano denso, concreto, asfalto vial, techos industriales y roca o suelo compacto." },
        { color: "#0D1B2A", label: "Azul muy oscuro / Negro", desc: "Cuerpos de agua limpios (ríos, embalses, mar) que absorben la radiación infrarroja cercana." }
      ]
    },
    "s1-rtc-falsecolor": {
      id: "s1-rtc-falsecolor",
      number: "Lámina 9",
      shortTitle: "📡 9. Morfología Urbana por Radar (Sentinel-1 SAR)",
      title: "Morfología y Densidad Estructural por Radar Todo-Tiempo (Copernicus Sentinel-1 SAR RTC · 10 m)",
      sensor: "Copernicus Sentinel-1 C-Band SAR (Radiometrically Terrain Corrected · Polarización Dual VV + VH a 10 m)",
      formula: "Compuesto RGB de retrodispersión radar corregida por terreno (VV, VH y razón VV/VH) — Penetra el 100% de las nubes",
      selectorLabel: "🎛️ Seleccionar polarización radar Sentinel-1 SAR (Compuesto VV+VH o Escala de Grises VV) y año:",
      defaultVariant: "s1-rtc-falsecolor",
      variants: [
        { key: "s1-rtc-falsecolor", pill: "VV+VH Urbano (Reciente)", label: "Compuesto Urbano Dual VV+VH (10 m · Reciente)", title: "Morfología Urbana por Radar Todo-Tiempo (Sentinel-1 SAR RTC · Compuesto VV+VH 10 m)" },
        { key: "s1-rtc-falsecolor-2024", pill: "VV+VH 2024", label: "Compuesto Urbano Dual VV+VH (10 m · Año 2024)", title: "Morfología Urbana por Radar Todo-Tiempo · Año 2024 (Sentinel-1 SAR RTC · VV+VH 10 m)" },
        { key: "s1-rtc-falsecolor-2022", pill: "VV+VH 2022", label: "Compuesto Urbano Dual VV+VH (10 m · Año 2022)", title: "Morfología Urbana por Radar Todo-Tiempo · Año 2022 (Sentinel-1 SAR RTC · VV+VH 10 m)" },
        { key: "s1-rtc-falsecolor-2020", pill: "VV+VH 2020", label: "Compuesto Urbano Dual VV+VH (10 m · Año 2020)", title: "Morfología Urbana por Radar Todo-Tiempo · Año 2020 (Sentinel-1 SAR RTC · VV+VH 10 m)" },
        {
          key: "s1-rtc-vv",
          pill: "Polarización VV (Grises)",
          label: "Polarización VV en Escala de Grises (10 m · Reciente)",
          title: "Retrodispersión Radar en Polarización VV (Sentinel-1 SAR RTC · Escala de Grises 10 m)",
          formula: " Intensidad de retrodispersión copolarizada VV corregida por terreno (Rango 0.00 a 0.25)",
          swatches: [
            { color: "#FFFFFF", label: "Blanco brillante (VV muy alto > 0.20)", desc: "Reflectores de esquina diedro: edificios densos, naves metálicas, puentes y laderas rocosas." },
            { color: "#9E9E9E", label: "Gris medio (VV moderado 0.06 – 0.18)", desc: "Dosel arbóreo, zonas residenciales de baja altura y terrenos rugosos." },
            { color: "#424242", label: "Gris oscuro (VV bajo 0.02 – 0.06)", desc: "Pastizales cortos, suelos agrícolas arados o pavimento liso." },
            { color: "#080B10", label: "Negro profundo (VV ~ 0 · Reflexión especular)", desc: "Espejos de agua calma, cauces fluviales e inundaciones urbanas activas bajo nubes." }
          ]
        },
        {
          key: "s1-rtc-vv-2024",
          pill: "VV Grises 2024",
          label: "Polarización VV en Escala de Grises (10 m · Año 2024)",
          title: "Retrodispersión Radar en Polarización VV · Año 2024 (Sentinel-1 SAR RTC · 10 m)",
          formula: "Intensidad de retrodispersión copolarizada VV corregida por terreno · Año 2024",
          swatches: [
            { color: "#FFFFFF", label: "Blanco brillante (VV muy alto > 0.20)", desc: "Reflectores de esquina diedro: edificios densos, naves metálicas, puentes y laderas rocosas." },
            { color: "#9E9E9E", label: "Gris medio (VV moderado 0.06 – 0.18)", desc: "Dosel arbóreo, zonas residenciales de baja altura y terrenos rugosos." },
            { color: "#424242", label: "Gris oscuro (VV bajo 0.02 – 0.06)", desc: "Pastizales cortos, suelos agrícolas arados o pavimento liso." },
            { color: "#080B10", label: "Negro profundo (VV ~ 0 · Reflexión especular)", desc: "Espejos de agua calma, cauces fluviales e inundaciones urbanas activas bajo nubes." }
          ]
        },
        {
          key: "s1-rtc-vv-2020",
          pill: "VV Grises 2020",
          label: "Polarización VV en Escala de Grises (10 m · Año 2020)",
          title: "Retrodispersión Radar en Polarización VV · Año 2020 (Sentinel-1 SAR RTC · 10 m)",
          formula: "Intensidad de retrodispersión copolarizada VV corregida por terreno · Año 2020",
          swatches: [
            { color: "#FFFFFF", label: "Blanco brillante (VV muy alto > 0.20)", desc: "Reflectores de esquina diedro: edificios densos, naves metálicas, puentes y laderas rocosas." },
            { color: "#9E9E9E", label: "Gris medio (VV moderado 0.06 – 0.18)", desc: "Dosel arbóreo, zonas residenciales de baja altura y terrenos rugosos." },
            { color: "#424242", label: "Gris oscuro (VV bajo 0.02 – 0.06)", desc: "Pastizales cortos, suelos agrícolas arados o pavimento liso." },
            { color: "#080B10", label: "Negro profundo (VV ~ 0 · Reflexión especular)", desc: "Espejos de agua calma, cauces fluviales e inundaciones urbanas activas bajo nubes." }
          ]
        }
      ],
      reading:
        "A diferencia de los sensores ópticos, el radar activo de Sentinel-1 opera día y noche atravesando nubes y lluvia. Detecta la rugosidad física y la geometría tridimensional de las construcciones humanas mediante el efecto de rebote doble (double-bounce) entre paredes y calles.",
      swatches: [
        { color: "#FFF59D", label: "Amarillo brillante / Blanco (Alto VV)", desc: "Rebote doble intenso (double-bounce): centros urbanos densos, edificaciones de varios niveles, naves metálicas y taludes." },
        { color: "#4CAF50", label: "Verde intenso (Alto VH cruzado)", desc: "Dispersión volumétrica producida por ramas y hojas del dosel arbóreo y vegetación densa." },
        { color: "#5C6BC0", label: "Azul / Añil intermedio", desc: "Suelos agrícolas, pastizales cortos o superficies de rugosidad baja a moderada." },
        { color: "#0D1B2A", label: "Azul muy oscuro / Negro (Baja retrodispersión)", desc: "Reflexión especular: espejos de agua calma (ríos, lagos, mar), pistas aeroportuarias o zonas urbanas inundadas." }
      ]
    },
    "jrc-gsw-occurrence": {
      id: "jrc-gsw-occurrence",
      number: "Lámina 10",
      shortTitle: "🌊 10. Agua Superficial e Inundación (JRC)",
      title: "Ocurrencia Histórica de Agua Superficial y Huella de Inundación (EC JRC / Copernicus)",
      sensor: "Joint Research Centre (JRC) de la Comisión Europea · Global Surface Water (Serie multitemporal 1984–2021)",
      formula: "Frecuencia porcentual (0–100%) de presencia de lámina de agua y huella de extensión máxima sobre relieve base",
      selectorLabel: "🎛️ Seleccionar capa hidrológica de JRC Global Surface Water:",
      defaultVariant: "jrc-gsw-occurrence",
      variants: [
        {
          key: "jrc-gsw-occurrence",
          pill: "Ocurrencia Histórica (0–100%)",
          label: "JRC Agua Superficial · Ocurrencia Histórica e Inundación (1984–2021 · 0–100%)",
          title: "Ocurrencia Histórica de Agua Superficial y Frecuencia de Inundación (EC JRC / Copernicus)",
          formula: "Frecuencia porcentual (0–100%) de presencia de lámina de agua detectada por píxel sobre relieve base"
        },
        {
          key: "jrc-gsw-extent",
          pill: "Extensión Máxima de Inundación",
          label: "JRC Agua Superficial · Extensión Máxima Histórica de Agua / Inundación",
          title: "Extensión Máxima Histórica de Agua Superficial y Desbordamiento (EC JRC / Copernicus)",
          formula: "Máscara binaria de huella máxima histórica donde se ha detectado agua superficial al menos una vez (1984–2021)",
          swatches: [
            { color: "#0055FF", label: "Huella Máxima de Agua / Inundación (#0055FF)", desc: "Toda superficie donde el registro satelital ha detectado lámina de agua permanente, estacional o desbordamiento extremo." },
            { color: "#364564", label: "Relieve base emergido sin registro de agua", desc: "Terreno sombreado de alto contraste fuera de la envolvente histórica de inundación a 30 m." }
          ]
        }
      ],
      reading:
        "Identifica tanto los cauces fluviales y cuerpos de agua permanentes como las planicies de inundación estacional o episódica dentro de la zona de estudio, insumo crítico para evitar o mitigar asentamientos humanos en zonas inundables.",
      swatches: [
        { color: "#0000FF", label: "80% – 100% Ocurrencia (Azul puro)", desc: "Cuerpos de agua permanentes: cauce activo de ríos principales, lagos, embalses y mar." },
        { color: "#8844CC", label: "25% – 80% Ocurrencia (Violeta / Púrpura)", desc: "Cuerpos de agua estacionales, barras fluviales inundables cada época lluviosa, esteros y zonas intermareales." },
        { color: "#FF3366", label: "1% – 25% Ocurrencia (Rosa / Magenta)", desc: "Llanuras de inundación episódica donde se han registrado desbordamientos históricos durante eventos extremos." },
        { color: "#364564", label: "Fondo topográfico sin ocurrencia hídrica", desc: "Relieve emergido atenuado para destacar con alto contraste cauces y planicies inundables a 30 m." }
      ]
    },
    "gee-pixel-suelo-20m": {
      id: "gee-pixel-suelo-20m",
      number: "Lámina 11",
      shortTitle: "💰 11. Valor del Suelo Píxel 20 m (Modelo GEE)",
      title: "Superficie Continua a Nivel de Píxel (20 m) — Valor Estimado del Suelo AMSS (Google Satellite Embeddings V1 + EO)",
      sensor: "Google Earth Engine · Random Forest (200 árboles) sobre 71 predictores: Google Satellite Embeddings V1 (64 bandas) + Open Buildings 2.5D + WorldCover 10 m + VIIRS DNB + Copernicus DEM GLO-30",
      formula: "V_est(x,y) = exp(RF_log(71 bandas)) · 3.85 M píxeles a 20 m · Rango $8.66 a $471.13 USD/m² (Mediana urbana $32.34 · P95 $176.17 · P99 $317.72/m²)",
      selectorLabel: "🎛️ Seleccionar superficie continua a 20 m generada en Google Earth Engine:",
      defaultVariant: "gee-pixel-20m-urbano",
      variants: [
        {
          key: "gee-pixel-20m-urbano",
          pill: "Píxel 20 m · Urbano y Desarrollable",
          label: "Superficie Píxel 20 m · Suelo Urbano y Desarrollable (3.63 M píxeles · Pendiente < 35° sin agua)",
          title: "Superficie Continua de Valor del Suelo a 20 m · Suelo Urbano y Desarrollable (Pendiente < 35° · USD/m²)",
          formula: "Máscara de aptitud constructiva (Pendiente GLO-30 < 35° y sin agua permanente WorldCover) · 3,631,473 píxeles válidos"
        },
        {
          key: "gee-pixel-20m-potencial",
          pill: "Píxel 20 m · Potencial Completo",
          label: "Superficie Píxel 20 m · Potencial Continuo Completo (3.85 M píxeles · 100% AMSS sin máscara)",
          title: "Superficie Continua de Valor Potencial del Suelo a 20 m · Cobertura Completa AMSS (USD/m²)",
          formula: "Inferencia continua Halo = 0 en los 3,845,824 píxeles del ámbito metropolitano (1,488.8 km²)"
        }
      ],
      reading:
        "Muestra a resolución de 20 metros el gradiente continuo del valor del suelo en el AMSS obtenido mediante aprendizaje automático sobre Google Satellite Embeddings V1 y variables físicas Copernicus. Destaca el núcleo policéntrico de máxima plusvalía (San Benito, Escalón, Antiguo Cuscatlán y Santa Tecla > $300 USD/m²), los corredores logísticos e industriales intermedios ($100–$175/m²) y la transición hacia reservas volcánicas y rurales (≤ $30/m²).",
      swatches: [
        { color: "#67001F", label: "> $420 USD/m² (Granate prime · Máx. $471.13)", desc: "Núcleos corporativos y financieros de máxima capitalización (San Benito, Santa Elena, Paseo General Escalón)." },
        { color: "#B30000", label: "$300 – $420 USD/m² (Rojo carmesí)", desc: "Ejes comerciales metropolitanos primarios, subcentros de servicios y desarrollos verticales consolidados." },
        { color: "#E34A33", label: "$175 – $300 USD/m² (Rojo anaranjado)", desc: "Tejido residencial medio-alto y corredores terciarios consolidados en San Salvador, Antiguo Cuscatlán y Santa Tecla." },
        { color: "#FC8D59", label: "$100 – $175 USD/m² (Naranja coral)", desc: "Tejido urbano consolidado de densidad media, nodos distritales y parques logísticos-industriales." },
        { color: "#FDBB84", label: "$50 – $100 USD/m² (Ámbar claro)", desc: "Frentes de expansión periurbana activa sobre los corredores Norte (Apopa), Oriente (Soyapango–Ilopango) y Sur." },
        { color: "#FDD49E", label: "$30 – $50 USD/m² (Crema cálido)", desc: "Borde rururbano de baja densidad constructiva y asentamientos dispersos en piedemonte." },
        { color: "#FEF0D9", label: "≤ $30 USD/m² (Marfil · Reserva / Rural)", desc: "Suelos agrícolas, cafetales de sombra, laderas volcánicas y áreas de recarga hídrica (mínimo $8.66/m²)." }
      ]
    },
    "gee-malla-upds-suelo": {
      id: "gee-malla-upds-suelo",
      number: "Lámina 12",
      shortTitle: "🗺️ 12. Malla 250 m y 425 UPDs (Resultados GEE)",
      title: "Malla Continua Metropolitana (24,292 Celdas de 250 m) e Imputación de las 425 UPDs sin Vacíos",
      sensor: "Síntesis Zonal GEE (250 × 250 m · 6.25 ha) + Consolidación de 281 UPDs Observadas (OPAMSS / Oferta 2025) y 144 UPDs Imputadas",
      formula: "Malla: 24,292 celdas (Media $50.04 · Mediana $32.47 · P90 $93.83 · Máx. $375.90/m²) | 425 UPDs: r = 0.7816 (0 vacíos)",
      selectorLabel: "🗺️ Seleccionar capa vectorial de resultados obtenidos (clic en cualquier polígono del mapa para inspeccionar):",
      defaultVariant: "gee-malla-250m-homol",
      variants: [
        {
          key: "gee-malla-250m-homol",
          pill: "Malla 250 m · Valor USD/m²",
          label: "1. Malla Continua 250 m · Valor Estimado Homologado (24,292 celdas · USD/m²)",
          title: "Malla Continua Metropolitana 250 m · Valor Estimado del Suelo (24,292 Celdas · 0 Vacíos)",
          formula: "Reducción zonal media/mediana/DE desde píxel de 20 m sobre 24,292 celdas de 6.25 ha (148,875.1 ha totales)"
        },
        {
          key: "gee-malla-250m-tipologia",
          pill: "Malla 250 m · Régimen Urbano/Rural",
          label: "2. Malla Continua 250 m · Régimen Morfológico (Urbano Consolidado / Periurbano / Rural)",
          title: "Clasificación Morfológica de las 24,292 Celdas de 250 m (Urbano Consolidado, Periurbano y Rural)",
          formula: "Clasificación por fracción edificada 10 m y altura 2.5D Open Buildings (2,215 urbanas · 1,571 periurbanas · 20,506 rurales)",
          swatches: [
            { color: "#B91C1C", label: "Urbano Consolidado (2,215 celdas · 13,825 ha)", desc: "Fracción edificada ≥ 40% o altura media ≥ 3.5 m. Valor medio: $187.27/m² (Mediana $169.24 · P90 $302.70/m²)." },
            { color: "#F59E0B", label: "Periurbano en Transición (1,571 celdas · 9,578 ha)", desc: "Fracción edificada entre 10% y 40%. Frentes de expansión activa con valor medio de $74.35/m² (Mediana $67.49/m²)." },
            { color: "#0F766E", label: "Rural / Reserva Ambiental (20,506 celdas · 125,472 ha)", desc: "Fracción edificada < 10%. Matrices agroforestales y volcánicas con valor medio de $33.35/m² (Mediana $31.11/m²)." }
          ]
        },
        {
          key: "gee-malla-250m-quintiles",
          pill: "Malla 250 m · Quintiles P20–P80",
          label: "3. Malla Continua 250 m · Quintiles Metropolitanos (4,858 celdas por clase)",
          title: "Distribución por Quintiles Metropolitanos de Valor del Suelo (Malla 250 m · P20 a P80)",
          formula: "Cortes empíricos exactos sobre 24,292 celdas: P20=$27.46 · P40=$30.73 · P60=$34.73 · P80=$46.33 USD/m²",
          swatches: [
            { color: "#440154", label: "Quintil 5 · Superior (> $46.33 hasta $375.90/m²)", desc: "20% superior metropolitano (4,859 celdas): concentra la totalidad del tejido urbano consolidado y subcentros." },
            { color: "#3B528B", label: "Quintil 4 · Medio-Alto ($34.74 – $46.33/m²)", desc: "Coronas periurbanas inmediatas y corredores secundarios en proceso de densificación." },
            { color: "#21918C", label: "Quintil 3 · Intermedio ($30.74 – $34.73/m²)", desc: "Transición agrourbana accesible y valles intermedios." },
            { color: "#5EC962", label: "Quintil 2 · Medio-Bajo ($27.47 – $30.73/m²)", desc: "Terrenos rurales de pendiente moderada y cafetales periféricos." },
            { color: "#FDE725", label: "Quintil 1 · Base (≤ $27.46/m²)", desc: "Zonas montañosas escarpadas, cañones y áreas de máxima restricción topográfica." }
          ]
        },
        {
          key: "gee-upd-425-fin",
          pill: "425 UPDs · Valor Integrado (0 Vacíos)",
          label: "4. 425 UPDs Completas · Valor Integrado 2025 sin Vacíos (Observado + Imputado GEE)",
          title: "Cobertura Completa de las 425 UPDs del AMSS · Valor del Suelo Integrado sin Vacíos (USD/m²)",
          formula: "VAL_FIN_M2 = Valor observado en 281 UPDs + Imputación satelital GEE en 144 UPDs (r = 0.7816 · sesgo mediana -0.79%)",
          swatches: [
            { color: "#B30000", label: "Alto (> $300 USD/m² · 37 UPDs)", desc: "UPDs corporativas y residenciales prime del eje central-poniente." },
            { color: "#E34A33", label: "Medio-Alto ($175 – $300 USD/m² · 53 UPDs)", desc: "UPDs residenciales consolidadas y subcentros comerciales." },
            { color: "#FC8D59", label: "Medio ($100 – $175 USD/m² · 67 UPDs)", desc: "Tejido urbano intermedio y corredores industriales-logísticos." },
            { color: "#FDCC8A", label: "Medio-Bajo ($50 – $100 USD/m² · 91 UPDs)", desc: "Sectores periféricos consolidados y cabeceras distritales." },
            { color: "#FEF0D9", label: "Bajo (≤ $50 USD/m² · 177 UPDs)", desc: "UPDs periurbanas extensivas y sectores rurales imputados sin muestra previa." }
          ]
        },
        {
          key: "gee-upd-425-origen",
          pill: "425 UPDs · Observado vs. Imputado",
          label: "5. 425 UPDs · Mapa de Procedencia: 281 Observadas vs. 144 Imputadas por Modelo GEE",
          title: "Cierre de Brecha Cartográfica: 281 UPDs Observadas vs. 144 UPDs Imputadas por Satélite (57,648 ha)",
          formula: "ORIGEN_FIN: 66.1% con evidencia directa (OPAMSS / Oferta 2025) + 33.9% completado mediante Google Satellite Embeddings V1",
          swatches: [
            { color: "#0F766E", label: "Observado / Calibrado 2025 (281 UPDs · 66.1%)", desc: "Unidades con registros verificados de oferta inmobiliaria 2025 y/o permisos OPAMSS (mediana observada $103.66/m²)." },
            { color: "#F59E0B", label: "Imputado por Modelo GEE (144 UPDs · 33.9% · 57,648 ha)", desc: "Unidades previamente vacías completadas por el modelo GEE (mediana imputada $35.14/m², rango $17.75–$267.21/m²)." }
          ]
        },
        {
          key: "lisa-mercado-2025",
          pill: "Clusters LISA · Oferta 2025",
          label: "6. Autocorrelación Espacial LISA (Moran Local) · Precios de Oferta Inmobiliaria 2025",
          title: "Clusters Espaciales LISA (Índice Local de Moran) · Oferta Inmobiliaria 2025 en 265 UPDs",
          formula: "Cuadrantes de autocorrelación espacial bivariada/local I_i sobre log-precios de oferta 2025",
          swatches: [
            { color: "#D7191C", label: "Alto-Alto · Hotspot de Plusvalía (122 UPDs)", desc: "Concentración estadísticamente contigua de valores altos en el corredor poniente-suroeste." },
            { color: "#2C7BB6", label: "Bajo-Bajo · Coldspot Periférico (78 UPDs)", desc: "Agrupamiento homogéneo de valores bajos en coronas norte y nororiente." },
            { color: "#ABD9E9", label: "Bajo-Alto · Isla de Menor Valor (33 UPDs)", desc: "UPDs de menor precio relativo rodeadas de vecindarios de alta valorización (potencial de recualificación)." },
            { color: "#FDAE61", label: "Alto-Bajo · Subcentro Aislado (32 UPDs)", desc: "Polos comerciales o logísticos de alto valor inmersos en entornos periféricos de menor precio." }
          ]
        }
      ],
      reading:
        "Integra en un solo lienzo interactivo la teselación continua de 24,292 celdas de 250 m y las 425 Unidades de Planificación Detallada (UPDs) del AMSS sin un solo vacío de información. Haz clic sobre cualquier celda o polígono en el mapa para consultar su valor estimado en USD/m², mediana, desviación estándar intra-celda, régimen morfológico, altura edificada 2.5D y distrito.",
      swatches: [
        { color: "#990000", label: "Nodos Prime (> $300 USD/m² · 241 celdas)", desc: "Subcentros corporativos y residenciales de máxima densidad económica (hasta $375.90/m² a escala de celda)." },
        { color: "#E34A33", label: "Urbano Alto ($175 – $300 USD/m² · 836 celdas)", desc: "Áreas urbanas consolidadas de alta renta en Antiguo Cuscatlán, San Salvador y Santa Tecla." },
        { color: "#FC8D59", label: "Urbano Medio ($100 – $175 USD/m² · 1,218 celdas)", desc: "Tejido residencial e industrial consolidado sobre ejes viales estructurantes." },
        { color: "#FDBB84", label: "Transición ($50 – $100 USD/m² · 2,215 celdas)", desc: "Bordes urbanos y corredores de expansión metropolitana." },
        { color: "#FDD49E", label: "Periurbano Bajo ($30 – $50 USD/m² · 11,225 celdas)", desc: "Piedemonte y transición agrourbana de baja compacidad." },
        { color: "#FEF0D9", label: "Reserva / Rural (≤ $30 USD/m² · 8,557 celdas)", desc: "Suelos rurales, forestales y relieves volcánicos del AMSS ampliado." }
      ]
    }
  };

  function makeAtlasNumericStepExpr(propName, breaks, colors, noDataColor) {
    var stepArr = ["step", ["coalesce", ["to-number", ["get", propName]], 0], colors[0]];
    for (var i = 0; i < breaks.length; i++) {
      stepArr.push(breaks[i], colors[i + 1]);
    }
    return [
      "case",
      ["all", ["has", propName], ["!=", ["get", propName], null], [">", ["to-number", ["get", propName]], 0]],
      stepArr,
      noDataColor || "#CBD5E1"
    ];
  }

  var ATLAS_LOCAL_VARIANTS = {
    "gee-pixel-20m-urbano": {
      kind: "image_overlay",
      imagePath: "geovisor/data/amss_pixel_20m_urbano.png",
      bounds: [-89.628689, 13.418135, -89.025201, 13.920473],
      opacity: 0.9,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    },
    "gee-pixel-20m-potencial": {
      kind: "image_overlay",
      imagePath: "geovisor/data/amss_pixel_20m_potencial.png",
      bounds: [-89.628689, 13.418135, -89.025201, 13.920473],
      opacity: 0.9,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    },
    "gee-malla-250m-homol": {
      kind: "geojson",
      sourcePath: "geovisor/capas/amss_malla_continua_250m.geojson",
      badge: "ATLAS GEE · MALLA CONTINUA 250 M",
      fillExpr: makeAtlasNumericStepExpr("VAL_EST_M2", [30, 50, 100, 175, 300], ["#FEF0D9", "#FDD49E", "#FDBB84", "#FC8D59", "#E34A33", "#990000"], "#CBD5E1"),
      fillOpacity: 0.85,
      fineMesh: true,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    },
    "gee-malla-250m-tipologia": {
      kind: "geojson",
      sourcePath: "geovisor/capas/amss_malla_continua_250m.geojson",
      badge: "ATLAS GEE · RÉGIMEN MORFOLÓGICO 250 M",
      fillExpr: [
        "match",
        ["get", "TIPO_SUELO"],
        "URBANO_CONSOLIDADO", "#B91C1C",
        "PERIURBANO_TRANSICION", "#F59E0B",
        "RURAL_RESERVA", "#0F766E",
        "#CBD5E1"
      ],
      fillOpacity: 0.82,
      fineMesh: true,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    },
    "gee-malla-250m-quintiles": {
      kind: "geojson",
      sourcePath: "geovisor/capas/amss_malla_continua_250m.geojson",
      badge: "ATLAS GEE · QUINTILES METROPOLITANOS 250 M",
      fillExpr: makeAtlasNumericStepExpr("VAL_EST_M2", [27.46, 30.73, 34.73, 46.33], ["#FDE725", "#5EC962", "#21918C", "#3B528B", "#440154"], "#CBD5E1"),
      fillOpacity: 0.84,
      fineMesh: true,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    },
    "gee-upd-425-fin": {
      kind: "geojson",
      sourcePath: "geovisor/capas/amss_upd_425_imputadas.geojson",
      badge: "ATLAS GEE · 425 UPDS INTEGRADAS (0 VACÍOS)",
      fillExpr: makeAtlasNumericStepExpr("VAL_FIN_M2", [50, 100, 175, 300], ["#FEF0D9", "#FDCC8A", "#FC8D59", "#E34A33", "#B30000"], "#CBD5E1"),
      fillOpacity: 0.84,
      fineMesh: false,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    },
    "gee-upd-425-origen": {
      kind: "geojson",
      sourcePath: "geovisor/capas/amss_upd_425_imputadas.geojson",
      badge: "ATLAS GEE · COBERTURA OBSERVADA VS. IMPUTADA",
      fillExpr: [
        "match",
        ["get", "ORIGEN_FIN"],
        "OBSERVADO", "#0F766E",
        "IMPUTADO_MODELO_GEE", "#F59E0B",
        "#94A3B8"
      ],
      fillOpacity: 0.84,
      fineMesh: false,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    },
    "lisa-mercado-2025": {
      kind: "geojson",
      sourcePath: "geovisor/capas/LISA_PRECIOS_2025.geojson",
      badge: "ATLAS · AUTOCORRELACIÓN ESPACIAL LISA 2025",
      fillExpr: [
        "match",
        ["get", "cuadrante_"],
        "Alto-Alto", "#D7191C",
        "Bajo-Bajo", "#2C7BB6",
        "Bajo-Alto", "#ABD9E9",
        "Alto-Bajo", "#FDAE61",
        "#CBD5E1"
      ],
      fillOpacity: 0.84,
      fineMesh: false,
      districtOutlinePath: "geovisor/capas/amss_14_distritos.geojson"
    }
  };

  function initCopernicusAtlasViewer() {
    var mapContainer = document.getElementById("atlas-copernicus-map");
    if (!mapContainer) return;

    var shellEl = mapContainer.closest(".atlas-copernicus-shell") || mapContainer;
    var detailTitleEl = document.getElementById("atlas-plate-title");
    var detailBadgeEl = document.getElementById("atlas-plate-badge");
    var detailSensorEl = document.getElementById("atlas-plate-sensor");
    var detailFormulaEl = document.getElementById("atlas-plate-formula");
    var detailReadingEl = document.getElementById("atlas-plate-reading");
    var detailSwatchesEl = document.getElementById("atlas-plate-swatches");
    var toolbarTitleEl = document.getElementById("atlas-toolbar-plate-label");

    var toolbarVariantSelectEl = document.getElementById("atlas-toolbar-variant-select");
    var panelVariantSelectEl = document.getElementById("atlas-panel-variant-select");
    var panelVariantLabelEl = document.getElementById("atlas-variant-selector-label");
    var panelVariantPillsEl = document.getElementById("atlas-variant-pills");

    var toolbarPlayBtnEl = document.getElementById("atlas-toolbar-play-btn");
    var panelPlayBtnEl = document.getElementById("atlas-panel-play-btn");
    var timelineBoxEl = document.getElementById("atlas-timeline-controls");
    var stepPrevBtnEl = document.getElementById("atlas-step-prev");
    var stepNextBtnEl = document.getElementById("atlas-step-next");
    var speedSelectEl = document.getElementById("atlas-play-speed");
    var timelineSliderEl = document.getElementById("atlas-timeline-slider");
    var timelineCounterEl = document.getElementById("atlas-timeline-counter");
    var mapYearBadgeEl = document.getElementById("atlas-map-year-badge");
    var mapYearTopEl = document.getElementById("atlas-map-year-top");
    var mapYearMainEl = document.getElementById("atlas-map-year-main");

    var maskCheckEl = document.getElementById("atlas-toggle-mask");
    var maskOpEl = document.getElementById("atlas-mask-opacity");
    var fitBtnEl = document.getElementById("atlas-fit-bounds");
    var fsBtnEl = document.getElementById("atlas-toggle-fullscreen");
    var projectSelectEl = document.getElementById("atlas-project-select");

    var plateTabs = Array.prototype.slice.call(document.querySelectorAll("[data-atlas-plate]"));
    var plateJumpBtns = Array.prototype.slice.call(document.querySelectorAll("[data-atlas-plate-select]"));

    var baseUrl = document.body.getAttribute("data-baseurl") || mapContainer.getAttribute("data-baseurl") || "";
    if (!baseUrl) {
      var gvScripts = document.querySelectorAll('script[src*="assets/js/geovisor.js"]');
      if (gvScripts.length) {
        try {
          var sPath = new URL(gvScripts[gvScripts.length - 1].src, window.location.href).pathname;
          baseUrl = sPath.replace(/assets\/js\/geovisor\.js.*$/i, "") || "/";
        } catch (e) {
          baseUrl = "/";
        }
      } else {
        baseUrl = "/";
      }
    }
    if (baseUrl.charAt(0) !== "/") baseUrl = "/" + baseUrl;
    if (baseUrl.charAt(baseUrl.length - 1) !== "/") baseUrl = baseUrl + "/";
    var initialCenterAttr = mapContainer.getAttribute("data-center");
    var initialZoomAttr = mapContainer.getAttribute("data-zoom");
    var currentCenter = [-84.0, 10.0];
    if (initialCenterAttr) {
      try {
        currentCenter = JSON.parse(initialCenterAttr);
      } catch (e) {}
    }
    var currentZoom = initialZoomAttr ? parseFloat(initialZoomAttr) : 12;
    var projPlatesScript = document.getElementById("atlas-project-plates-json");
    if (projPlatesScript) {
      try {
        var projPlatesArr = JSON.parse(projPlatesScript.textContent || "[]");
        if (Array.isArray(projPlatesArr)) {
          projPlatesArr.forEach(function (pl) {
            if (!pl || !pl.key) return;
            var varKey = pl.key + "-v1";
            ATLAS_PLATES[pl.key] = {
              id: pl.key,
              number: pl.number || "Parte I",
              shortTitle: pl.shortTitle || pl.title,
              title: pl.title || pl.shortTitle,
              sensor: pl.sensor || "Integración Copernicus + Datos Locales del Proyecto",
              formula: pl.formula || "Modelado espacial aplicado sobre la zona de estudio",
              selectorLabel: "📌 Lámina analítica específica desarrollada en este proyecto (Parte I del Atlas):",
              defaultVariant: varKey,
              variants: [
                {
                  key: varKey,
                  pill: pl.number || "Parte I",
                  label: pl.title || pl.shortTitle,
                  title: pl.title || pl.shortTitle,
                  formula: pl.formula || ""
                }
              ],
              reading: pl.reading || "",
              swatches: pl.swatches || []
            };
            ATLAS_LOCAL_VARIANTS[varKey] = {
              kind: "image_overlay",
              imagePath: pl.imageRel,
              coordinates: pl.coords,
              opacity: 0.94,
              districtOutlinePath: pl.outlineRel || null
            };
          });
        }
      } catch (e) {}
    }

    var defaultPlateAttr = mapContainer.getAttribute("data-default-plate");
    var currentPlateKey = (defaultPlateAttr && ATLAS_PLATES[defaultPlateAttr])
      ? defaultPlateAttr
      : (plateTabs.length ? plateTabs[0].getAttribute("data-atlas-plate") : "sentinel2-cloudless");
    if (!ATLAS_PLATES[currentPlateKey]) currentPlateKey = "sentinel2-cloudless";
    var currentVariantKey = ATLAS_PLATES[currentPlateKey].defaultVariant;
    var currentPerimeterGeoJson = null;
    var allHubPerimeters = null;
    var atlasMap = null;
    var mountedVariantMap = {};
    var atlasGeoJsonCache = {};
    var isPlayingTimeline = false;
    var playTimerId = null;

    var perimJsonScript = document.getElementById("atlas-perimeters-json");
    if (perimJsonScript) {
      try {
        allHubPerimeters = JSON.parse(perimJsonScript.textContent || "{}");
      } catch (e) {
        allHubPerimeters = null;
      }
    }

    function findVariantObj(plateObj, variantKey) {
      var list = plateObj.variants || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].key === variantKey) return list[i];
      }
      return list[0] || { key: plateObj.defaultVariant, label: plateObj.title, pill: "Principal" };
    }

    // Devuelve la secuencia cronológica (del año más antiguo al más reciente) si el tema es multitemporal
    function getTimelineSequence(plateObj, activeVarKey) {
      if (!plateObj) return [];
      var pid = plateObj.id;
      if (
        pid === "copernicus-dem-glo30" ||
        pid === "jrc-gsw-occurrence" ||
        pid === "gee-pixel-suelo-20m" ||
        pid === "gee-malla-upds-suelo" ||
        pid.indexOf("proj-") === 0 ||
        (plateObj.variants || []).length <= 1
      ) {
        return [];
      }
      if (pid === "s2-l2a-composites") {
        var isSwir = activeVarKey && activeVarKey.indexOf("s2-l2a-swir") === 0;
        return isSwir
          ? ["s2-l2a-swir-2020", "s2-l2a-swir-2022", "s2-l2a-swir-2024", "s2-l2a-swir"]
          : ["s2-l2a-falsecolor-2020", "s2-l2a-falsecolor-2022", "s2-l2a-falsecolor-2024", "s2-l2a-falsecolor"];
      }
      if (pid === "s1-rtc-falsecolor") {
        var isVv = activeVarKey && activeVarKey.indexOf("s1-rtc-vv") === 0;
        return isVv
          ? ["s1-rtc-vv-2020", "s1-rtc-vv-2024", "s1-rtc-vv"]
          : ["s1-rtc-falsecolor-2020", "s1-rtc-falsecolor-2022", "s1-rtc-falsecolor-2024", "s1-rtc-falsecolor"];
      }
      var keys = (plateObj.variants || []).map(function (v) {
        return v.key;
      });
      return keys.slice().reverse();
    }

    function updatePlayUiState() {
      var p = ATLAS_PLATES[currentPlateKey] || ATLAS_PLATES["sentinel2-cloudless"];
      var seq = getTimelineSequence(p, currentVariantKey);
      var hasSeq = seq.length > 1;

      if (timelineBoxEl) {
        timelineBoxEl.classList.toggle("hidden", !hasSeq);
      }
      if (toolbarPlayBtnEl) {
        toolbarPlayBtnEl.classList.toggle("hidden", !hasSeq);
        toolbarPlayBtnEl.classList.toggle("is-playing", isPlayingTimeline && hasSeq);
        toolbarPlayBtnEl.textContent = isPlayingTimeline ? "⏸ Pausar serie" : "▶ Reproducir serie";
      }
      if (panelPlayBtnEl) {
        panelPlayBtnEl.classList.toggle("is-playing", isPlayingTimeline && hasSeq);
        panelPlayBtnEl.textContent = isPlayingTimeline ? "⏸ Pausar animación" : "▶ Reproducir secuencia";
      }

      var vObj = findVariantObj(p, currentVariantKey);
      var idx = seq.indexOf(currentVariantKey);
      if (idx < 0) idx = seq.length - 1;

      if (timelineSliderEl && hasSeq) {
        timelineSliderEl.max = String(seq.length - 1);
        timelineSliderEl.value = String(idx);
      }
      if (timelineCounterEl && hasSeq) {
        timelineCounterEl.textContent = (idx + 1) + " / " + seq.length;
      }

      if (mapYearBadgeEl) {
        mapYearBadgeEl.classList.toggle("is-playing", isPlayingTimeline && hasSeq);
        if ( mapYearTopEl ) {
          mapYearTopEl.textContent = hasSeq
            ? (isPlayingTimeline ? "▶ ANIMACIÓN MULTITEMPORAL (" + (idx + 1) + "/" + seq.length + ")" : "SERIE MULTITEMPORAL (" + (idx + 1) + "/" + seq.length + ")")
            : p.number.toUpperCase();
        }
        if (mapYearMainEl) {
          mapYearMainEl.textContent = vObj.pill || vObj.label;
        }
      }
    }

    function stopTimelinePlayback() {
      isPlayingTimeline = false;
      if (playTimerId) {
        clearTimeout(playTimerId);
        playTimerId = null;
      }
      updatePlayUiState();
    }

    function stepTimelineBy(delta) {
      var p = ATLAS_PLATES[currentPlateKey] || ATLAS_PLATES["sentinel2-cloudless"];
      var seq = getTimelineSequence(p, currentVariantKey);
      if (seq.length <= 1) return;
      var idx = seq.indexOf(currentVariantKey);
      if (idx < 0) idx = 0;
      var nextIdx = (idx + delta + seq.length) % seq.length;
      activateAtlasPlate(currentPlateKey, seq[nextIdx], true);
    }

    function scheduleNextTimelineStep() {
      if (!isPlayingTimeline) return;
      if (playTimerId) clearTimeout(playTimerId);
      var delayMs = speedSelectEl ? parseInt(speedSelectEl.value, 10) || 1800 : 1800;
      playTimerId = setTimeout(function () {
        if (!isPlayingTimeline) return;
        stepTimelineBy(1);
        scheduleNextTimelineStep();
      }, delayMs);
    }

    function toggleTimelinePlayback() {
      var p = ATLAS_PLATES[currentPlateKey] || ATLAS_PLATES["sentinel2-cloudless"];
      var seq = getTimelineSequence(p, currentVariantKey);
      if (seq.length <= 1) return;

      if (isPlayingTimeline) {
        stopTimelinePlayback();
        return;
      }

      isPlayingTimeline = true;
      // Pre-registrar todos los años de la secuencia para transición instantánea sin esperas
      seq.forEach(function (vk) {
        resolveBasemapTiles(vk, function () {});
      });

      // Si estamos en el último año de la serie al pulsar Play, comenzar desde el primer año (el más antiguo)
      var idx = seq.indexOf(currentVariantKey);
      if (idx === seq.length - 1 || idx < 0) {
        activateAtlasPlate(currentPlateKey, seq[0], true);
      } else {
        updatePlayUiState();
      }
      scheduleNextTimelineStep();
    }

    function populateVariantControls(plateObj, activeVarKey) {
      var variants = plateObj.variants || [];
      if (panelVariantLabelEl) {
        panelVariantLabelEl.textContent = plateObj.selectorLabel || "Seleccionar año o variante de la capa:";
      }
      [toolbarVariantSelectEl, panelVariantSelectEl].forEach(function (sel) {
        if (!sel) return;
        sel.innerHTML = "";
        variants.forEach(function (v) {
          var opt = document.createElement("option");
          opt.value = v.key;
          opt.textContent = v.label;
          if (v.key === activeVarKey) opt.selected = true;
          sel.appendChild(opt);
        });
      });

      if (panelVariantPillsEl) {
        panelVariantPillsEl.innerHTML = "";
        variants.forEach(function (v) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "atlas-variant-pill" + (v.key === activeVarKey ? " is-active" : "");
          btn.textContent = v.pill || v.label;
          btn.setAttribute("data-variant-key", v.key);
          btn.addEventListener("click", function () {
            stopTimelinePlayback();
            activateAtlasPlate(plateObj.id, v.key, false);
          });
          panelVariantPillsEl.appendChild(btn);
        });
      }
    }

    function renderPlateInfoPanel(plateKey, variantKey) {
      var p = ATLAS_PLATES[plateKey] || ATLAS_PLATES["sentinel2-cloudless"];
      var vObj = findVariantObj(p, variantKey || p.defaultVariant);
      var effectiveSwatches = vObj.swatches || p.swatches || [];

      populateVariantControls(p, vObj.key);
      updatePlayUiState();

      if (detailBadgeEl) {
        detailBadgeEl.textContent = p.number + " · " + (vObj.pill || "Dato Abierto Copernicus");
      }
      if (detailTitleEl) detailTitleEl.textContent = vObj.title || p.title;
      if (detailSensorEl) detailSensorEl.textContent = p.sensor;
      if (detailFormulaEl) detailFormulaEl.textContent = vObj.formula || p.formula;
      if (detailReadingEl) detailReadingEl.textContent = p.reading;
      if (toolbarTitleEl) toolbarTitleEl.textContent = p.shortTitle;

      if (detailSwatchesEl) {
        detailSwatchesEl.innerHTML = "";
        effectiveSwatches.forEach(function (sw) {
          var li = document.createElement("li");
          li.className = "atlas-swatch-item";

          var chip = document.createElement("span");
          chip.className = "atlas-swatch-chip";
          chip.style.backgroundColor = sw.color;

          var lbl = document.createElement("span");
          lbl.className = "atlas-swatch-label";
          lbl.textContent = sw.label;

          var desc = document.createElement("span");
          desc.className = "atlas-swatch-desc";
          desc.textContent = sw.desc;

          li.appendChild(chip);
          li.appendChild(lbl);
          li.appendChild(desc);
          detailSwatchesEl.appendChild(li);
        });
      }

      plateTabs.forEach(function (btn) {
        var active = btn.getAttribute("data-atlas-plate") === plateKey;
        btn.classList.toggle("is-active", active);
      });
    }

    function refreshMaskOnAtlasMap(shouldFit) {
      if (!atlasMap || !currentPerimeterGeoJson) return;
      var enabled = maskCheckEl ? maskCheckEl.checked : true;
      var op = maskOpEl ? parseFloat(maskOpEl.value) : 0.88;
      applyStudyAreaMaskToMap(atlasMap, currentPerimeterGeoJson, enabled, op);
      if (shouldFit) {
        var b = computeGeoJsonBounds(currentPerimeterGeoJson);
        if (b) {
          atlasMap.fitBounds(b, { padding: 42, maxZoom: 15.2, duration: 700 });
        }
      }
    }

    // Motor de capas rásters sin parpadeo (flicker-free) para animaciones multitemporales fluidas:
    // En lugar de destruir el estilo con setStyle(), monta las fuentes rásters debajo de la máscara
    // del perímetro de estudio y realiza fundido cruzado (cross-fade) de opacidad.
    function clearMountedVariantsFromOtherPlates(keepPlateKey) {
      if (!atlasMap) return;
      var keepObj = ATLAS_PLATES[keepPlateKey];
      var allowed = {};
      if (keepObj && keepObj.variants) {
        keepObj.variants.forEach(function (v) {
          allowed[v.key] = true;
        });
      }
      Object.keys(mountedVariantMap).forEach(function (vk) {
        if (allowed[vk]) return;
        var info = mountedVariantMap[vk];
        (info.layerIds || []).forEach(function (lid) {
          if (atlasMap.getLayer(lid)) atlasMap.removeLayer(lid);
        });
        (info.sourceIds || []).forEach(function (sid) {
          if (atlasMap.getSource(sid)) atlasMap.removeSource(sid);
        });
        delete mountedVariantMap[vk];
      });
    }

    function fetchAtlasGeoJson(relPath, cb) {
      if (atlasGeoJsonCache[relPath]) {
        cb(atlasGeoJsonCache[relPath]);
        return;
      }
      var resolvedUrl = /^https?:\/\//i.test(relPath)
        ? relPath
        : new URL(relPath, window.location.origin + baseUrl).href;
      fetch(resolvedUrl)
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (gj) {
          if (gj) atlasGeoJsonCache[relPath] = gj;
          cb(gj);
        })
        .catch(function () {
          cb(null);
        });
    }

    function attachAtlasFeaturePopup(layerId, badgeTitle) {
      if (!atlasMap) return;
      atlasMap.on("click", layerId, function (e) {
        if (e.originalEvent && e.originalEvent._atlasPopupHandled) return;
        if (!e.features || !e.features.length) return;
        if (e.originalEvent) e.originalEvent._atlasPopupHandled = true;
        var props = e.features[0].properties || {};
        var nameVal = props.NAME_UPD || props.nombre || "Polígono Atlas";
        var rows = [];
        if (props.ID_CELDA !== undefined && props.ID_CELDA !== null) {
          nameVal = "Celda " + String(props.ID_CELDA) + (props.DISTRITO ? " · " + String(props.DISTRITO) : "");
          rows.push(["Valor estimado (Media celda)", "$" + Number(props.VAL_EST_M2 || 0).toFixed(2) + " USD/m²"]);
          rows.push([
            "Mediana / Potencial celda",
            "$" + Number(props.VAL_MED_M2 || 0).toFixed(2) + " / $" + Number(props.VAL_POT_M2 || 0).toFixed(2) + " USD/m²"
          ]);
          rows.push(["Dispersión intra-celda (DE)", "± $" + Number(props.VAL_STD_M2 || 0).toFixed(2) + " USD/m²"]);
          rows.push(["Régimen morfológico GEE", String(props.TIPO_SUELO || "—").replace(/_/g, " ")]);
          var pctEd = props.PCT_EDIF !== undefined && props.PCT_EDIF !== null
            ? Number(props.PCT_EDIF)
            : Number(props.FRAC_EDIF || 0) * 100;
          rows.push(["Fracción construida (10 m)", pctEd.toFixed(1) + "%"]);
          rows.push(["Altura media 2.5D (Open Buildings)", Number(props.ALT_EDIF_M || 0).toFixed(2) + " m"]);
          rows.push(["Pendiente media (GLO-30)", Number(props.PEND_DEG || 0).toFixed(1) + "°"]);
          rows.push(["Distrito / Superficie", (props.DISTRITO || "AMSS") + " · " + Number(props.AREA_HA || 0).toFixed(2) + " ha"]);
        } else if (props.ORIGEN_FIN !== undefined && props.ORIGEN_FIN !== null) {
          nameVal = (props.NAME_UPD || ("UPD #" + (props.OBJECTID || ""))) + (props.DISTRITO ? " · " + String(props.DISTRITO) : "");
          rows.push(["Valor integrado 2025 (VAL_FIN_M2)", "$" + Number(props.VAL_FIN_M2 || 0).toFixed(2) + " USD/m²"]);
          rows.push([
            "Fuente de consolidación",
            props.ORIGEN_FIN === "OBSERVADO" ? "Observado / Calibrado 2025" : "Imputado por Modelo Satelital GEE"
          ]);
          rows.push(["Predicción satelital GEE (VAL_MOD_M2)", "$" + Number(props.VAL_MOD_M2 || 0).toFixed(2) + " USD/m²"]);
          rows.push(["Tipología UPD / Superficie", (props.TIPO || "—") + " · " + Number(props.AREA_HA || 0).toFixed(2) + " ha"]);
          rows.push(["Distrito / Municipio", (props.DISTRITO || "—") + (props.MUNICIPIO ? " · " + props.MUNICIPIO : "")]);
        } else if (props.promedio_2025 !== undefined && props.promedio_2025 !== null) {
          nameVal = (props.NAME_UPD || "UPD") + (props.nomb_distr ? " · " + String(props.nomb_distr) : "");
          rows.push(["Precio promedio 2025 (Oferta)", "$" + Number(props.promedio_2025).toFixed(2) + " USD/m²"]);
          if (props.cuadrante_) rows.push(["Cuadrante LISA (Moran)", String(props.cuadrante_)]);
          if (props.cluster_p05) rows.push(["Significancia LISA (p≤0.05)", String(props.cluster_p05)]);
          if (props.moran_loca !== undefined) rows.push(["I de Moran Local", String(props.moran_loca) + " (p=" + props.p_perm_loc + ")"]);
        }
        if (!rows.length) rows.push(["Estado", "Capa temática activa en el Atlas"]);
        var dom = createSafePopupElement(String(nameVal), rows.slice(0, 9), badgeTitle || "ATLAS TEMÁTICO AMSS");
        new window.maplibregl.Popup({ maxWidth: "350px" }).setLngLat(e.lngLat).setDOMContent(dom).addTo(atlasMap);
      });
      atlasMap.on("mouseenter", layerId, function () {
        atlasMap.getCanvas().style.cursor = "pointer";
      });
      atlasMap.on("mouseleave", layerId, function () {
        atlasMap.getCanvas().style.cursor = "";
      });
    }

    function syncMountedVariantVisibilities(activeKey) {
      if (!atlasMap) return;
      Object.keys(mountedVariantMap).forEach(function (vk) {
        var info = mountedVariantMap[vk];
        var isTarget = vk === activeKey;
        (info.specs || []).forEach(function (sp) {
          if (!atlasMap.getLayer(sp.id)) return;
          if (sp.isVector) {
            atlasMap.setLayoutProperty(sp.id, "visibility", isTarget ? "visible" : "none");
          } else {
            atlasMap.setPaintProperty(sp.id, "raster-opacity", isTarget ? sp.targetOpacity : 0);
          }
        });
      });
    }

    function mountDistrictOutlineForAtlasVariant(prefix, distPath, beforeLayerId, srcIds, lyrSpecs, variantKey) {
      if (!distPath || !atlasMap) return;
      fetchAtlasGeoJson(distPath, function (distGj) {
        if (!distGj || !atlasMap || !mountedVariantMap[variantKey]) return;
        var dSrc = prefix + "-dist-src";
        var dLyr = prefix + "-dist-line";
        var effBefore = atlasMap.getLayer("study-area-mask-fill") ? "study-area-mask-fill" : beforeLayerId;
        if (!atlasMap.getSource(dSrc)) {
          atlasMap.addSource(dSrc, { type: "geojson", data: distGj });
          srcIds.push(dSrc);
        }
        if (!atlasMap.getLayer(dLyr)) {
          atlasMap.addLayer(
            {
              id: dLyr,
              type: "line",
              source: dSrc,
              layout: { visibility: currentVariantKey === variantKey ? "visible" : "none" },
              paint: { "line-color": "#0F172A", "line-width": 1.15, "line-opacity": 0.68 }
            },
            effBefore
          );
          lyrSpecs.push({ id: dLyr, isVector: true });
          mountedVariantMap[variantKey].layerIds.push(dLyr);
        }
      });
    }

    function mountAndCrossfadeVariantOnAtlasMap(variantKey) {
      if (!atlasMap) return;

      // Caso A: Capas locales empíricas del Modelo de Valor del Suelo GEE y LISA
      if (ATLAS_LOCAL_VARIANTS[variantKey]) {
        if (!atlasMap.isStyleLoaded()) {
          atlasMap.once("load", function () {
            mountAndCrossfadeVariantOnAtlasMap(variantKey);
          });
          return;
        }
        var localCfg = ATLAS_LOCAL_VARIANTS[variantKey];
        var beforeLayerId = atlasMap.getLayer("study-area-mask-fill") ? "study-area-mask-fill" : undefined;

        if (mountedVariantMap[variantKey]) {
          syncMountedVariantVisibilities(variantKey);
          return;
        }

        var prefix = "atlas-loc-" + variantKey;
        var srcIds = [];
        var lyrSpecs = [];
        var cleanLightTiles = [
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        ];
        var baseSrc = prefix + "-base-src";
        var baseLyr = prefix + "-base-lyr";
        atlasMap.addSource(baseSrc, { type: "raster", tiles: cleanLightTiles, tileSize: 256 });
        atlasMap.addLayer(
          {
            id: baseLyr,
            type: "raster",
            source: baseSrc,
            minzoom: 0,
            maxzoom: 19,
            paint: {
              "raster-opacity": 0,
              "raster-saturation": -0.82,
              "raster-contrast": -0.12,
              "raster-brightness-min": 0.18,
              "raster-fade-duration": 220
            }
          },
          beforeLayerId
        );
        srcIds.push(baseSrc);
        lyrSpecs.push({ id: baseLyr, targetOpacity: 0.96, isVector: false });

        if (localCfg.kind === "image_overlay") {
          var imgUrl = new URL(localCfg.imagePath, window.location.origin + baseUrl).href;
          var b = localCfg.bounds;
          var quad = Array.isArray(localCfg.coordinates) && localCfg.coordinates.length === 4
            ? localCfg.coordinates
            : [
                [b[0], b[3]],
                [b[2], b[3]],
                [b[2], b[1]],
                [b[0], b[1]]
              ];
          var imgSrc = prefix + "-img-src";
          var imgLyr = prefix + "-img-lyr";
          atlasMap.addSource(imgSrc, { type: "image", url: imgUrl, coordinates: quad });
          atlasMap.addLayer(
            {
              id: imgLyr,
              type: "raster",
              source: imgSrc,
              paint: { "raster-opacity": 0, "raster-resampling": "linear", "raster-fade-duration": 220 }
            },
            beforeLayerId
          );
          srcIds.push(imgSrc);
          lyrSpecs.push({ id: imgLyr, targetOpacity: localCfg.opacity || 0.9, isVector: false });

          mountedVariantMap[variantKey] = {
            sourceIds: srcIds,
            layerIds: lyrSpecs.map(function (s) {
              return s.id;
            }),
            specs: lyrSpecs
          };
          mountDistrictOutlineForAtlasVariant(prefix, localCfg.districtOutlinePath, beforeLayerId, srcIds, lyrSpecs, variantKey);
          if (currentVariantKey === variantKey) {
            syncMountedVariantVisibilities(variantKey);
          }
          return;
        }

        if (localCfg.kind === "geojson") {
          mountedVariantMap[variantKey] = {
            sourceIds: srcIds,
            layerIds: lyrSpecs.map(function (s) {
              return s.id;
            }),
            specs: lyrSpecs
          };
          if (currentVariantKey === variantKey) {
            syncMountedVariantVisibilities(variantKey);
          }
          fetchAtlasGeoJson(localCfg.sourcePath, function (gj) {
            if (!gj || !atlasMap || !mountedVariantMap[variantKey]) return;
            var effBefore = atlasMap.getLayer("study-area-mask-fill") ? "study-area-mask-fill" : undefined;
            var vSrc = prefix + "-vec-src";
            var vFill = prefix + "-vec-fill";
            var vLine = prefix + "-vec-line";
            if (!atlasMap.getSource(vSrc)) {
              atlasMap.addSource(vSrc, { type: "geojson", data: gj });
              srcIds.push(vSrc);
            }
            var initVis = currentVariantKey === variantKey ? "visible" : "none";
            if (!atlasMap.getLayer(vFill)) {
              atlasMap.addLayer(
                {
                  id: vFill,
                  type: "fill",
                  source: vSrc,
                  layout: { visibility: initVis },
                  paint: { "fill-color": localCfg.fillExpr, "fill-opacity": localCfg.fillOpacity || 0.84 }
                },
                effBefore
              );
              lyrSpecs.push({ id: vFill, isVector: true });
              mountedVariantMap[variantKey].layerIds.push(vFill);
              attachAtlasFeaturePopup(vFill, localCfg.badge);
            }
            if (!atlasMap.getLayer(vLine)) {
              var linePaint = localCfg.fineMesh
                ? {
                    "line-color": "#1E293B",
                    "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.04, 11.5, 0.14, 13.5, 0.35, 16, 0.8],
                    "line-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.16, 12, 0.36, 15, 0.62]
                  }
                : { "line-color": "#1E293B", "line-width": 0.75, "line-opacity": 0.72 };
              atlasMap.addLayer(
                {
                  id: vLine,
                  type: "line",
                  source: vSrc,
                  layout: { visibility: initVis },
                  paint: linePaint
                },
                effBefore
              );
              lyrSpecs.push({ id: vLine, isVector: true });
              mountedVariantMap[variantKey].layerIds.push(vLine);
            }
            mountDistrictOutlineForAtlasVariant(prefix, localCfg.districtOutlinePath, effBefore, srcIds, lyrSpecs, variantKey);
            if (currentVariantKey === variantKey) {
              syncMountedVariantVisibilities(variantKey);
            }
          });
          return;
        }
      }

      // Caso B: Mosaicos satelitales e índices Copernicus globales
      resolveBasemapTiles(variantKey, function () {
        if (!atlasMap.isStyleLoaded()) {
          atlasMap.once("load", function () {
            mountAndCrossfadeVariantOnAtlasMap(variantKey);
          });
          return;
        }
        var bm = BASEMAPS[variantKey] || BASEMAPS["sentinel2-2024"];
        var beforeLayerId = atlasMap.getLayer("study-area-mask-fill") ? "study-area-mask-fill" : undefined;

        if (!mountedVariantMap[variantKey]) {
          var srcIds = [];
          var lyrSpecs = [];
          var prefix = "atlas-bm-" + variantKey;

          if (bm.underlayTiles) {
            var uSrc = prefix + "-underlay-src";
            var uLyr = prefix + "-underlay-lyr";
            var uOp = typeof bm.underlayOpacity === "number" ? bm.underlayOpacity : 1;
            atlasMap.addSource(uSrc, { type: "raster", tiles: bm.underlayTiles, tileSize: 256 });
            atlasMap.addLayer(
              {
                id: uLyr,
                type: "raster",
                source: uSrc,
                minzoom: 0,
                maxzoom: 19,
                paint: { "raster-opacity": 0, "raster-fade-duration": 260 }
              },
              beforeLayerId
            );
            srcIds.push(uSrc);
            lyrSpecs.push({ id: uLyr, targetOpacity: uOp, isVector: false });
          } else if (bm.lowZoomFallbackTiles) {
            var fSrc = prefix + "-fallback-src";
            var fLyr = prefix + "-fallback-lyr";
            atlasMap.addSource(fSrc, { type: "raster", tiles: bm.lowZoomFallbackTiles, tileSize: 256 });
            atlasMap.addLayer(
              {
                id: fLyr,
                type: "raster",
                source: fSrc,
                minzoom: 0,
                maxzoom: 7,
                paint: { "raster-opacity": 0, "raster-fade-duration": 260 }
              },
              beforeLayerId
            );
            srcIds.push(fSrc);
            lyrSpecs.push({ id: fLyr, targetOpacity: 1, isVector: false });
          }

          var mSrc = prefix + "-main-src";
          var mLyr = prefix + "-main-lyr";
          atlasMap.addSource(mSrc, {
            type: "raster",
            tiles: bm.tiles,
            tileSize: 256
          });
          atlasMap.addLayer(
            {
              id: mLyr,
              type: "raster",
              source: mSrc,
              minzoom: bm.lowZoomFallbackTiles ? 6 : 0,
              maxzoom: 19,
              paint: { "raster-opacity": 0, "raster-fade-duration": 260 }
            },
            beforeLayerId
          );
          srcIds.push(mSrc);
          lyrSpecs.push({ id: mLyr, targetOpacity: 1, isVector: false });

          if (bm.overlayTiles) {
            var oSrc = prefix + "-overlay-src";
            var oLyr = prefix + "-overlay-lyr";
            var oOp = typeof bm.overlayOpacity === "number" ? bm.overlayOpacity : 0.4;
            atlasMap.addSource(oSrc, { type: "raster", tiles: bm.overlayTiles, tileSize: 256 });
            atlasMap.addLayer(
              {
                id: oLyr,
                type: "raster",
                source: oSrc,
                minzoom: bm.lowZoomFallbackTiles ? 6 : 0,
                maxzoom: 19,
                paint: { "raster-opacity": 0, "raster-fade-duration": 260 }
              },
              beforeLayerId
            );
            srcIds.push(oSrc);
            lyrSpecs.push({ id: oLyr, targetOpacity: oOp, isVector: false });
          }

          mountedVariantMap[variantKey] = {
            sourceIds: srcIds,
            layerIds: lyrSpecs.map(function (s) {
              return s.id;
            }),
            specs: lyrSpecs
          };
        }

        // Si aún estamos en este variantKey como objetivo activo, hacer cross-fade de opacidad
        if (currentVariantKey !== variantKey) return;
        syncMountedVariantVisibilities(variantKey);
      });
    }

    function activateAtlasPlate(plateKey, optionalVariantKey, keepPlaying) {
      if (!plateKey || !ATLAS_PLATES[plateKey]) return;
      var plateChanged = currentPlateKey !== plateKey;
      if (!keepPlaying && isPlayingTimeline) {
        stopTimelinePlayback();
      }
      var p = ATLAS_PLATES[plateKey];
      var targetVarKey = optionalVariantKey || (currentPlateKey === plateKey ? currentVariantKey : p.defaultVariant);
      var vObj = findVariantObj(p, targetVarKey);
      currentPlateKey = plateKey;
      currentVariantKey = vObj.key;

      if (plateChanged) {
        clearMountedVariantsFromOtherPlates(currentPlateKey);
      }

      renderPlateInfoPanel(currentPlateKey, currentVariantKey);
      mountAndCrossfadeVariantOnAtlasMap(currentVariantKey);
    }

    if (toolbarVariantSelectEl) {
      toolbarVariantSelectEl.addEventListener("change", function () {
        stopTimelinePlayback();
        activateAtlasPlate(currentPlateKey, toolbarVariantSelectEl.value, false);
      });
    }
    if (panelVariantSelectEl) {
      panelVariantSelectEl.addEventListener("change", function () {
        stopTimelinePlayback();
        activateAtlasPlate(currentPlateKey, panelVariantSelectEl.value, false);
      });
    }
    if (toolbarPlayBtnEl) {
      toolbarPlayBtnEl.addEventListener("click", function () {
        toggleTimelinePlayback();
      });
    }
    if (panelPlayBtnEl) {
      panelPlayBtnEl.addEventListener("click", function () {
        toggleTimelinePlayback();
      });
    }
    if (stepPrevBtnEl) {
      stepPrevBtnEl.addEventListener("click", function () {
        stopTimelinePlayback();
        stepTimelineBy(-1);
      });
    }
    if (stepNextBtnEl) {
      stepNextBtnEl.addEventListener("click", function () {
        stopTimelinePlayback();
        stepTimelineBy(1);
      });
    }
    if (speedSelectEl) {
      speedSelectEl.addEventListener("change", function () {
        if (isPlayingTimeline) {
          scheduleNextTimelineStep();
        }
      });
    }
    if (timelineSliderEl) {
      timelineSliderEl.addEventListener("input", function () {
        stopTimelinePlayback();
        var p = ATLAS_PLATES[currentPlateKey] || ATLAS_PLATES["sentinel2-cloudless"];
        var seq = getTimelineSequence(p, currentVariantKey);
        var idx = parseInt(timelineSliderEl.value, 10) || 0;
        if (seq[idx]) {
          activateAtlasPlate(currentPlateKey, seq[idx], false);
        }
      });
    }

    renderPlateInfoPanel(currentPlateKey, currentVariantKey);

    function escapeHtml(val) {
      return String(val == null ? "" : val)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function getActiveProjectMeta() {
      var pid = "";
      var label = document.title.split("·").pop().trim() || "Zona de Estudio";
      if (projectSelectEl && projectSelectEl.value) {
        pid = projectSelectEl.value;
        if (projectSelectEl.options[projectSelectEl.selectedIndex]) {
          label = projectSelectEl.options[projectSelectEl.selectedIndex].text;
        }
      } else {
        var dlBtn = document.querySelector(".atlas-pdf-banner a[download]");
        if (dlBtn) {
          var href = dlBtn.getAttribute("href") || "";
          var m = href.match(/atlas_copernicus_([a-z0-9-]+)\.pdf/i);
          if (m && m[1] !== "zona_estudio" && m[1] !== "regional") {
            pid = m[1];
          }
        }
      }
      var pdfPath = pid
        ? "assets/descargas/atlas_copernicus_" + encodeURIComponent(pid) + ".pdf"
        : "assets/descargas/atlas_copernicus_zona_estudio.pdf";
      var pdfUrl = new URL(pdfPath, window.location.origin + baseUrl).href;
      var dlName = pid ? "Atlas_Copernicus_" + pid + ".pdf" : "Atlas_Copernicus_Zona_Estudio.pdf";
      return { id: pid, label: label, pdfUrl: pdfUrl, downloadName: dlName };
    }

    function renderCartographicPlateCanvasDataUrl(p, vObj) {
      var W = 840;
      var H = 560;
      var cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      var ctx = cv.getContext("2d");
      if (!ctx) return "";

      ctx.fillStyle = "#070D24";
      ctx.fillRect(0, 0, W, H);

      var drewLiveCanvas = false;
      try {
        if (atlasMap && typeof atlasMap.triggerRepaint === "function") {
          atlasMap.triggerRepaint();
        }
        if (atlasMap && typeof atlasMap.getCanvas === "function") {
          var mapCanvas = atlasMap.getCanvas();
          if (mapCanvas && mapCanvas.width > 0 && mapCanvas.height > 0) {
            var srcRatio = mapCanvas.width / mapCanvas.height;
            var dstRatio = W / H;
            var drawW = W;
            var drawH = H;
            var dx = 0;
            var dy = 0;
            if (srcRatio > dstRatio) {
              drawH = W / srcRatio;
              dy = (H - drawH) / 2;
            } else {
              drawW = H * srcRatio;
              dx = (W - drawW) / 2;
            }
            ctx.drawImage(mapCanvas, dx, dy, drawW, drawH);
            var testUrl = cv.toDataURL("image/png");
            if (testUrl && testUrl.length > 14000) {
              drewLiveCanvas = true;
            }
          }
        }
      } catch (err) {
        drewLiveCanvas = false;
      }

      var b = currentPerimeterGeoJson ? computeGeoJsonBounds(currentPerimeterGeoJson) : null;
      var minLon = b ? b[0][0] : currentCenter[0] - 0.08;
      var minLat = b ? b[0][1] : currentCenter[1] - 0.06;
      var maxLon = b ? b[1][0] : currentCenter[0] + 0.08;
      var maxLat = b ? b[1][1] : currentCenter[1] + 0.06;
      var meanLat = 0.5 * (minLat + maxLat);
      var cosLat = Math.cos((meanLat * Math.PI) / 180);
      var padLon = Math.max(0.008, (maxLon - minLon) * 0.16);
      var padLat = Math.max(0.008, (maxLat - minLat) * 0.16);
      var cx = 0.5 * (minLon + maxLon);
      var cy = 0.5 * (minLat + maxLat);
      var spanLon = maxLon - minLon + 2 * padLon;
      var spanLat = maxLat - minLat + 2 * padLat;
      var targetRatio = W / H;
      if ((spanLon * cosLat) / spanLat > targetRatio) {
        spanLat = (spanLon * cosLat) / targetRatio;
      } else {
        spanLon = (spanLat * targetRatio) / cosLat;
      }
      minLon = cx - spanLon / 2;
      maxLon = cx + spanLon / 2;
      minLat = cy - spanLat / 2;
      maxLat = cy + spanLat / 2;

      function lonLatToXY(lon, lat) {
        return [
          ((lon - minLon) / Math.max(1e-6, maxLon - minLon)) * W,
          ((maxLat - lat) / Math.max(1e-6, maxLat - minLat)) * H
        ];
      }

      if (!drewLiveCanvas) {
        var swatches = vObj.swatches || p.swatches || [];
        var col0 = (swatches[0] && swatches[0].color) || "#1E5631";
        var col1 = (swatches[1] && swatches[1].color) || "#76B041";
        var col2 = (swatches[2] && swatches[2].color) || "#D29D6A";

        ctx.fillStyle = "#070D24";
        ctx.fillRect(0, 0, W, H);

        if (currentPerimeterGeoJson) {
          var rings = [];
          function collectRings(g) {
            if (!g) return;
            if (g.type === "FeatureCollection") {
              (g.features || []).forEach(collectRings);
            } else if (g.type === "Feature") {
              collectRings(g.geometry);
            } else if (g.type === "Polygon" && g.coordinates && g.coordinates[0]) {
              rings.push(g.coordinates[0]);
            } else if (g.type === "MultiPolygon" && g.coordinates) {
              g.coordinates.forEach(function (poly) {
                if (poly && poly[0]) rings.push(poly[0]);
              });
            }
          }
          collectRings(currentPerimeterGeoJson);

          ctx.save();
          ctx.beginPath();
          rings.forEach(function (ring) {
            ring.forEach(function (pt, idx) {
              var xy = lonLatToXY(pt[0], pt[1]);
              if (idx === 0) ctx.moveTo(xy[0], xy[1]);
              else ctx.lineTo(xy[0], xy[1]);
            });
            ctx.closePath();
          });
          ctx.clip();

          var grad = ctx.createLinearGradient(80, 60, W - 80, H - 60);
          grad.addColorStop(0, col1);
          grad.addColorStop(0.52, col0);
          grad.addColorStop(1, col2);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          ctx.strokeStyle = "rgba(255,255,255,0.16)";
          ctx.lineWidth = 1;
          for (var gx = 40; gx < W; gx += 28) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, H);
            ctx.stroke();
          }
          for (var gy = 40; gy < H; gy += 28) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(W, gy);
            ctx.stroke();
          }
          ctx.restore();

          rings.forEach(function (ring) {
            ctx.beginPath();
            ring.forEach(function (pt, idx) {
              var xy = lonLatToXY(pt[0], pt[1]);
              if (idx === 0) ctx.moveTo(xy[0], xy[1]);
              else ctx.lineTo(xy[0], xy[1]);
            });
            ctx.closePath();
            ctx.strokeStyle = "#000A62";
            ctx.lineWidth = 7;
            ctx.stroke();
            ctx.strokeStyle = "#FFC800";
            ctx.lineWidth = 3.5;
            ctx.stroke();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          });
        }
      }

      // Grilla de coordenadas EPSG:4326
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      [0.28, 0.72].forEach(function (frac) {
        var x = Math.round(W * frac);
        var y = Math.round(H * frac);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();

        var lonV = minLon + (maxLon - minLon) * frac;
        var latV = maxLat - (maxLat - minLat) * frac;
        ctx.fillStyle = "rgba(7,13,36,0.82)";
        ctx.fillRect(x - 32, 6, 64, 16);
        ctx.fillRect(W - 68, y - 8, 60, 16);
        ctx.fillStyle = "#E2E8F8";
        ctx.font = "bold 11px Calibri, Arial, sans-serif";
        ctx.fillText(Math.abs(lonV).toFixed(2) + "°W", x - 26, 18);
        ctx.fillText(Math.abs(latV).toFixed(2) + "°N", W - 64, y + 4);
      });

      // Insignia superior izquierda de Lámina y Año
      var badgeText = (p.number + " · " + (vObj.pill || vObj.label || "")).toUpperCase();
      ctx.font = "bold 13px Calibri, Arial, sans-serif";
      var bw = Math.max(175, ctx.measureText(badgeText).width + 26);
      ctx.fillStyle = "rgba(12,22,89,0.92)";
      ctx.fillRect(16, 26, bw, 28);
      ctx.strokeStyle = "#FFC800";
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 26, bw, 28);
      ctx.fillStyle = "#FFC800";
      ctx.fillText(badgeText, 28, 45);

      // Flecha de Norte superior derecha
      var nx = W - 40;
      var ny = 42;
      ctx.beginPath();
      ctx.arc(nx, ny, 18, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(12,22,89,0.9)";
      ctx.fill();
      ctx.strokeStyle = "#FFC800";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(nx, ny - 12);
      ctx.lineTo(nx - 6, ny + 8);
      ctx.lineTo(nx, ny + 3);
      ctx.lineTo(nx + 6, ny + 8);
      ctx.closePath();
      ctx.fillStyle = "#FFC800";
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 12px Calibri, Arial, sans-serif";
      ctx.fillText("N", nx - 4, ny + 32);

      // Barra de escala métrica inferior derecha
      var kmSpan = (maxLon - minLon) * 111.32 * cosLat;
      var targetKm = kmSpan > 18 ? 5 : kmSpan > 7 ? 2 : kmSpan > 2.2 ? 1 : 0.5;
      var barPx = Math.max(90, Math.min(160, Math.round((targetKm / Math.max(0.1, kmSpan)) * W)));
      var sx1 = W - 20;
      var sx0 = sx1 - barPx;
      var sy = H - 18;
      ctx.fillStyle = "rgba(7,13,36,0.88)";
      ctx.fillRect(sx0 - 10, sy - 20, barPx + 18, 28);
      ctx.strokeStyle = "#FFC800";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(sx0 - 10, sy - 20, barPx + 18, 28);
      ctx.fillStyle = "#FFC800";
      ctx.fillRect(sx0, sy - 3, barPx / 2, 5);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(sx0 + barPx / 2, sy - 3, barPx / 2, 5);
      ctx.font = "bold 11px Calibri, Arial, sans-serif";
      ctx.fillText("0      " + targetKm + " km (EPSG:4326)", sx0 - 4, sy - 7);

      try {
        return cv.toDataURL("image/png");
      } catch (e) {
        return "";
      }
    }

    function exportCurrentAtlasPlateToPdf() {
      stopTimelinePlayback();
      var p = ATLAS_PLATES[currentPlateKey] || ATLAS_PLATES["sentinel2-cloudless"];
      var vObj = findVariantObj(p, currentVariantKey);
      var effectiveSwatches = vObj.swatches || p.swatches || [];
      var projMeta = getActiveProjectMeta();
      var mapDataUrl = renderCartographicPlateCanvasDataUrl(p, vObj);

      var brandBase = new URL("assets/img/brand/", window.location.origin + baseUrl).href;
      var ggUrl = brandBase + "logo-global-gateway.png";
      var euUrl = brandBase + "logo-union-europea.png";
      var ccvahUrl = brandBase + "logo-ccvah.png";
      var siscaUrl = brandBase + "logo-sisca.png";
      var sicaUrl = brandBase + "logo-sica.png";
      var coopUrl = brandBase + "logo-cooperacion-alemana.png";
      var gizUrl = brandBase + "logo-giz.png";
      var copUrl = brandBase + "logo-copernicus-lac-chile.png";

      var swatchesRowsHtml = effectiveSwatches
        .map(function (sw) {
          return (
            "<tr>" +
            '<td style="width:24mm;white-space:nowrap;padding:1.3mm 1.5mm;border-bottom:0.25mm solid #E6ECF8;">' +
            '<span style="display:inline-block;width:6.8mm;height:4.2mm;border-radius:0.8mm;border:0.3mm solid rgba(0,10,98,0.3);background:' +
            escapeHtml(sw.color) +
            ';vertical-align:middle;"></span> ' +
            '<code style="font-size:6.8pt;color:#455073;">' +
            escapeHtml(sw.color) +
            "</code></td>" +
            '<td style="padding:1.3mm 1.5mm;border-bottom:0.25mm solid #E6ECF8;font-size:7.6pt;line-height:1.28;">' +
            "<strong>" +
            escapeHtml(sw.label) +
            ":</strong> " +
            escapeHtml(sw.desc) +
            "</td></tr>"
          );
        })
        .join("");

      var variantsChipsHtml = (p.variants || [])
        .map(function (v) {
          var isAct = v.key === vObj.key;
          return (
            '<span style="display:inline-block;padding:0.5mm 1.8mm;border-radius:1mm;font-size:7.1pt;font-weight:700;margin-left:0.8mm;' +
            (isAct
              ? "background:#FFC800;color:#000A62;border:0.35mm solid #000A62;"
              : "background:#FFFFFF;color:#000A62;border:0.3mm solid #B0BBE0;") +
            '">' +
            escapeHtml(v.pill || v.label) +
            "</span>"
          );
        })
        .join("");

      var sheetInnerHtml =
        '<header style="background:linear-gradient(90deg,#000A62 0%,#0C1659 60%,#172070 100%);color:#FFFFFF;padding:3.8mm 10mm;border-bottom:1.1mm solid #FFC800;display:flex;align-items:center;justify-content:space-between;gap:4mm;">' +
        '<div style="display:flex;align-items:center;gap:3.2mm;">' +
        '<span style="background:#FFC800;color:#000A62;font-weight:800;font-size:8.3pt;padding:1mm 2.8mm;border-radius:1.2mm;text-transform:uppercase;white-space:nowrap;">' +
        escapeHtml(p.number + " · " + (vObj.pill || "")) +
        "</span>" +
        "<div>" +
        '<h1 style="margin:0;font-size:12pt;color:#FFFFFF;line-height:1.15;">' +
        escapeHtml(vObj.title || p.title) +
        "</h1>" +
        '<p style="margin:0.5mm 0 0;font-size:7.8pt;color:#C5D0F0;">Zona de Estudio: <strong>' +
        escapeHtml(projMeta.label) +
        "</strong> · Clúster de Asentamientos Humanos (Fase II)</p>" +
        "</div></div>" +
        '<div style="text-align:right;font-size:7.6pt;color:#E2E8F8;white-space:nowrap;">' +
        '<strong style="display:block;color:#FFC800;font-size:8.3pt;">Atlas Temático Copernicus</strong>' +
        "<span>Recorte Enmascarado · EPSG:4326</span>" +
        "</div></header>" +
        '<div style="flex:1;display:grid;grid-template-columns:1.38fr 1fr;gap:5mm;padding:4mm 10mm;min-height:0;">' +
        '<div style="background:#FFFFFF;border:0.4mm solid #D5DCEE;border-radius:2.5mm;padding:2.5mm;display:flex;flex-direction:column;justify-content:space-between;">' +
        '<div style="width:100%;height:116mm;background:#070D24;border-radius:1.8mm;overflow:hidden;border:0.5mm solid #FFC800;display:flex;align-items:center;justify-content:center;">' +
        (mapDataUrl
          ? '<img src="' + mapDataUrl + '" alt="Mapa de la lámina activa" style="width:100%;height:100%;object-fit:contain;display:block;">'
          : '<div style="color:#FFF;padding:20mm;text-align:center;">Mapa interactivo Copernicus</div>') +
        "</div>" +
        '<div style="margin-top:2mm;background:#EEF2FA;border:0.35mm solid #C5D0F0;border-left:1.1mm solid #000A62;border-radius:1.5mm;padding:1.8mm 2.8mm;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1.5mm;font-size:7.5pt;">' +
        '<strong style="color:#000A62;">📅 Serie multitemporal / variante activa:</strong>' +
        "<div>" +
        variantsChipsHtml +
        "</div></div></div>" +
        '<div style="background:#FFFFFF;border:0.4mm solid #D5DCEE;border-top:1.1mm solid #000A62;border-radius:2.5mm;padding:3.2mm 3.8mm;display:flex;flex-direction:column;gap:2.6mm;">' +
        '<div style="background:#F8FAFF;border:0.3mm solid #D5DCEE;border-radius:1.8mm;padding:2.2mm 2.8mm;font-size:7.8pt;line-height:1.38;">' +
        '<div><strong style="color:#000A62;">Sensor / Fuente Oficial:</strong> ' +
        escapeHtml(p.sensor) +
        "</div>" +
        '<div style="margin-top:0.7mm;"><strong style="color:#000A62;">Fórmula / Expresión:</strong> <code style="background:#EEF2FA;color:#000A62;padding:0.3mm 1.2mm;border-radius:0.8mm;font-weight:700;">' +
        escapeHtml(vObj.formula || p.formula) +
        "</code></div></div>" +
        '<div style="background:#F3F6FD;border-left:1.1mm solid #000A62;border-radius:1.5mm;padding:2.2mm 2.8mm;font-size:7.9pt;line-height:1.4;">' +
        '<strong style="display:block;color:#000A62;margin-bottom:0.6mm;">Lectura e interpretación territorial:</strong>' +
        escapeHtml(p.reading) +
        "</div>" +
        "<div>" +
        '<h3 style="margin:0 0 1.2mm;font-size:8pt;font-weight:800;text-transform:uppercase;color:#000A62;">Guía de interpretación de los colores de la leyenda</h3>' +
        '<table style="width:100%;border-collapse:collapse;"><tbody>' +
        swatchesRowsHtml +
        "</tbody></table></div></div></div>" +
        '<footer style="background:#FFFFFF;border-top:0.8mm solid #FFC800;padding:2.2mm 10mm;display:flex;align-items:center;justify-content:space-between;gap:3mm;white-space:nowrap;">' +
        '<div style="display:flex;align-items:center;gap:4mm;">' +
        '<div style="display:flex;align-items:center;gap:1.5mm;"><span style="font-size:6.6pt;font-weight:700;color:#000A62;">GLOBAL GATEWAY · UE:</span>' +
        '<span style="background:#0C1659;padding:0.6mm 1.4mm;border-radius:1mm;display:inline-flex;"><img src="' +
        ggUrl +
        '" alt="Global Gateway" style="height:4.8mm;"></span>' +
        '<img src="' +
        euUrl +
        '" alt="UE" style="height:5.2mm;"></div>' +
        '<div style="display:flex;align-items:center;gap:1.5mm;"><span style="font-size:6.6pt;font-weight:700;color:#000A62;">IMPLEMENTADO POR:</span>' +
        '<img src="' +
        ccvahUrl +
        '" alt="CCVAH" style="height:5.6mm;">' +
        '<img src="' +
        siscaUrl +
        '" alt="SISCA" style="height:5.2mm;">' +
        '<img src="' +
        sicaUrl +
        '" alt="SICA" style="height:5.2mm;"></div>' +
        '<div style="display:flex;align-items:center;gap:1.5mm;"><span style="font-size:6.6pt;font-weight:700;color:#000A62;">APOYO TÉCNICO:</span>' +
        '<img src="' +
        coopUrl +
        '" alt="Cooperación Alemana" style="height:5.6mm;">' +
        '<img src="' +
        gizUrl +
        '" alt="GIZ" style="height:4.8mm;">' +
        '<img src="' +
        copUrl +
        '" alt="Copernicus LAC" style="height:5.2mm;"></div>' +
        "</div>" +
        '<div style="font-size:7.1pt;color:#455073;">Atlas Temático Copernicus · <strong>' +
        escapeHtml(projMeta.id || "A4") +
        " · " +
        escapeHtml(p.number) +
        " (" +
        escapeHtml(vObj.pill || "") +
        ")</strong></div>" +
        "</footer>";

      var existingModal = document.getElementById("atlas-print-modal-backdrop");
      if (existingModal && existingModal.parentNode) {
        existingModal.parentNode.removeChild(existingModal);
      }

      var modal = document.createElement("div");
      modal.id = "atlas-print-modal-backdrop";
      modal.className = "atlas-print-modal-backdrop";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Vista Previa Institucional A4 Horizontal de la Lámina Activa");

      var bar = document.createElement("div");
      bar.className = "atlas-print-modal-bar";
      bar.innerHTML =
        '<div><strong style="color:#FFC800;font-size:0.92rem;">🖨️ Vista Previa Institucional A4 Horizontal:</strong> ' +
        '<span style="font-size:0.84rem;color:#E2E8F8;">' +
        escapeHtml(p.number + " (" + (vObj.pill || "") + ") · " + projMeta.label) +
        "</span></div>" +
        '<div style="display:flex;flex-wrap:wrap;gap:0.45rem;align-items:center;">' +
        '<button type="button" id="atlas-modal-do-print" class="btn btn-primary btn-xs">🖨️ Imprimir / Guardar esta Lámina en PDF</button>' +
        '<a class="btn btn-teal btn-xs" href="' +
        escapeHtml(projMeta.pdfUrl) +
        '" download="' +
        escapeHtml(projMeta.downloadName) +
        '">📥 Descargar Atlas PDF Completo de esta Zona</a>' +
        '<button type="button" id="atlas-modal-close" class="btn btn-outline-light btn-xs">✕ Cerrar vista previa</button>' +
        "</div>";

      var sheet = document.createElement("section");
      sheet.className = "atlas-print-sheet";
      sheet.innerHTML = sheetInnerHtml;

      modal.appendChild(bar);
      modal.appendChild(sheet);
      document.body.appendChild(modal);
      document.body.classList.add("is-printing-atlas-plate");

      function closeModal() {
        document.body.classList.remove("is-printing-atlas-plate");
        if (modal && modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }

      var printBtn = document.getElementById("atlas-modal-do-print");
      if (printBtn) {
        printBtn.addEventListener("click", function () {
          document.body.classList.add("is-printing-atlas-plate");
          window.print();
        });
      }
      var closeBtn = document.getElementById("atlas-modal-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", closeModal);
      }
      modal.addEventListener("click", function (ev) {
        if (ev.target === modal) closeModal();
      });
    }

    var exportPdfBtns = document.querySelectorAll("[data-atlas-export-pdf]");
    exportPdfBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        exportCurrentAtlasPlateToPdf();
      });
    });

    // Sincronización del filtro de Zona de Estudio con los archivos de descarga disponibles y el catálogo
    var hubProjPdfBtn = document.getElementById("atlas-download-project-pdf");
    var panelProjPdfBtn = document.getElementById("atlas-panel-download-pdf");
    var bannerZoneBadgeEl = document.getElementById("atlas-banner-active-zone");
    var pdfPills = Array.prototype.slice.call(document.querySelectorAll("[data-pdf-project-id]"));
    var toggleAllPdfsBtn = document.getElementById("atlas-toggle-all-pdfs");
    var catalogProjFilterEl = document.getElementById("f-atlas-project");
    var showAllPdfPills = false;

    function updateStudyAreaDownloadsAndFilters(pid, syncCatalog) {
      if (!pid) return;
      var pdfHref = new URL("assets/descargas/atlas_copernicus_" + encodeURIComponent(pid) + ".pdf", window.location.origin + baseUrl).href;
      var optionText = pid;
      if (projectSelectEl) {
        for (var i = 0; i < projectSelectEl.options.length; i++) {
          if (projectSelectEl.options[i].value === pid) {
            optionText = projectSelectEl.options[i].text;
            break;
          }
        }
      }
      if (hubProjPdfBtn) {
        hubProjPdfBtn.href = pdfHref;
        hubProjPdfBtn.setAttribute("download", "Atlas_Copernicus_" + pid + ".pdf");
        hubProjPdfBtn.textContent = "📥 Descargar Atlas PDF: " + optionText;
      }
      if (panelProjPdfBtn) {
        panelProjPdfBtn.href = pdfHref;
        panelProjPdfBtn.setAttribute("download", "Atlas_Copernicus_" + pid + ".pdf");
        panelProjPdfBtn.textContent = "📥 Descargar Atlas PDF (" + pid + ")";
      }
      if (bannerZoneBadgeEl) {
        bannerZoneBadgeEl.textContent = "ZONA SELECCIONADA: " + optionText.toUpperCase();
      }
      pdfPills.forEach(function (pill) {
        var pillPid = pill.getAttribute("data-pdf-project-id");
        var isMatch = pillPid === pid;
        pill.classList.toggle("is-active", isMatch);
        pill.classList.toggle("is-filtered-out", !showAllPdfPills && !isMatch);
      });
      if (syncCatalog && catalogProjFilterEl && catalogProjFilterEl.value !== pid) {
        catalogProjFilterEl.value = pid;
        catalogProjFilterEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    if (toggleAllPdfsBtn) {
      toggleAllPdfsBtn.addEventListener("click", function () {
        showAllPdfPills = !showAllPdfPills;
        toggleAllPdfsBtn.textContent = showAllPdfPills
          ? "Mostrar solo zona seleccionada"
          : "Ver descargas de las 8 zonas";
        if (projectSelectEl) {
          updateStudyAreaDownloadsAndFilters(projectSelectEl.value, false);
        }
      });
    }

    if (catalogProjFilterEl && projectSelectEl) {
      catalogProjFilterEl.addEventListener("change", function () {
        var val = catalogProjFilterEl.value;
        if (val && allHubPerimeters && allHubPerimeters[val] && projectSelectEl.value !== val) {
          projectSelectEl.value = val;
          projectSelectEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    }

    function selectHubProject(pid) {
      if (!allHubPerimeters || !pid) return;
      var entry = allHubPerimeters[pid];
      if (!entry || !entry.feature_collection) return;
      currentPerimeterGeoJson = entry.feature_collection;
      currentCenter = entry.center || currentCenter;
      currentZoom = entry.zoom || 12;
      updateStudyAreaDownloadsAndFilters(pid, true);
      if (atlasMap) {
        if (atlasMap.isStyleLoaded()) {
          refreshMaskOnAtlasMap(true);
        } else {
          atlasMap.once("load", function () {
            refreshMaskOnAtlasMap(true);
          });
        }
      }
    }

    if (allHubPerimeters && projectSelectEl) {
      projectSelectEl.addEventListener("change", function () {
        selectHubProject(projectSelectEl.value);
      });
      selectHubProject(projectSelectEl.value || Object.keys(allHubPerimeters)[0]);
    }

    if (typeof window.maplibregl === "undefined" || !isWebGLSupported()) {
      mapContainer.innerHTML =
        '<div class="callout callout-warn" style="margin:1rem;"><strong>Modo de lectura de leyendas activo:</strong> Consulta las fichas cromáticas, series anuales e interpretaciones de las 10 láminas a la derecha y debajo de este recuadro.</div>';
      plateTabs.forEach(function (btn) {
        btn.addEventListener("click", function () {
          activateAtlasPlate(btn.getAttribute("data-atlas-plate"));
        });
      });
      plateJumpBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          var pk = btn.getAttribute("data-atlas-plate-select");
          var vk = btn.getAttribute("data-atlas-variant-select") || null;
          activateAtlasPlate(pk, vk);
          shellEl.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
      return;
    }

    atlasMap = new window.maplibregl.Map({
      container: mapContainer,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "atlas-bg-layer",
            type: "background",
            paint: { "background-color": "#070D24" }
          }
        ]
      },
      center: currentCenter,
      zoom: currentZoom,
      attributionControl: false,
      preserveDrawingBuffer: true,
      canvasContextAttributes: { preserveDrawingBuffer: true }
    });

    atlasMap.addControl(new window.maplibregl.NavigationControl(), "top-right");
    atlasMap.addControl(new window.maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
    if (window.maplibregl.FullscreenControl) {
      atlasMap.addControl(new window.maplibregl.FullscreenControl({ container: shellEl }), "top-right");
    }

    atlasMap.once("load", function () {
      mountAndCrossfadeVariantOnAtlasMap(currentVariantKey);
      if (currentPerimeterGeoJson) {
        refreshMaskOnAtlasMap(true);
      }
    });

    plateTabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateAtlasPlate(btn.getAttribute("data-atlas-plate"));
      });
    });

    plateJumpBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var pk = btn.getAttribute("data-atlas-plate-select");
        var vk = btn.getAttribute("data-atlas-variant-select") || null;
        activateAtlasPlate(pk, vk);
        shellEl.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    if (maskCheckEl) {
      maskCheckEl.addEventListener("change", function () {
        if (atlasMap.getLayer("study-area-mask-fill")) {
          atlasMap.setLayoutProperty("study-area-mask-fill", "visibility", maskCheckEl.checked ? "visible" : "none");
        } else {
          refreshMaskOnAtlasMap(false);
        }
      });
    }

    if (maskOpEl) {
      maskOpEl.addEventListener("input", function () {
        if (atlasMap.getLayer("study-area-mask-fill")) {
          atlasMap.setPaintProperty("study-area-mask-fill", "fill-opacity", parseFloat(maskOpEl.value));
        }
      });
    }

    if (fitBtnEl) {
      fitBtnEl.addEventListener("click", function () {
        if (currentPerimeterGeoJson) {
          var b = computeGeoJsonBounds(currentPerimeterGeoJson);
          if (b) atlasMap.fitBounds(b, { padding: 42, maxZoom: 15.2 });
        } else {
          atlasMap.flyTo({ center: currentCenter, zoom: currentZoom });
        }
      });
    }

    if (fsBtnEl && shellEl) {
      fsBtnEl.addEventListener("click", function () {
        var isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement || shellEl.classList.contains("is-fullscreen"));
        if (!isFs) {
          if (shellEl.requestFullscreen) {
            shellEl.requestFullscreen().catch(function () {
              shellEl.classList.add("is-fullscreen");
            });
          } else {
            shellEl.classList.add("is-fullscreen");
          }
          fsBtnEl.textContent = "✕ Salir";
        } else {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(function () {});
          }
          shellEl.classList.remove("is-fullscreen");
          fsBtnEl.textContent = "⛶ Pantalla completa";
        }
        setTimeout(function () {
          atlasMap.resize();
        }, 120);
      });
    }

    function loadSingleProjectPerimeter() {
      var customPerimRel = mapContainer.getAttribute("data-perimeter-path") || "geovisor/capas/perimetro_zona_estudio.geojson";
      var perimUrl = new URL(customPerimRel, window.location.origin + baseUrl).href;
      fetch(perimUrl)
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (gj) {
          if (gj) {
            currentPerimeterGeoJson = gj;
            if (atlasMap && atlasMap.isStyleLoaded()) {
              refreshMaskOnAtlasMap(true);
            } else if (atlasMap) {
              atlasMap.once("load", function () {
                refreshMaskOnAtlasMap(true);
              });
            }
          }
        })
        .catch(function () {});
    }

    if (!allHubPerimeters || !projectSelectEl) {
      loadSingleProjectPerimeter();
    }
  }

  initProjectGeovisor();
  initHubRegionalMap();
  initCopernicusAtlasViewer();
})();
