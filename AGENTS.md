# FR-SST-036 - Preoperacional Vehículo - SITOC

## Descripción

PWA (Progressive Web App) para diligenciar, guardar localmente y exportar en PDF (vía impresión) el formato **FR-SST-036** de SITOC para inspección preoperacional de vehículos. Funciona offline gracias a un Service Worker.

## Stack

- **HTML5 + CSS3 vanilla** — sin frameworks ni librerías externas
- **JavaScript vanilla** (IIFE) — sin dependencias
- **Canvas API** — firma digital y estampado de fotos con metadatos
- **localStorage** — persistencia local de registros e historial descargable
- **Service Worker** (`sw.js`) — caché offline con strategy stale-while-revalidate
- **Manifest** (`manifest.json`) — instalable en dispositivos móviles

## Estructura

```
Preoperacional/
├── index.html        # HTML limpio
├── styles.css        # Todos los estilos
├── app.js            # Todo el JS en IIFE
├── manifest.json     # Configuración PWA
├── sw.js             # Service Worker (caché offline)
├── icon.svg          # Icono PWA local (vehículo)
└── AGENTS.md         # Este archivo
```

## Convenciones

- **JS modular** — `app.js` envuelto en IIFE `(function () { 'use strict'; ... })();`
- **CSS externo** — `styles.css` con variables CSS, estilos de formulario, chips, toast tipos, etc.
- **LocalStorage key** — `sitoc_vehiculo_v2` (JSON array de registros)
- **Navegación** — 2 pantallas (`form` y `historial/detalle`) controladas por `showScreen(name)`
- **Firma** — exportada como `dataURL`, almacenada como string único
- **Fotos** — se estampan con fecha, GPS y placa, guardadas como `image/jpeg` base64 comprimido 65%
- **Chips** — inputs dinámicos con etiquetas removibles para proyectos y destinos
- **Impresión PDF** — vía `window.print()` con estilos `@media print` específicos
- **Sin tests** — no hay suite de pruebas configurada

## Funcionalidades clave

1. Formulario con datos de control (fecha, placa, conductor, SOAT, Tecno-Mecánica)
2. Campos de proyectos y destinos con entrada tipo chip (Enter para agregar, ✕ para eliminar)
3. Matriz de evaluación con 5 categorías (Luces, Cabina, Rodamiento, Mecánico/Eléctrico, Seguridad)
4. Toggle de estado por ítem: F (Funciona), NF (No Funciona), D (Defectuoso)
5. Captura de fotos con geolocalización obligatoria y estampado en lienzo (800px max, JPEG 65%)
6. Firma digital en canvas (touch y mouse) con verificación de vacío
7. Validación: firma requerida si hay evaluaciones marcadas
8. Guardado en localStorage con historial descargable (JSON)
9. Vista detalle con tabla de inspección y botón "Exportar PDF" (print)
10. Edición de registros existentes
11. Offline-first con Service Worker (network-first para navegación, stale-while-revalidate para assets)
12. Lightbox para visualización de fotos en HD

## Convenciones de código

- No usar librerías externas
- Las funciones expuestas globalmente se asignan al final de `app.js`
- Las evaluaciones se almacenan en `formState.evaluaciones` como objeto: `{ "Categoría_Item": "F" }`
- Las fotos se almacenan como base64 JPEG comprimido al 65% con metadatos visibles, max 800px
- El buscador de GPS es obligatorio para certificar cada foto
- `formState` = `{ editingId, evaluaciones{}, fotos[], firma, proyectos[], destinos[] }`
- Los botones de matriz se identifican por patrón `btn-{f,nf,d}-{catIdx}_{itemIdx}`
- Los chips se gestionan con `formState.proyectos[]` y `formState.destinos[]`, arrays de strings

## Generador PDF Nativo (`generarPDF`)

### Paginación dinámica
- Fase 1: pre-cálculo de Y para todas las líneas con `tempY -= lh + gap`
- Si `tempY - lh < MB + 30`, se inserta un page break en esa línea
- `pageBreaks[]` contiene los índices de inicio de cada página
- `textPages = pageBreaks.length - 1`

### Gap (espaciado vertical)
- `gap` se almacena por línea pero se aplica DESPUÉS de registrar `y`:
  ```js
  tempY -= plh;
  pageY.push({ y: tempY, lh: plh, top: tempY + plh });
  tempY -= (pln.gap || 0);
  ```
- Esto asegura que el rectángulo de fondo cubra solo `lh` puntos y haya `gap` puntos de espacio vacío antes de la siguiente línea

### Secciones (recuadros)
- `sectionMap` se construye por página con `-start`/`-end` markers
- `startIdx = pi + 1` (primera línea de contenido después del marker)
- `endIdx = pi - 1` (última línea de contenido antes del marker)
- `startY = pageY[pi].top` (tope del primer contenido)
- `endY = pageY[pi].y` (base del marker end)
- Los recuadros se dibujan con `re S` (borde) y `re f` (fondo)
- Resumen: fondo `0.95 0.97 1` (azul claro)
- Matriz: fondo `0.97 0.98 0.99` (gris claro)

### Celdas coloreadas (F/NF/D)
- F (Funciona): fondo `0.85 1 0.85 rg` (verde claro), texto `0 0.55 0 rg`
- NF (No Funciona): fondo `1 0.85 0.85 rg` (rojo claro), texto `0.8 0 0 rg`
- D (Defectuoso): fondo `1 0.92 0.8 rg` (naranja claro), texto `0.85 0.5 0 rg`
- Rectángulo: `x = ML + 8`, `w = CW - 12`, `h = lh` (exacto, sin overlap)

### Líneas divisorias
- Entre categorías de matriz: línea horizontal `(ML+5) y (CW-5) 0 re S` en gris `0.8 0.8 0.8`
- HR globales: línea dibujada con `m`/`l`/`S` en gris `0.6 0.6 0.6`

### Páginas de imágenes
- Fotos y firma en páginas separadas después del texto
- Grid de 2×2 (4 imágenes por página)
- Las imágenes JPEG se incrustan como XObject con filtro DCTDecode
