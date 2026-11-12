/**
 * GEO-URBANO · Comparador multianual de cobertura urbana (Google Earth Engine, Code Editor)
 * ---------------------------------------------------------------------------------------
 * Pega este archivo completo en https://code.earthengine.google.com/ , edita SOLO el bloque
 * "1. PARÁMETROS" (centroide, radio en km, años) y pulsa Run.
 *
 * Produce, para cada año:
 *   - Imagen Sentinel-2 (compuesto de temporada seca, color natural).
 *   - Mapa de 5 categorías: urbanización, asentamiento, vegetación, industrial_comercial,
 *     suelo_desnudo (+ clase auxiliar agua_otros).
 *   - Estadística de superficie (ha y %) por categoría y año, gráfico y exportación opcional.
 *
 * Método (resumen):
 *   Base  = Dynamic World V1 (probabilidad media de la temporada → clase más probable).
 *   Veg.  = trees, grass, flooded_vegetation, crops, shrub_and_scrub.   Suelo = bare.
 *   Construido (built) se subdivide con reglas sobre Sentinel-2 SR + Cloud Score+:
 *     industrial_comercial = parche grande + brillante + sin vegetación
 *     asentamiento         = densidad local muy alta + textura heterogénea
 *     urbanizacion         = resto del construido
 *
 * IMPORTANTE: los umbrales de la sección 2 son valores iniciales SIN calibrar. La separación
 * entre urbanización / asentamiento / industrial_comercial es una aproximación espectral y
 * contextual a 10 m; valídala con muestras locales (ver ASSET_ASENTAMIENTOS / ASSET_INDUSTRIAL)
 * antes de usar cifras en decisiones.
 *
 * Todo el servicio es gratuito para uso no comercial / investigación / educación con una
 * cuenta de Earth Engine. Datos: Copernicus Sentinel-2 (ESA), Dynamic World (Google/WRI).
 */

// =====================================================================================
// 1. PARÁMETROS  ← lo único que normalmente necesitas editar
// =====================================================================================
var LAT = 9.33500;           // Corredor Urbano-Portuario de Colón, Panamá          // Latitud del centroide (grados decimales, WGS84)
var LON = -79.86500;         // Isla Manzanillo, Zona Libre, Cristóbal, Cativá, Sabanitas         // Longitud del centroide (negativa al oeste de Greenwich)
var RADIO_KM = 9;            // Radio 9 km -> ventana 18 x 18 km sobre Colón            // Radio en km: 5 → cuadrado de 10 x 10 km (lado = 2 × radio)
var FORMA = 'cuadrado';      // 'cuadrado' | 'circulo'
var ANIO_INICIO = 2018;      // Primer año (Sentinel-2 SR + Dynamic World: desde 2017)
var ANIO_FIN = 2025;         // Último año
var MES_INICIO = 1;          // Temporada de composición (1 = enero) …
var MES_FIN = 4;             // … hasta abril (época seca en Centroamérica; ajusta a tu clima)

// =====================================================================================
// 2. AJUSTES AVANZADOS (opcionales)
// =====================================================================================
var ESCALA = 10;                 // m por píxel para estadísticas
var CS_UMBRAL = 0.6;             // Cloud Score+ (0-1): más alto = más estricto con nubes
var UMBRAL_BRILLO_VIS = 0.17;    // reflectancia media visible para techos "brillantes"
var UMBRAL_SWIR1 = 0.22;         // reflectancia SWIR1 (B11) para techos "brillantes"
var UMBRAL_NDVI_MAX_IND = 0.20;  // NDVI máximo permitido para industrial/comercial
var UMBRAL_PARCHE_PX = 150;      // píxeles contiguos (150 px × 100 m² = 1,5 ha)
var RADIO_DENSIDAD_M = 60;       // vecindario para densidad de construido
var UMBRAL_DENSIDAD = 0.70;      // fracción construida local para "asentamiento"
var RADIO_TEXTURA_M = 30;        // vecindario para textura
var UMBRAL_TEXTURA = 0.035;      // desviación estándar del brillo visible para "asentamiento"
var EXPORTAR = false;            // true → crea tareas de exportación (CSV y GeoTIFF a Drive)

