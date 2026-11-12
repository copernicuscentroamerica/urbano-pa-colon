/* ==========================================================================
   Comparador multianual · controlador de la página /comparador/
   1) Formulario de área (centroide + radio) con mapa A | B por año (sin cuenta).
   2) Generación del script de Earth Engine y del comando de GitHub Actions con tus valores.
   3) Visor de análisis publicados: cuadrícula por año, deslizador A | B, estadísticas,
      con filtro por categoría (se recolorea en el navegador a partir de los PNG de GEE).
   Sin dependencias salvo MapLibre GL JS (solo para el mapa del formulario).
   ========================================================================== */
(function () {
  "use strict";

  var cfgEl = document.getElementById("comparador-config");
  if (!cfgEl) return;
  var CFG = JSON.parse(cfgEl.textContent);
  var CLASES = CFG.clases;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  function hexToRgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function fmt(n, d) {
    return Number(n).toLocaleString("es-GT", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }
  function copyText(text, statusEl) {
    function ok() { if (statusEl) { statusEl.textContent = "Copiado al portapapeles."; } }
    function fail() { if (statusEl) { statusEl.textContent = "No se pudo copiar automáticamente: selecciona el texto manualmente."; } }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else {
      var ta = el("textarea", { "aria-hidden": "true" });
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? ok() : fail(); } catch (e) { fail(); }
      document.body.removeChild(ta);
    }
  }

  /* ----------------------------------------------------------------------
     1. Parámetros y geometría
     ---------------------------------------------------------------------- */
  var F = {
    lat: $("#cmp-lat"), lon: $("#cmp-lon"), radio: $("#cmp-radio"), forma: $("#cmp-forma"),
    a0: $("#cmp-anio-ini"), a1: $("#cmp-anio-fin"), m0: $("#cmp-mes-ini"), m1: $("#cmp-mes-fin"),
    id: $("#cmp-id")
  };
  function num(v) { return parseFloat(String(v).replace(",", ".")); }

  function readParams() {
    var p = {
      lat: num(F.lat.value), lon: num(F.lon.value), radio: num(F.radio.value), forma: F.forma.value,
      a0: parseInt(F.a0.value, 10), a1: parseInt(F.a1.value, 10),
      m0: parseInt(F.m0.value, 10), m1: parseInt(F.m1.value, 10), id: (F.id.value || "").trim()
    };
    var maxYear = new Date().getFullYear();
    var err = null;
    if (!(p.lat >= -90 && p.lat <= 90)) err = "Latitud fuera de rango (-90 a 90).";
    else if (!(p.lon >= -180 && p.lon <= 180)) err = "Longitud fuera de rango (-180 a 180).";
    else if (!(p.radio > 0 && p.radio <= 30)) err = "El radio debe ser mayor que 0 y como máximo 30 km.";
    else if (!(p.a0 >= 2017 && p.a1 >= p.a0 && p.a1 <= maxYear)) err = "Años: desde 2017 y año final ≥ año inicial.";
    else if (p.a1 - p.a0 > 12) err = "Máximo 13 años por análisis.";
    else if (!(p.m0 >= 1 && p.m1 <= 12 && p.m0 <= p.m1)) err = "Meses: 1 a 12, con mes inicial ≤ mes final.";
    else if (p.id && !/^[a-z0-9][a-z0-9_-]{0,47}$/.test(p.id)) err = "Identificador: solo a-z, 0-9, _ y - (máx. 48).";
    p.error = err;
    return p;
  }

  function aoiGeometry(p) {
    var dLat = p.radio / 111.32;
    var dLon = p.radio / (111.32 * Math.cos(p.lat * Math.PI / 180));
    var ring = [];
    if (p.forma === "circulo") {
      for (var i = 0; i <= 64; i++) {
        var t = (i / 64) * 2 * Math.PI;
        ring.push([p.lon + dLon * Math.cos(t), p.lat + dLat * Math.sin(t)]);
      }
    } else {
      ring = [[p.lon - dLon, p.lat - dLat], [p.lon + dLon, p.lat - dLat], [p.lon + dLon, p.lat + dLat],
              [p.lon - dLon, p.lat + dLat], [p.lon - dLon, p.lat - dLat]];
    }
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] },
             bbox: [p.lon - dLon, p.lat - dLat, p.lon + dLon, p.lat + dLat] };
  }
  function areaKm2(p) {
    return p.forma === "circulo" ? Math.PI * p.radio * p.radio : Math.pow(2 * p.radio, 2);
  }

  /* ----------------------------------------------------------------------
     2. Mapa A | B (Sentinel-2 cloudless por año, sin cuenta)
     ---------------------------------------------------------------------- */
  var mapA = null, mapB = null, lastParams = null;
  var swipeWrap = $("#cmp-swipe");
  var mapNotice = $("#cmp-map-notice");

  function eoxStyle(initialYear) {
    var sources = { aoi: { type: "geojson", data: { type: "FeatureCollection", features: [] } } };
    var layers = [];
    CFG.eox_years.forEach(function (y) {
      sources["eox" + y] = {
        type: "raster", tileSize: 256, maxzoom: 13,
        tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-" + y + "_3857/default/g/{z}/{y}/{x}.jpg"],
        attribution: "Sentinel-2 cloudless <a href=\"https://s2maps.eu\" target=\"_blank\" rel=\"noopener\">s2maps.eu</a> by EOX IT Services GmbH (contiene datos Copernicus Sentinel modificados, " + y + ") · CC BY-NC-SA 4.0"
      };
      layers.push({ id: "eox" + y, type: "raster", source: "eox" + y,
                    layout: { visibility: y === initialYear ? "visible" : "none" } });
    });
    layers.push({ id: "aoi-fill", type: "fill", source: "aoi", paint: { "fill-color": "#FFC800", "fill-opacity": 0.08 } });
    layers.push({ id: "aoi-line", type: "line", source: "aoi", paint: { "line-color": "#FFC800", "line-width": 2.5 } });
    return { version: 8, sources: sources, layers: layers };
  }
  function showYear(map, year) {
    CFG.eox_years.forEach(function (y) {
      if (map.getLayer("eox" + y)) map.setLayoutProperty("eox" + y, "visibility", y === year ? "visible" : "none");
    });
  }

  var selA = $("#cmp-eox-a"), selB = $("#cmp-eox-b"), slider = $("#cmp-slider");
  function fillYearSelect(sel, value) {
    CFG.eox_years.forEach(function (y) { sel.appendChild(el("option", { value: String(y), text: String(y) })); });
    sel.value = String(value);
  }
  function setSplit(pct) {
    var a = $("#cmp-map-a"), line = $("#cmp-divider");
    if (a) a.style.clipPath = "inset(0 " + (100 - pct) + "% 0 0)";
    if (line) line.style.left = pct + "%";
  }

  function initMaps() {
    if (!window.maplibregl) {
      if (mapNotice) mapNotice.hidden = false;
      return;
    }
    var years = CFG.eox_years;
    var ya = years[Math.max(0, years.length - 6)] || years[0], yb = years[years.length - 1];
    fillYearSelect(selA, ya); fillYearSelect(selB, yb);
    var p0 = readParams();
    var base = { center: [isNaN(p0.lon) ? -90.35 : p0.lon, isNaN(p0.lat) ? 14.62 : p0.lat], zoom: 10, attributionControl: true };
    mapB = new maplibregl.Map(Object.assign({ container: "cmp-map-b", style: eoxStyle(yb) }, base));
    mapA = new maplibregl.Map(Object.assign({ container: "cmp-map-a", style: eoxStyle(ya), attributionControl: false }, base));
    mapB.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapB.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    var syncing = false;
    function link(src, dst) {
      src.on("move", function () {
        if (syncing) return; syncing = true;
        dst.jumpTo({ center: src.getCenter(), zoom: src.getZoom(), bearing: src.getBearing(), pitch: src.getPitch() });
        syncing = false;
      });
    }
    link(mapA, mapB); link(mapB, mapA);

    var loaded = 0;
    function onLoad() { if (++loaded === 2) updateAll(true); }
    mapA.on("load", onLoad); mapB.on("load", onLoad);

    function onClick(e) {
      F.lat.value = e.lngLat.lat.toFixed(5); F.lon.value = e.lngLat.lng.toFixed(5);
      updateAll(false);
    }
    mapA.on("click", onClick); mapB.on("click", onClick);

    selA.addEventListener("change", function () { showYear(mapA, parseInt(selA.value, 10)); });
    selB.addEventListener("change", function () { showYear(mapB, parseInt(selB.value, 10)); });
    slider.addEventListener("input", function () { setSplit(parseFloat(slider.value)); });
    setSplit(50);
  }

  /* ----------------------------------------------------------------------
     3. Actualización de lecturas y comandos
     ---------------------------------------------------------------------- */
  var readout = $("#cmp-readout"), formError = $("#cmp-form-error");
  var repoSlug = (function () {
    var h = location.hostname;
    if (/\.github\.io$/.test(h)) {
      var owner = h.split(".")[0], repo = location.pathname.split("/").filter(Boolean)[0];
      if (owner && repo) return owner + "/" + repo;
    }
    return CFG.repo_slug || null;
  })();

  function updateAll(fit) {
    var p = readParams();
    lastParams = p;
    if (p.error) {
      formError.textContent = p.error; formError.hidden = false;
      readout.textContent = "Corrige los datos para ver el área.";
      return;
    }
    formError.hidden = true;
    var g = aoiGeometry(p), b = g.bbox;
    readout.textContent = "Área ≈ " + fmt(areaKm2(p), 1) + " km² · lado " + (p.forma === "circulo" ? "(círculo, Ø " : "") +
      fmt(p.radio * 2, 1) + " km" + (p.forma === "circulo" ? ")" : "") + " · Oeste " + b[0].toFixed(4) + " · Sur " + b[1].toFixed(4) +
      " · Este " + b[2].toFixed(4) + " · Norte " + b[3].toFixed(4);
    [mapA, mapB].forEach(function (m) {
      if (m && m.getSource("aoi")) {
        m.getSource("aoi").setData({ type: "FeatureCollection", features: [g] });
        if (fit) m.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 40, duration: 0 });
      }
    });
    $("#cmp-gh-cmd").textContent = ghCommand(p);
  }

  function ghCommand(p) {
    var parts = ["gh workflow run comparador.yml" + (repoSlug ? " -R " + repoSlug : "")];
    parts.push("-f lat=" + p.lat, "-f lon=" + p.lon, "-f radio_km=" + p.radio, "-f forma=" + p.forma,
               "-f anio_inicio=" + p.a0, "-f anio_fin=" + p.a1, "-f mes_inicio=" + p.m0, "-f mes_fin=" + p.m1);
    if (p.id) parts.push("-f id=" + p.id);
    return parts.join(" \\\n  ");
  }

  function setLine(src, name, value) {
    var re = new RegExp("^(var " + name + " = )[^;]*;", "m");
    return src.replace(re, function (_, pre) { return pre + value + ";"; });
  }
  function buildGeeScript(src, p) {
    var s = src;
    s = setLine(s, "LAT", p.lat); s = setLine(s, "LON", p.lon); s = setLine(s, "RADIO_KM", p.radio);
    s = setLine(s, "FORMA", "'" + p.forma + "'");
    s = setLine(s, "ANIO_INICIO", p.a0); s = setLine(s, "ANIO_FIN", p.a1);
    s = setLine(s, "MES_INICIO", p.m0); s = setLine(s, "MES_FIN", p.m1);
    return s;
  }

  var geeStatus = $("#cmp-gee-status");
  $("#cmp-copy-gee").addEventListener("click", function () {
    var p = readParams();
    if (p.error) { geeStatus.textContent = p.error; return; }
    geeStatus.textContent = "Preparando script…";
    fetch(CFG.base + "comparador/geourbano_comparador.js").then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    }).then(function (t) { copyText(buildGeeScript(t, p), geeStatus); })
      .catch(function () { geeStatus.textContent = "No se pudo cargar el script. Descárgalo desde el enlace de abajo."; });
  });
  $("#cmp-copy-gh").addEventListener("click", function () {
    var p = readParams();
    if (p.error) { $("#cmp-gh-status").textContent = p.error; return; }
    copyText(ghCommand(p), $("#cmp-gh-status"));
  });
  var actionsLink = $("#cmp-actions-link");
  if (actionsLink && repoSlug) actionsLink.href = "https://github.com/" + repoSlug + "/actions/workflows/comparador.yml";

  $$("[data-cmp-input]").forEach(function (i) {
    i.addEventListener("change", function () { updateAll(true); });
  });
  $("#cmp-locate").addEventListener("click", function () { updateAll(true); });
  $("#cmp-use-project").addEventListener("click", function () {
    F.lat.value = CFG.default_center[1]; F.lon.value = CFG.default_center[0]; updateAll(true);
  });

  /* ----------------------------------------------------------------------
     4. Visor de análisis publicados
     ---------------------------------------------------------------------- */
  var viewer = $("#cmp-viewer");
  var state = { items: [], cur: null, view: "grid", visible: {}, opacity: 0.75, rgb: true, yA: null, yB: null };
  CLASES.forEach(function (c) { state.visible[c.id] = c.id !== "agua_otros"; });
  var cache = {};

  function loadClassMap(url) {
    if (cache[url]) return cache[url];
    cache[url] = new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        var ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        var d = ctx.getImageData(0, 0, c.width, c.height).data;
        var pal = CLASES.map(function (k) { return hexToRgb(k.color); });
        var idx = new Uint8Array(c.width * c.height);
        for (var i = 0, j = 0; i < d.length; i += 4, j++) {
          if (d[i + 3] < 128) continue;            // transparente / fuera del área
          var best = 0, bd = 1e9;
          for (var k = 0; k < pal.length; k++) {
            var dr = d[i] - pal[k][0], dg = d[i + 1] - pal[k][1], db = d[i + 2] - pal[k][2];
            var dist = dr * dr + dg * dg + db * db;
            if (dist < bd) { bd = dist; best = k + 1; }
          }
          idx[j] = best;
        }
        resolve({ w: c.width, h: c.height, idx: idx });
      };
      img.onerror = function () { reject(new Error("No se pudo cargar " + url)); };
      img.src = url;
    });
    return cache[url];
  }
  function paint(canvas, map) {
    canvas.width = map.w; canvas.height = map.h;
    var ctx = canvas.getContext("2d");
    var out = ctx.createImageData(map.w, map.h), o = out.data;
    var rgb = CLASES.map(function (k) { return hexToRgb(k.color); });
    var on = CLASES.map(function (k) { return !!state.visible[k.id]; });
    for (var j = 0; j < map.idx.length; j++) {
      var c = map.idx[j];
      if (!c || !on[c - 1]) continue;
      var q = j * 4, col = rgb[c - 1];
      o[q] = col[0]; o[q + 1] = col[1]; o[q + 2] = col[2]; o[q + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    canvas.style.opacity = String(state.opacity);
  }
  function stack(item, year) {
    var f = item.archivos[String(year)];
    var base = CFG.base + "comparador/resultados/" + item.id + "/";
    var wrap = el("div", { class: "cmp-stack" + (state.rgb ? "" : " no-rgb") });
    var img = el("img", { src: base + f.rgb, alt: "Sentinel-2 " + year + " · " + item.nombre, loading: "lazy" });
    var cv = el("canvas", { role: "img", "aria-label": "Categorías de cobertura " + year });
    wrap.appendChild(img); wrap.appendChild(cv);
    loadClassMap(base + f.clase).then(function (m) { cv._map = m; paint(cv, m); })
      .catch(function () { wrap.appendChild(el("span", { class: "cmp-err", text: "Imagen no disponible" })); });
    return wrap;
  }
  function repaintAll() {
    $$("#cmp-viewer canvas").forEach(function (cv) { if (cv._map) paint(cv, cv._map); });
    $$("#cmp-viewer .cmp-stack").forEach(function (s) { s.classList.toggle("no-rgb", !state.rgb); });
  }

  function renderLegend() {
    var box = $("#cmp-legend"); box.textContent = "";
    CLASES.forEach(function (c) {
      var id = "cmp-cls-" + c.id;
      var cb = el("input", { type: "checkbox", id: id });
      cb.checked = !!state.visible[c.id];
      cb.addEventListener("change", function () { state.visible[c.id] = cb.checked; repaintAll(); renderStats(); });
      var chip = el("span", { class: "cmp-chip", "aria-hidden": "true" }); chip.style.background = c.color;
      var lab = el("label", { for: id, title: c.descripcion }, [chip, el("span", { text: c.etiqueta })]);
      var only = el("button", { type: "button", class: "cmp-only", text: "solo" });
      only.setAttribute("aria-label", "Mostrar solo " + c.etiqueta);
      only.addEventListener("click", function () {
        CLASES.forEach(function (k) { state.visible[k.id] = k.id === c.id; });
        renderLegend(); repaintAll(); renderStats();
      });
      box.appendChild(el("li", {}, [cb, lab, only]));
    });
  }

  function renderView() {
    var item = state.cur; var host = $("#cmp-view"); host.textContent = "";
    if (!item) return;
    $$("[data-cmp-tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-cmp-tab") === state.view)); });
    $("#cmp-pane-stats").hidden = state.view !== "stats";
    host.hidden = state.view === "stats";
    $("#cmp-swipe-years").hidden = state.view !== "swipe";
    if (state.view === "grid") {
      var grid = el("div", { class: "cmp-grid" });
      item.anios.forEach(function (y) {
        var fig = el("figure", { class: "cmp-fig" }, [stack(item, y), el("figcaption", { text: String(y) })]);
        grid.appendChild(fig);
      });
      host.appendChild(grid);
    } else if (state.view === "swipe") {
      var wrap = el("div", { class: "cmp-cmp" });
      var a = stack(item, state.yA), b = stack(item, state.yB);
      a.classList.add("cmp-top"); a.style.clipPath = "inset(0 50% 0 0)";
      var line = el("div", { class: "cmp-cmp-line" });
      var la = el("span", { class: "cmp-tag cmp-tag-a", text: String(state.yA) });
      var lb = el("span", { class: "cmp-tag cmp-tag-b", text: String(state.yB) });
      var rng = el("input", { type: "range", min: "0", max: "100", value: "50", class: "cmp-cmp-range", "aria-label": "Deslizar entre año A y año B" });
      rng.addEventListener("input", function () {
        a.style.clipPath = "inset(0 " + (100 - rng.value) + "% 0 0)"; line.style.left = rng.value + "%";
      });
      line.style.left = "50%";
      [b, a, line, la, lb, rng].forEach(function (n) { wrap.appendChild(n); });
      host.appendChild(wrap);
    } else {
      renderStats();
    }
  }

  function totals(item, y) {
    var s = item.estadisticas_ha[String(y)] || {}, t = 0;
    CLASES.forEach(function (c) { t += s[c.id] || 0; });
    return t;
  }
  function renderStats() {
    var item = state.cur; if (!item) return;
    var cols = CLASES.filter(function (c) { return state.visible[c.id]; });
    var tbl = $("#cmp-stats-table"); tbl.textContent = "";
    var thead = el("tr", {}, [el("th", { text: "Año" })]);
    cols.forEach(function (c) {
      var chip = el("span", { class: "cmp-chip", "aria-hidden": "true" }); chip.style.background = c.color;
      thead.appendChild(el("th", {}, [chip, el("span", { text: c.etiqueta })]));
    });
    tbl.appendChild(el("thead", {}, [thead]));
    var tb = el("tbody");
    item.anios.forEach(function (y) {
      var s = item.estadisticas_ha[String(y)] || {}, t = totals(item, y);
      var tr = el("tr", {}, [el("th", { scope: "row", text: String(y) })]);
      cols.forEach(function (c) {
        var v = s[c.id] || 0;
        tr.appendChild(el("td", { text: fmt(v, 1) + " ha (" + fmt(t ? 100 * v / t : 0, 1) + " %)" }));
      });
      tb.appendChild(tr);
    });
    if (item.anios.length > 1) {
      var y0 = item.anios[0], y1 = item.anios[item.anios.length - 1];
      var s0 = item.estadisticas_ha[String(y0)] || {}, s1 = item.estadisticas_ha[String(y1)] || {};
      var t0 = totals(item, y0), t1 = totals(item, y1);
      var tr2 = el("tr", { class: "cmp-delta" }, [el("th", { scope: "row", text: "Cambio " + y0 + "→" + y1 })]);
      cols.forEach(function (c) {
        var dv = (s1[c.id] || 0) - (s0[c.id] || 0);
        var dp = (t1 ? 100 * (s1[c.id] || 0) / t1 : 0) - (t0 ? 100 * (s0[c.id] || 0) / t0 : 0);
        tr2.appendChild(el("td", { text: (dv >= 0 ? "+" : "−") + fmt(Math.abs(dv), 1) + " ha (" + (dp >= 0 ? "+" : "−") + fmt(Math.abs(dp), 1) + " pp)" }));
      });
      tb.appendChild(tr2);
    }
    tbl.appendChild(tb);
    drawChart(item, cols);
  }

  function drawChart(item, cols) {
    var host = $("#cmp-chart"); host.textContent = "";
    var W = 720, H = 320, m = { l: 62, r: 12, t: 12, b: 34 };
    var NS = "http://www.w3.org/2000/svg";
    function s(tag, a) { var n = document.createElementNS(NS, tag); Object.keys(a || {}).forEach(function (k) { n.setAttribute(k, a[k]); }); return n; }
    var svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Superficie por categoría y año (ha)", class: "cmp-svg" });
    var maxV = 0;
    item.anios.forEach(function (y) {
      var st = item.estadisticas_ha[String(y)] || {}, t = 0;
      cols.forEach(function (c) { t += st[c.id] || 0; }); if (t > maxV) maxV = t;
    });
    if (!maxV) maxV = 1;
    var step = Math.pow(10, Math.floor(Math.log10(maxV / 4))), mult = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < mult.length; i++) { if (maxV / (step * mult[i]) <= 5) { step *= mult[i]; break; } }
    var top = Math.ceil(maxV / step) * step, iw = W - m.l - m.r, ih = H - m.t - m.b;
    for (var v = 0; v <= top + 1e-9; v += step) {
      var y = m.t + ih - (v / top) * ih;
      svg.appendChild(s("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: "currentColor", "stroke-opacity": "0.15" }));
      var tx = s("text", { x: m.l - 6, y: y + 4, "text-anchor": "end", "font-size": "11", fill: "currentColor" }); tx.textContent = fmt(v, 0);
      svg.appendChild(tx);
    }
    var bw = iw / item.anios.length;
    item.anios.forEach(function (yr, k) {
      var st = item.estadisticas_ha[String(yr)] || {}, acc = 0;
      cols.forEach(function (c) {
        var val = st[c.id] || 0; if (!val) return;
        var h = (val / top) * ih, yy = m.t + ih - ((acc + val) / top) * ih;
        var r = s("rect", { x: m.l + k * bw + bw * 0.15, y: yy, width: bw * 0.7, height: h, fill: c.color });
        var t = s("title"); t.textContent = yr + " · " + c.etiqueta + ": " + fmt(val, 1) + " ha"; r.appendChild(t);
        svg.appendChild(r); acc += val;
      });
      var lb = s("text", { x: m.l + k * bw + bw / 2, y: H - 12, "text-anchor": "middle", "font-size": "12", fill: "currentColor" });
      lb.textContent = String(yr); svg.appendChild(lb);
    });
    var yl = s("text", { x: 14, y: m.t + ih / 2, transform: "rotate(-90 14 " + (m.t + ih / 2) + ")", "text-anchor": "middle", "font-size": "11", fill: "currentColor" });
    yl.textContent = "hectáreas"; svg.appendChild(yl);
    host.appendChild(svg);
  }

  function selectItem(item) {
    state.cur = item;
    if (!item) return;
    state.yA = item.anios[0]; state.yB = item.anios[item.anios.length - 1];
    var sa = $("#cmp-sw-a"), sb = $("#cmp-sw-b"); sa.textContent = ""; sb.textContent = "";
    item.anios.forEach(function (y) {
      sa.appendChild(el("option", { value: String(y), text: String(y) }));
      sb.appendChild(el("option", { value: String(y), text: String(y) }));
    });
    sa.value = String(state.yA); sb.value = String(state.yB);
    var sd = $("#cmp-meta"); sd.textContent = "";
    var g = new Date(item.generado_utc);
    sd.appendChild(el("span", { text: "Centroide " + item.centroide.lat + ", " + item.centroide.lon + " · radio " + item.radio_km + " km (" + item.forma + ") · " +
      fmt(item.area_km2, 1) + " km² · temporada meses " + item.temporada.mes_inicio + "–" + item.temporada.mes_fin +
      " · generado " + (isNaN(g) ? item.generado_utc : g.toLocaleDateString("es-GT")) }));
    if (item.anios_omitidos && item.anios_omitidos.length) {
      sd.appendChild(el("span", { class: "cmp-warn", text: " · Años omitidos: " + item.anios_omitidos.map(function (o) { return o.anio; }).join(", ") }));
    }
    renderView(); renderStats();
  }

  function initViewer() {
    if (!viewer) return;
    fetch(CFG.base + "comparador/index.json").then(function (r) { return r.json(); }).then(function (idx) {
      state.items = idx.analisis || [];
      if (!state.items.length) { $("#cmp-empty").hidden = false; return; }
      $("#cmp-viewer-body").hidden = false;
      var sel = $("#cmp-analysis");
      state.items.forEach(function (it, i) { sel.appendChild(el("option", { value: String(i), text: it.nombre + " (" + it.anios[0] + "–" + it.anios[it.anios.length - 1] + ")" })); });
      sel.addEventListener("change", function () { selectItem(state.items[parseInt(sel.value, 10)]); });
      renderLegend(); selectItem(state.items[0]);
      // Si el formulario ya tiene el centroide del análisis, no hay que hacer nada más.
    }).catch(function () { $("#cmp-empty").hidden = false; });
    $$("[data-cmp-tab]").forEach(function (b) {
      b.addEventListener("click", function () { state.view = b.getAttribute("data-cmp-tab"); renderView(); });
    });
    $("#cmp-sw-a").addEventListener("change", function (e) { state.yA = parseInt(e.target.value, 10); renderView(); });
    $("#cmp-sw-b").addEventListener("change", function (e) { state.yB = parseInt(e.target.value, 10); renderView(); });
    $("#cmp-opacity").addEventListener("input", function (e) { state.opacity = parseFloat(e.target.value); repaintAll(); });
    $("#cmp-show-rgb").addEventListener("change", function (e) { state.rgb = e.target.checked; repaintAll(); });
  }

  /* ---------------------------------------------------------------------- */
  initMaps();
  updateAll(true);
  initViewer();
})();
