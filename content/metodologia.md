## Metodología de clasificación multianual en 6 clases (GEO-URBANO)

1. **Compuestos anuales libres de nubes (2018–2024):** Selección automatizada de escenas de época seca caribeña (enero–abril) de **Copernicus Sentinel-2 L2A (10 m)** con enmascaramiento de nubes y sombras mediante bandas de calidad (`SCL` / `Cloud Score+`).
2. **Separación de coberturas naturales y antrópicas:** Identificación anual a 10 m de vegetación arbórea, bosque húmedo y manglares costeros (`vegetacion`), explanaciones (`suelo_desnudo`), canales y bahías (`agua_otros`) y huella edificada total (`built`).
3. **Subdivisión morfológico-espectral del tejido construido:**
   - **Industrial, portuario y Zona Libre (`#7B2CBF`):** Parches contiguos >= 150 píxeles (~1.5 ha) con alta reflectancia visible (> 0.17), alta señal SWIR1 (> 0.20) y NDVI < 0.22.
   - **Asentamiento de alta densidad (`#F28C28`):** Tejido no industrial con compacidad edificada > 68% en radio de 60 m y desviación estándar óptica > 0.032 en radio de 30 m.
   - **Urbanización consolidada (`#D7263D`):** Tejido urbano residencial y mixto restante.
4. **Agregación en malla continua de 250 m:** Síntesis de porcentajes 2018 y 2024 sobre **2,003 celdas regulares** y **6 corregimientos**.