// Muestras locales OPCIONALES (FeatureCollection de polígonos en tus Assets). Si se indican,
// fuerzan la clase dentro de esos polígonos (útil para calibrar / corregir). Déjalos en ''.
var ASSET_ASENTAMIENTOS = '';    // p.ej. 'users/tu_usuario/asentamientos_validados'
var ASSET_INDUSTRIAL = '';       // p.ej. 'users/tu_usuario/zonas_industriales'

// =====================================================================================
// 3. CATEGORÍAS (mismas que comparador/clases.json en el repositorio)
// =====================================================================================
var CLASES = [
  {codigo: 1, id: 'urbanizacion',         etiqueta: 'Urbanización',          color: 'D7263D'},
  {codigo: 2, id: 'asentamiento',         etiqueta: 'Asentamiento',          color: 'F28C28'},
  {codigo: 3, id: 'industrial_comercial', etiqueta: 'Industrial / comercial', color: '7B2CBF'},
  {codigo: 4, id: 'vegetacion',           etiqueta: 'Vegetación',            color: '2E8B57'},
  {codigo: 5, id: 'suelo_desnudo',        etiqueta: 'Suelo desnudo',         color: 'C9A66B'},
  {codigo: 6, id: 'agua_otros',           etiqueta: 'Agua / otros (auxiliar)', color: '9DB4C0'}
];
var PALETA = CLASES.map(function (c) { return c.color; });

// =====================================================================================
// 4. ÁREA DE ESTUDIO
// =====================================================================================
var centro = ee.Geometry.Point([LON, LAT]);
var aoi = (FORMA === 'circulo')
  ? centro.buffer(RADIO_KM * 1000)
  : centro.buffer(RADIO_KM * 1000).bounds();   // cuadrado alineado a ejes, lado = 2 × radio

var anios = [];
for (var a = ANIO_INICIO; a <= ANIO_FIN; a++) { anios.push(a); }

if (ANIO_FIN < ANIO_INICIO) { throw 'ANIO_FIN debe ser >= ANIO_INICIO'; }
if (RADIO_KM <= 0 || RADIO_KM > 30) { throw 'RADIO_KM debe estar entre 0 y 30'; }

// =====================================================================================
// 5. NÚCLEO DE CLASIFICACIÓN
// =====================================================================================
function rango(anio) {
  var ini = ee.Date.fromYMD(anio, MES_INICIO, 1);
  var fin = ee.Date.fromYMD(anio, MES_FIN, 1).advance(1, 'month');
  return {ini: ini, fin: fin};
}

/** Compuesto Sentinel-2 SR (mediana, enmascarado con Cloud Score+), reflectancia 0-1. */
function compuestoS2(anio) {
  var r = rango(anio);
  var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi).filterDate(r.ini, r.fin);
  var cs = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED')
    .filterBounds(aoi).filterDate(r.ini, r.fin);
  return s2.linkCollection(cs, ['cs_cdf'])
    .map(function (img) { return img.updateMask(img.select('cs_cdf').gte(CS_UMBRAL)); })
    .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
    .median()
    .divide(10000);
}

/** Clase más probable de Dynamic World en la temporada (0=agua … 6=built, 7=bare, 8=nieve). */
function baseDW(anio) {
  var r = rango(anio);
  var bandas = ['water', 'trees', 'grass', 'flooded_vegetation', 'crops',
                'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'];
  var probs = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterBounds(aoi).filterDate(r.ini, r.fin)
    .select(bandas).mean();
  return probs.toArray().arrayArgmax().arrayGet([0]).rename('dw');
}

