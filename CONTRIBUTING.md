# Guía de contribución (`clusterurbano-proyecto-template`)

## 1. Modelo de colaboración: fork personal y Pull Request

Este repositorio mantiene la versión compartida (canónica) de la iniciativa `xx-iniciativa-plantilla`. Para proponer mejoras en la ficha, metodología, código o capas del Geovisor GeoLibre:

1. **Haz un fork** de este repositorio en tu cuenta personal de GitHub (no hagas fork del portal general para trabajar en esta iniciativa).
2. **Clona tu fork** y añade el repositorio canónico como `upstream`:

```bash
gh repo fork copernicuscentroamerica/clusterurbano-proyecto-template --clone=false
git clone https://github.com/TU_USUARIO_GITHUB/clusterurbano-proyecto-template.git
cd clusterurbano-proyecto-template
git remote add upstream https://github.com/copernicuscentroamerica/clusterurbano-proyecto-template.git
git fetch upstream
git switch -c feat/mi-aporte upstream/main
```

*(Sustituye el propietario `copernicuscentroamerica` si la organización definitiva cambia).*

## 2. Desplegar capas en el Geovisor basado en GeoLibre

1. Exporta tu capa pública autorizada en `EPSG:4326` (por ejemplo GeoJSON ligero en `geovisor/data/` o URL HTTPS de COG / XYZ Tiles / OGC WMS).
2. Registra la ruta en `source_path` dentro de `geovisor/layers.json`, documenta sus limitaciones (`caveat`) y actualiza `status` a `"en_revision"` o `"publicado"`.
3. Construye y valida localmente el sitio.

## 3. Validación obligatoria antes de abrir Pull Request

```bash
python3 -m pip install -r requirements.txt
python3 scripts/validate.py --source
python3 scripts/build_site.py --output site
python3 scripts/validate.py --site site
```

Para previsualizar en navegador:

```bash
python3 -m http.server 8000 --directory site
```

Abre `http://localhost:8000` y revisa portada, ficha, geovisor y vista móvil.

## 4. Sincronizar tu fork tras integrar cambios

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```
