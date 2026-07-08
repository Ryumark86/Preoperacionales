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