/** Devuelve {s2, clase} para un año. clase: 1..6 (ver CLASES), enmascarada al AOI. */
function clasificar(anio) {
  var s2 = compuestoS2(anio);
  var dw = baseDW(anio);

  var vis = s2.select(['B2', 'B3', 'B4']).reduce(ee.Reducer.mean()).rename('vis');
  var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
  var swir = s2.select('B11');

  var construido = dw.eq(6);
  var vegetacion = dw.gte(1).and(dw.lte(5));
  var suelo = dw.eq(7);
  var agua = dw.eq(0).or(dw.eq(8));

  // Contexto espacial del construido
  var densidad = construido.toFloat().focalMean({
    radius: RADIO_DENSIDAD_M, kernelType: 'circle', units: 'meters'});
  var textura = vis.reduceNeighborhood({
    reducer: ee.Reducer.stdDev(),
    kernel: ee.Kernel.circle({radius: RADIO_TEXTURA_M, units: 'meters'})
  }).rename('textura');
  var parche = construido.selfMask().connectedPixelCount(256, true).unmask(0);

  var brillante = vis.gt(UMBRAL_BRILLO_VIS).and(swir.gt(UMBRAL_SWIR1));
  var industrial = construido
    .and(parche.gte(UMBRAL_PARCHE_PX))
    .and(brillante)
    .and(ndvi.lt(UMBRAL_NDVI_MAX_IND));
  var asentamiento = construido
    .and(industrial.not())
    .and(densidad.gt(UMBRAL_DENSIDAD))
    .and(textura.gt(UMBRAL_TEXTURA));

  // Muestras locales opcionales (anulan la regla dentro de sus polígonos)
  if (ASSET_INDUSTRIAL) {
    var mInd = ee.Image.constant(1).clip(ee.FeatureCollection(ASSET_INDUSTRIAL)).mask();
    industrial = industrial.or(construido.and(mInd.unmask(0)));
  }
  if (ASSET_ASENTAMIENTOS) {
    var mAsen = ee.Image.constant(1).clip(ee.FeatureCollection(ASSET_ASENTAMIENTOS)).mask();
    asentamiento = asentamiento.or(construido.and(mAsen.unmask(0))).and(industrial.not());
  }
  var urbanizacion = construido.and(industrial.not()).and(asentamiento.not());

  var clase = ee.Image(0)
    .where(urbanizacion, 1)
    .where(asentamiento, 2)
    .where(industrial, 3)
    .where(vegetacion, 4)
    .where(suelo, 5)
    .where(agua, 6)
    .rename('clase')
    .clip(aoi);
  return {s2: s2.clip(aoi), clase: clase.selfMask()};
}

/** Estadística de superficie en ha por categoría → ee.Feature con una propiedad por clase. */
function estadistica(anio, clase) {
  var d = ee.Image.pixelArea().divide(10000).addBands(clase.unmask(0)).reduceRegion({
    reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'clase'}),
    geometry: aoi, scale: ESCALA, maxPixels: 1e10, tileScale: 4
  });
  var grupos = ee.List(ee.Dictionary(d).get('groups'));
  var porCodigo = ee.Dictionary(grupos.iterate(function (g, acc) {
    g = ee.Dictionary(g);
    return ee.Dictionary(acc).set(ee.Number(g.get('clase')).format('%d'), g.get('sum'));
  }, ee.Dictionary({})));
  var props = {anio: String(anio)};
  CLASES.forEach(function (c) { props[c.id] = porCodigo.get(String(c.codigo), 0); });
  return ee.Feature(null, props);
}

// =====================================================================================
// 6. CÁLCULO POR AÑO
// =====================================================================================
var porAnio = {};
anios.forEach(function (anio) { porAnio[anio] = clasificar(anio); });

var tabla = ee.FeatureCollection(anios.map(function (anio) {
  return estadistica(anio, porAnio[anio].clase);
}));

