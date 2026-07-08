(function () {
    'use strict';

    var CONFIG = {
        HISTORY_KEY: 'sitoc_vehiculo_v2'
    };

    var TELEGRAM_TOKEN = '8609966029:AAFx5daDcA19MiGTjyYE0Ky2uhi9yuJynHg';
    var TELEGRAM_CHAT_ID = '-1004367728045';

    var MATRIZ_CATEGORIAS = [
        {
            titulo: 'Luces',
            items: ['Frontales', 'Traseras', 'Direccionales', 'De Parqueo', 'De Stop y Frenado', 'Internas (cabina/vag\u00f3n)']
        },
        {
            titulo: 'Cabina',
            items: ['Espejo Central Panor\u00e1mico', 'Espejos Laterales', 'Alarma de Retroceso', 'Pito', 'Cintur\u00f3n de Seguridad', 'Limpia Parabrisas (Agua y Plumillas)', 'Asientos en Buenas Condiciones', 'Indicadores: Aceite, Temperatura, Tac\u00f3metro']
        },
        {
            titulo: 'Rodamiento',
            items: ['Estado de las Llantas', 'Llanta de Repuesto en Buen Estado', 'Muelles Traseros / Delanteros', 'Freno de Seguridad']
        },
        {
            titulo: 'Estado Mec\u00e1nico y El\u00e9ctrico',
            items: ['Fugas Hidr\u00e1ulicas', 'Fugas Otros L\u00edquidos (Agua, Valvulinas)', 'Estado de Mangueras, Correas', 'SOPORTE DEL CARDAN', 'Niveles: Aceite, Temperatura, Frenos, Embrague, Hidr\u00e1ulico', 'Bater\u00eda (Protectores y Bornes)', 'Sistema El\u00e9ctrico Aislado y Cableado']
        },
        {
            titulo: 'Condiciones de Seguridad',
            items: ['Botiqu\u00edn de Prim. Auxilios', 'Extintor de Incendios', 'Equipo de Carretera', 'Herramientas B\u00e1sicas', 'Conos con Reflectivos']
        }
    ];

    var formState = {
        editingId: null,
        evaluaciones: {},
        fotos: [],
        firma: '',
        proyectos: [],
        destinos: []
    };

    var canvas, ctx, dibujando = false;

    function $(id) { return document.getElementById(id); }

    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function checkDependencies() {
        var ids = ['screen-form', 'screen-historial', 'screen-detalle', 'toast', 'firmaCanvas', 'contenedor-matriz', 'historial-lista', 'detalleContenido', 'btn-eliminar-reg'];
        var missing = [];
        ids.forEach(function (id) {
            if (!$(id)) missing.push(id);
        });
        if (missing.length > 0) {
            console.error('Elementos faltantes en el DOM:', missing.join(', '));
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        construirMatrizUI();
        initCanvasFirma();
        initChipInput('input-proyectos', 'chip-container-proyectos', 'proyectos');
        initChipInput('input-destinos', 'chip-container-destinos', 'destinos');
        resetFormularioUI();
        checkDependencies();
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(function () {});
        }
    });

    function initChipInput(inputId, containerId, stateKey) {
        var input = $(inputId);
        var container = $(containerId);

        function renderChips() {
            var chipsHtml = '';
            formState[stateKey].forEach(function (item, i) {
                chipsHtml += '<span class="chip">' + escHtml(item) + '<button type="button" class="chip-remove" data-index="' + i + '">\u2715</button></span>';
            });
            var existingChips = container.querySelectorAll('.chip');
            existingChips.forEach(function (c) { c.remove(); });
            container.insertAdjacentHTML('afterbegin', chipsHtml);

            container.querySelectorAll('.chip-remove').forEach(function (btn) {
                btn.onclick = function (e) {
                    e.stopPropagation();
                    var idx = parseInt(btn.getAttribute('data-index'), 10);
                    formState[stateKey].splice(idx, 1);
                    renderChips();
                };
            });
        }

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                var val = input.value.trim();
                if (val) {
                    formState[stateKey].push(val);
                    input.value = '';
                    renderChips();
                }
            }
        });

        input.addEventListener('blur', function () {
            var val = input.value.trim();
            if (val) {
                formState[stateKey].push(val);
                input.value = '';
                renderChips();
            }
        });

        formState[stateKey] = [];
        renderChips();
    }

    function construirMatrizUI() {
        var html = '';
        MATRIZ_CATEGORIAS.forEach(function (cat, catIdx) {
            html += '<div class="caract-item">';
            html += '  <div class="caract-nombre">' + cat.titulo + '</div>';
            cat.items.forEach(function (item, itemIdx) {
                var key = cat.titulo + '_' + item;
                var safeId = catIdx + '_' + itemIdx;
                html += '  <div class="eq-row">';
                html += '    <div class="eq-nombre">' + item + '</div>';
                html += '    <div class="mini-yn">';
                html += '      <div class="mini-btn" id="btn-f-' + safeId + '" onclick="window._setEvaluacion(\'' + key.replace(/'/g, "\\'") + '\',\'F\',\'' + safeId + '\')">F</div>';
                html += '      <div class="mini-btn" id="btn-nf-' + safeId + '" onclick="window._setEvaluacion(\'' + key.replace(/'/g, "\\'") + '\',\'NF\',\'' + safeId + '\')">NF</div>';
                html += '      <div class="mini-btn" id="btn-d-' + safeId + '" onclick="window._setEvaluacion(\'' + key.replace(/'/g, "\\'") + '\',\'D\',\'' + safeId + '\')">D</div>';
                html += '    </div>';
                html += '  </div>';
            });
            html += '</div>';
        });
        $('contenedor-matriz').innerHTML = html;
    }

    function setEvaluacion(key, valor, safeId) {
        if (formState.evaluaciones[key] === valor) {
            formState.evaluaciones[key] = '';
        } else {
            formState.evaluaciones[key] = valor;
        }
        actualizarFilaBotones(key, safeId);
    }

    function actualizarFilaBotones(key, safeId) {
        var idF = 'btn-f-' + safeId;
        var idNf = 'btn-nf-' + safeId;
        var idD = 'btn-d-' + safeId;
        var estadoActual = formState.evaluaciones[key] || '';

        $(idF).className = estadoActual === 'F' ? 'mini-btn sel-f' : 'mini-btn';
        $(idNf).className = estadoActual === 'NF' ? 'mini-btn sel-nf' : 'mini-btn';
        $(idD).className = estadoActual === 'D' ? 'mini-btn sel-d' : 'mini-btn';
    }

    function capturarFotoManejador(input, contenedorId) {
        if (!input.files || input.files.length === 0) return;
        Array.from(input.files).forEach(function (file) {
            var lector = new FileReader();
            lector.onload = function (eventoRaiz) {
                var img = new Image();
                img.onload = function () {
                    var placa = $('vehPlaca').value.trim().toUpperCase() || 'Sin Placa';
                    var ahora = new Date();
                    var fechaHoraStr = ahora.toLocaleDateString('es-CO') + ' ' + ahora.toLocaleTimeString('es-CO');
                    if (navigator.geolocation) {
                        showToast('\ud83d\udce1 Fijando coordenadas por sat\u00e9lite...');
                        navigator.geolocation.getCurrentPosition(
                            function (position) {
                                var lat = position.coords.latitude.toFixed(6);
                                var lon = position.coords.longitude.toFixed(6);
                                var geoStr = 'Lat: ' + lat + ', Lon: ' + lon;
                                procesarYEstamparLienzo(img, fechaHoraStr, geoStr, placa, contenedorId);
                            },
                            function () {
                                alert('\u274c RECHAZO DE SEGURIDAD:\nGPS No Disponible para timbrado.');
                                showToast('\u26a0\ufe0f Foto rechazada por falta de GPS');
                            },
                            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                        );
                    }
                };
                img.src = eventoRaiz.target.result;
            };
            lector.readAsDataURL(file);
        });
        input.value = '';
    }

    function procesarYEstamparLienzo(img, fechaHora, gps, placa, contenedorId) {
        var canvasAux = document.createElement('canvas');
        var maxAnchoAlto = 800;
        var ancho = img.width;
        var alto = img.height;
        if (ancho > alto) {
            if (ancho > maxAnchoAlto) { alto *= maxAnchoAlto / ancho; ancho = maxAnchoAlto; }
        } else {
            if (alto > maxAnchoAlto) { ancho *= maxAnchoAlto / alto; alto = maxAnchoAlto; }
        }
        canvasAux.width = ancho;
        canvasAux.height = alto;
        var contexto = canvasAux.getContext('2d');
        contexto.drawImage(img, 0, 0, ancho, alto);

        var altoFranja = 60;
        contexto.fillStyle = 'rgba(0, 0, 0, 0.65)';
        contexto.fillRect(0, alto - altoFranja, ancho, altoFranja);
        contexto.fillStyle = '#ffffff';
        contexto.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
        contexto.textBaseline = 'top';
        contexto.fillText('\ud83d\udcc5 ' + fechaHora + '   \ud83d\udccd ' + gps, 14, alto - altoFranja + 10);
        contexto.fillText('\ud83d\ude98 Inspecci\u00f3n Placa: ' + placa, 14, alto - altoFranja + 32);

        formState.fotos.push(canvasAux.toDataURL('image/jpeg', 0.65));
        renderizarPrevisualizacionFotos(contenedorId);
    }

    function renderizarPrevisualizacionFotos(contenedorId) {
        var contenedor = $(contenedorId);
        contenedor.innerHTML = '';
        formState.fotos.forEach(function (base64Data, indice) {
            var wrap = document.createElement('div');
            wrap.className = 'photo-thumb-wrap';
            var img = document.createElement('img');
            img.src = base64Data;
            img.onclick = function () { abrirHdLightbox(this.src); };
            var btnBorrar = document.createElement('button');
            btnBorrar.className = 'photo-delete-btn';
            btnBorrar.type = 'button';
            btnBorrar.innerHTML = '\u2715';
            btnBorrar.onclick = function (e) {
                e.stopPropagation();
                formState.fotos.splice(indice, 1);
                renderizarPrevisualizacionFotos(contenedorId);
            };
            wrap.appendChild(img);
            wrap.appendChild(btnBorrar);
            contenedor.appendChild(wrap);
        });
    }

    function abrirHdLightbox(sourceB64) {
        var overlay = $('customLightbox');
        $('customLightboxImg').src = sourceB64;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function cerrarHdLightbox() {
        $('customLightbox').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function initCanvasFirma() {
        canvas = $('firmaCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.strokeStyle = '#0d2b4e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';

        function ajustarAnchoCanvas() {
            var width = canvas.parentElement.clientWidth;
            if (width < 200) width = 200;
            canvas.width = width;
            ctx.strokeStyle = '#0d2b4e';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            if (formState.firma) {
                var img = new Image();
                img.onload = function () { ctx.drawImage(img, 0, 0); };
                img.src = formState.firma;
            }
        }
        ajustarAnchoCanvas();
        window.addEventListener('resize', ajustarAnchoCanvas);

        canvas.addEventListener('mousedown', function (e) {
            dibujando = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        });
        canvas.addEventListener('mousemove', function (e) {
            if (dibujando) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); }
        });
        window.addEventListener('mouseup', function () { dibujando = false; });

        canvas.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                dibujando = true;
                var t = e.touches[0];
                var r = canvas.getBoundingClientRect();
                ctx.beginPath();
                ctx.moveTo(t.clientX - r.left, t.clientY - r.top);
                e.preventDefault();
            }
        }, { passive: false });
        canvas.addEventListener('touchmove', function (e) {
            if (dibujando && e.touches.length === 1) {
                var t = e.touches[0];
                var r = canvas.getBoundingClientRect();
                ctx.lineTo(t.clientX - r.left, t.clientY - r.top);
                ctx.stroke();
                e.preventDefault();
            }
        }, { passive: false });
        canvas.addEventListener('touchend', function () { dibujando = false; });
    }

    function limpiarFirma() {
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        formState.firma = '';
    }

    function firmaVacia() {
        if (!ctx) return true;
        var buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
        return !buffer.some(function (color) { return color !== 0; });
    }

    function resetFormularioUI() {
        $('vehFecha').value = new Date().toISOString().split('T')[0];
        $('vehPlaca').value = '';
        $('vehConductor').value = '';
        $('vehSoat').value = '';
        $('vehTecno').value = '';
        $('vehObs').value = '';
        $('btn-guardar-main').innerText = 'Guardar Reporte';

        formState.editingId = null;
        formState.evaluaciones = {};
        formState.fotos = [];
        formState.firma = '';
        formState.proyectos = [];
        formState.destinos = [];

        MATRIZ_CATEGORIAS.forEach(function (cat) {
            cat.items.forEach(function (item) {
                formState.evaluaciones[cat.titulo + '_' + item] = '';
            });
        });

        $('preview-vehiculo').innerHTML = '';
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

        $('input-proyectos').value = '';
        $('input-destinos').value = '';
        renderChipsFromState('proyectos');
        renderChipsFromState('destinos');
    }

    function renderChipsFromState(stateKey) {
        var container = $('chip-container-' + stateKey);
        if (!container) return;
        container.querySelectorAll('.chip').forEach(function (c) { c.remove(); });
        formState[stateKey].forEach(function (item, i) {
            var span = document.createElement('span');
            span.className = 'chip';
            span.innerHTML = escHtml(item) + '<button type="button" class="chip-remove" data-index="' + i + '">\u2715</button>';
            span.querySelector('.chip-remove').onclick = function (e) {
                e.stopPropagation();
                formState[stateKey].splice(i, 1);
                renderChipsFromState(stateKey);
            };
            container.insertBefore(span, container.querySelector('.chip-input'));
        });
    }

    function getRegs() {
        return JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY) || '[]');
    }

    function guardarFormulario() {
        var fecha = $('vehFecha').value;
        var placa = $('vehPlaca').value.trim().toUpperCase();
        var conductor = $('vehConductor').value.trim();
        var soat = $('vehSoat').value;
        var tecno = $('vehTecno').value;
        var obs = $('vehObs').value.trim();

        if (!fecha || !placa || !conductor || !soat || !tecno) {
            showToast('\u26a0\ufe0f Complete todos los datos obligatorios de control');
            return;
        }

        if (!firmaVacia()) {
            formState.firma = canvas.toDataURL();
        } else {
            formState.firma = '';
        }

        var hayEvaluacion = Object.values(formState.evaluaciones).some(function (v) { return v !== ''; });
        if (hayEvaluacion && !formState.firma) {
            alert('\u274c VALIDACI\u00d3N SST RECHAZADA:\nDebe registrar la firma del conductor.');
            return;
        }

        var aprobadoGlobal = true;
        Object.values(formState.evaluaciones).forEach(function (val) { if (val === 'NF' || val === 'D') aprobadoGlobal = false; });

        var registro = {
            id: formState.editingId ? formState.editingId : Date.now().toString(),
            fecha: fecha,
            placa: placa,
            conductor: conductor,
            soat: soat,
            tecno: tecno,
            proyectos: formState.proyectos,
            destinos: formState.destinos,
            evaluaciones: formState.evaluaciones,
            observaciones: obs,
            fotos: formState.fotos,
            firma: formState.firma,
            aprobado: aprobadoGlobal
        };

        var regs = getRegs();
        if (formState.editingId) {
            var idx = regs.findIndex(function (r) { return r.id === formState.editingId; });
            if (idx !== -1) regs[idx] = registro;
        } else {
            regs.unshift(registro);
        }

        localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(regs));
        showToast('\u2705 Reporte guardado. Enviando por Telegram...', 'info');
        enviarTelegram(registro);
        resetFormularioUI();
        showScreen('historial');
    }

    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
        document.querySelectorAll('.nav-btn').forEach(function (b) {
            b.classList.remove('active');
            var bar = b.querySelector('.nav-bar');
            if (bar) bar.style.display = 'none';
        });
        $('screen-' + name).classList.add('active');
        var navBtn = $('nav-' + name);
        if (navBtn) {
            navBtn.classList.add('active');
            var bar = navBtn.querySelector('.nav-bar');
            if (bar) bar.style.display = 'block';
        }
        window.scrollTo(0, 0);
        if (name === 'historial') renderHistorial();
    }

    function showToast(msg, type) {
        var t = $('toast');
        if (!t) return;
        t.textContent = msg;
        t.className = 'toast show' + (type ? ' toast--' + type : '');
        setTimeout(function () { t.className = 'toast'; }, 2500);
    }

    function renderHistorial() {
        var list = $('historial-lista');
        var regs = getRegs();
        var btnBorrar = $('btn-borrar-todo');
        if (regs.length === 0) {
            btnBorrar.style.display = 'none';
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">\ud83d\udcc1</div><p>No se registran preoperacionales</p></div>';
            return;
        }
        btnBorrar.style.display = 'block';
        var html = '';
        regs.forEach(function (r) {
            var dotClass = r.aprobado ? 'dot-ok' : 'dot-warn';
            html += '<div class="record-item" onclick="window.verDetalle(\'' + r.id + '\')">';
            html += '  <div class="record-dot ' + dotClass + '"></div>';
            html += '  <div class="record-info">';
            html += '    <div class="record-name">' + escHtml(r.placa) + ' \u2014 ' + escHtml(r.conductor) + '</div>';
            html += '    <div class="record-date">' + escHtml(r.fecha) + '</div>';
            html += '  </div>';
            html += '  <span style="font-size:12px; color:var(--cyan); font-weight:bold;">\ud83d\udc41\ufe0f Ver / PDF</span>';
            html += '</div>';
        });
        list.innerHTML = html;
    }

    function cargarParaEditar(id) {
        var r = getRegs().find(function (reg) { return reg.id === id; });
        if (!r) return;

        formState.editingId = r.id;
        formState.evaluaciones = JSON.parse(JSON.stringify(r.evaluaciones));
        formState.fotos = Array.from(r.fotos || []);
        formState.firma = r.firma || '';
        formState.proyectos = Array.from(r.proyectos || []);
        formState.destinos = Array.from(r.destinos || []);

        $('vehFecha').value = r.fecha;
        $('vehPlaca').value = r.placa;
        $('vehConductor').value = r.conductor;
        $('vehSoat').value = r.soat;
        $('vehTecno').value = r.tecno;
        $('vehObs').value = r.observaciones || '';
        $('btn-guardar-main').innerText = '\ud83d\udd04 Actualizar Reporte';
        renderizarPrevisualizacionFotos('preview-vehiculo');
        renderChipsFromState('proyectos');
        renderChipsFromState('destinos');

        Object.keys(formState.evaluaciones).forEach(function (key) {
            MATRIZ_CATEGORIAS.forEach(function (cat, catIdx) {
                cat.items.forEach(function (item, itemIdx) {
                    var k = cat.titulo + '_' + item;
                    if (k === key) {
                        var safeId = catIdx + '_' + itemIdx;
                        actualizarFilaBotones(key, safeId);
                    }
                });
            });
        });

        if (formState.firma) {
            var img = new Image();
            img.onload = function () { ctx.drawImage(img, 0, 0); };
            img.src = formState.firma;
        }

        showScreen('form');
    }

    function verDetalle(id) {
        var r = getRegs().find(function (reg) { return reg.id === id; });
        if (!r) return;

        var html = '';
        var estadoTexto = r.aprobado ? 'CONFORME (Veh\u00edculo Apto)' : 'NO CONFORME (Se detectaron hallazgos cr\u00edticos)';
        var estadoColor = r.aprobado ? 'var(--success)' : 'var(--danger)';

        html += '<div class="detail-hdr">';
        html += '  <h2>INSPECCI\u00d3N PREOPERACIONAL DE VEH\u00cdCULOS (FR-SST-036)</h2>';
        html += '  <p>Conductor: ' + escHtml(r.conductor) + ' | Placa: ' + escHtml(r.placa) + '</p>';
        html += '</div>';

        html += '<button class="btn btn-outline" onclick="window.cargarParaEditar(\'' + r.id + '\')" style="background: #fff8e1; border-color: var(--warn); color: var(--navy); margin-bottom: 12px; font-size:13px;">\u270f\ufe0f Editar Reporte</button>';

        html += '<div class="card">';
        html += '  <div class="card-title"><div class="icon">\ud83d\udccb</div>Resumen de Auditor\u00eda</div>';
        html += '  <div class="info-row"><span>Dictamen:</span><strong style="color:' + estadoColor + '">' + estadoTexto + '</strong></div>';
        html += '  <div class="info-row"><span>Fecha de Inspecci\u00f3n:</span><strong>' + escHtml(r.fecha) + '</strong></div>';
        html += '  <div class="info-row"><span>Conductor:</span><strong>' + escHtml(r.conductor) + '</strong></div>';
        html += '  <div class="info-row"><span>Placa:</span><strong>' + escHtml(r.placa) + '</strong></div>';
        if (r.proyectos && r.proyectos.length > 0) {
            html += '  <div class="info-row"><span>Proyecto(s):</span><div class="chip-list">';
            r.proyectos.forEach(function (p) { html += '<span class="chip-view">' + escHtml(p) + '</span>'; });
            html += '  </div></div>';
        }
        if (r.destinos && r.destinos.length > 0) {
            html += '  <div class="info-row"><span>Destino(s):</span><div class="chip-list">';
            r.destinos.forEach(function (d) { html += '<span class="chip-view">' + escHtml(d) + '</span>'; });
            html += '  </div></div>';
        }
        html += '  <div class="info-row"><span>Vencimiento SOAT:</span><strong>' + escHtml(r.soat) + '</strong></div>';
        html += '  <div class="info-row"><span>Vencimiento Tecno-Mec\u00e1nica:</span><strong>' + escHtml(r.tecno) + '</strong></div>';
        html += '  <div class="info-row"><span>Observaciones:</span><p style="font-size:13px; margin-top:2px;">' + escHtml(r.observaciones || 'Sin novedades registradas.') + '</p></div>';
        html += '</div>';

        html += '<div class="card" style="padding: 10px; overflow-x: auto;">';
        html += '  <div class="card-title"><div class="icon">\ud83d\udcca</div>Matriz de Inspecci\u00f3n</div>';
        html += '  <table class="inspection-table"><thead><tr><th>\u00cdtem / Componente</th><th>Estado</th></tr></thead><tbody>';
        MATRIZ_CATEGORIAS.forEach(function (cat) {
            html += '    <tr><td colspan="2" class="cat-hdr-row">' + cat.titulo + '</td></tr>';
            cat.items.forEach(function (item) {
                var key = cat.titulo + '_' + item;
                var val = r.evaluaciones[key] || '\u2014';
                var cClass = 'sc-empty';
                if (val === 'F') cClass = 'sc-F';
                if (val === 'NF') cClass = 'sc-NF';
                if (val === 'D') cClass = 'sc-D';
                html += '    <tr><td>' + item + '</td><td class="status-cell ' + cClass + '">' + val + '</td></tr>';
            });
        });
        html += '    </tbody></table></div>';

        if (r.fotos && r.fotos.length > 0) {
            html += '<div class="card"><div class="card-title"><div class="icon">\ud83d\udcf7</div>Soporte Fotogr\u00e1fico</div><div class="photo-grid" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:10px;">';
            r.fotos.forEach(function (base64) {
                html += '    <div style="width:100%; border:1px solid var(--gray3); border-radius:6px; overflow:hidden; background:#000;"><img src="' + base64 + '" style="width:100%; height:auto; display:block; cursor:zoom-in;" onclick="window.abrirHdLightbox(this.src)"></div>';
            });
            html += '  </div></div>';
        }

        if (r.firma) {
            html += '<div class="card" style="page-break-inside:avoid;">';
            html += '  <div class="card-title"><div class="icon">\u2712\ufe0f</div>Firma del Conductor</div>';
            html += '  <img src="' + r.firma + '" style="display:block;width:100%;max-width:300px;height:auto;background:#fafbfc;border:1px solid var(--gray3);border-radius:6px;margin:0 auto;">';
            html += '</div>';
        }

        html += '<div class="card" style="page-break-inside: avoid; padding: 0; overflow: hidden; border: 1px solid var(--gray3);"><table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 11px;"><thead><tr style="background: var(--gray); border-bottom: 1px solid var(--gray3);"><th style="padding: 8px; font-weight: bold; color: var(--navy); border-right: 1px solid var(--gray3); background:none;">Elaborado por:</th><th style="padding: 8px; font-weight: bold; color: var(--navy); border-right: 1px solid var(--gray3); background:none;">Revisado por:</th><th style="padding: 8px; font-weight: bold; color: var(--navy); border-right: 1px solid var(--gray3); background:none;">C\u00f3digo Formato:</th><th style="padding: 8px; font-weight: bold; color: var(--navy); background:none;">Versi\u00f3n:</th></tr></thead><tbody><tr><td style="padding: 10px; color: var(--text); border-right: 1px solid var(--gray3);">\u00c1rea SST Operativa</td><td style="padding: 10px; color: var(--text); border-right: 1px solid var(--gray3);">Gerencia General / L\u00edder HSEQ</td><td style="padding: 10px; color: var(--text); border-right: 1px solid var(--gray3);">FR-SST-036</td><td style="padding: 10px; color: var(--text);">02 (2026)</td></tr></tbody></table></div>';

        $('detalleContenido').innerHTML = html;
        $('btn-eliminar-reg').onclick = function () { eliminarReg(r.id); };

        var pd = $('screen-detalle');
        var oldBtn = pd.querySelector('.btn-pdf-dinamico');
        if (oldBtn) oldBtn.remove();

        var btnPdf = document.createElement('button');
        btnPdf.className = 'btn btn-pdf-dinamico';
        btnPdf.style = "background:var(--success);color:white;margin-top:15px;box-shadow:0 3px 10px rgba(56,161,105,.3);";
        btnPdf.innerHTML = '\ud83d\udce5 Exportar / Guardar Reporte en PDF';
        btnPdf.onclick = function () {
            var orig = document.title;
            document.title = 'Preoperacional_' + r.placa.trim() + '_' + r.fecha;
            window.print();
            setTimeout(function () { document.title = orig; }, 1000);
        };
        pd.insertBefore(btnPdf, $('btn-eliminar-reg'));

        var oldTel = pd.querySelector('.btn-telegram-dinamico');
        if (oldTel) oldTel.remove();

        var btnTel = document.createElement('button');
        btnTel.className = 'btn btn-telegram-dinamico';
        btnTel.style = "background:var(--primary);color:white;margin-top:8px;box-shadow:0 3px 10px rgba(0,53,102,.3);";
        btnTel.innerHTML = '\u2709\ufe0f Enviar Reporte por Telegram';
        btnTel.onclick = function () { enviarTelegram(r); };
        pd.insertBefore(btnTel, $('btn-eliminar-reg'));

        showScreen('detalle');
    }

    function eliminarReg(id) {
        if (!confirm('\u00bfSeguro que desea eliminar este registro?')) return;
        var regs = getRegs().filter(function (r) { return r.id !== id; });
        localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(regs));
        showScreen('historial');
        showToast('\ud83d\uddd1\ufe0f Registro eliminado');
    }

    function borrarTodo() {
        if (!confirm('\ud83d\udea8 \u00bfDesea vaciar TODO el historial?')) return;
        localStorage.removeItem(CONFIG.HISTORY_KEY);
        renderHistorial();
        showToast('\ud83d\uddd1\ufe0f Historial vaciado');
    }

    function descargarHistorial() {
        var regs = getRegs();
        if (regs.length === 0) { showToast('No hay historial para descargar', 'info'); return; }
        var json = JSON.stringify(regs, null, 2);
        var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'historial_preoperacional_' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('\ud83d\udce5 Historial descargado \u2713', 'success');
    }

    function canvasToJpeg(cvs, quality) {
        quality = quality || 0.85;
        if (!cvs || !cvs.width || !cvs.height) {
            var tmp = document.createElement('canvas');
            tmp.width = 200; tmp.height = 150;
            var tc = tmp.getContext('2d');
            tc.fillStyle = '#ffffff';
            tc.fillRect(0, 0, 200, 150);
            tc.fillStyle = '#aaaaaa';
            tc.font = '14px sans-serif';
            tc.textAlign = 'center';
            tc.fillText('Firma no disponible', 100, 80);
            return tmp.toDataURL('image/jpeg', quality);
        }
        try {
            var ctx2 = cvs.getContext('2d');
            var src = ctx2.getImageData(0, 0, cvs.width, cvs.height);
            var d = src.data;
            var tmp = document.createElement('canvas');
            tmp.width = cvs.width;
            tmp.height = cvs.height;
            var tc = tmp.getContext('2d');
            var dst = tc.createImageData(cvs.width, cvs.height);
            var o = dst.data;
            for (var i = 0; i < d.length; i += 4) {
                if (d[i + 3] > 0) {
                    o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = 255;
                } else {
                    o[i] = 255; o[i + 1] = 255; o[i + 2] = 255; o[i + 3] = 255;
                }
            }
            tc.putImageData(dst, 0, 0);
            return tmp.toDataURL('image/jpeg', quality);
        } catch (e) {
            console.error('canvasToJpeg fall\u00f3:', e);
            return cvs.toDataURL('image/png');
        }
    }

    function base64ToBytes(b64) {
        var raw = atob(b64.indexOf(',') >= 0 ? b64.split(',')[1] : b64);
        var b = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) b[i] = raw.charCodeAt(i);
        return b;
    }

    function jpgSize(b64) {
        var bytes = base64ToBytes(b64);
        if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return null;
        var i = 2;
        while (i < bytes.length) {
            if (bytes[i] !== 0xFF) return null;
            var marker = bytes[i+1];
            if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
                var h = (bytes[i+5] << 8) + bytes[i+6];
                var w = (bytes[i+7] << 8) + bytes[i+8];
                return { w: w, h: h };
            }
            var segLen = (bytes[i+2] << 8) + bytes[i+3];
            i += 2 + segLen;
        }
        return null;
    }

    function concatBytes(list) {
        var total = 0;
        for (var i = 0; i < list.length; i++) total += list[i].length;
        var r = new Uint8Array(total);
        var off = 0;
        for (var i = 0; i < list.length; i++) { r.set(list[i], off); off += list[i].length; }
        return r;
    }

    function escPdf(t) {
        if (!t) t = '';
        var r = '';
        for (var i = 0; i < t.length; i++) {
            var c = t.charCodeAt(i);
            if (c === 0x28 || c === 0x29 || c === 0x5C) { r += '\\' + String.fromCharCode(c); }
            else if (c < 32) { r += '\\' + c.toString(8).padStart(3, '0'); }
            else if (c < 128) { r += String.fromCharCode(c); }
            else {
                var m = { 0xd1:'\\335',0xf1:'\\361',0xc1:'\\301',0xe1:'\\341',0xc9:'\\311',0xe9:'\\351',
                          0xcd:'\\315',0xed:'\\355',0xd3:'\\323',0xf3:'\\363',0xda:'\\332',0xfa:'\\372',
                          0xdc:'\\334',0xfc:'\\374',0xbf:'\\277',0xa1:'\\241',0xb0:'\\260',0xaa:'\\252',
                          0xba:'\\272',0xac:'\\254',0xa9:'\\251',0xae:'\\256',0xab:'\\253',0xbb:'\\273',0xb7:'\\267' };
                r += m[c] || '?';
            }
        }
        return r;
    }

    function generarPDF(r) {
        var PAGE_W = 595, PAGE_H = 842;
        var ML = 45, MR = 45, MT = 50, MB = 50;
        var CW = PAGE_W - ML - MR;
        var LH = 14;

        var lines = [];

        function addLine(text, opts) {
            opts = opts || {};
            lines.push({ text: text || '', size: opts.size || 10, bold: opts.bold || false, indent: opts.indent || 0, gap: opts.gap || 0, pageBreak: opts.pageBreak || false, color: opts.color || null });
        }

        function addImageLine(b64, caption) {
            var info = jpgSize(b64);
            if (!info) { addLine('[Imagen no disponible]', { size: 9 }); return; }
            var maxW = CW * 0.7;
            var maxH = 180;
            var scale = Math.min(maxW / info.w, maxH / info.h, 1);
            var iw = Math.round(info.w * scale);
            var ih = Math.round(info.h * scale);
            lines.push({ type: 'image', b64: b64, w: iw, h: ih, caption: caption || '' });
        }

        addLine('PREOPERACIONAL DE VEH\u00cdCULOS (FR-SST-036)', { size: 15, bold: true, gap: 4 });
        addLine('SITOC \u00b7 FR-SST-036 Ver. 02', { size: 9, gap: 6 });
        addLine('', { size: 4, gap: 0 });
        addLine('\u2500'.repeat(80), { size: 8, gap: 4 });

        var est = r.aprobado ? 'CONFORME (Veh\u00edculo Apto)' : 'NO CONFORME (Se detectaron fallas cr\u00edticas)';
        var estColor = r.aprobado ? '0 0.55 0 rg' : '0.8 0 0 rg';
        addLine('RESUMEN DE AUDITOR\u00cdA', { size: 11, bold: true, gap: 6 });
        addLine('Estado: ' + est, { size: 10, gap: 2, color: estColor });
        addLine('Conductor: ' + (r.conductor || '\u2014'), { size: 10 });
        addLine('Placa: ' + (r.placa || '\u2014'), { size: 10 });
        addLine('Fecha: ' + (r.fecha || '\u2014'), { size: 10 });
        addLine('SOAT vence: ' + (r.soat || '\u2014'), { size: 10 });
        addLine('Tecno-Mec vence: ' + (r.tecno || '\u2014'), { size: 10 });
        if (r.proyectos && r.proyectos.length > 0) addLine('Proyectos: ' + r.proyectos.join(', '), { size: 10 });
        if (r.destinos && r.destinos.length > 0) addLine('Destinos: ' + r.destinos.join(', '), { size: 10, gap: 4 });
        if (r.observaciones) addLine('Obs: ' + r.observaciones, { size: 9, gap: 2 });
        addLine('', { size: 4, gap: 0 });

        addLine('MATRIZ DE EVALUACI\u00d3N', { size: 11, bold: true, gap: 4 });
        var hayEval = Object.values(r.evaluaciones).some(function (v) { return v !== ''; });
        if (hayEval) {
            MATRIZ_CATEGORIAS.forEach(function (cat) {
                addLine('  ' + cat.titulo, { size: 10, bold: true, indent: 5, gap: 2 });
                cat.items.forEach(function (item) {
                    var val = r.evaluaciones[cat.titulo + '_' + item];
                    if (val && val !== '') {
                        var colorVal = val === 'F' ? '0 0.55 0 rg' : (val === 'NF' ? '0.8 0 0 rg' : '0.85 0.5 0 rg');
                        addLine('    ' + item + ': ' + val, { size: 9, indent: 10, color: colorVal });
                    }
                });
            });
            addLine('', { size: 2, gap: 0 });
        }

        addLine('', { size: 2, gap: 0 });
        addLine('Elaborado por: \u00c1rea SST Operativa', { size: 9, indent: 5 });
        addLine('Revisado por: Gerencia General / L\u00edder HSEQ', { size: 9, indent: 5 });
        addLine('C\u00f3digo Formato: FR-SST-036  |  Versi\u00f3n: 02 (2026)', { size: 9, indent: 5, gap: 4 });
        addLine('', { size: 4, gap: 0 });
        addLine('\u2500'.repeat(80), { size: 8, gap: 6 });

        var images = [];
        if (r.fotos && r.fotos.length > 0) {
            r.fotos.forEach(function (b64) {
                images.push({ b64: b64, caption: 'Foto veh\u00edculo ' + r.placa });
            });
        }
        if (r.firma) {
            (function () {
                var fj;
                try {
                    var fc = document.createElement('canvas');
                    fc.width = 400; fc.height = 200;
                    var fctx = fc.getContext('2d');
                    var img = new Image();
                    img.src = r.firma;
                    if (img.complete && img.naturalWidth > 0) {
                        fctx.drawImage(img, 0, 0, 400, 200);
                    } else {
                        fctx.fillStyle = '#ffffff';
                        fctx.fillRect(0, 0, 400, 200);
                        fctx.fillStyle = '#cccccc';
                        fctx.font = '16px sans-serif';
                        fctx.textAlign = 'center';
                        fctx.fillText('Firma digital', 200, 105);
                    }
                    fj = canvasToJpeg(fc, 0.9);
                } catch (ef) {
                    console.error('Firma conversion error:', ef);
                    fj = canvasToJpeg(null);
                }
                images.push({ b64: fj, caption: 'Firma del Conductor: ' + (r.conductor || '') });
            })();
        }

        var seen = {};
        images = images.filter(function (img) {
            var key = img.b64;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });

        var objs = [];
        var objStreams = [];
        var objStrings = [];
        var nextNum = 0;
        function newObj(isStream) {
            nextNum++;
            var entry = { num: nextNum, offset: 0, gen: 0 };
            objs.push(entry);
            if (isStream) objStreams.push(entry);
            else objStrings.push(entry);
            return entry;
        }

        var fHelv = newObj(false);
        fHelv.text = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
        var fHelvB = newObj(false);
        fHelvB.text = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

        var imgXObjs = [];
        images.forEach(function (img) {
            var bytes = base64ToBytes(img.b64);
            var info = jpgSize(img.b64);
            if (!info) return;
            var entry = newObj(true);
            entry.imgBytes = bytes;
            entry.imgW = info.w;
            entry.imgH = info.h;
            entry.caption = img.caption;
            entry.text = '<< /Type /XObject /Subtype /Image /Width ' + info.w + ' /Height ' + info.h +
                        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bytes.length + ' >>';
            imgXObjs.push(entry);
        });

        var allPages = [];
        var linesPerPage = 56;
        var textPages = Math.max(1, Math.ceil(lines.length / linesPerPage));

        for (var tp = 0; tp < textPages; tp++) {
            var start = tp * linesPerPage;
            var end = Math.min(start + linesPerPage, lines.length);
            var pageLines = lines.slice(start, end);

            var content = '';
            var y = PAGE_H - MT - 15;
            for (var li = 0; li < pageLines.length; li++) {
                var ln = pageLines[li];
                var lh = Math.max(10, (ln.size || 10) + 4);
                y -= lh;
                if (ln.type === 'image') continue;
                var indent = ML + (ln.indent || 0);
                var font = ln.bold ? '/F2' : '/F1';
                var sz = ln.size || 10;
                if (ln.color) content += ln.color + ' ';
                content += 'BT ' + font + ' ' + sz + ' Tf ' + indent + ' ' + y + ' Td (' + escPdf(ln.text) + ') Tj ET\n';
                if (ln.color) content += '0 0 0 rg\n';
            }

            content += 'BT /F1 8 Tf ' + ML + ' 30 Td (P\u00e1gina ' + (tp + 1) + ' de ' + textPages + ' | Generado: ' + new Date().toLocaleDateString('es-CO') + ') Tj ET\n';

            var contentEntry = newObj(true);
            contentEntry.text = '<< /Length ' + content.length + ' >>';
            contentEntry.streamData = content;

            var fonts = '<< /F1 ' + fHelv.num + ' 0 R /F2 ' + fHelvB.num + ' 0 R >>';
            var pageEntry = newObj(false);
            pageEntry.text = '<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + '] /Contents ' + contentEntry.num + ' 0 R /Resources << /Font ' + fonts + ' >> >>';
            allPages.push(pageEntry);
        }

        if (imgXObjs.length > 0) {
            var imgsPerPage = 4;
            var imgPages = Math.ceil(imgXObjs.length / imgsPerPage);

            for (var ip = 0; ip < imgPages; ip++) {
                var startI = ip * imgsPerPage;
                var endI = Math.min(startI + imgsPerPage, imgXObjs.length);
                var pageImgs = imgXObjs.slice(startI, endI);

                var content = '';
                var cols = 2, rows = 2;
                var cellW = CW / cols;
                var cellH = (PAGE_H - MT - MB - 40) / rows;
                var iy = PAGE_H - MT - 20;

                content += 'BT /F1 10 Tf ' + ML + ' ' + (iy + 8) + ' Td (FOTOS Y FIRMAS - P\u00e1gina ' + (ip + 1) + ') Tj ET\n';
                iy -= 20;

                pageImgs.forEach(function (imgObj, idx) {
                    var col = idx % cols;
                    var row = Math.floor(idx / cols);
                    var ix = ML + col * cellW + 10;

                    var imgW = imgObj.imgW;
                    var imgH = imgObj.imgH;
                    var maxW = cellW - 20;
                    var maxH = cellH - 35;
                    var sc = Math.min(maxW / imgW, maxH / imgH, 1);
                    var dw = Math.round(imgW * sc);
                    var dh = Math.round(imgH * sc);

                    var cellTop = iy - row * cellH;
                    var imgY = cellTop - 15 - dh;

                    content += 'q ' + dw + ' 0 0 ' + dh + ' ' + ix + ' ' + imgY + ' cm /Img' + imgObj.num + ' Do Q\n';
                    content += 'BT /F1 7 Tf ' + ix + ' ' + (imgY - 12) + ' Td (' + escPdf(imgObj.caption.substring(0, 50)) + ') Tj ET\n';
                });

                var contentEntry = newObj(true);
                contentEntry.text = '<< /Length ' + content.length + ' >>';
                contentEntry.streamData = content;

                var fonts = '<< /F1 ' + fHelv.num + ' 0 R >>';
                var xobjs = '<< ';
                pageImgs.forEach(function (imgObj) { xobjs += '/Img' + imgObj.num + ' ' + imgObj.num + ' 0 R '; });
                xobjs += '>>';
                var resources = '<< /Font ' + fonts + ' /XObject ' + xobjs + ' >>';

                var pageEntry = newObj(false);
                pageEntry.text = '<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H + '] /Contents ' + contentEntry.num + ' 0 R /Resources ' + resources + ' >>';
                allPages.push(pageEntry);
            }
        }

        var pagesKids = allPages.map(function (p) { return p.num + ' 0 R'; }).join(' ');
        var pagesEntry = newObj(false);
        pagesEntry.text = '<< /Type /Pages /Kids [' + pagesKids + '] /Count ' + allPages.length + ' >>';

        allPages.forEach(function (p) {
            p.text = p.text.replace('/Parent 0 0 R', '/Parent ' + pagesEntry.num + ' 0 R');
        });

        var catalogEntry = newObj(false);
        catalogEntry.text = '<< /Type /Catalog /Pages ' + pagesEntry.num + ' 0 R >>';

        function serialize() {
            var chunks = [];
            function add(s) {
                if (typeof s === 'string') {
                    var b = new Uint8Array(s.length);
                    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xFF;
                    chunks.push(b);
                } else { chunks.push(s); }
            }

            add('%PDF-1.4\n');

            var offsets = new Array(objs.length + 1).fill(0);

            for (var i = 0; i < objs.length; i++) {
                var o = objs[i];
                offsets[o.num] = concatBytes(chunks).length;

                add(o.num + ' ' + o.gen + ' obj\n');
                if (o.text) add(o.text);
                if (objStreams.indexOf(o) >= 0) {
                    add('\nstream\n');
                    if (o.streamData !== undefined) add(o.streamData);
                    else if (o.imgBytes) add(o.imgBytes);
                    add('\nendstream');
                }
                add('\nendobj\n');
            }

            var xrefOffset = concatBytes(chunks).length;
            add('xref\n');
            add('0 ' + (objs.length + 1) + '\n');
            add('0000000000 65535 f \n');
            for (var i = 1; i <= objs.length; i++) {
                var s = '0000000000' + offsets[i];
                add(s.slice(-10) + ' 00000 n \n');
            }

            add('trailer\n');
            add('<< /Size ' + (objs.length + 1) + ' /Root ' + catalogEntry.num + ' 0 R >>\n');
            add('startxref\n');
            add(xrefOffset + '\n');
            add('%%EOF');

            return concatBytes(chunks);
        }

        return serialize();
    }

    function enviarTelegram(r) {
        showToast('\ud83d\udcc4 Generando PDF...', 'info');

        try {
            var pdfBytes = generarPDF(r);
        } catch (e) {
            console.error('generarPDF error:', e);
            showToast('\u274c Error generando PDF: ' + e.message, 'error');
            return;
        }
        if (!pdfBytes || pdfBytes.length < 100) {
            showToast('\u274c PDF generado vac\u00edo o inv\u00e1lido', 'error');
            return;
        }

        var pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        var nomBase = 'Preoperacional_' + (r.placa || 'SinPlaca').replace(/[/\\?%*:|"<> ]/g, '_') + '_' + (r.fecha || '');

        var pdfUrl = URL.createObjectURL(pdfBlob);
        var a = document.createElement('a');
        a.href = pdfUrl;
        a.download = nomBase + '.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(pdfUrl); }, 10000);

        var caption = '\ud83d\ude98 PREOPERACIONAL VEH\u00cdCULO - SITOC';
        caption += '\n\ud83d\udcc5 Fecha: ' + (r.fecha || '');
        caption += '\n\ud83d\udc64 Conductor: ' + (r.conductor || '');
        caption += '\n\ud83d\ude98 Placa: ' + (r.placa || '');
        if (r.proyectos && r.proyectos.length > 0) caption += '\n\ud83d\udcc1 Proyectos: ' + r.proyectos.join(', ');
        if (r.destinos && r.destinos.length > 0) caption += '\n\ud83d\udccd Destinos: ' + r.destinos.join(', ');
        caption += '\n\ud83d\udcca Estado: ' + (r.aprobado ? '\u2705 CONFORME' : '\u274c NO CONFORME');
        if (r.observaciones) caption += '\n\ud83d\udcac Obs: ' + r.observaciones;

        if (caption.length > 1024) caption = caption.substring(0, 1021) + '...';

        var formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('document', pdfBlob, nomBase + '.pdf');
        formData.append('caption', caption);

        fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendDocument', {
            method: 'POST',
            body: formData
        }).then(function (res) { return res.json(); }).then(function (data) {
            if (data.ok) {
                showToast('\u2705 PDF enviado por Telegram', 'success');
            } else {
                showToast('\u274c Error Telegram: ' + (data.description || 'desconocido'), 'error');
            }
        }).catch(function (err) {
            showToast('\u274c Error de red: ' + err.message, 'error');
        });
    }

    /* EXPOSE GLOBALS */
    window._setEvaluacion = setEvaluacion;
    window.capturarFotoManejador = capturarFotoManejador;
    window.limpiarFirma = limpiarFirma;
    window.guardarFormulario = guardarFormulario;
    window.showScreen = showScreen;
    window.verDetalle = verDetalle;
    window.cargarParaEditar = cargarParaEditar;
    window.eliminarReg = eliminarReg;
    window.borrarTodo = borrarTodo;
    window.abrirHdLightbox = abrirHdLightbox;
    window.cerrarHdLightbox = cerrarHdLightbox;
    window._descargarHistorial = descargarHistorial;
    window._enviarTelegram = enviarTelegram;

})();
