# Comparador multianual de cobertura urbana

Herramienta replicable y gratuita: introduces un **centroide** (latitud/longitud) y un **radio en km** (5 → cuadrado de 10 × 10 km; 10 → 20 × 20 km; máximo 30) y obtienes, año por año, un mapa con estas categorías:

| Categoría | Color | Qué representa |
|---|---|---|
| `urbanizacion` | rojo | Tejido urbano construido consolidado |
| `asentamiento` | naranja | Construido muy denso y heterogéneo (patrón compatible con asentamientos informales) |
| `industrial_comercial` | morado | Parches grandes, brillantes y sin vegetación (naves, bodegas, centros comerciales) |
| `vegetacion` | verde | Árboles, pasto, arbustos, cultivos, vegetación inundable |
| `suelo_desnudo` | arena | Suelo expuesto, canteras, solares |
| `agua_otros` *(auxiliar)* | gris azulado | Agua y nieve; evita contaminar las cinco categorías |

> **Indicativo.** Los umbrales son valores iniciales **sin calibrar**. La separación entre urbanización, asentamiento e industrial/comercial a 10 m es una aproximación; valídala con muestras locales antes de usar cifras en decisiones.

## Tres formas de usarlo (todas gratuitas)

### A · Vista previa sin cuenta — página `/comparador/`
Escribe centroide y radio (o haz clic en el mapa). Verás el área sobre un deslizador A | B de mosaicos anuales Sentinel-2 cloudless (EOX, 2016–2024). Es imagen, no clasificación.

### B · Earth Engine Code Editor — interactivo
1. En `/comparador/` pulsa **Copiar script con mis valores** (o abre `src/gee/geourbano_comparador.js` y edita el bloque `1. PARÁMETROS`).
2. Pega en <https://code.earthengine.google.com/> y pulsa **Run**.
3. Obtienes: cuadrícula por año o deslizador A | B, casillas para identificar cada categoría, opacidad, gráfico de superficie por año y tabla en la consola. Con `EXPORTAR = true` crea tareas para CSV y GeoTIFF en Drive.

Requiere cuenta de Earth Engine (gratuita para uso no comercial, investigación y educación).

### C · GitHub Actions — automático y publicado en el sitio
Genera los PNG/JPG y estadísticas, los guarda en `comparador/resultados/<id>/` y vuelve a publicar el sitio; el análisis aparece en la sección «Resultados clasificados».

**Configuración única (por repositorio o fork):**
1. Crea (o usa) un proyecto de Google Cloud con la API de Earth Engine habilitada y regístralo para uso no comercial en Earth Engine.
2. Crea una **cuenta de servicio** en ese proyecto, regístrala en Earth Engine y descarga su clave JSON. Consulta la documentación oficial de Earth Engine sobre cuentas de servicio para los roles IAM requeridos.
3. En GitHub → *Settings → Secrets and variables → Actions*:
   - Secreto `EE_SERVICE_ACCOUNT_JSON`: pega el contenido completo del JSON.
   - Variable `EE_PROJECT`: el ID del proyecto de Cloud.
4. (Para publicar) Variable `PAGES_ENABLED=true` y *Pages → Source: GitHub Actions* (ver `README.md`).

**Ejecutar:** *Actions → Comparador multianual (Earth Engine) → Run workflow*, o por terminal:

```bash
gh workflow run comparador.yml -f lat=14.62124 -f lon=-90.34751 -f radio_km=5 \
  -f forma=cuadrado -f anio_inicio=2018 -f anio_fin=2025 -f mes_inicio=1 -f mes_fin=4
```

El comando con tus valores se genera solo en `/comparador/`. También puedes correr el script localmente:

```bash
python3 -m pip install -r requirements-gee.txt
earthengine authenticate
python3 src/python/comparador_gee.py --lat 14.62124 --lon -90.34751 --radio-km 5 \
  --anio-inicio 2018 --anio-fin 2025 --project TU_PROYECTO_CLOUD
python3 scripts/build_site.py --output site && python3 -m http.server 8000 --directory site
```

`--dry-run` valida los parámetros sin contactar a Earth Engine.

## Método

1. **Compuesto Sentinel-2 SR Harmonized** por año, mediana de la temporada (por defecto meses 1–4, época seca) enmascarada con **Cloud Score+** (`cs_cdf ≥ 0,6`).
2. **Base Dynamic World V1**: clase más probable según la probabilidad media de la temporada. Vegetación = trees + grass + flooded_vegetation + crops + shrub_and_scrub; suelo desnudo = bare; agua/otros = water + snow_and_ice.
3. **Subdivisión del construido (`built`)**:
   - *industrial_comercial*: parche contiguo ≥ 150 px (1,5 ha), reflectancia visible > 0,17, SWIR1 > 0,22 y NDVI < 0,20.
   - *asentamiento*: densidad local de construido (radio 60 m) > 0,70 y desviación estándar del brillo visible (radio 30 m) > 0,035.
   - *urbanizacion*: el resto.
4. **Estadísticas** de superficie (ha) por categoría y año a 10 m.

Los umbrales están al inicio de `geourbano_comparador.js` y `comparador_gee.py` (mantenerlos sincronizados). Para calibrar, el script del Code Editor admite polígonos propios (`ASSET_ASENTAMIENTOS`, `ASSET_INDUSTRIAL`) que fuerzan la clase dentro de ellos.

## Estructura de los resultados publicados

```
comparador/resultados/<id>/
  meta.json            parámetros, bbox, años, estadísticas (ha), umbrales, fuentes
  rgb_<año>.jpg|png    Sentinel-2 color natural
  clase_<año>.png      categorías (colores de comparador/clases.json; transparente fuera del área)
```

`scripts/build_site.py` publica estas carpetas e indexa los `meta.json` en `site/comparador/index.json`. Para cambiar nombres o colores de categorías edita `comparador/clases.json` (y el bloque `CLASES` del script del Code Editor).

## Límites y buenas prácticas

- Radio máximo 30 km y 13 años por análisis (límites de las miniaturas y de memoria de Earth Engine).
- Cada análisis ocupa unos pocos MB en el repositorio; elimina carpetas de `comparador/resultados/` que ya no necesites.
- El sitio no almacena la clave de la cuenta de servicio: el workflow la lee del secreto y borra el archivo temporal. Para mayor seguridad puedes sustituirla por *Workload Identity Federation*.
- Años sin escenas Sentinel-2 en la temporada se omiten y se indican en `anios_omitidos`.
- Las capas son una referencia de apoyo; no reemplazan la validación institucional (ver `AGENTS.md`).