// =====================================================================================
// 7. INTERFAZ: cuadrícula por año | deslizador A|B · filtro de categorías · gráfico
// =====================================================================================
var estado = {
  modo: 'Cuadrícula por año',
  anioA: anios[0],
  anioB: anios[anios.length - 1],
  visibles: {},          // id de clase → boolean
  mostrarRGB: true,
  opacidad: 0.7
};
CLASES.forEach(function (c) { estado.visibles[c.id] = (c.id !== 'agua_otros'); });

function capaClase(anio) {
  var clase = porAnio[anio].clase;
  var mascara = ee.Image(0);
  CLASES.forEach(function (c) {
    if (estado.visibles[c.id]) { mascara = mascara.or(clase.eq(c.codigo)); }
  });
  return ui.Map.Layer(clase.updateMask(mascara), {min: 1, max: 6, palette: PALETA},
    'Categorías ' + anio, true, estado.opacidad);
}
function capaRGB(anio) {
  return ui.Map.Layer(porAnio[anio].s2, {bands: ['B4', 'B3', 'B2'], min: 0.02, max: 0.28, gamma: 1.2},
    'Sentinel-2 ' + anio, estado.mostrarRGB);
}
function crearMapa(anio) {
  var m = ui.Map();
  m.setControlVisibility({all: false, zoomControl: true, scaleControl: true});
  m.setOptions('SATELLITE');
  m.layers().set(0, capaRGB(anio));
  m.layers().set(1, capaClase(anio));
  m.addLayer(ee.FeatureCollection([ee.Feature(aoi)]).style({color: 'FFFF00', fillColor: '00000000', width: 2}),
    {}, 'Área de estudio');
  m.add(ui.Label(String(anio), {position: 'top-left', fontWeight: 'bold', fontSize: '18px',
    backgroundColor: 'rgba(0,10,98,0.85)', color: 'white', padding: '4px 10px'}));
  m.centerObject(aoi);
  m.style().set('cursor', 'crosshair');
  m.anio = anio;
  return m;
}

var mapasActivos = [];
function refrescarCapas() {
  mapasActivos.forEach(function (m) {
    m.layers().set(0, capaRGB(m.anio));
    m.layers().set(1, capaClase(m.anio));
  });
}

function leyendaYControles() {
  var panel = ui.Panel({style: {width: '320px', padding: '10px'}});
  panel.add(ui.Label('GEO-URBANO · Comparador multianual', {fontWeight: 'bold', fontSize: '16px'}));
  panel.add(ui.Label('Centroide: ' + LAT + ', ' + LON + ' · radio ' + RADIO_KM + ' km (' + FORMA + ')',
    {fontSize: '12px', color: '#455073'}));
  panel.add(ui.Label('Temporada: meses ' + MES_INICIO + '–' + MES_FIN + ' · ' + ANIO_INICIO + '–' + ANIO_FIN,
    {fontSize: '12px', color: '#455073'}));

  panel.add(ui.Label('Vista', {fontWeight: 'bold', margin: '12px 0 2px 0'}));
  panel.add(ui.Select({
    items: ['Cuadrícula por año', 'Deslizador A | B'], value: estado.modo,
    onChange: function (v) { estado.modo = v; construirVista(); }
  }));
  if (anios.length > 1) {
    panel.add(ui.Label('Años del deslizador (A | B)', {fontSize: '12px', margin: '8px 0 2px 0'}));
    var sel = anios.map(String);
    panel.add(ui.Panel([
      ui.Select({items: sel, value: String(estado.anioA), onChange: function (v) {
        estado.anioA = Number(v); if (estado.modo !== 'Cuadrícula por año') { construirVista(); } }}),
      ui.Select({items: sel, value: String(estado.anioB), onChange: function (v) {
        estado.anioB = Number(v); if (estado.modo !== 'Cuadrícula por año') { construirVista(); } }})
    ], ui.Panel.Layout.flow('horizontal')));
  }

  panel.add(ui.Label('Categorías a identificar', {fontWeight: 'bold', margin: '12px 0 2px 0'}));
  CLASES.forEach(function (c) {
    var chip = ui.Label('', {backgroundColor: '#' + c.color, padding: '8px', margin: '4px 6px 0 0'});
    var cb = ui.Checkbox({label: c.etiqueta, value: estado.visibles[c.id], onChange: function (v) {
      estado.visibles[c.id] = v; refrescarCapas(); }});
    panel.add(ui.Panel([chip, cb], ui.Panel.Layout.flow('horizontal')));
  });
  panel.add(ui.Checkbox({label: 'Mostrar imagen Sentinel-2 de fondo', value: estado.mostrarRGB,
    onChange: function (v) { estado.mostrarRGB = v; refrescarCapas(); }}));
  panel.add(ui.Label('Opacidad de categorías', {fontSize: '12px', margin: '8px 0 0 0'}));
  panel.add(ui.Slider({min: 0.1, max: 1, value: estado.opacidad, step: 0.05,
    onChange: function (v) { estado.opacidad = v; refrescarCapas(); }, style: {stretch: 'horizontal'}}));

  panel.add(ui.Label('Superficie por categoría y año (ha)', {fontWeight: 'bold', margin: '14px 0 2px 0'}));
  var grafico = ui.Chart.feature.byFeature(tabla, 'anio', CLASES.map(function (c) { return c.id; }))
    .setChartType('ColumnChart')
    .setOptions({
      isStacked: true, height: 240, legend: {position: 'none'},
      colors: CLASES.map(function (c) { return '#' + c.color; }),
      hAxis: {title: 'Año'}, vAxis: {title: 'ha'}
    });
  panel.add(grafico);
  panel.add(ui.Label('Los valores numéricos están en la consola (pestaña Console).',
    {fontSize: '11px', color: '#455073'}));
  panel.add(ui.Label('Cifras indicativas: umbrales sin calibrar. Valida con muestras locales.',
    {fontSize: '11px', color: '#8A1C1C'}));
  return panel;
}

var panelLateral = leyendaYControles();

function construirVista() {
  mapasActivos = [];
  var contenido;
  if (estado.modo === 'Deslizador A | B' && anios.length > 1) {
    var mA = crearMapa(estado.anioA);
    var mB = crearMapa(estado.anioB);
    mapasActivos = [mA, mB];
    ui.Map.Linker(mapasActivos);
    contenido = ui.SplitPanel({firstPanel: mA, secondPanel: mB, orientation: 'horizontal',
      wipe: true, style: {stretch: 'both'}});
  } else {
    var maps = anios.map(crearMapa);
    mapasActivos = maps;
    ui.Map.Linker(maps);
    var columnas = (maps.length <= 2) ? maps.length : (maps.length <= 4 ? 2 : 3);
    var filas = [];
    for (var i = 0; i < maps.length; i += columnas) {
      var fila = maps.slice(i, i + columnas);
      fila.forEach(function (m) { m.style().set({stretch: 'both'}); });
      filas.push(ui.Panel(fila, ui.Panel.Layout.flow('horizontal'), {stretch: 'both'}));
    }
    contenido = ui.Panel(filas, ui.Panel.Layout.flow('vertical'), {stretch: 'both'});
  }
  ui.root.clear();
  ui.root.add(ui.SplitPanel(panelLateral, contenido));
}
construirVista();

// =====================================================================================
// 8. CONSOLA Y EXPORTACIÓN
// =====================================================================================
print('Área de estudio (km²):', aoi.area(1).divide(1e6));
print('Superficie por categoría (ha) y año:', tabla);

if (EXPORTAR) {
  Export.table.toDrive({
    collection: tabla, description: 'geourbano_estadisticas_' + LAT + '_' + LON + '_' + RADIO_KM + 'km',
    fileFormat: 'CSV'
  });
  anios.forEach(function (anio) {
    Export.image.toDrive({
      image: porAnio[anio].clase.toByte(), description: 'geourbano_clase_' + anio,
      region: aoi, scale: ESCALA, maxPixels: 1e10, crs: 'EPSG:4326'
    });
  });
}
