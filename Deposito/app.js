/* =========================================================
   StockFlow WMS — prototipo de gestión de depósito
   HTML5 + CSS3 + JavaScript vanilla. Persistencia en localStorage.

   Índice
   1. Constantes y utilidades
   2. Íconos
   3. Datos de demostración
   4. Estado, persistencia y reglas de stock
   5. Componentes de UI (modal, confirmación, toasts, validación)
   6. Vistas
   7. Acciones y formularios
   8. Inicialización
   ========================================================= */
'use strict';

/* =========================================================
   1. Constantes y utilidades
   ========================================================= */
const STORAGE_KEY = 'stockflow-wms';
const DATA_VERSION = 1;

const UNIDADES = ['unidad', 'caja', 'rollo', 'bidón', 'pack', 'pallet', 'resma', 'kg'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const ESTADOS_TAREA = ['Pendiente', 'En proceso', 'Completada'];
const FLUJO_PEDIDO = ['Pendiente', 'Preparado', 'Embalado', 'Despachado'];
const MOTIVOS_AJUSTE = ['Conteo cíclico', 'Rotura', 'Vencimiento', 'Error de registro', 'Hallazgo', 'Muestra / consumo interno', 'Otro'];
const MOTIVOS_REUBICACION = ['Optimización de picking', 'Reorganización de pasillo', 'Consolidación de stock', 'Posición dañada', 'Rotación por vencimiento', 'Otro'];
const MOTIVOS_DEVOLUCION = ['Producto dañado', 'Error de preparación', 'Rechazo del cliente', 'Producto vencido', 'Sobrante de entrega', 'Otro'];
const TRANSPORTES = ['Flota propia', 'Transporte Rápido Sur', 'Logística Express', 'Cargas del Litoral', 'Retira el cliente'];
const EMBALAJES = ['Caja de cartón', 'Pallet film', 'Bolsa', 'Sobre', 'Granel'];
const TIPOS_MOV = ['Alta de producto', 'Recepción', 'Almacenamiento', 'Movimiento interno', 'Reserva', 'Picking', 'Packing', 'Despacho', 'Devolución', 'Ajuste', 'Cancelación', 'Baja de producto'];

const TONO_MOV = {
  'Alta de producto': 'info', 'Recepción': 'info', 'Almacenamiento': 'success', 'Movimiento interno': 'violet',
  'Reserva': 'neutral', 'Picking': 'warning', 'Packing': 'violet', 'Despacho': 'primary', 'Devolución': 'success',
  'Ajuste': 'warning', 'Cancelación': 'neutral', 'Baja de producto': 'danger'
};
const TONO_PEDIDO = { Pendiente: 'warning', Preparado: 'info', Embalado: 'violet', Despachado: 'success', Cancelado: 'neutral' };
const TONO_PRIORIDAD = { Alta: 'danger', Media: 'warning', Baja: 'neutral' };
const TONO_TAREA = { Pendiente: 'warning', 'En proceso': 'info', Completada: 'success' };

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, l = 2) => String(n).padStart(l, '0');
const num = n => Number(n || 0).toLocaleString('es-AR');
const sum = (arr, fn) => arr.reduce((acc, x) => acc + fn(x), 0);
const unique = arr => [...new Set(arr)].sort((a, b) => String(a).localeCompare(String(b), 'es'));
const clone = obj => JSON.parse(JSON.stringify(obj));

function isoDate(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function dayOffset(days) { const d = new Date(); d.setDate(d.getDate() + days); return isoDate(d); }
function stampOffset(days, h = 9, m = 0) { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); }
function agoMinutes(min) { return new Date(Date.now() - min * 60000).toISOString(); }
function localDateOf(stamp) { return isoDate(new Date(stamp)); }
function fmtDate(s) { if (!s) return '—'; const [y, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  return `${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
}
function initials(name) { return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
function plural(n, s, p) { return `${num(n)} ${n === 1 ? s : p}`; }

/* =========================================================
   2. Íconos (trazos estilo "feather", sin dependencias)
   ========================================================= */
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  shuffle: '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  undo: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  'check-square': '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  map: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  adjust: '<line x1="12" y1="3" x2="12" y2="11"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="17" x2="16" y2="17"/><rect x="3" y="2" width="18" height="20" rx="2"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>'
};
function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* =========================================================
   3. Datos de demostración
   ========================================================= */
function crearDatosDemo() {
  const s = {
    version: DATA_VERSION,
    usuario: 'Laura Gómez',
    layout: { pasillos: ['A', 'B', 'C', 'D'], estanterias: 5, niveles: 4 },
    personal: [
      { id: 1, nombre: 'Laura Gómez', rol: 'Supervisora' },
      { id: 2, nombre: 'Martín Ruiz', rol: 'Operario de depósito' },
      { id: 3, nombre: 'Lucía Fernández', rol: 'Preparadora de pedidos' },
      { id: 4, nombre: 'Diego Sosa', rol: 'Autoelevadorista' },
      { id: 5, nombre: 'Sofía Herrera', rol: 'Control de calidad' }
    ],
    productos: [], recepciones: [], pedidos: [], devoluciones: [], tareas: [], movimientos: [],
    seq: { producto: 0, recepcion: 0, pedido: 0, devolucion: 0, tarea: 0, movimiento: 0, personal: 5 }
  };

  // [sku, descripción, categoría, proveedor, unidad, stock, mínimo, ubicación]
  const catalogo = [
    ['ELE-001', 'Cable unipolar 2,5 mm (rollo 100 m)', 'Electricidad', 'Distribuidora Norte', 'rollo', 42, 20, 'A-01-1'],
    ['ELE-002', 'Lámpara LED 9 W luz fría', 'Electricidad', 'Distribuidora Norte', 'unidad', 310, 150, 'A-01-2'],
    ['ELE-003', 'Tomacorriente doble 10 A', 'Electricidad', 'Distribuidora Norte', 'unidad', 18, 40, 'A-01-3'],
    ['ELE-004', 'Disyuntor diferencial 2x40 A', 'Electricidad', 'Distribuidora Norte', 'unidad', 12, 10, 'A-02-1'],
    ['ELE-005', 'Cinta aisladora negra 20 m', 'Electricidad', 'Distribuidora Norte', 'unidad', 0, 50, 'A-02-2'],
    ['FER-001', 'Tornillo autoperforante 8x1" (caja x100)', 'Ferretería', 'Ferretera del Sur', 'caja', 95, 30, 'B-01-1'],
    ['FER-002', 'Taladro percutor 650 W', 'Ferretería', 'Ferretera del Sur', 'unidad', 7, 5, 'B-01-2'],
    ['FER-003', 'Martillo carpintero 27 mm', 'Ferretería', 'Ferretera del Sur', 'unidad', 26, 10, 'B-01-3'],
    ['FER-004', 'Llave ajustable 10"', 'Ferretería', 'Ferretera del Sur', 'unidad', 4, 8, 'B-02-1'],
    ['FER-005', 'Disco de corte 115 mm', 'Ferretería', 'Ferretera del Sur', 'unidad', 140, 60, 'B-02-2'],
    ['LIM-001', 'Lavandina concentrada 5 L', 'Limpieza', 'Limpiolux SA', 'bidón', 64, 30, 'C-01-1'],
    ['LIM-002', 'Detergente industrial 5 L', 'Limpieza', 'Limpiolux SA', 'bidón', 22, 25, 'C-01-2'],
    ['LIM-003', 'Rollo papel industrial 300 m', 'Limpieza', 'Limpiolux SA', 'rollo', 80, 40, 'C-01-3'],
    ['LIM-004', 'Guantes de nitrilo talle M (caja x100)', 'Limpieza', 'Limpiolux SA', 'caja', 35, 15, 'C-02-1'],
    ['EMB-001', 'Caja corrugada 40x30x30 cm', 'Embalaje', 'Packaging Total', 'unidad', 520, 200, 'D-01-1'],
    ['EMB-002', 'Film stretch 50 cm x 300 m', 'Embalaje', 'Packaging Total', 'rollo', 48, 20, 'D-01-2'],
    ['EMB-003', 'Cinta de embalar transparente 48 mm', 'Embalaje', 'Packaging Total', 'rollo', 260, 100, 'D-01-3'],
    ['EMB-004', 'Pallet de madera 1,20 x 1,00 m', 'Embalaje', 'Packaging Total', 'pallet', 15, 20, 'D-02-1'],
    ['LIB-001', 'Resma A4 75 g', 'Librería', 'Papelera Central', 'resma', 180, 80, 'C-03-1'],
    ['LIB-002', 'Bolígrafo azul (caja x50)', 'Librería', 'Papelera Central', 'caja', 40, 15, 'C-03-2'],
    ['LIB-003', 'Etiqueta térmica 100x150 (rollo x500)', 'Librería', 'Papelera Central', 'rollo', 9, 12, 'D-02-2'],
    ['ALI-001', 'Yerba mate 1 kg', 'Alimentos', 'Alimentos del Valle', 'unidad', 210, 100, 'B-03-1'],
    ['ALI-002', 'Azúcar 1 kg', 'Alimentos', 'Alimentos del Valle', 'unidad', 175, 120, 'B-03-2'],
    ['ALI-003', 'Aceite de girasol 1,5 L', 'Alimentos', 'Alimentos del Valle', 'unidad', 96, 60, 'B-03-3']
  ];
  catalogo.forEach(([sku, descripcion, categoria, proveedor, unidad, stock, minimo, ubicacion]) => {
    s.productos.push({ id: ++s.seq.producto, sku, descripcion, categoria, proveedor, unidad, stock, minimo, ubicacion, creado: stampOffset(-40) });
  });

  const bySku = sku => s.productos.find(p => p.sku === sku);
  const linea = (sku, cantidad, extra = {}) => { const p = bySku(sku); return { productoId: p.id, sku: p.sku, descripcion: p.descripcion, cantidad, ...extra }; };
  const mov = (fecha, tipo, sku, cantidad, signo, responsable, referencia, detalle = '') => {
    const p = bySku(sku);
    s.movimientos.push({ id: 0, fecha, tipo, productoId: p.id, sku: p.sku, descripcion: p.descripcion, cantidad, signo, stockResultante: null, responsable, referencia, detalle });
  };

  // Recepciones
  const recepcion = (dias, proveedor, remito, items, responsable, almacenadoTotal) => {
    const id = ++s.seq.recepcion;
    const codigo = `REC-${pad(id, 4)}`;
    const fecha = stampOffset(dias, 8, 20);
    const its = items.map(([sku, cant, alm]) => linea(sku, cant, { almacenado: almacenadoTotal ? cant : (alm || 0) }));
    const completa = its.every(i => i.almacenado >= i.cantidad);
    s.recepciones.push({ id, codigo, fecha, proveedor, remito, observaciones: '', responsable, estado: completa ? 'Almacenada' : 'Recibida', items: its });
    its.forEach(i => {
      mov(fecha, 'Recepción', i.sku, i.cantidad, 0, responsable, codigo, 'Ingreso a zona de recepción');
      if (i.almacenado) mov(stampOffset(dias, 10, 40), 'Almacenamiento', i.sku, i.almacenado, 1, 'Diego Sosa', codigo, `Ubicado en ${bySku(i.sku).ubicacion}`);
    });
  };
  recepcion(-6, 'Alimentos del Valle', 'R-0001-00004521', [['ALI-001', 100], ['ALI-002', 80]], 'Martín Ruiz', true);
  recepcion(-3, 'Packaging Total', 'R-0003-00012877', [['EMB-001', 200], ['EMB-003', 100]], 'Diego Sosa', true);
  recepcion(-1, 'Limpiolux SA', 'R-0002-00007310', [['LIM-002', 30, 0], ['LIM-003', 40, 20]], 'Martín Ruiz', false);

  // Pedidos
  const preparadores = ['Laura Gómez', 'Lucía Fernández', 'Martín Ruiz', 'Diego Sosa'];
  const pedido = (cliente, dias, entrega, prioridad, estado, items, extra = {}) => {
    const id = ++s.seq.pedido;
    const codigo = `PED-${pad(id, 4)}`;
    const idx = FLUJO_PEDIDO.indexOf(estado);
    const historial = FLUJO_PEDIDO.slice(0, idx + 1).map((e, i) => ({ estado: e, fecha: stampOffset(dias + Math.floor(i / 2), 9 + (i % 2) * 5, 10), usuario: preparadores[i] }));
    const its = items.map(([sku, cant]) => linea(sku, cant, { devuelto: 0 }));
    s.pedidos.push({ id, codigo, cliente, fecha: historial[0].fecha, entrega: dayOffset(entrega), prioridad, estado, observaciones: '', items: its, historial, embalaje: null, despacho: null, ...extra });
    historial.forEach(h => {
      const tipo = { Pendiente: 'Reserva', Preparado: 'Picking', Embalado: 'Packing', Despachado: 'Despacho' }[h.estado];
      its.forEach(i => mov(h.fecha, tipo, i.sku, i.cantidad, tipo === 'Picking' ? -1 : 0, h.usuario, codigo, tipo === 'Reserva' ? 'Stock comprometido para el pedido' : ''));
    });
    return codigo;
  };
  const embalaje = { tipo: 'Caja de cartón', bultos: 3, peso: 18.5 };
  pedido('Ferretería El Tornillo', -4, -2, 'Media', 'Despachado', [['FER-001', 10], ['FER-005', 20]], { embalaje, despacho: { transportista: 'Transporte Rápido Sur', guia: 'TRS-558120', patente: 'AE 412 KD' } });
  pedido('Supermercado La Esquina', -3, -1, 'Alta', 'Despachado', [['ALI-001', 30], ['ALI-002', 25]], { embalaje: { tipo: 'Pallet film', bultos: 1, peso: 62 }, despacho: { transportista: 'Flota propia', guia: 'FP-00931', patente: 'AC 118 ZT' } });
  pedido('Construcciones Patagonia', -2, 0, 'Alta', 'Embalado', [['ELE-001', 5], ['ELE-004', 2]], { embalaje: { tipo: 'Caja de cartón', bultos: 2, peso: 31 } });
  pedido('Limpieza Integral SRL', -1, 1, 'Media', 'Preparado', [['LIM-001', 12], ['LIM-004', 5]]);
  pedido('Oficinas Centro', -1, 0, 'Alta', 'Pendiente', [['LIB-001', 20], ['LIB-002', 4]]);
  pedido('Almacén Don Pepe', -1, 1, 'Media', 'Pendiente', [['ALI-003', 24], ['ALI-001', 15]]);
  pedido('Electricidad Sur', -1, 3, 'Baja', 'Pendiente', [['ELE-002', 60], ['ELE-003', 10]]);

  // Devolución (descarte) sobre PED-0001
  const ped1 = s.pedidos[0];
  ped1.items[1].devuelto = 2;
  s.devoluciones.push({ id: ++s.seq.devolucion, codigo: 'DEV-0001', fecha: stampOffset(-2, 15, 30), pedidoId: ped1.id, pedidoCodigo: ped1.codigo, cliente: ped1.cliente, items: [linea('FER-005', 2)], motivo: 'Producto dañado', condicion: 'No apta', observaciones: 'Discos con fisuras por golpe en transporte.', responsable: 'Sofía Herrera' });
  mov(stampOffset(-2, 15, 30), 'Devolución', 'FER-005', 2, 0, 'Sofía Herrera', 'DEV-0001', 'No apta: enviada a descarte');

  // Ajustes y movimientos internos
  mov(stampOffset(-5, 11, 5), 'Ajuste', 'ELE-005', 6, -1, 'Laura Gómez', 'Rotura', 'Cajas dañadas por humedad');
  mov(stampOffset(-6, 16, 20), 'Ajuste', 'FER-002', 1, 1, 'Martín Ruiz', 'Hallazgo', 'Unidad encontrada en zona de recepción');
  mov(stampOffset(-2, 12, 0), 'Movimiento interno', 'ALI-003', 120, 0, 'Diego Sosa', 'Optimización de picking', 'B-02-3 → B-03-3');
  mov(agoMinutes(95), 'Ajuste', 'LIB-003', 1, -1, 'Laura Gómez', 'Conteo cíclico', 'Conteo físico: 10 → 9');
  mov(agoMinutes(40), 'Movimiento interno', 'LIM-004', 35, 0, 'Martín Ruiz', 'Reorganización de pasillo', 'C-03-4 → C-02-1');

  s.movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(m => { m.id = ++s.seq.movimiento; });
  s.movimientos.reverse();

  // Tareas
  const tarea = (titulo, descripcion, responsable, prioridad, dias, estado) => {
    s.tareas.push({ id: ++s.seq.tarea, titulo, descripcion, responsable, prioridad, fecha: dayOffset(dias), estado, creado: stampOffset(Math.min(dias, 0) - 1, 8) });
  };
  tarea('Inventario cíclico pasillo A', 'Contar posiciones A-01 y A-02 y registrar diferencias como ajuste.', 'Martín Ruiz', 'Alta', 0, 'En proceso');
  tarea('Preparar pedido PED-0005', 'Cliente Oficinas Centro: entrega comprometida para hoy.', 'Lucía Fernández', 'Alta', 0, 'Pendiente');
  tarea('Almacenar recepción REC-0003', 'Ubicar el saldo pendiente de Limpiolux SA.', 'Diego Sosa', 'Media', 0, 'Pendiente');
  tarea('Solicitar reposición de ELE-005', 'Cinta aisladora sin stock: pedir cotización a Distribuidora Norte.', 'Laura Gómez', 'Alta', 0, 'Pendiente');
  tarea('Control de temperatura sector alimentos', 'Registrar lectura de termómetros del pasillo B.', 'Sofía Herrera', 'Baja', 0, 'Completada');
  tarea('Mantenimiento preventivo de autoelevador', 'Revisar nivel de batería y horquillas.', 'Diego Sosa', 'Media', -1, 'Pendiente');
  tarea('Etiquetado de pallets entrantes', 'Imprimir etiquetas para la recepción programada.', 'Martín Ruiz', 'Baja', 1, 'Pendiente');
  tarea('Revisión de devoluciones de la semana', 'Clasificar mercadería devuelta en apta / no apta.', 'Sofía Herrera', 'Media', -1, 'Completada');

  return s;
}

/* =========================================================
   4. Estado, persistencia y reglas de stock
   ========================================================= */
const FILTROS_INICIALES = {
  productos: { q: '', cat: '', prov: '', est: '', sort: 'sku', dir: 1 },
  inventario: { tab: 'existencias', q: '', cat: '', pasillo: '' },
  pedidos: { q: '', estado: '' },
  tareas: { q: '', resp: '', prio: '', fecha: '' },
  historial: { q: '', tipo: '', resp: '', desde: '', hasta: '', limite: 100 }
};
const ui = { route: 'dashboard', ...clone(FILTROS_INICIALES) };

let state = cargar();

function esEstadoValido(d) {
  return !!d && d.version === DATA_VERSION && !!d.layout && !!d.seq &&
    ['productos', 'recepciones', 'pedidos', 'devoluciones', 'tareas', 'movimientos', 'personal'].every(k => Array.isArray(d[k]));
}
function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (esEstadoValido(data)) return data;
    }
  } catch (err) {
    console.warn('No se pudieron leer los datos guardados:', err);
  }
  const demo = crearDatosDemo();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(demo)); } catch (err) { /* sin almacenamiento: se trabaja en memoria */ }
  return demo;
}
function guardar() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    toast('No se pudo guardar en el navegador (almacenamiento lleno o bloqueado).', 'error');
    return false;
  }
}
function nuevoId(clave) { state.seq[clave] = (state.seq[clave] || 0) + 1; return state.seq[clave]; }
function confirmarCambios(mensaje, tipo = 'success') { guardar(); render(); if (mensaje) toast(mensaje, tipo); }

/** Registra un movimiento en el historial. Se llama DESPUÉS de modificar el stock. */
function registrarMovimiento(tipo, producto, cantidad, signo, referencia = '', detalle = '') {
  state.movimientos.unshift({
    id: nuevoId('movimiento'), fecha: new Date().toISOString(), tipo,
    productoId: producto.id, sku: producto.sku, descripcion: producto.descripcion,
    cantidad, signo, stockResultante: producto.stock, responsable: state.usuario, referencia, detalle
  });
}
/** Única vía para modificar stock físico: impide cantidades negativas. */
function aplicarStock(producto, delta) {
  if (producto.stock + delta < 0) throw new Error(`Stock insuficiente de ${producto.sku}: hay ${producto.stock} y se requieren ${-delta}.`);
  producto.stock += delta;
}

const productoPorId = id => state.productos.find(p => p.id === Number(id));
const pedidoPorId = id => state.pedidos.find(p => p.id === Number(id));
const recepcionPorId = id => state.recepciones.find(r => r.id === Number(id));
const tareaPorId = id => state.tareas.find(t => t.id === Number(id));

/* Reservado y "en recepción" se derivan siempre de los documentos: nunca se desincronizan. */
function reservasPorProducto() {
  const m = new Map();
  state.pedidos.filter(p => p.estado === 'Pendiente').forEach(p => p.items.forEach(i => m.set(i.productoId, (m.get(i.productoId) || 0) + i.cantidad)));
  return m;
}
function recepcionPendientePorProducto() {
  const m = new Map();
  state.recepciones.filter(r => r.estado === 'Recibida').forEach(r => r.items.forEach(i => {
    const pend = i.cantidad - i.almacenado;
    if (pend > 0) m.set(i.productoId, (m.get(i.productoId) || 0) + pend);
  }));
  return m;
}
const reservado = id => reservasPorProducto().get(id) || 0;
const enRecepcion = id => recepcionPendientePorProducto().get(id) || 0;
const disponible = p => p.stock - reservado(p.id);
function estadoStock(p) { return p.stock <= 0 ? 'sin' : p.stock < p.minimo ? 'bajo' : 'ok'; }
function criticos() {
  return state.productos.filter(p => estadoStock(p) !== 'ok')
    .sort((a, b) => (a.stock / (a.minimo || 1)) - (b.stock / (b.minimo || 1)));
}

/* Ubicaciones: Pasillo-Estantería-Nivel, p. ej. "B-03-2" */
function ubicaciones() {
  const L = state.layout, out = [];
  L.pasillos.forEach(p => { for (let e = 1; e <= L.estanterias; e++) for (let n = 1; n <= L.niveles; n++) out.push(`${p}-${pad(e)}-${n}`); });
  return out;
}
function mapaOcupacion() { const m = new Map(); state.productos.forEach(p => m.set(p.ubicacion, p)); return m; }
function ubicacionesLibres(exceptoProductoId) {
  const occ = mapaOcupacion();
  return ubicaciones().filter(u => !occ.has(u) || (exceptoProductoId && occ.get(u).id === exceptoProductoId));
}
function fmtUbic(code) { if (!code) return '—'; const [p, e, n] = code.split('-'); return `Pasillo ${p} · Estantería ${e} · Nivel ${n}`; }

function hoy() { return isoDate(); }
function tareasVencidas() { return state.tareas.filter(t => t.fecha < hoy() && t.estado !== 'Completada'); }
function pedidosActivos() { return state.pedidos.filter(p => ['Pendiente', 'Preparado', 'Embalado'].includes(p.estado)); }
function pendienteAlmacenar() { return sum(state.recepciones.filter(r => r.estado === 'Recibida'), r => sum(r.items, i => i.cantidad - i.almacenado)); }

/* =========================================================
   5. Componentes de UI
   ========================================================= */
function toast(mensaje, tipo = 'success') {
  const iconos = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(iconos[tipo] || 'info')}<div>${esc(mensaje)}</div>`;
  $('#toastRoot').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, tipo === 'error' ? 5200 : 3600);
}

function badge(texto, tono = 'neutral') { return `<span class="badge badge-${tono}">${esc(texto)}</span>`; }
function badgeStock(p) {
  const e = estadoStock(p);
  return e === 'sin' ? badge('Sin stock', 'danger') : e === 'bajo' ? badge('Bajo mínimo', 'warning') : badge('Normal', 'success');
}
function vacio(mensaje, ic = 'box') { return `<div class="empty">${icon(ic)}<p>${mensaje}</p></div>`; }
function cantidadMov(m) {
  if (m.signo > 0) return `<span class="pos">+${num(m.cantidad)}</span>`;
  if (m.signo < 0) return `<span class="neg">−${num(m.cantidad)}</span>`;
  return `<span class="muted">${num(m.cantidad)}</span>`;
}
function opciones(lista, seleccionado, { placeholder } = {}) {
  return (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : '') + lista.map(v => {
    const [val, label] = Array.isArray(v) ? v : [v, v];
    return `<option value="${esc(val)}" ${String(val) === String(seleccionado) ? 'selected' : ''}>${esc(label)}</option>`;
  }).join('');
}
/** modo: 'pedido' muestra disponible y deshabilita sin disponible; 'stock' muestra stock físico. */
function opcionesProducto(seleccionado, { placeholder = 'Seleccioná un producto…', modo = 'stock' } = {}) {
  const res = reservasPorProducto();
  const lista = [...state.productos].sort((a, b) => a.sku.localeCompare(b.sku));
  return `<option value="">${esc(placeholder)}</option>` + lista.map(p => {
    const disp = p.stock - (res.get(p.id) || 0);
    const extra = modo === 'pedido' ? `disp. ${num(disp)}` : `stock ${num(p.stock)}`;
    const deshab = modo === 'pedido' && disp <= 0;
    return `<option value="${p.id}" ${p.id === Number(seleccionado) ? 'selected' : ''} ${deshab ? 'disabled' : ''}>${esc(p.sku)} — ${esc(p.descripcion)} (${extra})</option>`;
  }).join('');
}
function opcionesUbicacion(seleccionada, exceptoProductoId) {
  const libres = ubicacionesLibres(exceptoProductoId);
  return `<option value="">Seleccioná una posición…</option>` + state.layout.pasillos.map(p => {
    const del = libres.filter(u => u.startsWith(p + '-'));
    if (!del.length) return '';
    return `<optgroup label="Pasillo ${p}">${del.map(u => `<option value="${u}" ${u === seleccionada ? 'selected' : ''}>${u} · Est. ${u.split('-')[1]} · Nivel ${u.split('-')[2]}</option>`).join('')}</optgroup>`;
  }).join('');
}
const opcionesPersonal = sel => opciones(unique([...state.personal.map(p => p.nombre), sel].filter(Boolean)), sel);

/* ---------- Modal genérico ---------- */
function abrirModal({ titulo, cuerpo, aceptar = 'Guardar', cancelar = 'Cancelar', tamano = '', peligro = false, sinAceptar = false, alAbrir, alEnviar, alCerrar }) {
  const root = $('#modalRoot');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal ${tamano}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}">
      <form class="modal-form" novalidate>
        <header class="modal-header"><h2>${esc(titulo)}</h2><button type="button" class="icon-btn" data-cerrar aria-label="Cerrar">${icon('x')}</button></header>
        <div class="modal-body">${cuerpo}</div>
        <footer class="modal-footer">
          <button type="button" class="btn btn-ghost" data-cerrar>${esc(cancelar)}</button>
          ${sinAceptar ? '' : `<button type="submit" class="btn ${peligro ? 'btn-danger' : 'btn-primary'}">${esc(aceptar)}</button>`}
        </footer>
      </form>
    </div>`;
  root.appendChild(wrap);
  const form = $('form', wrap);
  const previo = document.activeElement;
  let cerrado = false;
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    document.removeEventListener('keydown', onKey);
    wrap.classList.add('closing');
    setTimeout(() => wrap.remove(), 150);
    if (previo && previo.focus && document.contains(previo)) previo.focus();
    if (alCerrar) alCerrar();
  };
  const onKey = e => { if (e.key === 'Escape' && root.lastElementChild === wrap) cerrar(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) cerrar(); });
  wrap.addEventListener('click', e => { if (e.target.closest('[data-cerrar]')) cerrar(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validarFormulario(form)) return;
    try {
      if (alEnviar && alEnviar(form, cerrar) === false) return;
    } catch (err) {
      console.error(err);
      toast(err.message || 'Ocurrió un error inesperado.', 'error');
      return;
    }
    cerrar();
  });
  if (alAbrir) alAbrir(form, cerrar);
  setTimeout(() => { const f = form.querySelector('.modal-body input:not([disabled]):not([type=hidden]):not([type=checkbox]):not([type=radio]), .modal-body select:not([disabled]), .modal-body textarea'); (f || form.querySelector('[type=submit]') || form.querySelector('[data-cerrar]')).focus(); }, 60);
  return { form, cerrar };
}

function confirmar({ titulo = '¿Confirmar acción?', mensaje, aceptar = 'Confirmar', peligro = false }) {
  return new Promise(resolve => {
    let ok = false;
    abrirModal({ titulo, cuerpo: `<p class="confirm-msg">${mensaje}</p>`, aceptar, peligro, tamano: 'sm', alEnviar() { ok = true; }, alCerrar() { resolve(ok); } });
  });
}

/* ---------- Validación ---------- */
function limpiarErrores(form) {
  $$('.is-invalid', form).forEach(el => el.classList.remove('is-invalid'));
  $$('.field-msg', form).forEach(el => el.remove());
}
function errorCampo(el, mensaje) {
  if (!el) { toast(mensaje, 'error'); return; }
  el.classList.add('is-invalid');
  const msg = document.createElement('div');
  msg.className = 'field-msg';
  msg.textContent = mensaje;
  (el.closest('.field') || el.closest('.item-row') || el.parentElement).appendChild(msg);
  if (!$('.is-invalid:focus', el.form || document)) el.focus();
}
function validarFormulario(form) {
  limpiarErrores(form);
  let ok = true;
  for (const el of form.elements) {
    if (!el.name || el.disabled || el.type === 'hidden' || !el.willValidate) continue;
    const v = el.validity;
    let msg = '';
    if (v.valueMissing) msg = el.type === 'checkbox' ? 'Debés marcar esta casilla.' : 'Campo obligatorio.';
    else if (v.badInput) msg = 'Ingresá un número válido.';
    else if (v.rangeUnderflow) msg = `El valor mínimo es ${el.min}.`;
    else if (v.rangeOverflow) msg = `El valor máximo es ${el.max}.`;
    else if (v.stepMismatch) msg = 'Ingresá un número entero.';
    else if (v.tooLong) msg = `Máximo ${el.maxLength} caracteres.`;
    else if (el.type !== 'checkbox' && el.required && typeof el.value === 'string' && !el.value.trim()) msg = 'Campo obligatorio.';
    if (msg) {
      if (ok) el.focus();
      errorCampo(el, msg);
      ok = false;
    }
  }
  return ok;
}
const campo = (form, name) => form.querySelector(`[name="${name}"]`);
const valor = (form, name) => (campo(form, name)?.value ?? '').trim();

/* ---------- Líneas de productos (recepción / pedido) ---------- */
function filaItem(modo) {
  return `<div class="item-row">
    <select name="producto" required aria-label="Producto">${opcionesProducto('', { modo })}</select>
    <input type="number" name="cantidad" min="1" step="1" required placeholder="Cantidad" aria-label="Cantidad">
    <button type="button" class="icon-btn danger" data-quitar-fila aria-label="Quitar línea">${icon('trash')}</button>
    <div class="item-hint"></div>
  </div>`;
}
function bloqueItems(modo, titulo = 'Productos') {
  return `<div>
    <div class="items-header"><span class="field-label">${titulo} *</span><button type="button" class="btn btn-soft btn-sm" data-agregar-fila>${icon('plus')}Agregar línea</button></div>
    <div class="items">${filaItem(modo)}</div>
  </div>`;
}
function montarItems(form, modo) {
  const cont = $('.items', form);
  const actualizarHint = row => {
    const p = productoPorId(campo(row, 'producto').value);
    $('.item-hint', row).textContent = !p ? '' : modo === 'pedido'
      ? `Disponible: ${num(disponible(p))} ${p.unidad} · Ubicación ${p.ubicacion}`
      : `Destino: ${fmtUbic(p.ubicacion)} · Stock actual ${num(p.stock)} ${p.unidad}`;
  };
  form.addEventListener('click', e => {
    if (e.target.closest('[data-agregar-fila]')) {
      cont.insertAdjacentHTML('beforeend', filaItem(modo));
      campo(cont.lastElementChild, 'producto').focus();
    }
    const quitar = e.target.closest('[data-quitar-fila]');
    if (quitar) {
      if (cont.children.length > 1) quitar.closest('.item-row').remove();
      else toast('El documento debe tener al menos una línea.', 'warning');
    }
  });
  form.addEventListener('change', e => { if (e.target.name === 'producto') actualizarHint(e.target.closest('.item-row')); });
}
function leerItems(form) {
  return $$('.item-row', form).map(row => ({ row, producto: productoPorId(campo(row, 'producto').value), cantidad: Number(campo(row, 'cantidad').value) }));
}
function validarItemsUnicos(items) {
  const vistos = new Set();
  for (const it of items) {
    if (vistos.has(it.producto.id)) { errorCampo(campo(it.row, 'producto'), 'Producto repetido: unificá la cantidad en una sola línea.'); return false; }
    vistos.add(it.producto.id);
  }
  return true;
}

/* ---------- Gráficos simples (SVG) ---------- */
function pasoRedondo(v) {
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}
function graficoBarras(datos, series, { alto = 230, etiqueta = 'Gráfico' } = {}) {
  const W = 620, H = alto, L = 46, R = 8, T = 10, B = 30;
  const max = Math.max(1, ...datos.flatMap(d => series.map(s => d[s.key])));
  const paso = Math.max(1, pasoRedondo(max / 4));
  const tope = paso * 4;
  const gw = (W - L - R) / datos.length;
  const bw = Math.min(24, (gw - 14) / series.length);
  const alturaUtil = H - T - B;
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = T + alturaUtil * (1 - i / 4);
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid-line"/><text x="${L - 8}" y="${y + 4}" class="axis" text-anchor="end">${num(paso * i)}</text>`;
  }
  datos.forEach((d, i) => {
    const x0 = L + gw * i + (gw - bw * series.length) / 2;
    series.forEach((s, j) => {
      const h = alturaUtil * (d[s.key] / tope);
      g += `<rect x="${x0 + j * bw}" y="${H - B - h}" width="${bw - 3}" height="${h}" rx="3" class="${s.clase}"><title>${esc(d.label)} · ${s.label}: ${num(d[s.key])}</title></rect>`;
    });
    g += `<text x="${L + gw * i + gw / 2}" y="${H - 9}" class="axis" text-anchor="middle">${esc(d.label)}</text>`;
  });
  const leyenda = series.map(s => `<span class="legend-item"><i class="${s.clase}"></i>${s.label}</span>`).join('');
  return `<div class="chart-legend">${leyenda}</div><svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(etiqueta)}">${g}</svg>`;
}
function dona(pct) {
  const r = 42, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 100 100" class="donut" role="img" aria-label="Ocupación ${pct}%"><circle cx="50" cy="50" r="${r}" class="donut-bg"/><circle cx="50" cy="50" r="${r}" class="donut-val" stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 50 50)"/><text x="50" y="50" class="donut-txt" text-anchor="middle" dominant-baseline="central">${pct}%</text></svg>`;
}
function barrasH(items) {
  const max = Math.max(1, ...items.map(i => i.valor));
  return `<div class="hbars">${items.map(i => `<div><div class="hbar-label"><span>${esc(i.label)}</span><span>${i.texto ?? num(i.valor)}</span></div><div class="hbar"><span style="width:${(i.valor / max) * 100}%"></span></div></div>`).join('')}</div>`;
}

/* ---------- Utilidades de descarga ---------- */
function descargar(nombre, contenido, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function aCSV(filas) {
  return '﻿' + filas.map(f => f.map(v => { const s = String(v ?? ''); return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(';')).join('\r\n');
}

/* =========================================================
   6. Vistas
   ========================================================= */
const VISTAS = {
  dashboard: { titulo: 'Panel de control', sub: 'Resumen operativo del depósito', render: vistaDashboard },
  productos: { titulo: 'Productos', sub: 'Catálogo de artículos, proveedores y ubicaciones', render: vistaProductos, resultados: resultadosProductos },
  inventario: { titulo: 'Inventario', sub: 'Existencias, mapa de ubicaciones, alertas y ajustes', render: vistaInventario, resultados: resultadosExistencias },
  recepcion: { titulo: 'Recepción y almacenamiento', sub: 'Ingreso de mercadería y ubicación en estanterías', render: vistaRecepcion },
  internos: { titulo: 'Movimientos internos', sub: 'Reubicación de artículos entre posiciones', render: vistaInternos, montar: montarInternos },
  pedidos: { titulo: 'Pedidos y despacho', sub: 'Picking, packing y despacho de pedidos', render: vistaPedidos, resultados: resultadosPedidos },
  devoluciones: { titulo: 'Devoluciones', sub: 'Mercadería devuelta por clientes', render: vistaDevoluciones },
  tareas: { titulo: 'Tareas', sub: 'Planificación del trabajo diario del equipo', render: vistaTareas, resultados: resultadosTareas },
  historial: { titulo: 'Historial de movimientos', sub: 'Trazabilidad completa de cada operación', render: vistaHistorial, resultados: resultadosHistorial },
  config: { titulo: 'Configuración', sub: 'Usuarios, layout del depósito y datos de la demo', render: vistaConfig }
};

function rutaActual() {
  const r = location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  return VISTAS[r] ? r : 'dashboard';
}
function irA(ruta) {
  if (rutaActual() === ruta && location.hash) render();
  else location.hash = `#/${ruta}`;
}

function render() {
  ui.route = rutaActual();
  const v = VISTAS[ui.route];
  $('#pageTitle').textContent = v.titulo;
  $('#pageSubtitle').textContent = v.sub;
  document.title = `${v.titulo} · StockFlow WMS`;
  const scroll = window.scrollY;
  $('#view').innerHTML = v.render();
  if (v.montar) v.montar();
  window.scrollTo(0, scroll);
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === ui.route));
  renderChrome();
}
function refrescarResultados() {
  const v = VISTAS[ui.route];
  const cont = $('#resultados');
  if (v.resultados && cont) cont.innerHTML = v.resultados();
  else render();
}

/* Barra superior, contadores y notificaciones */
function renderChrome() {
  const sel = $('#userSelect');
  sel.innerHTML = opciones(state.personal.map(p => p.nombre), state.usuario);
  if (!state.personal.some(p => p.nombre === state.usuario)) sel.insertAdjacentHTML('afterbegin', `<option selected>${esc(state.usuario)}</option>`);
  $('#userAvatar').textContent = initials(state.usuario);

  const setCount = (k, n) => { $(`[data-count="${k}"]`).textContent = n > 0 ? n : ''; };
  setCount('alertas', criticos().length);
  setCount('pedidos', pedidosActivos().length);
  setCount('recepcion', state.recepciones.filter(r => r.estado === 'Recibida').length);
  setCount('tareas', state.tareas.filter(t => t.estado !== 'Completada' && t.fecha <= hoy()).length);

  const notifs = notificaciones();
  const b = $('#notifBadge');
  b.hidden = notifs.length === 0;
  b.textContent = notifs.length > 99 ? '99+' : notifs.length;
  if (!$('#notifPanel').hidden) renderNotificaciones();
}
function notificaciones() {
  const out = [];
  criticos().forEach(p => out.push({ tono: p.stock <= 0 ? 'danger' : 'warning', titulo: `${p.sku} ${p.stock <= 0 ? 'sin stock' : 'bajo mínimo'}`, detalle: `${p.descripcion} · ${num(p.stock)} / mín. ${num(p.minimo)}`, ruta: 'inventario', tab: 'alertas' }));
  pedidosActivos().filter(p => p.entrega < hoy()).forEach(p => out.push({ tono: 'danger', titulo: `${p.codigo} con entrega vencida`, detalle: `${p.cliente} · comprometido ${fmtDate(p.entrega)}`, ruta: 'pedidos' }));
  tareasVencidas().forEach(t => out.push({ tono: 'warning', titulo: 'Tarea vencida', detalle: `${t.titulo} · ${t.responsable}`, ruta: 'tareas' }));
  state.recepciones.filter(r => r.estado === 'Recibida').forEach(r => out.push({ tono: 'info', titulo: `${r.codigo} pendiente de almacenar`, detalle: `${r.proveedor} · ${num(sum(r.items, i => i.cantidad - i.almacenado))} unidades en muelle`, ruta: 'recepcion' }));
  return out;
}
function renderNotificaciones() {
  const n = notificaciones();
  $('#notifPanel').innerHTML = `<header><span>Notificaciones</span><span class="muted small">${plural(n.length, 'aviso', 'avisos')}</span></header>` +
    (n.length ? n.map(x => `<button class="notif-item" data-action="ir" data-ruta="${x.ruta}" ${x.tab ? `data-tab="${x.tab}"` : ''}><span class="notif-dot ${x.tono}"></span><span><strong>${esc(x.titulo)}</strong><br><span class="muted small">${esc(x.detalle)}</span></span></button>`).join('')
      : `<div class="notif-empty">${icon('check')}<p>Todo en orden: no hay avisos.</p></div>`);
}

/* ---------- 6.1 Dashboard ---------- */
function kpi({ label, valor, sub, ic, tono = 'primary', ruta, tab }) {
  return `<button class="kpi tone-${tono}" data-action="ir" data-ruta="${ruta}" ${tab ? `data-tab="${tab}"` : ''}>
    <div class="kpi-top"><span>${label}</span><span class="kpi-icon">${icon(ic)}</span></div>
    <div class="kpi-value">${valor}</div><div class="kpi-sub">${sub}</div></button>`;
}
function vistaDashboard() {
  const res = reservasPorProducto();
  const prods = state.productos;
  const unidades = sum(prods, p => p.stock);
  const reservadas = sum(prods, p => res.get(p.id) || 0);
  const crit = criticos();
  const sinStock = crit.filter(p => p.stock <= 0).length;
  const activos = pedidosActivos();
  const porEstado = e => state.pedidos.filter(p => p.estado === e).length;
  const tHoy = state.tareas.filter(t => t.fecha === hoy());
  const vencidas = tareasVencidas();
  const totalUb = ubicaciones().length;
  const ocupadas = new Set(prods.map(p => p.ubicacion)).size;
  const pctOcup = totalUb ? Math.round((ocupadas / totalUb) * 100) : 0;

  const dias = [...Array(7)].map((_, i) => dayOffset(i - 6));
  const datos7 = dias.map(d => {
    const ms = state.movimientos.filter(m => localDateOf(m.fecha) === d);
    return {
      label: new Date(`${d}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit' }),
      entradas: sum(ms.filter(m => m.signo > 0), m => m.cantidad),
      salidas: sum(ms.filter(m => m.signo < 0), m => m.cantidad)
    };
  });

  const categorias = unique(prods.map(p => p.categoria)).map(c => ({ label: c, valor: sum(prods.filter(p => p.categoria === c), p => p.stock) })).sort((a, b) => b.valor - a.valor);
  const porPasillo = state.layout.pasillos.map(pa => {
    const total = state.layout.estanterias * state.layout.niveles;
    const occ = prods.filter(p => p.ubicacion.startsWith(pa + '-')).length;
    return { label: `Pasillo ${pa}`, valor: occ, texto: `${occ}/${total}` };
  });

  const tareasDia = [...vencidas, ...tHoy].sort((a, b) => ESTADOS_TAREA.indexOf(a.estado) - ESTADOS_TAREA.indexOf(b.estado) || PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad));

  return `
  <div class="kpis">
    ${kpi({ label: 'Productos almacenados', valor: num(prods.filter(p => p.stock > 0).length), sub: `de ${plural(prods.length, 'SKU', 'SKU')} · ${num(unidades)} unidades`, ic: 'box', ruta: 'productos' })}
    ${kpi({ label: 'Stock disponible', valor: num(unidades - reservadas), sub: `${num(reservadas)} u. reservadas para pedidos`, ic: 'layers', tono: 'success', ruta: 'inventario' })}
    ${kpi({ label: 'Bajo mínimo', valor: num(crit.length), sub: `${plural(sinStock, 'producto sin stock', 'productos sin stock')}`, ic: 'alert', tono: crit.length ? 'danger' : 'success', ruta: 'inventario', tab: 'alertas' })}
    ${kpi({ label: 'Pedidos pendientes', valor: num(activos.length), sub: `${porEstado('Pendiente')} a preparar · ${porEstado('Embalado')} a despachar`, ic: 'clipboard', tono: 'warning', ruta: 'pedidos' })}
    ${kpi({ label: 'Tareas del día', valor: `${tHoy.filter(t => t.estado === 'Completada').length}/${tHoy.length}`, sub: vencidas.length ? `${plural(vencidas.length, 'tarea vencida', 'tareas vencidas')}` : 'completadas hoy', ic: 'check-square', tono: vencidas.length ? 'danger' : 'violet', ruta: 'tareas' })}
    ${kpi({ label: 'En recepción', valor: num(pendienteAlmacenar()), sub: 'unidades a almacenar', ic: 'inbox', tono: 'info', ruta: 'recepcion' })}
  </div>

  <div class="grid grid-3">
    <section class="card span-2">
      <div class="card-header"><div><h2>Movimientos de los últimos 7 días</h2><p>Unidades que ingresan o egresan del stock físico</p></div><button class="btn btn-ghost btn-sm" data-action="ir" data-ruta="historial">Ver historial</button></div>
      <div class="card-body">${graficoBarras(datos7, [{ key: 'entradas', label: 'Entradas', clase: 'c-in' }, { key: 'salidas', label: 'Salidas', clase: 'c-out' }], { etiqueta: 'Entradas y salidas de stock por día' })}</div>
    </section>
    <section class="card">
      <div class="card-header"><div><h2>Ocupación del depósito</h2><p>${ocupadas} de ${totalUb} posiciones ocupadas</p></div><button class="btn btn-ghost btn-sm" data-action="ir" data-ruta="inventario" data-tab="mapa">${icon('map')}Mapa</button></div>
      <div class="card-body"><div class="donut-wrap">${dona(pctOcup)}${barrasH(porPasillo)}</div></div>
    </section>

    <section class="card">
      <div class="card-header"><div><h2>Flujo de pedidos</h2><p>Estado actual de la preparación</p></div></div>
      <div class="card-body">
        <div class="pipeline">
          ${FLUJO_PEDIDO.map(e => `<button class="pipe-step" data-action="ir" data-ruta="pedidos"><strong>${porEstado(e)}</strong><span>${e === 'Pendiente' ? 'A preparar' : e === 'Preparado' ? 'A embalar' : e === 'Embalado' ? 'A despachar' : 'Despachados'}</span></button>`).join('')}
        </div>
        <p class="muted small" style="margin-top:12px">Unidades en pedidos activos: <strong>${num(sum(activos, p => sum(p.items, i => i.cantidad)))}</strong></p>
      </div>
    </section>
    <section class="card">
      <div class="card-header"><div><h2>Stock por categoría</h2><p>Unidades físicas</p></div></div>
      <div class="card-body">${categorias.length ? barrasH(categorias) : vacio('Sin productos cargados.')}</div>
    </section>
    <section class="card">
      <div class="card-header"><div><h2>Stock crítico</h2><p>Productos por debajo del mínimo</p></div><button class="btn btn-ghost btn-sm" data-action="ir" data-ruta="inventario" data-tab="alertas">Ver todo</button></div>
      <div class="card-body">${crit.length ? `<ul class="list">${crit.slice(0, 5).map(p => `
        <li><div class="grow"><div class="title">${esc(p.sku)} · ${esc(p.descripcion)}</div><div class="meta">${num(p.stock)} de mín. ${num(p.minimo)} · ${p.ubicacion}</div></div>${badgeStock(p)}
        <button class="icon-btn sm" data-action="ajustar" data-id="${p.id}" title="Ajustar stock" aria-label="Ajustar stock de ${esc(p.sku)}">${icon('adjust')}</button></li>`).join('')}</ul>` : vacio('No hay productos bajo mínimo.', 'check')}</div>
    </section>

    <section class="card span-2 table-card">
      <div class="card-header"><div><h2>Movimientos recientes</h2><p>Últimas operaciones registradas</p></div></div>
      <div class="card-body flush">${tablaMovimientos(state.movimientos.slice(0, 8), true)}</div>
    </section>
    <section class="card">
      <div class="card-header"><div><h2>Tareas del día</h2><p>${fmtDate(hoy())}${vencidas.length ? ` · ${vencidas.length} vencidas` : ''}</p></div><button class="btn btn-ghost btn-sm" data-action="nueva-tarea">${icon('plus')}Nueva</button></div>
      <div class="card-body">${tareasDia.length ? `<ul class="list">${tareasDia.map(t => `
        <li class="${t.estado === 'Completada' ? 'done' : ''}">
          <span class="avatar sm" title="${esc(t.responsable)}">${initials(t.responsable)}</span>
          <div class="grow"><div class="title">${esc(t.titulo)}</div><div class="meta">${esc(t.responsable)} · ${t.fecha < hoy() ? `<span class="neg">vencida ${fmtDate(t.fecha)}</span>` : t.prioridad}</div></div>
          ${badge(t.estado, TONO_TAREA[t.estado])}
          <button class="icon-btn sm" data-action="tarea-mover" data-id="${t.id}" data-dir="1" ${t.estado === 'Completada' ? 'disabled' : ''} title="Avanzar estado" aria-label="Avanzar estado de la tarea">${icon('chevron-right')}</button>
        </li>`).join('')}</ul>` : vacio('No hay tareas para hoy.', 'check-square')}</div>
    </section>
  </div>`;
}

function tablaMovimientos(lista, compacta = false) {
  if (!lista.length) return vacio('No hay movimientos para mostrar.', 'clock');
  return `<div class="table-wrap"><table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th class="num">Cantidad</th>${compacta ? '' : '<th class="num">Stock result.</th>'}<th>Responsable</th><th>Referencia</th>${compacta ? '' : '<th>Detalle</th>'}</tr></thead>
    <tbody>${lista.map(m => `<tr>
      <td class="nowrap">${fmtDateTime(m.fecha)}</td>
      <td>${badge(m.tipo, TONO_MOV[m.tipo])}</td>
      <td><strong class="mono">${esc(m.sku)}</strong><span class="sub">${esc(m.descripcion)}</span></td>
      <td class="num">${cantidadMov(m)}</td>
      ${compacta ? '' : `<td class="num">${m.stockResultante == null ? '<span class="muted">—</span>' : num(m.stockResultante)}</td>`}
      <td class="nowrap">${esc(m.responsable)}</td>
      <td>${esc(m.referencia)}</td>
      ${compacta ? '' : `<td class="muted small">${esc(m.detalle)}</td>`}
    </tr>`).join('')}</tbody></table></div>`;
}

/* ---------- 6.2 Productos ---------- */
function vistaProductos() {
  const f = ui.productos;
  return `
  <div class="toolbar card">
    <div class="search-field">${icon('search')}<input type="search" placeholder="Buscar por SKU, descripción, proveedor o ubicación" value="${esc(f.q)}" data-filter="productos.q" aria-label="Buscar productos"></div>
    <select data-filter="productos.cat" aria-label="Categoría">${opciones(unique(state.productos.map(p => p.categoria)), f.cat, { placeholder: 'Todas las categorías' })}</select>
    <select data-filter="productos.prov" aria-label="Proveedor">${opciones(unique(state.productos.map(p => p.proveedor)), f.prov, { placeholder: 'Todos los proveedores' })}</select>
    <select data-filter="productos.est" aria-label="Estado de stock">${opciones([['ok', 'Stock normal'], ['bajo', 'Bajo mínimo'], ['sin', 'Sin stock']], f.est, { placeholder: 'Todos los estados' })}</select>
    <button class="btn btn-ghost" data-action="limpiar-filtros" data-scope="productos">Limpiar</button>
    <div class="toolbar-spacer"></div>
    <button class="btn btn-ghost" data-action="exportar-productos">${icon('download')}Exportar CSV</button>
    <button class="btn btn-primary" data-action="nuevo-producto">${icon('plus')}Nuevo producto</button>
  </div>
  <div id="resultados">${resultadosProductos()}</div>`;
}
function filtrarProductos() {
  const f = ui.productos;
  const q = f.q.trim().toLowerCase();
  const lista = state.productos.filter(p =>
    (!q || [p.sku, p.descripcion, p.proveedor, p.categoria, p.ubicacion].join(' ').toLowerCase().includes(q)) &&
    (!f.cat || p.categoria === f.cat) && (!f.prov || p.proveedor === f.prov) && (!f.est || estadoStock(p) === f.est));
  return lista.sort((a, b) => {
    const va = a[f.sort], vb = b[f.sort];
    return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')) * f.dir;
  });
}
function th(scope, key, label, cls = '') {
  const f = ui[scope];
  const activo = f.sort === key;
  return `<th class="sortable ${cls}" data-action="ordenar" data-scope="${scope}" data-key="${key}" aria-sort="${activo ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}">${label} <span class="sort-ind">${activo ? (f.dir > 0 ? '▲' : '▼') : ''}</span></th>`;
}
function resultadosProductos() {
  const lista = filtrarProductos();
  const res = reservasPorProducto();
  return `<div class="table-meta"><span>${plural(lista.length, 'producto', 'productos')} ${lista.length !== state.productos.length ? `(de ${state.productos.length})` : ''}</span><span>Hacé clic en los encabezados para ordenar</span></div>
  <section class="card table-card">${lista.length ? `<div class="table-wrap"><table>
    <thead><tr>${th('productos', 'sku', 'SKU')}${th('productos', 'descripcion', 'Descripción')}${th('productos', 'categoria', 'Categoría')}${th('productos', 'proveedor', 'Proveedor')}${th('productos', 'ubicacion', 'Ubicación')}${th('productos', 'stock', 'Cantidad', 'num')}${th('productos', 'minimo', 'Mínimo', 'num')}<th>Estado</th><th class="num">Acciones</th></tr></thead>
    <tbody>${lista.map(p => {
      const r = res.get(p.id) || 0;
      return `<tr class="${estadoStock(p) === 'sin' ? 'row-crit' : ''}">
      <td><strong class="mono">${esc(p.sku)}</strong></td>
      <td>${esc(p.descripcion)}<span class="sub">${esc(p.unidad)}</span></td>
      <td>${esc(p.categoria)}</td>
      <td>${esc(p.proveedor)}</td>
      <td class="nowrap mono">${esc(p.ubicacion)}</td>
      <td class="num"><strong>${num(p.stock)}</strong>${r ? `<span class="sub">${num(r)} reserv.</span>` : ''}</td>
      <td class="num">${num(p.minimo)}</td>
      <td>${badgeStock(p)}</td>
      <td><div class="actions">
        <button class="icon-btn sm" data-action="ver-producto" data-id="${p.id}" title="Ver detalle" aria-label="Ver ${esc(p.sku)}">${icon('eye')}</button>
        <button class="icon-btn sm" data-action="editar-producto" data-id="${p.id}" title="Editar" aria-label="Editar ${esc(p.sku)}">${icon('edit')}</button>
        <button class="icon-btn sm" data-action="ajustar" data-id="${p.id}" title="Ajustar stock" aria-label="Ajustar ${esc(p.sku)}">${icon('adjust')}</button>
        <button class="icon-btn sm danger" data-action="eliminar-producto" data-id="${p.id}" title="Eliminar" aria-label="Eliminar ${esc(p.sku)}">${icon('trash')}</button>
      </div></td></tr>`;
    }).join('')}</tbody></table></div>` : vacio('No se encontraron productos con esos filtros.', 'search')}</section>`;
}

/* ---------- 6.3 Inventario ---------- */
function vistaInventario() {
  const tab = ui.inventario.tab;
  const nCrit = criticos().length;
  const tabs = [['existencias', 'Existencias', 'layers'], ['mapa', 'Mapa de ubicaciones', 'map'], ['alertas', 'Alertas', 'alert'], ['ajustes', 'Ajustes', 'adjust']];
  const cabecera = `<div class="tabs" role="tablist">${tabs.map(([k, l, ic]) => `<button class="tab ${tab === k ? 'active' : ''}" role="tab" aria-selected="${tab === k}" data-action="tab" data-scope="inventario" data-tab="${k}">${icon(ic)}${l}${k === 'alertas' && nCrit ? ` ${badge(nCrit, 'danger')}` : ''}</button>`).join('')}</div>`;
  if (tab === 'mapa') return cabecera + inventarioMapa();
  if (tab === 'alertas') return cabecera + inventarioAlertas();
  if (tab === 'ajustes') return cabecera + inventarioAjustes();
  const f = ui.inventario;
  return cabecera + `
  <div class="toolbar card">
    <div class="search-field">${icon('search')}<input type="search" placeholder="Buscar SKU o descripción" value="${esc(f.q)}" data-filter="inventario.q" aria-label="Buscar en inventario"></div>
    <select data-filter="inventario.cat" aria-label="Categoría">${opciones(unique(state.productos.map(p => p.categoria)), f.cat, { placeholder: 'Todas las categorías' })}</select>
    <select data-filter="inventario.pasillo" aria-label="Pasillo">${opciones(state.layout.pasillos.map(p => [p, `Pasillo ${p}`]), f.pasillo, { placeholder: 'Todos los pasillos' })}</select>
    <div class="toolbar-spacer"></div>
    <button class="btn btn-ghost" data-action="reubicar">${icon('shuffle')}Reubicar</button>
    <button class="btn btn-primary" data-action="ajustar">${icon('adjust')}Nuevo ajuste</button>
  </div>
  <div id="resultados">${resultadosExistencias()}</div>`;
}
function resultadosExistencias() {
  const f = ui.inventario;
  const q = f.q.trim().toLowerCase();
  const res = reservasPorProducto();
  const rec = recepcionPendientePorProducto();
  const lista = state.productos
    .filter(p => (!q || `${p.sku} ${p.descripcion}`.toLowerCase().includes(q)) && (!f.cat || p.categoria === f.cat) && (!f.pasillo || p.ubicacion.startsWith(f.pasillo + '-')))
    .sort((a, b) => a.ubicacion.localeCompare(b.ubicacion));
  if (!lista.length) return `<section class="card">${vacio('Sin resultados.', 'search')}</section>`;
  const tot = k => sum(lista, k);
  return `<section class="card table-card"><div class="table-wrap"><table>
    <thead><tr><th>Ubicación</th><th>Producto</th><th class="num">Físico</th><th class="num">Reservado</th><th class="num">Disponible</th><th class="num">En recepción</th><th class="num">Mínimo</th><th>Nivel de stock</th><th class="num">Acciones</th></tr></thead>
    <tbody>${lista.map(p => {
      const r = res.get(p.id) || 0;
      const est = estadoStock(p);
      const pct = Math.min(100, p.minimo ? (p.stock / (p.minimo * 2)) * 100 : 100);
      return `<tr class="${est === 'sin' ? 'row-crit' : ''}">
        <td class="nowrap"><strong class="mono">${p.ubicacion}</strong><span class="sub">${fmtUbic(p.ubicacion)}</span></td>
        <td><strong class="mono">${esc(p.sku)}</strong><span class="sub">${esc(p.descripcion)}</span></td>
        <td class="num"><strong>${num(p.stock)}</strong></td>
        <td class="num">${r ? num(r) : '<span class="muted">0</span>'}</td>
        <td class="num"><strong>${num(p.stock - r)}</strong></td>
        <td class="num">${rec.get(p.id) ? num(rec.get(p.id)) : '<span class="muted">0</span>'}</td>
        <td class="num">${num(p.minimo)}</td>
        <td><div class="progress ${est}" title="${num(p.stock)} de mínimo ${num(p.minimo)}"><span style="width:${pct}%"></span></div></td>
        <td><div class="actions">
          <button class="icon-btn sm" data-action="ajustar" data-id="${p.id}" title="Ajustar stock" aria-label="Ajustar ${esc(p.sku)}">${icon('adjust')}</button>
          <button class="icon-btn sm" data-action="reubicar" data-id="${p.id}" title="Reubicar" aria-label="Reubicar ${esc(p.sku)}">${icon('shuffle')}</button>
          <button class="icon-btn sm" data-action="ver-producto" data-id="${p.id}" title="Ver detalle" aria-label="Ver ${esc(p.sku)}">${icon('eye')}</button>
        </div></td></tr>`;
    }).join('')}</tbody>
    <tfoot><tr><td colspan="2">Total (${plural(lista.length, 'ítem', 'ítems')})</td><td class="num">${num(tot(p => p.stock))}</td><td class="num">${num(tot(p => res.get(p.id) || 0))}</td><td class="num">${num(tot(p => p.stock - (res.get(p.id) || 0)))}</td><td class="num">${num(tot(p => rec.get(p.id) || 0))}</td><td colspan="3"></td></tr></tfoot>
  </table></div></section>`;
}
function inventarioMapa() {
  const occ = mapaOcupacion();
  const L = state.layout;
  const cols = `grid-template-columns: 34px repeat(${L.estanterias}, minmax(88px, 1fr))`;
  const pasillos = L.pasillos.map(pa => {
    let celdas = '';
    for (let n = L.niveles; n >= 1; n--) {
      celdas += `<div class="map-axis">N${n}</div>`;
      for (let e = 1; e <= L.estanterias; e++) {
        const code = `${pa}-${pad(e)}-${n}`;
        const p = occ.get(code);
        celdas += p
          ? `<button class="map-cell ${estadoStock(p)}" data-action="ver-producto" data-id="${p.id}" title="${esc(`${code} · ${p.sku} · ${p.descripcion} · ${p.stock} ${p.unidad}`)}"><span class="mc-code">${code}</span><strong>${esc(p.sku)}</strong><span>${num(p.stock)} ${esc(p.unidad)}</span></button>`
          : `<button class="map-cell free" data-action="nuevo-producto" data-ubicacion="${code}" title="Posición libre ${code}: crear un producto aquí"><span class="mc-code">${code}</span><span>Libre</span></button>`;
      }
    }
    celdas += '<div></div>' + [...Array(L.estanterias)].map((_, i) => `<div class="map-axis">E${pad(i + 1)}</div>`).join('');
    const ocupadas = state.productos.filter(p => p.ubicacion.startsWith(pa + '-')).length;
    return `<section class="card map-aisle"><header><h3>Pasillo ${pa}</h3><span class="muted small">${ocupadas} / ${L.estanterias * L.niveles} posiciones ocupadas</span></header><div class="map-rack" style="${cols}">${celdas}</div></section>`;
  }).join('');
  return `<div class="map-legend"><span><i class="ok"></i>Stock normal</span><span><i class="bajo"></i>Bajo mínimo</span><span><i class="sin"></i>Sin stock</span><span><i class="free"></i>Posición libre (clic para crear producto)</span><span>· N = nivel, E = estantería</span></div>
  <div class="map-grid">${pasillos}</div>`;
}
function inventarioAlertas() {
  const crit = criticos();
  if (!crit.length) return `<section class="card">${vacio('No hay alertas: todos los productos están por encima del stock mínimo.', 'check')}</section>`;
  const rec = recepcionPendientePorProducto();
  return `<p class="muted" style="margin-bottom:14px">${plural(crit.length, 'producto requiere', 'productos requieren')} reposición. La cantidad sugerida lleva el stock al doble del mínimo.</p>
  <div class="alert-grid">${crit.map(p => {
    const sugerido = Math.max(p.minimo * 2 - p.stock - (rec.get(p.id) || 0), 0);
    const tareaExiste = state.tareas.some(t => t.ref === `repo-${p.id}` && t.estado !== 'Completada');
    return `<article class="card alert-card ${estadoStock(p)}">
      <div class="alert-head"><div><strong class="mono">${esc(p.sku)}</strong><div>${esc(p.descripcion)}</div><div class="muted small">${esc(p.proveedor)} · ${p.ubicacion}</div></div>${badgeStock(p)}</div>
      <div class="alert-nums"><div><strong>${num(p.stock)}</strong><span>Stock</span></div><div><strong>${num(p.minimo)}</strong><span>Mínimo</span></div><div><strong>${num(sugerido)}</strong><span>Sugerido</span></div></div>
      ${rec.get(p.id) ? `<div class="muted small">${icon('inbox', 'ic-sm')} ${num(rec.get(p.id))} u. en muelle pendientes de almacenar</div>` : ''}
      <div class="alert-actions">
        ${tareaExiste ? badge('Tarea de reposición creada', 'info') : `<button class="btn btn-soft btn-sm" data-action="tarea-reposicion" data-id="${p.id}" data-sugerido="${sugerido}">${icon('check-square')}Crear tarea</button>`}
        <button class="btn btn-ghost btn-sm" data-action="ajustar" data-id="${p.id}">${icon('adjust')}Ajustar</button>
        <button class="btn btn-ghost btn-sm" data-action="nueva-recepcion" data-id="${p.id}">${icon('inbox')}Recibir</button>
      </div></article>`;
  }).join('')}</div>`;
}
function inventarioAjustes() {
  const ajustes = state.movimientos.filter(m => m.tipo === 'Ajuste');
  const pos = sum(ajustes.filter(m => m.signo > 0), m => m.cantidad);
  const neg = sum(ajustes.filter(m => m.signo < 0), m => m.cantidad);
  return `<div class="toolbar card"><span class="muted">${plural(ajustes.length, 'ajuste registrado', 'ajustes registrados')} · <span class="pos">+${num(pos)}</span> / <span class="neg">−${num(neg)}</span> unidades</span><div class="toolbar-spacer"></div><button class="btn btn-primary" data-action="ajustar">${icon('adjust')}Nuevo ajuste</button></div>
  <section class="card table-card">${tablaMovimientos(ajustes)}</section>`;
}

/* ---------- 6.4 Recepción ---------- */
function vistaRecepcion() {
  const pendientes = [];
  state.recepciones.filter(r => r.estado === 'Recibida').forEach(r => r.items.forEach((i, idx) => { if (i.cantidad > i.almacenado) pendientes.push({ r, i, idx }); }));
  const hoyRec = state.recepciones.filter(r => localDateOf(r.fecha) === hoy());
  const lista = [...state.recepciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return `
  <div class="kpis k4">
    <div class="kpi static tone-info"><div class="kpi-top"><span>Recepciones de hoy</span><span class="kpi-icon">${icon('inbox')}</span></div><div class="kpi-value">${hoyRec.length}</div><div class="kpi-sub">${num(sum(hoyRec, r => sum(r.items, i => i.cantidad)))} unidades ingresadas</div></div>
    <div class="kpi static tone-warning"><div class="kpi-top"><span>Pendiente de almacenar</span><span class="kpi-icon">${icon('archive')}</span></div><div class="kpi-value">${num(pendienteAlmacenar())}</div><div class="kpi-sub">${plural(pendientes.length, 'línea en muelle', 'líneas en muelle')}</div></div>
    <div class="kpi static tone-success"><div class="kpi-top"><span>Recepciones completas</span><span class="kpi-icon">${icon('check')}</span></div><div class="kpi-value">${state.recepciones.filter(r => r.estado === 'Almacenada').length}</div><div class="kpi-sub">de ${state.recepciones.length} registradas</div></div>
    <div class="kpi static tone-primary"><div class="kpi-top"><span>Proveedores</span><span class="kpi-icon">${icon('truck')}</span></div><div class="kpi-value">${unique(state.productos.map(p => p.proveedor)).length}</div><div class="kpi-sub">activos en catálogo</div></div>
  </div>
  <div class="stack">
    <section class="card table-card">
      <div class="card-header"><div><h2>Pendiente de almacenar</h2><p>Mercadería recibida en muelle que todavía no está en su ubicación (no disponible para pedidos)</p></div><button class="btn btn-primary" data-action="nueva-recepcion">${icon('plus')}Registrar recepción</button></div>
      <div class="card-body flush">${pendientes.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Recepción</th><th>Producto</th><th>Destino</th><th class="num">Recibido</th><th class="num">Almacenado</th><th class="num">Pendiente</th><th class="num">Acción</th></tr></thead>
        <tbody>${pendientes.map(({ r, i, idx }) => {
          const p = productoPorId(i.productoId);
          return `<tr><td><strong>${r.codigo}</strong><span class="sub">${fmtDateTime(r.fecha)}</span></td>
          <td><strong class="mono">${esc(i.sku)}</strong><span class="sub">${esc(i.descripcion)}</span></td>
          <td class="mono">${p ? p.ubicacion : '—'}</td>
          <td class="num">${num(i.cantidad)}</td><td class="num">${num(i.almacenado)}</td><td class="num"><strong>${num(i.cantidad - i.almacenado)}</strong></td>
          <td><div class="actions"><button class="btn btn-success btn-sm" data-action="almacenar-item" data-id="${r.id}" data-idx="${idx}">${icon('archive')}Almacenar</button></div></td></tr>`;
        }).join('')}</tbody></table></div>` : vacio('No hay mercadería pendiente de almacenar.', 'check')}</div>
    </section>
    <section class="card table-card">
      <div class="card-header"><div><h2>Recepciones registradas</h2><p>Remitos de proveedores ingresados</p></div></div>
      <div class="card-body flush">${lista.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Código</th><th>Fecha</th><th>Proveedor</th><th>Remito</th><th class="num">Líneas</th><th class="num">Unidades</th><th>Estado</th><th>Responsable</th><th class="num">Acciones</th></tr></thead>
        <tbody>${lista.map(r => `<tr>
          <td><strong>${r.codigo}</strong></td><td class="nowrap">${fmtDateTime(r.fecha)}</td><td>${esc(r.proveedor)}</td><td class="mono">${esc(r.remito)}</td>
          <td class="num">${r.items.length}</td><td class="num">${num(sum(r.items, i => i.cantidad))}</td>
          <td>${badge(r.estado === 'Recibida' ? 'En muelle' : 'Almacenada', r.estado === 'Recibida' ? 'warning' : 'success')}</td><td>${esc(r.responsable)}</td>
          <td><div class="actions">
            ${r.estado === 'Recibida' ? `<button class="btn btn-soft btn-sm" data-action="almacenar-todo" data-id="${r.id}">Almacenar todo</button>` : ''}
            <button class="icon-btn sm" data-action="ver-recepcion" data-id="${r.id}" title="Ver detalle" aria-label="Ver ${r.codigo}">${icon('eye')}</button>
          </div></td></tr>`).join('')}</tbody></table></div>` : vacio('Todavía no se registraron recepciones.', 'inbox')}</div>
    </section>
  </div>`;
}

/* ---------- 6.5 Movimientos internos ---------- */
function cuerpoReubicacion(id) {
  return `<div class="field"><label for="ri-prod">Producto *</label><select id="ri-prod" name="producto" required>${opcionesProducto(id)}</select></div>
    <div class="info-box" data-info-reubic><div><span>Ubicación actual</span><strong>—</strong></div><div><span>Stock a mover</span><strong>—</strong></div></div>
    <div class="form-grid">
      <div class="field"><label for="ri-dest">Ubicación destino *</label><select id="ri-dest" name="destino" required>${opcionesUbicacion('')}</select><small class="hint">Solo posiciones libres.</small></div>
      <div class="field"><label for="ri-mot">Motivo *</label><select id="ri-mot" name="motivo" required>${opciones(MOTIVOS_REUBICACION, '', { placeholder: 'Seleccioná un motivo' })}</select></div>
    </div>`;
}
function montarReubicacion(form) {
  const info = $('[data-info-reubic]', form);
  const upd = () => {
    const p = productoPorId(valor(form, 'producto'));
    info.innerHTML = p
      ? `<div><span>Ubicación actual</span><strong class="mono">${p.ubicacion}</strong></div><div><span>Stock a mover</span><strong>${num(p.stock)} ${esc(p.unidad)}</strong></div><div><span>Categoría</span><strong>${esc(p.categoria)}</strong></div>`
      : `<div><span>Ubicación actual</span><strong>—</strong></div><div><span>Stock a mover</span><strong>—</strong></div>`;
  };
  campo(form, 'producto').addEventListener('change', upd);
  upd();
}
function procesarReubicacion(form) {
  const p = productoPorId(valor(form, 'producto'));
  const destino = valor(form, 'destino');
  if (!p) { errorCampo(campo(form, 'producto'), 'Seleccioná un producto.'); return false; }
  if (!ubicacionesLibres().includes(destino)) { errorCampo(campo(form, 'destino'), 'La posición destino ya está ocupada.'); return false; }
  const origen = p.ubicacion;
  p.ubicacion = destino;
  registrarMovimiento('Movimiento interno', p, p.stock, 0, valor(form, 'motivo'), `${origen} → ${destino}`);
  confirmarCambios(`${p.sku} reubicado de ${origen} a ${destino}.`);
  return true;
}
function vistaInternos() {
  const movs = state.movimientos.filter(m => m.tipo === 'Movimiento interno');
  return `<div class="grid grid-3">
    <section class="card">
      <div class="card-header"><div><h2>Nuevo movimiento interno</h2><p>Traslada todo el stock de un artículo a otra posición libre</p></div></div>
      <div class="card-body">
        <form data-form="interno" class="stack" novalidate>
          ${cuerpoReubicacion('')}
          <button type="submit" class="btn btn-primary">${icon('shuffle')}Registrar movimiento</button>
        </form>
      </div>
    </section>
    <section class="card span-2 table-card">
      <div class="card-header"><div><h2>Historial de reubicaciones</h2><p>${plural(movs.length, 'movimiento', 'movimientos')}</p></div><button class="btn btn-ghost btn-sm" data-action="ir" data-ruta="inventario" data-tab="mapa">${icon('map')}Ver mapa</button></div>
      <div class="card-body flush">${movs.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Producto</th><th>Origen → destino</th><th class="num">Unidades</th><th>Motivo</th><th>Responsable</th></tr></thead>
        <tbody>${movs.map(m => `<tr><td class="nowrap">${fmtDateTime(m.fecha)}</td><td><strong class="mono">${esc(m.sku)}</strong><span class="sub">${esc(m.descripcion)}</span></td><td class="mono nowrap">${esc(m.detalle)}</td><td class="num">${num(m.cantidad)}</td><td>${esc(m.referencia)}</td><td>${esc(m.responsable)}</td></tr>`).join('')}</tbody>
      </table></div>` : vacio('Sin movimientos internos registrados.', 'shuffle')}</div>
    </section>
  </div>`;
}
function montarInternos() { const f = $('form[data-form="interno"]'); if (f) montarReubicacion(f); }

/* ---------- 6.6 Pedidos ---------- */
function vistaPedidos() {
  const f = ui.pedidos;
  return `<div class="toolbar card">
    <div class="search-field">${icon('search')}<input type="search" placeholder="Buscar por código, cliente o SKU" value="${esc(f.q)}" data-filter="pedidos.q" aria-label="Buscar pedidos"></div>
    <select data-filter="pedidos.estado" aria-label="Estado">${opciones([...FLUJO_PEDIDO, 'Cancelado'], f.estado, { placeholder: 'Todos los estados (historial)' })}</select>
    <div class="toolbar-spacer"></div>
    <button class="btn btn-primary" data-action="nuevo-pedido">${icon('plus')}Nuevo pedido</button>
  </div>
  <div id="resultados">${resultadosPedidos()}</div>`;
}
function filtrarPedidos(lista) {
  const q = ui.pedidos.q.trim().toLowerCase();
  if (!q) return lista;
  return lista.filter(p => [p.codigo, p.cliente, ...p.items.map(i => i.sku)].join(' ').toLowerCase().includes(q));
}
function tarjetaPedido(p) {
  const unidades = sum(p.items, i => i.cantidad);
  const vencido = p.estado !== 'Despachado' && p.entrega < hoy();
  const accion = {
    Pendiente: `<button class="btn btn-primary btn-sm" data-action="picking" data-id="${p.id}">${icon('list')}Picking</button>`,
    Preparado: `<button class="btn btn-primary btn-sm" data-action="packing" data-id="${p.id}">${icon('archive')}Embalar</button>`,
    Embalado: `<button class="btn btn-success btn-sm" data-action="despachar" data-id="${p.id}">${icon('truck')}Despachar</button>`
  }[p.estado] || '';
  return `<article class="kcard prio-${p.prioridad}">
    <div class="kcard-head"><span class="kcard-title">${p.codigo}</span>${badge(p.prioridad, TONO_PRIORIDAD[p.prioridad])}</div>
    <div>${esc(p.cliente)}</div>
    <div class="kcard-meta">
      <span class="${vencido ? 'late' : ''}">${icon('calendar')}${p.estado === 'Despachado' ? `Despachado ${fmtDateTime(p.historial[p.historial.length - 1].fecha)}` : `Entrega ${fmtDate(p.entrega)}${vencido ? ' (vencida)' : ''}`}</span>
      <span>${icon('box')}${plural(p.items.length, 'línea', 'líneas')} · ${num(unidades)} u.</span>
    </div>
    <div class="kcard-foot">
      <div class="actions">
        <button class="icon-btn sm" data-action="ver-pedido" data-id="${p.id}" title="Ver detalle" aria-label="Ver ${p.codigo}">${icon('eye')}</button>
        ${p.estado !== 'Despachado' ? `<button class="icon-btn sm danger" data-action="cancelar-pedido" data-id="${p.id}" title="Cancelar pedido" aria-label="Cancelar ${p.codigo}">${icon('ban')}</button>` : ''}
      </div>${accion}
    </div></article>`;
}
function resultadosPedidos() {
  const ordenar = l => l.sort((a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad) || a.entrega.localeCompare(b.entrega));
  const cols = [
    { estado: 'Pendiente', titulo: 'A preparar (picking)', color: 'var(--warning-fill)' },
    { estado: 'Preparado', titulo: 'A embalar (packing)', color: 'var(--info)' },
    { estado: 'Embalado', titulo: 'A despachar', color: 'var(--violet)' },
    { estado: 'Despachado', titulo: 'Despachados recientes', color: 'var(--success-fill)' }
  ];
  const kanban = cols.map(c => {
    let lista = filtrarPedidos(state.pedidos.filter(p => p.estado === c.estado));
    lista = c.estado === 'Despachado'
      ? lista.sort((a, b) => b.historial[b.historial.length - 1].fecha.localeCompare(a.historial[a.historial.length - 1].fecha)).slice(0, 5)
      : ordenar(lista);
    return `<div class="kcol"><div class="kcol-head"><h3><span class="kdot" style="background:${c.color}"></span>${c.titulo}</h3><small>${lista.length}</small></div>
      <div class="kcards">${lista.length ? lista.map(tarjetaPedido).join('') : '<div class="kempty">Sin pedidos</div>'}</div></div>`;
  }).join('');

  const est = ui.pedidos.estado;
  const historial = filtrarPedidos(state.pedidos.filter(p => !est || p.estado === est)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return `<div class="kanban">${kanban}</div>
  <section class="card table-card">
    <div class="card-header"><div><h2>Todos los pedidos</h2><p>${plural(historial.length, 'pedido', 'pedidos')}</p></div></div>
    <div class="card-body flush">${historial.length ? `<div class="table-wrap"><table>
      <thead><tr><th>Código</th><th>Cliente</th><th>Creado</th><th>Entrega</th><th>Prioridad</th><th class="num">Unidades</th><th>Estado</th><th class="num">Acciones</th></tr></thead>
      <tbody>${historial.map(p => `<tr><td><strong>${p.codigo}</strong></td><td>${esc(p.cliente)}</td><td class="nowrap">${fmtDateTime(p.fecha)}</td><td class="nowrap">${fmtDate(p.entrega)}</td><td>${badge(p.prioridad, TONO_PRIORIDAD[p.prioridad])}</td><td class="num">${num(sum(p.items, i => i.cantidad))}</td><td>${badge(p.estado, TONO_PEDIDO[p.estado])}</td>
        <td><div class="actions"><button class="icon-btn sm" data-action="ver-pedido" data-id="${p.id}" title="Ver detalle" aria-label="Ver ${p.codigo}">${icon('eye')}</button></div></td></tr>`).join('')}</tbody>
    </table></div>` : vacio('No hay pedidos con esos filtros.', 'clipboard')}</div>
  </section>`;
}

/* ---------- 6.7 Devoluciones ---------- */
function vistaDevoluciones() {
  const lista = [...state.devoluciones].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const unidades = d => sum(d.items, i => i.cantidad);
  const aptas = sum(lista.filter(d => d.condicion === 'Apta'), unidades);
  const noAptas = sum(lista.filter(d => d.condicion !== 'Apta'), unidades);
  const motivos = unique(lista.map(d => d.motivo)).map(m => ({ label: m, valor: lista.filter(d => d.motivo === m).length })).sort((a, b) => b.valor - a.valor);
  return `<div class="kpis k4">
    <div class="kpi static tone-primary"><div class="kpi-top"><span>Devoluciones</span><span class="kpi-icon">${icon('undo')}</span></div><div class="kpi-value">${lista.length}</div><div class="kpi-sub">registradas</div></div>
    <div class="kpi static tone-success"><div class="kpi-top"><span>Reingresadas a stock</span><span class="kpi-icon">${icon('check')}</span></div><div class="kpi-value">${num(aptas)}</div><div class="kpi-sub">unidades aptas</div></div>
    <div class="kpi static tone-danger"><div class="kpi-top"><span>Descartadas</span><span class="kpi-icon">${icon('trash')}</span></div><div class="kpi-value">${num(noAptas)}</div><div class="kpi-sub">unidades no aptas</div></div>
    <div class="kpi static tone-info"><div class="kpi-top"><span>Pedidos despachados</span><span class="kpi-icon">${icon('truck')}</span></div><div class="kpi-value">${state.pedidos.filter(p => p.estado === 'Despachado').length}</div><div class="kpi-sub">susceptibles de devolución</div></div>
  </div>
  <div class="grid grid-3">
    <section class="card span-2 table-card">
      <div class="card-header"><div><h2>Devoluciones registradas</h2><p>Mercadería que regresa de clientes</p></div><button class="btn btn-primary" data-action="nueva-devolucion">${icon('plus')}Registrar devolución</button></div>
      <div class="card-body flush">${lista.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Código</th><th>Fecha</th><th>Pedido / cliente</th><th>Productos</th><th>Motivo</th><th>Condición</th><th>Responsable</th></tr></thead>
        <tbody>${lista.map(d => `<tr><td><strong>${d.codigo}</strong></td><td class="nowrap">${fmtDateTime(d.fecha)}</td><td><strong>${esc(d.pedidoCodigo)}</strong><span class="sub">${esc(d.cliente)}</span></td>
          <td>${d.items.map(i => `<div><span class="mono">${esc(i.sku)}</span> × ${num(i.cantidad)}</div>`).join('')}</td>
          <td>${esc(d.motivo)}${d.observaciones ? `<span class="sub">${esc(d.observaciones)}</span>` : ''}</td>
          <td>${d.condicion === 'Apta' ? badge('Apta · reingresa', 'success') : badge('No apta · descarte', 'danger')}</td><td>${esc(d.responsable)}</td></tr>`).join('')}</tbody>
      </table></div>` : vacio('Sin devoluciones registradas.', 'undo')}</div>
    </section>
    <section class="card">
      <div class="card-header"><div><h2>Motivos de devolución</h2><p>Cantidad de casos</p></div></div>
      <div class="card-body">${motivos.length ? barrasH(motivos) : vacio('Sin datos.', 'trending')}</div>
    </section>
  </div>`;
}

/* ---------- 6.8 Tareas ---------- */
function vistaTareas() {
  const f = ui.tareas;
  return `<div class="toolbar card">
    <div class="search-field">${icon('search')}<input type="search" placeholder="Buscar tareas" value="${esc(f.q)}" data-filter="tareas.q" aria-label="Buscar tareas"></div>
    <select data-filter="tareas.resp" aria-label="Responsable">${opciones(unique([...state.personal.map(p => p.nombre), ...state.tareas.map(t => t.responsable)]), f.resp, { placeholder: 'Todos los responsables' })}</select>
    <select data-filter="tareas.prio" aria-label="Prioridad">${opciones(PRIORIDADES, f.prio, { placeholder: 'Todas las prioridades' })}</select>
    <select data-filter="tareas.fecha" aria-label="Fecha">${opciones([['hoy', 'Para hoy'], ['vencidas', 'Vencidas'], ['proximas', 'Próximas']], f.fecha, { placeholder: 'Todas las fechas' })}</select>
    <button class="btn btn-ghost" data-action="limpiar-filtros" data-scope="tareas">Limpiar</button>
    <div class="toolbar-spacer"></div>
    <button class="btn btn-primary" data-action="nueva-tarea">${icon('plus')}Nueva tarea</button>
  </div>
  <div id="resultados">${resultadosTareas()}</div>`;
}
function resultadosTareas() {
  const f = ui.tareas;
  const q = f.q.trim().toLowerCase();
  const h = hoy();
  const lista = state.tareas.filter(t =>
    (!q || `${t.titulo} ${t.descripcion} ${t.responsable}`.toLowerCase().includes(q)) &&
    (!f.resp || t.responsable === f.resp) && (!f.prio || t.prioridad === f.prio) &&
    (!f.fecha || (f.fecha === 'hoy' && t.fecha === h) || (f.fecha === 'vencidas' && t.fecha < h && t.estado !== 'Completada') || (f.fecha === 'proximas' && t.fecha > h)));
  const colores = { Pendiente: 'var(--warning-fill)', 'En proceso': 'var(--primary)', Completada: 'var(--success-fill)' };
  return `<div class="kanban k3">${ESTADOS_TAREA.map((estado, idx) => {
    const col = lista.filter(t => t.estado === estado).sort((a, b) => a.fecha.localeCompare(b.fecha) || PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad));
    return `<div class="kcol"><div class="kcol-head"><h3><span class="kdot" style="background:${colores[estado]}"></span>${estado}</h3><small>${col.length}</small></div>
    <div class="kcards">${col.length ? col.map(t => {
      const vencida = t.fecha < h && t.estado !== 'Completada';
      return `<article class="kcard prio-${t.prioridad}">
        <div class="kcard-head"><span class="kcard-title">${esc(t.titulo)}</span>${badge(t.prioridad, TONO_PRIORIDAD[t.prioridad])}</div>
        ${t.descripcion ? `<div class="kcard-desc">${esc(t.descripcion)}</div>` : ''}
        <div class="kcard-meta"><span>${icon('user')}${esc(t.responsable)}</span><span class="${vencida ? 'late' : ''}">${icon('calendar')}${t.fecha === h ? 'Hoy' : fmtDate(t.fecha)}${vencida ? ' · vencida' : ''}</span></div>
        <div class="kcard-foot">
          <div class="actions">
            <button class="icon-btn sm" data-action="editar-tarea" data-id="${t.id}" title="Editar" aria-label="Editar tarea">${icon('edit')}</button>
            <button class="icon-btn sm danger" data-action="eliminar-tarea" data-id="${t.id}" title="Eliminar" aria-label="Eliminar tarea">${icon('trash')}</button>
          </div>
          <div class="actions">
            <button class="icon-btn sm" data-action="tarea-mover" data-id="${t.id}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} title="Volver a ${ESTADOS_TAREA[idx - 1] || ''}" aria-label="Retroceder estado">${icon('chevron-left')}</button>
            <button class="icon-btn sm" data-action="tarea-mover" data-id="${t.id}" data-dir="1" ${idx === 2 ? 'disabled' : ''} title="Pasar a ${ESTADOS_TAREA[idx + 1] || ''}" aria-label="Avanzar estado">${icon('chevron-right')}</button>
          </div>
        </div></article>`;
    }).join('') : '<div class="kempty">Sin tareas</div>'}</div></div>`;
  }).join('')}</div>`;
}

/* ---------- 6.9 Historial ---------- */
function vistaHistorial() {
  const f = ui.historial;
  return `<div class="toolbar card">
    <div class="search-field">${icon('search')}<input type="search" placeholder="SKU, descripción, referencia o detalle" value="${esc(f.q)}" data-filter="historial.q" aria-label="Buscar movimientos"></div>
    <select data-filter="historial.tipo" aria-label="Tipo">${opciones(TIPOS_MOV, f.tipo, { placeholder: 'Todos los tipos' })}</select>
    <select data-filter="historial.resp" aria-label="Responsable">${opciones(unique(state.movimientos.map(m => m.responsable)), f.resp, { placeholder: 'Todos los responsables' })}</select>
    <label class="small muted">Desde <input type="date" value="${f.desde}" data-filter="historial.desde"></label>
    <label class="small muted">Hasta <input type="date" value="${f.hasta}" data-filter="historial.hasta"></label>
    <button class="btn btn-ghost" data-action="limpiar-filtros" data-scope="historial">Limpiar</button>
    <div class="toolbar-spacer"></div>
    <button class="btn btn-ghost" data-action="exportar-historial">${icon('download')}Exportar CSV</button>
  </div>
  <div id="resultados">${resultadosHistorial()}</div>`;
}
function filtrarHistorial() {
  const f = ui.historial;
  const q = f.q.trim().toLowerCase();
  return state.movimientos.filter(m => {
    const d = localDateOf(m.fecha);
    return (!q || `${m.sku} ${m.descripcion} ${m.referencia} ${m.detalle}`.toLowerCase().includes(q)) &&
      (!f.tipo || m.tipo === f.tipo) && (!f.resp || m.responsable === f.resp) && (!f.desde || d >= f.desde) && (!f.hasta || d <= f.hasta);
  });
}
function resultadosHistorial() {
  const lista = filtrarHistorial();
  const visibles = lista.slice(0, ui.historial.limite);
  const entradas = sum(lista.filter(m => m.signo > 0), m => m.cantidad);
  const salidas = sum(lista.filter(m => m.signo < 0), m => m.cantidad);
  return `<div class="table-meta"><span>${plural(lista.length, 'movimiento', 'movimientos')} · entradas <span class="pos">+${num(entradas)}</span> · salidas <span class="neg">−${num(salidas)}</span></span><span>Cantidades sin signo no alteran el stock físico (reservas, packing, despachos, reubicaciones)</span></div>
  <section class="card table-card">${tablaMovimientos(visibles)}
  ${lista.length > visibles.length ? `<div class="table-more"><button class="btn btn-ghost" data-action="mas-historial">Mostrar más (${num(lista.length - visibles.length)} restantes)</button></div>` : ''}</section>`;
}

/* ---------- 6.10 Configuración ---------- */
function vistaConfig() {
  const L = state.layout;
  const bytes = new Blob([JSON.stringify(state)]).size;
  const siguiente = String.fromCharCode(L.pasillos[L.pasillos.length - 1].charCodeAt(0) + 1);
  const ultimo = L.pasillos[L.pasillos.length - 1];
  const ultimoVacio = !state.productos.some(p => p.ubicacion.startsWith(ultimo + '-'));
  return `<div class="grid grid-2">
    <section class="card table-card">
      <div class="card-header"><div><h2>Personal del depósito</h2><p>Responsables asignables a tareas y operaciones</p></div></div>
      <div class="card-body flush"><div class="table-wrap"><table>
        <thead><tr><th>Nombre</th><th>Rol</th><th class="num">Tareas abiertas</th><th class="num">Acciones</th></tr></thead>
        <tbody>${state.personal.map(p => `<tr><td><span class="avatar sm">${initials(p.nombre)}</span> ${esc(p.nombre)} ${p.nombre === state.usuario ? badge('Activo', 'primary') : ''}</td><td>${esc(p.rol)}</td>
          <td class="num">${state.tareas.filter(t => t.responsable === p.nombre && t.estado !== 'Completada').length}</td>
          <td><div class="actions"><button class="icon-btn sm danger" data-action="eliminar-personal" data-id="${p.id}" title="Eliminar" aria-label="Eliminar ${esc(p.nombre)}" ${p.nombre === state.usuario ? 'disabled' : ''}>${icon('trash')}</button></div></td></tr>`).join('')}</tbody>
      </table></div></div>
      <div class="card-body">
        <form data-form="personal" class="form-grid" novalidate>
          <div class="field"><label for="pe-nombre">Nombre y apellido *</label><input id="pe-nombre" name="nombre" required maxlength="40"></div>
          <div class="field"><label for="pe-rol">Rol *</label><input id="pe-rol" name="rol" required maxlength="40" list="dl-roles"><datalist id="dl-roles">${opciones(unique(state.personal.map(p => p.rol)), '')}</datalist></div>
          <div class="span-2"><button type="submit" class="btn btn-primary">${icon('plus')}Agregar persona</button></div>
        </form>
      </div>
    </section>
    <div class="stack">
      <section class="card">
        <div class="card-header"><div><h2>Layout del depósito</h2><p>Pasillos × estanterías × niveles</p></div></div>
        <div class="card-body stack">
          <div class="info-box"><div><span>Pasillos</span><strong>${L.pasillos.join(', ')}</strong></div><div><span>Estanterías por pasillo</span><strong>${L.estanterias}</strong></div><div><span>Niveles</span><strong>${L.niveles}</strong></div><div><span>Posiciones</span><strong>${ubicaciones().length}</strong></div></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-ghost" data-action="agregar-pasillo" ${L.pasillos.length >= 12 ? 'disabled' : ''}>${icon('plus')}Agregar pasillo ${siguiente}</button>
            <button class="btn btn-ghost" data-action="quitar-pasillo" ${L.pasillos.length <= 1 || !ultimoVacio ? 'disabled' : ''} title="${ultimoVacio ? '' : 'El pasillo tiene productos ubicados'}">${icon('trash')}Quitar pasillo ${ultimo}</button>
          </div>
          <p class="hint">Solo se puede quitar el último pasillo si no tiene productos ubicados.</p>
        </div>
      </section>
      <section class="card">
        <div class="card-header"><div><h2>Datos de la demostración</h2><p>Se guardan en el almacenamiento local de este navegador (${(bytes / 1024).toFixed(1)} KB)</p></div></div>
        <div class="card-body stack">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-ghost" data-action="exportar-json">${icon('download')}Exportar copia (JSON)</button>
            <label class="btn btn-ghost" for="importFile">${icon('upload')}Importar copia</label>
            <input type="file" id="importFile" accept="application/json,.json" hidden>
            <button class="btn btn-danger" data-action="reset-demo">${icon('refresh')}Restablecer demostración</button>
          </div>
          <p class="hint">Restablecer reemplaza todos los datos por el set ficticio inicial. Exportá una copia antes si querés conservar los cambios.</p>
        </div>
      </section>
    </div>
  </div>`;
}

/* =========================================================
   7. Acciones y formularios
   ========================================================= */

/* ---------- Productos ---------- */
function abrirFormProducto(id, ubicacionPreset = '') {
  const p = id ? productoPorId(id) : null;
  if (id && !p) return toast('El producto ya no existe.', 'error');
  const d = p || { sku: '', descripcion: '', categoria: '', proveedor: '', unidad: 'unidad', stock: 0, minimo: 0, ubicacion: ubicacionPreset };
  abrirModal({
    titulo: p ? `Editar producto ${p.sku}` : 'Nuevo producto',
    tamano: 'lg',
    aceptar: p ? 'Guardar cambios' : 'Crear producto',
    cuerpo: `<div class="form-grid">
      <div class="field"><label for="fp-sku">Código SKU *</label><input id="fp-sku" name="sku" required maxlength="20" value="${esc(d.sku)}" placeholder="Ej.: ELE-006" autocomplete="off" style="text-transform:uppercase"><small class="hint">3 a 20 caracteres: letras, números o guiones.</small></div>
      <div class="field"><label for="fp-uni">Unidad de medida *</label><select id="fp-uni" name="unidad" required>${opciones(UNIDADES, d.unidad)}</select></div>
      <div class="field span-2"><label for="fp-desc">Descripción *</label><input id="fp-desc" name="descripcion" required maxlength="90" value="${esc(d.descripcion)}"></div>
      <div class="field"><label for="fp-cat">Categoría *</label><input id="fp-cat" name="categoria" required maxlength="40" list="dl-cat" value="${esc(d.categoria)}" autocomplete="off"><datalist id="dl-cat">${opciones(unique(state.productos.map(x => x.categoria)), '')}</datalist></div>
      <div class="field"><label for="fp-prov">Proveedor *</label><input id="fp-prov" name="proveedor" required maxlength="50" list="dl-prov" value="${esc(d.proveedor)}" autocomplete="off"><datalist id="dl-prov">${opciones(unique(state.productos.map(x => x.proveedor)), '')}</datalist></div>
      ${p
        ? `<div class="field"><label>Cantidad en stock</label><input value="${num(p.stock)} ${esc(p.unidad)}" disabled><small class="hint">Para modificarla usá un ajuste de inventario: así queda trazado.</small></div>`
        : `<div class="field"><label for="fp-stock">Cantidad inicial *</label><input id="fp-stock" type="number" name="stock" min="0" max="999999" step="1" required value="0"></div>`}
      <div class="field"><label for="fp-min">Stock mínimo *</label><input id="fp-min" type="number" name="minimo" min="0" max="999999" step="1" required value="${d.minimo}"></div>
      <div class="field span-2"><label for="fp-ubic">Ubicación (pasillo · estantería · nivel) *</label><select id="fp-ubic" name="ubicacion" required>${opcionesUbicacion(d.ubicacion, p?.id)}</select><small class="hint">Solo se listan posiciones libres. Cambiarla registra un movimiento interno.</small></div>
    </div>`,
    alEnviar(form) {
      const sku = valor(form, 'sku').toUpperCase();
      if (!/^[A-Z0-9-]{3,20}$/.test(sku)) { errorCampo(campo(form, 'sku'), 'Usá entre 3 y 20 caracteres: letras, números o guiones.'); return false; }
      if (state.productos.some(x => x.sku.toUpperCase() === sku && x.id !== p?.id)) { errorCampo(campo(form, 'sku'), 'Ya existe un producto con ese SKU.'); return false; }
      const ubic = valor(form, 'ubicacion');
      if (!ubicacionesLibres(p?.id).includes(ubic)) { errorCampo(campo(form, 'ubicacion'), 'La posición ya está ocupada.'); return false; }
      const datos = { sku, descripcion: valor(form, 'descripcion'), categoria: valor(form, 'categoria'), proveedor: valor(form, 'proveedor'), unidad: valor(form, 'unidad'), minimo: Number(valor(form, 'minimo')) };
      if (p) {
        const origen = p.ubicacion;
        Object.assign(p, datos, { ubicacion: ubic });
        if (origen !== ubic) registrarMovimiento('Movimiento interno', p, p.stock, 0, 'Edición de producto', `${origen} → ${ubic}`);
        confirmarCambios(`Producto ${sku} actualizado.`);
      } else {
        const nuevo = { id: nuevoId('producto'), ...datos, stock: Number(valor(form, 'stock')), ubicacion: ubic, creado: new Date().toISOString() };
        state.productos.push(nuevo);
        registrarMovimiento('Alta de producto', nuevo, nuevo.stock, nuevo.stock > 0 ? 1 : 0, 'Stock inicial', `Ubicado en ${ubic}`);
        confirmarCambios(`Producto ${sku} creado en ${ubic}.`);
      }
    }
  });
}
function verProducto(id) {
  const p = productoPorId(id);
  if (!p) return toast('El producto ya no existe.', 'error');
  const r = reservado(p.id);
  const movs = state.movimientos.filter(m => m.productoId === p.id).slice(0, 10);
  const pedidos = state.pedidos.filter(x => ['Pendiente', 'Preparado', 'Embalado'].includes(x.estado) && x.items.some(i => i.productoId === p.id));
  abrirModal({
    titulo: `${p.sku} · ${p.descripcion}`, tamano: 'lg', sinAceptar: true, cancelar: 'Cerrar',
    cuerpo: `<div class="detail-grid">
      <div><span>Categoría</span><strong>${esc(p.categoria)}</strong></div><div><span>Proveedor</span><strong>${esc(p.proveedor)}</strong></div>
      <div><span>Unidad</span><strong>${esc(p.unidad)}</strong></div><div><span>Ubicación</span><strong>${fmtUbic(p.ubicacion)}</strong></div>
      <div><span>Estado</span>${badgeStock(p)}</div><div><span>Alta</span><strong>${fmtDateTime(p.creado)}</strong></div>
    </div>
    <div class="info-box"><div><span>Físico</span><strong>${num(p.stock)}</strong></div><div><span>Reservado</span><strong>${num(r)}</strong></div><div><span>Disponible</span><strong>${num(p.stock - r)}</strong></div><div><span>En recepción</span><strong>${num(enRecepcion(p.id))}</strong></div><div><span>Mínimo</span><strong>${num(p.minimo)}</strong></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="btn btn-soft btn-sm" data-action="editar-producto" data-id="${p.id}" data-cerrar>${icon('edit')}Editar</button>
      <button type="button" class="btn btn-soft btn-sm" data-action="ajustar" data-id="${p.id}" data-cerrar>${icon('adjust')}Ajustar stock</button>
      <button type="button" class="btn btn-soft btn-sm" data-action="reubicar" data-id="${p.id}" data-cerrar>${icon('shuffle')}Reubicar</button>
    </div>
    ${pedidos.length ? `<div><div class="section-title">Pedidos activos con este producto</div>${pedidos.map(x => `${badge(`${x.codigo} · ${x.estado}`, TONO_PEDIDO[x.estado])} `).join('')}</div>` : ''}
    <div><div class="section-title">Últimos movimientos</div><div class="box-bordered">${tablaMovimientos(movs, true)}</div></div>`
  });
}
async function eliminarProducto(id) {
  const p = productoPorId(id);
  if (!p) return;
  if (reservado(p.id) > 0) return toast(`No se puede eliminar ${p.sku}: tiene unidades reservadas en pedidos pendientes.`, 'error');
  if (enRecepcion(p.id) > 0) return toast(`No se puede eliminar ${p.sku}: tiene mercadería en muelle pendiente de almacenar.`, 'error');
  if (state.pedidos.some(x => ['Preparado', 'Embalado'].includes(x.estado) && x.items.some(i => i.productoId === p.id))) return toast(`No se puede eliminar ${p.sku}: forma parte de pedidos en preparación.`, 'error');
  const ok = await confirmar({
    titulo: 'Eliminar producto',
    mensaje: `¿Eliminar <strong>${esc(p.sku)} · ${esc(p.descripcion)}</strong>?${p.stock > 0 ? `<br><br>Tiene <strong>${num(p.stock)} ${esc(p.unidad)}</strong> en stock: se registrará una baja por esa cantidad.` : ''}<br><br>El historial de movimientos se conserva.`,
    aceptar: 'Eliminar', peligro: true
  });
  if (!ok) return;
  if (p.stock > 0) { const cant = p.stock; aplicarStock(p, -cant); registrarMovimiento('Baja de producto', p, cant, -1, 'Eliminación', `Liberada ubicación ${p.ubicacion}`); }
  else registrarMovimiento('Baja de producto', p, 0, 0, 'Eliminación', `Liberada ubicación ${p.ubicacion}`);
  state.productos = state.productos.filter(x => x.id !== p.id);
  state.tareas.forEach(t => { if (t.ref === `repo-${p.id}`) t.ref = null; });
  confirmarCambios(`Producto ${p.sku} eliminado.`);
}

/* ---------- Inventario: ajuste manual ---------- */
function abrirAjuste(id) {
  if (!state.productos.length) return toast('No hay productos cargados.', 'warning');
  abrirModal({
    titulo: 'Ajuste manual de inventario', aceptar: 'Registrar ajuste',
    cuerpo: `<div class="field"><label for="aj-prod">Producto *</label><select id="aj-prod" name="producto" required>${opcionesProducto(id)}</select></div>
      <div class="info-box" data-info></div>
      <div class="form-grid">
        <div class="field"><label for="aj-tipo">Tipo de ajuste *</label><select id="aj-tipo" name="tipo" required><option value="ingreso">Ingreso (+)</option><option value="egreso">Egreso (−)</option><option value="conteo">Conteo físico (fija la cantidad)</option></select></div>
        <div class="field"><label for="aj-cant" data-label-cant>Cantidad *</label><input id="aj-cant" type="number" name="cantidad" min="0" max="999999" step="1" required></div>
        <div class="field"><label for="aj-mot">Motivo *</label><select id="aj-mot" name="motivo" required>${opciones(MOTIVOS_AJUSTE, '', { placeholder: 'Seleccioná un motivo' })}</select></div>
        <div class="field"><label for="aj-obs">Observación</label><input id="aj-obs" name="obs" maxlength="120" placeholder="Opcional"></div>
      </div>
      <div class="preview" data-preview></div>`,
    alAbrir(form) {
      const upd = () => {
        const p = productoPorId(valor(form, 'producto'));
        const tipo = valor(form, 'tipo');
        $('[data-label-cant]', form).textContent = tipo === 'conteo' ? 'Cantidad contada *' : 'Cantidad *';
        const info = $('[data-info]', form), prev = $('[data-preview]', form);
        if (!p) { info.innerHTML = '<div><span>Seleccioná un producto</span><strong>—</strong></div>'; prev.textContent = ''; return; }
        const r = reservado(p.id);
        info.innerHTML = `<div><span>Stock físico</span><strong>${num(p.stock)}</strong></div><div><span>Reservado</span><strong>${num(r)}</strong></div><div><span>Ubicación</span><strong class="mono">${p.ubicacion}</strong></div>`;
        const raw = valor(form, 'cantidad');
        if (raw === '') { prev.textContent = ''; return; }
        const c = Number(raw);
        const nuevo = tipo === 'ingreso' ? p.stock + c : tipo === 'egreso' ? p.stock - c : c;
        prev.classList.toggle('warn', nuevo < r);
        prev.innerHTML = nuevo < r
          ? `El stock quedaría en ${num(nuevo)}, por debajo de las ${num(r)} u. reservadas. No se permite.`
          : `Stock resultante: <strong>${num(p.stock)} → ${num(nuevo)}</strong> (${nuevo - p.stock >= 0 ? '+' : '−'}${num(Math.abs(nuevo - p.stock))})`;
      };
      form.addEventListener('input', upd);
      upd();
    },
    alEnviar(form) {
      const p = productoPorId(valor(form, 'producto'));
      const tipo = valor(form, 'tipo');
      const c = Number(valor(form, 'cantidad'));
      if (!Number.isInteger(c)) { errorCampo(campo(form, 'cantidad'), 'Ingresá un número entero.'); return false; }
      if (tipo !== 'conteo' && c < 1) { errorCampo(campo(form, 'cantidad'), 'La cantidad debe ser mayor que cero.'); return false; }
      const delta = tipo === 'ingreso' ? c : tipo === 'egreso' ? -c : c - p.stock;
      const r = reservado(p.id);
      if (p.stock + delta < 0) { errorCampo(campo(form, 'cantidad'), `No hay stock suficiente: el máximo a egresar es ${num(p.stock)}.`); return false; }
      if (p.stock + delta < r) { errorCampo(campo(form, 'cantidad'), `El stock no puede quedar por debajo de lo reservado (${num(r)} u.). Cancelá o modificá pedidos primero.`); return false; }
      if (delta === 0) { toast('Conteo sin diferencias: no se registró ajuste.', 'info'); return; }
      const antes = p.stock;
      aplicarStock(p, delta);
      const obs = valor(form, 'obs');
      registrarMovimiento('Ajuste', p, Math.abs(delta), Math.sign(delta), valor(form, 'motivo'), tipo === 'conteo' ? `Conteo físico: ${antes} → ${p.stock}${obs ? ` · ${obs}` : ''}` : obs);
      confirmarCambios(`Ajuste registrado: ${p.sku} ${antes} → ${p.stock}.`);
    }
  });
}
function abrirReubicacion(id) {
  if (!state.productos.length) return toast('No hay productos cargados.', 'warning');
  abrirModal({ titulo: 'Movimiento interno', aceptar: 'Reubicar', cuerpo: cuerpoReubicacion(id), alAbrir: montarReubicacion, alEnviar: procesarReubicacion });
}
function tareaReposicion(id, sugerido) {
  const p = productoPorId(id);
  if (!p) return;
  abrirFormTarea(null, {
    titulo: `Reponer ${p.sku} · ${p.descripcion}`.slice(0, 80),
    descripcion: `Stock ${p.stock} / mínimo ${p.minimo}. Solicitar ${sugerido} ${p.unidad} a ${p.proveedor}.`,
    prioridad: p.stock <= 0 ? 'Alta' : 'Media', fecha: hoy(), ref: `repo-${p.id}`
  });
}

/* ---------- Recepción ---------- */
function abrirRecepcion(productoId) {
  if (!state.productos.length) return toast('Primero cargá productos en el catálogo.', 'warning');
  abrirModal({
    titulo: 'Registrar recepción de mercadería', tamano: 'lg', aceptar: 'Registrar recepción',
    cuerpo: `<div class="form-grid">
        <div class="field"><label for="re-prov">Proveedor *</label><input id="re-prov" name="proveedor" required maxlength="50" list="dl-prov-r" autocomplete="off"><datalist id="dl-prov-r">${opciones(unique(state.productos.map(p => p.proveedor)), '')}</datalist></div>
        <div class="field"><label for="re-rem">N° de remito *</label><input id="re-rem" name="remito" required maxlength="30" placeholder="R-0001-00000000"></div>
      </div>
      ${bloqueItems('recepcion', 'Productos recibidos')}
      <div class="field"><label for="re-obs">Observaciones</label><textarea id="re-obs" name="obs" maxlength="200" placeholder="Estado de la carga, faltantes, etc."></textarea></div>
      <label class="check"><input type="checkbox" name="almacenar"> Almacenar inmediatamente en la ubicación asignada a cada producto</label>`,
    alAbrir(form) {
      montarItems(form, 'recepcion');
      if (productoId) {
        const p = productoPorId(productoId);
        const sel = campo(form, 'producto');
        sel.value = String(productoId);
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        if (p) campo(form, 'proveedor').value = p.proveedor;
      }
    },
    alEnviar(form) {
      const items = leerItems(form);
      if (!validarItemsUnicos(items)) return false;
      const almacenar = campo(form, 'almacenar').checked;
      const id = nuevoId('recepcion');
      const codigo = `REC-${pad(id, 4)}`;
      const rec = {
        id, codigo, fecha: new Date().toISOString(), proveedor: valor(form, 'proveedor'), remito: valor(form, 'remito'),
        observaciones: valor(form, 'obs'), responsable: state.usuario, estado: 'Recibida',
        items: items.map(it => ({ productoId: it.producto.id, sku: it.producto.sku, descripcion: it.producto.descripcion, cantidad: it.cantidad, almacenado: 0 }))
      };
      state.recepciones.push(rec);
      items.forEach(it => registrarMovimiento('Recepción', it.producto, it.cantidad, 0, codigo, 'Ingreso a zona de recepción'));
      if (almacenar) rec.items.forEach(i => almacenarLinea(rec, i, i.cantidad));
      actualizarEstadoRecepcion(rec);
      confirmarCambios(almacenar ? `${codigo} recibida y almacenada.` : `${codigo} registrada: ${plural(items.length, 'línea', 'líneas')} en muelle.`);
    }
  });
}
function almacenarLinea(rec, item, cantidad) {
  const p = productoPorId(item.productoId);
  if (!p) throw new Error(`El producto ${item.sku} ya no existe.`);
  if (cantidad < 1 || cantidad > item.cantidad - item.almacenado) throw new Error('Cantidad a almacenar inválida.');
  aplicarStock(p, cantidad);
  item.almacenado += cantidad;
  registrarMovimiento('Almacenamiento', p, cantidad, 1, rec.codigo, `Ubicado en ${p.ubicacion}`);
}
function actualizarEstadoRecepcion(rec) { rec.estado = rec.items.every(i => i.almacenado >= i.cantidad) ? 'Almacenada' : 'Recibida'; }
function abrirAlmacenar(recId, idx) {
  const rec = recepcionPorId(recId);
  const item = rec?.items[Number(idx)];
  if (!item) return;
  const p = productoPorId(item.productoId);
  const pend = item.cantidad - item.almacenado;
  abrirModal({
    titulo: `Almacenar ${item.sku}`, aceptar: 'Confirmar almacenamiento', tamano: 'sm',
    cuerpo: `<p>${esc(item.descripcion)}</p>
      <div class="info-box"><div><span>Recepción</span><strong>${rec.codigo}</strong></div><div><span>Pendiente</span><strong>${num(pend)}</strong></div></div>
      <div class="info-box"><div><span>Destino</span><strong>${p ? fmtUbic(p.ubicacion) : '—'}</strong></div></div>
      <div class="field"><label for="al-cant">Cantidad a almacenar *</label><input id="al-cant" type="number" name="cantidad" min="1" max="${pend}" step="1" required value="${pend}"><small class="hint">Podés almacenar en forma parcial.</small></div>`,
    alEnviar(form) {
      almacenarLinea(rec, item, Number(valor(form, 'cantidad')));
      actualizarEstadoRecepcion(rec);
      confirmarCambios(`${item.sku}: ${valor(form, 'cantidad')} u. almacenadas en ${p.ubicacion}.`);
    }
  });
}
async function almacenarTodo(recId) {
  const rec = recepcionPorId(recId);
  if (!rec) return;
  const pend = rec.items.filter(i => i.cantidad > i.almacenado);
  const ok = await confirmar({ titulo: 'Almacenar recepción completa', mensaje: `Se ubicarán <strong>${num(sum(pend, i => i.cantidad - i.almacenado))} unidades</strong> de ${rec.codigo} en las posiciones asignadas a cada producto.`, aceptar: 'Almacenar todo' });
  if (!ok) return;
  try {
    pend.forEach(i => almacenarLinea(rec, i, i.cantidad - i.almacenado));
  } catch (err) {
    toast(err.message, 'error');
  }
  actualizarEstadoRecepcion(rec);
  confirmarCambios(`${rec.codigo} almacenada completamente.`);
}
function verRecepcion(id) {
  const r = recepcionPorId(id);
  if (!r) return;
  abrirModal({
    titulo: `Recepción ${r.codigo}`, tamano: 'lg', sinAceptar: true, cancelar: 'Cerrar',
    cuerpo: `<div class="detail-grid"><div><span>Proveedor</span><strong>${esc(r.proveedor)}</strong></div><div><span>Remito</span><strong class="mono">${esc(r.remito)}</strong></div><div><span>Fecha</span><strong>${fmtDateTime(r.fecha)}</strong></div><div><span>Responsable</span><strong>${esc(r.responsable)}</strong></div><div><span>Estado</span>${badge(r.estado === 'Recibida' ? 'En muelle' : 'Almacenada', r.estado === 'Recibida' ? 'warning' : 'success')}</div></div>
      ${r.observaciones ? `<p class="muted">${esc(r.observaciones)}</p>` : ''}
      <div class="box-bordered table-wrap"><table class="mini-table"><thead><tr><th>SKU</th><th>Descripción</th><th class="num">Recibido</th><th class="num">Almacenado</th></tr></thead>
      <tbody>${r.items.map(i => `<tr><td class="mono">${esc(i.sku)}</td><td>${esc(i.descripcion)}</td><td class="num">${num(i.cantidad)}</td><td class="num">${num(i.almacenado)}</td></tr>`).join('')}</tbody></table></div>`
  });
}

/* ---------- Pedidos ---------- */
function abrirPedido() {
  if (!state.productos.some(p => disponible(p) > 0)) return toast('No hay productos con stock disponible para pedidos.', 'warning');
  abrirModal({
    titulo: 'Nuevo pedido de cliente', tamano: 'lg', aceptar: 'Crear pedido',
    cuerpo: `<div class="form-grid">
        <div class="field span-2"><label for="pe-cli">Cliente *</label><input id="pe-cli" name="cliente" required maxlength="60" list="dl-cli" autocomplete="off"><datalist id="dl-cli">${opciones(unique(state.pedidos.map(p => p.cliente)), '')}</datalist></div>
        <div class="field"><label for="pe-ent">Fecha de entrega *</label><input id="pe-ent" type="date" name="entrega" required min="${hoy()}" value="${dayOffset(1)}"></div>
        <div class="field"><label for="pe-prio">Prioridad *</label><select id="pe-prio" name="prioridad" required>${opciones(PRIORIDADES, 'Media')}</select></div>
      </div>
      ${bloqueItems('pedido', 'Productos solicitados')}
      <div class="field"><label for="pe-obs">Observaciones</label><textarea id="pe-obs" name="obs" maxlength="200"></textarea></div>
      <p class="hint">Al crear el pedido, las cantidades quedan reservadas y dejan de estar disponibles para otros pedidos.</p>`,
    alAbrir(form) { montarItems(form, 'pedido'); },
    alEnviar(form) {
      if (valor(form, 'entrega') < hoy()) { errorCampo(campo(form, 'entrega'), 'La fecha de entrega no puede ser anterior a hoy.'); return false; }
      const items = leerItems(form);
      if (!validarItemsUnicos(items)) return false;
      for (const it of items) {
        const disp = disponible(it.producto);
        if (it.cantidad > disp) { errorCampo(campo(it.row, 'cantidad'), `Solo hay ${num(disp)} ${it.producto.unidad} disponibles de ${it.producto.sku}.`); return false; }
      }
      const id = nuevoId('pedido');
      const codigo = `PED-${pad(id, 4)}`;
      const ahora = new Date().toISOString();
      state.pedidos.push({
        id, codigo, cliente: valor(form, 'cliente'), fecha: ahora, entrega: valor(form, 'entrega'), prioridad: valor(form, 'prioridad'),
        estado: 'Pendiente', observaciones: valor(form, 'obs'),
        items: items.map(it => ({ productoId: it.producto.id, sku: it.producto.sku, descripcion: it.producto.descripcion, cantidad: it.cantidad, devuelto: 0 })),
        historial: [{ estado: 'Pendiente', fecha: ahora, usuario: state.usuario }], embalaje: null, despacho: null
      });
      items.forEach(it => registrarMovimiento('Reserva', it.producto, it.cantidad, 0, codigo, 'Stock comprometido para el pedido'));
      confirmarCambios(`Pedido ${codigo} creado y stock reservado.`);
    }
  });
}
function cambiarEstadoPedido(p, estado) {
  p.estado = estado;
  p.historial.push({ estado, fecha: new Date().toISOString(), usuario: state.usuario });
}
function abrirPicking(id) {
  const p = pedidoPorId(id);
  if (!p || p.estado !== 'Pendiente') return;
  const lineas = p.items.map(i => ({ i, prod: productoPorId(i.productoId) })).sort((a, b) => (a.prod?.ubicacion || '').localeCompare(b.prod?.ubicacion || ''));
  abrirModal({
    titulo: `Picking ${p.codigo} · ${p.cliente}`, tamano: 'lg', aceptar: 'Confirmar preparación',
    cuerpo: `<p class="muted">Recorrido sugerido ordenado por ubicación. Marcá cada línea a medida que la retirás de la estantería.</p>
      <div class="box-bordered table-wrap"><table class="mini-table"><thead><tr><th>Ubicación</th><th>Producto</th><th class="num">Cantidad</th><th class="num">Stock</th><th>Retirado</th></tr></thead>
      <tbody>${lineas.map(({ i, prod }, n) => `<tr><td class="mono"><strong>${prod ? prod.ubicacion : '—'}</strong></td><td><span class="mono">${esc(i.sku)}</span><span class="sub">${esc(i.descripcion)}</span></td><td class="num"><strong>${num(i.cantidad)}</strong></td><td class="num">${prod ? num(prod.stock) : '—'}</td>
        <td><label class="check"><input type="checkbox" name="linea-${n}" required> OK</label></td></tr>`).join('')}</tbody></table></div>
      <button type="button" class="btn btn-ghost btn-sm" data-marcar-todo style="align-self:flex-start">${icon('check')}Marcar todas</button>`,
    alAbrir(form) { $('[data-marcar-todo]', form).addEventListener('click', () => $$('input[type=checkbox]', form).forEach(c => { c.checked = true; })); },
    alEnviar() {
      for (const { i, prod } of lineas) {
        if (!prod) throw new Error(`El producto ${i.sku} ya no existe.`);
        if (prod.stock < i.cantidad) throw new Error(`Stock insuficiente de ${i.sku} en ${prod.ubicacion}.`);
      }
      lineas.forEach(({ i, prod }) => { aplicarStock(prod, -i.cantidad); registrarMovimiento('Picking', prod, i.cantidad, -1, p.codigo, `Retirado de ${prod.ubicacion}`); });
      cambiarEstadoPedido(p, 'Preparado');
      confirmarCambios(`${p.codigo} preparado: listo para embalar.`);
    }
  });
}
function abrirPacking(id) {
  const p = pedidoPorId(id);
  if (!p || p.estado !== 'Preparado') return;
  abrirModal({
    titulo: `Packing ${p.codigo}`, aceptar: 'Confirmar embalaje',
    cuerpo: `<div class="info-box"><div><span>Cliente</span><strong>${esc(p.cliente)}</strong></div><div><span>Unidades</span><strong>${num(sum(p.items, i => i.cantidad))}</strong></div></div>
      <div class="form-grid">
        <div class="field"><label for="pk-tipo">Tipo de embalaje *</label><select id="pk-tipo" name="tipo" required>${opciones(EMBALAJES, 'Caja de cartón')}</select></div>
        <div class="field"><label for="pk-bul">Bultos *</label><input id="pk-bul" type="number" name="bultos" min="1" max="500" step="1" required value="1"></div>
        <div class="field"><label for="pk-peso">Peso total (kg) *</label><input id="pk-peso" type="number" name="peso" min="0.1" max="50000" step="0.1" required></div>
      </div>
      <label class="check"><input type="checkbox" name="verificado" required> Verifiqué el contenido contra el pedido y rotulé los bultos</label>`,
    alEnviar(form) {
      p.embalaje = { tipo: valor(form, 'tipo'), bultos: Number(valor(form, 'bultos')), peso: Number(valor(form, 'peso')) };
      p.items.forEach(i => { const prod = productoPorId(i.productoId); if (prod) registrarMovimiento('Packing', prod, i.cantidad, 0, p.codigo, `${p.embalaje.bultos} bulto(s) · ${p.embalaje.tipo}`); });
      cambiarEstadoPedido(p, 'Embalado');
      confirmarCambios(`${p.codigo} embalado en ${plural(p.embalaje.bultos, 'bulto', 'bultos')}.`);
    }
  });
}
function abrirDespacho(id) {
  const p = pedidoPorId(id);
  if (!p || p.estado !== 'Embalado') return;
  abrirModal({
    titulo: `Despacho ${p.codigo}`, aceptar: 'Confirmar despacho',
    cuerpo: `<div class="info-box"><div><span>Cliente</span><strong>${esc(p.cliente)}</strong></div><div><span>Bultos</span><strong>${p.embalaje ? p.embalaje.bultos : '—'}</strong></div><div><span>Peso</span><strong>${p.embalaje ? `${p.embalaje.peso} kg` : '—'}</strong></div></div>
      <div class="form-grid">
        <div class="field"><label for="de-tr">Transportista *</label><select id="de-tr" name="transportista" required>${opciones(TRANSPORTES, '', { placeholder: 'Seleccioná…' })}</select></div>
        <div class="field"><label for="de-guia">N° de guía / remito *</label><input id="de-guia" name="guia" required maxlength="30"></div>
        <div class="field"><label for="de-pat">Patente del vehículo</label><input id="de-pat" name="patente" maxlength="12" placeholder="Opcional"></div>
      </div>`,
    alEnviar(form) {
      p.despacho = { transportista: valor(form, 'transportista'), guia: valor(form, 'guia'), patente: valor(form, 'patente') };
      p.items.forEach(i => { const prod = productoPorId(i.productoId); if (prod) registrarMovimiento('Despacho', prod, i.cantidad, 0, p.codigo, `${p.despacho.transportista} · guía ${p.despacho.guia}`); });
      cambiarEstadoPedido(p, 'Despachado');
      confirmarCambios(`${p.codigo} despachado con ${p.despacho.transportista}.`);
    }
  });
}
async function cancelarPedido(id) {
  const p = pedidoPorId(id);
  if (!p || !['Pendiente', 'Preparado', 'Embalado'].includes(p.estado)) return;
  const devuelveStock = p.estado !== 'Pendiente';
  const ok = await confirmar({
    titulo: `Cancelar ${p.codigo}`,
    mensaje: devuelveStock
      ? `El pedido ya fue preparado. Las <strong>${num(sum(p.items, i => i.cantidad))} unidades</strong> retiradas se reingresarán a sus ubicaciones.`
      : 'Se liberará el stock reservado para este pedido.',
    aceptar: 'Cancelar pedido', peligro: true
  });
  if (!ok) return;
  p.items.forEach(i => {
    const prod = productoPorId(i.productoId);
    if (!prod) return;
    if (devuelveStock) { aplicarStock(prod, i.cantidad); registrarMovimiento('Cancelación', prod, i.cantidad, 1, p.codigo, `Reingreso a ${prod.ubicacion}`); }
    else registrarMovimiento('Cancelación', prod, i.cantidad, 0, p.codigo, 'Liberación de reserva');
  });
  cambiarEstadoPedido(p, 'Cancelado');
  confirmarCambios(`${p.codigo} cancelado.`, 'warning');
}
function verPedido(id) {
  const p = pedidoPorId(id);
  if (!p) return;
  const devs = state.devoluciones.filter(d => d.pedidoId === p.id);
  abrirModal({
    titulo: `Pedido ${p.codigo}`, tamano: 'lg', sinAceptar: true, cancelar: 'Cerrar',
    cuerpo: `<div class="detail-grid">
        <div><span>Cliente</span><strong>${esc(p.cliente)}</strong></div><div><span>Estado</span>${badge(p.estado, TONO_PEDIDO[p.estado])}</div>
        <div><span>Prioridad</span>${badge(p.prioridad, TONO_PRIORIDAD[p.prioridad])}</div><div><span>Entrega</span><strong>${fmtDate(p.entrega)}</strong></div>
        ${p.embalaje ? `<div><span>Embalaje</span><strong>${p.embalaje.bultos} × ${esc(p.embalaje.tipo)} · ${p.embalaje.peso} kg</strong></div>` : ''}
        ${p.despacho ? `<div><span>Transporte</span><strong>${esc(p.despacho.transportista)}</strong></div><div><span>Guía</span><strong class="mono">${esc(p.despacho.guia)}</strong></div>` : ''}
      </div>
      ${p.observaciones ? `<p class="muted">${esc(p.observaciones)}</p>` : ''}
      <div class="box-bordered table-wrap"><table class="mini-table"><thead><tr><th>SKU</th><th>Descripción</th><th>Ubicación</th><th class="num">Cantidad</th><th class="num">Devuelto</th></tr></thead>
      <tbody>${p.items.map(i => { const prod = productoPorId(i.productoId); return `<tr><td class="mono">${esc(i.sku)}</td><td>${esc(i.descripcion)}</td><td class="mono">${prod ? prod.ubicacion : '<span class="muted">eliminado</span>'}</td><td class="num">${num(i.cantidad)}</td><td class="num">${num(i.devuelto || 0)}</td></tr>`; }).join('')}</tbody></table></div>
      <div><div class="section-title">Trazabilidad</div><ul class="timeline">${p.historial.map(h => `<li><strong>${h.estado}</strong> · ${fmtDateTime(h.fecha)} · <span class="muted">${esc(h.usuario)}</span></li>`).join('')}</ul></div>
      ${devs.length ? `<div><div class="section-title">Devoluciones</div>${devs.map(d => `${badge(`${d.codigo} · ${d.condicion}`, d.condicion === 'Apta' ? 'success' : 'danger')} `).join('')}</div>` : ''}`
  });
}

/* ---------- Devoluciones ---------- */
function abrirDevolucion() {
  const elegibles = state.pedidos.filter(p => p.estado === 'Despachado' && p.items.some(i => i.cantidad - (i.devuelto || 0) > 0));
  if (!elegibles.length) return toast('No hay pedidos despachados con unidades pendientes de devolución.', 'warning');
  abrirModal({
    titulo: 'Registrar devolución', tamano: 'lg', aceptar: 'Registrar devolución',
    cuerpo: `<div class="field"><label for="dv-ped">Pedido despachado *</label><select id="dv-ped" name="pedido" required>${opciones(elegibles.map(p => [p.id, `${p.codigo} — ${p.cliente}`]), '', { placeholder: 'Seleccioná un pedido…' })}</select></div>
      <div data-lineas></div>
      <div class="form-grid">
        <div class="field"><label for="dv-mot">Motivo *</label><select id="dv-mot" name="motivo" required>${opciones(MOTIVOS_DEVOLUCION, '', { placeholder: 'Seleccioná un motivo' })}</select></div>
        <div class="field"><label for="dv-obs">Observaciones</label><input id="dv-obs" name="obs" maxlength="150"></div>
      </div>
      <div><span class="field-label">Condición de la mercadería *</span>
        <div class="radio-group" style="margin-top:6px">
          <label class="radio-card"><input type="radio" name="condicion" value="Apta" checked><span><strong>Apta para la venta</strong><small>Reingresa al stock en su ubicación.</small></span></label>
          <label class="radio-card"><input type="radio" name="condicion" value="No apta"><span><strong>No apta</strong><small>Se registra como descarte, no suma stock.</small></span></label>
        </div>
      </div>`,
    alAbrir(form) {
      const cont = $('[data-lineas]', form);
      campo(form, 'pedido').addEventListener('change', () => {
        const p = pedidoPorId(valor(form, 'pedido'));
        cont.innerHTML = !p ? '' : `<div class="box-bordered table-wrap"><table class="mini-table"><thead><tr><th>Producto</th><th class="num">Despachado</th><th class="num">Ya devuelto</th><th class="num">A devolver</th></tr></thead><tbody>
          ${p.items.map((i, n) => { const max = i.cantidad - (i.devuelto || 0); return `<tr><td><span class="mono">${esc(i.sku)}</span><span class="sub">${esc(i.descripcion)}</span></td><td class="num">${num(i.cantidad)}</td><td class="num">${num(i.devuelto || 0)}</td>
            <td class="num"><div class="field"><input type="number" name="dev-${n}" min="0" max="${max}" step="1" value="0" style="width:96px;margin-left:auto" ${max === 0 ? 'disabled' : ''} aria-label="Cantidad a devolver de ${esc(i.sku)}"></div></td></tr>`; }).join('')}
        </tbody></table></div>`;
      });
    },
    alEnviar(form) {
      const p = pedidoPorId(valor(form, 'pedido'));
      const lineas = p.items.map((i, n) => ({ i, n, cant: Number(campo(form, `dev-${n}`)?.value || 0) })).filter(l => l.cant > 0);
      if (!lineas.length) { errorCampo(campo(form, 'pedido'), 'Indicá al menos una cantidad a devolver.'); return false; }
      const condicion = form.querySelector('[name=condicion]:checked').value;
      if (condicion === 'Apta') {
        const faltante = lineas.find(l => !productoPorId(l.i.productoId));
        if (faltante) { errorCampo(campo(form, `dev-${faltante.n}`), 'El producto fue eliminado del catálogo: solo puede registrarse como no apto.'); return false; }
      }
      const id = nuevoId('devolucion');
      const codigo = `DEV-${pad(id, 4)}`;
      lineas.forEach(({ i, cant }) => {
        i.devuelto = (i.devuelto || 0) + cant;
        const prod = productoPorId(i.productoId);
        const ref = prod || { id: i.productoId, sku: i.sku, descripcion: i.descripcion, stock: null };
        if (condicion === 'Apta') { aplicarStock(prod, cant); registrarMovimiento('Devolución', prod, cant, 1, codigo, `Reingreso a ${prod.ubicacion} · ${p.codigo}`); }
        else registrarMovimiento('Devolución', ref, cant, 0, codigo, `No apta: enviada a descarte · ${p.codigo}`);
      });
      state.devoluciones.push({
        id, codigo, fecha: new Date().toISOString(), pedidoId: p.id, pedidoCodigo: p.codigo, cliente: p.cliente,
        items: lineas.map(({ i, cant }) => ({ productoId: i.productoId, sku: i.sku, descripcion: i.descripcion, cantidad: cant })),
        motivo: valor(form, 'motivo'), condicion, observaciones: valor(form, 'obs'), responsable: state.usuario
      });
      confirmarCambios(`${codigo} registrada${condicion === 'Apta' ? ': stock reingresado' : ' como descarte'}.`);
    }
  });
}

/* ---------- Tareas ---------- */
function abrirFormTarea(id, preset = {}) {
  const t = id ? tareaPorId(id) : null;
  const d = t || { titulo: '', descripcion: '', responsable: state.usuario, prioridad: 'Media', fecha: hoy(), estado: 'Pendiente', ...preset };
  abrirModal({
    titulo: t ? 'Editar tarea' : 'Nueva tarea', aceptar: t ? 'Guardar cambios' : 'Crear tarea',
    cuerpo: `<div class="form-grid">
      <div class="field span-2"><label for="ta-tit">Título *</label><input id="ta-tit" name="titulo" required maxlength="80" value="${esc(d.titulo)}"></div>
      <div class="field span-2"><label for="ta-desc">Descripción</label><textarea id="ta-desc" name="descripcion" maxlength="300">${esc(d.descripcion)}</textarea></div>
      <div class="field"><label for="ta-resp">Responsable *</label><select id="ta-resp" name="responsable" required>${opcionesPersonal(d.responsable)}</select></div>
      <div class="field"><label for="ta-prio">Prioridad *</label><select id="ta-prio" name="prioridad" required>${opciones(PRIORIDADES, d.prioridad)}</select></div>
      <div class="field"><label for="ta-fecha">Fecha *</label><input id="ta-fecha" type="date" name="fecha" required value="${d.fecha}"></div>
      <div class="field"><label for="ta-est">Estado *</label><select id="ta-est" name="estado" required>${opciones(ESTADOS_TAREA, d.estado)}</select></div>
    </div>`,
    alEnviar(form) {
      const datos = { titulo: valor(form, 'titulo'), descripcion: valor(form, 'descripcion'), responsable: valor(form, 'responsable'), prioridad: valor(form, 'prioridad'), fecha: valor(form, 'fecha'), estado: valor(form, 'estado') };
      if (t) { Object.assign(t, datos); confirmarCambios('Tarea actualizada.'); }
      else { state.tareas.push({ id: nuevoId('tarea'), ...datos, ref: preset.ref || null, creado: new Date().toISOString() }); confirmarCambios(`Tarea asignada a ${datos.responsable}.`); }
    }
  });
}
function moverTarea(id, dir) {
  const t = tareaPorId(id);
  if (!t) return;
  const idx = ESTADOS_TAREA.indexOf(t.estado) + Number(dir);
  if (idx < 0 || idx >= ESTADOS_TAREA.length) return;
  t.estado = ESTADOS_TAREA[idx];
  confirmarCambios(`"${t.titulo}" → ${t.estado}.`, t.estado === 'Completada' ? 'success' : 'info');
}
async function eliminarTarea(id) {
  const t = tareaPorId(id);
  if (!t) return;
  if (!(await confirmar({ titulo: 'Eliminar tarea', mensaje: `¿Eliminar la tarea <strong>${esc(t.titulo)}</strong>?`, aceptar: 'Eliminar', peligro: true }))) return;
  state.tareas = state.tareas.filter(x => x.id !== t.id);
  confirmarCambios('Tarea eliminada.');
}

/* ---------- Configuración ---------- */
async function eliminarPersonal(id) {
  const p = state.personal.find(x => x.id === Number(id));
  if (!p || p.nombre === state.usuario) return;
  const abiertas = state.tareas.filter(t => t.responsable === p.nombre && t.estado !== 'Completada').length;
  const ok = await confirmar({ titulo: 'Eliminar persona', mensaje: `¿Quitar a <strong>${esc(p.nombre)}</strong> del personal?${abiertas ? `<br><br>Tiene ${plural(abiertas, 'tarea abierta', 'tareas abiertas')}: conservarán su nombre como responsable hasta que las reasignes.` : ''}`, aceptar: 'Eliminar', peligro: true });
  if (!ok) return;
  state.personal = state.personal.filter(x => x.id !== p.id);
  confirmarCambios(`${p.nombre} eliminado del personal.`);
}
async function resetDemo() {
  const ok = await confirmar({ titulo: 'Restablecer demostración', mensaje: 'Se borrarán <strong>todos</strong> los cambios realizados y se cargarán nuevamente los datos ficticios iniciales.', aceptar: 'Restablecer', peligro: true });
  if (!ok) return;
  state = crearDatosDemo();
  Object.assign(ui, clone(FILTROS_INICIALES));
  confirmarCambios('Demostración restablecida con los datos iniciales.', 'info');
}
function importarJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    let data;
    try { data = JSON.parse(reader.result); } catch (err) { toast('El archivo no es un JSON válido.', 'error'); return; }
    if (!esEstadoValido(data)) { toast('El archivo no corresponde a una copia de StockFlow WMS compatible.', 'error'); return; }
    const ok = await confirmar({ titulo: 'Importar copia', mensaje: `Se reemplazarán los datos actuales por los del archivo <strong>${esc(file.name)}</strong> (${plural(data.productos.length, 'producto', 'productos')}, ${plural(data.movimientos.length, 'movimiento', 'movimientos')}).`, aceptar: 'Importar' });
    if (!ok) return;
    state = data;
    confirmarCambios('Copia importada correctamente.');
  };
  reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
  reader.readAsText(file);
}

/* ---------- Mapa de acciones (delegación de eventos) ---------- */
const ACCIONES = {
  'toggle-sidebar': () => document.body.classList.toggle('sidebar-open'),
  'toggle-notif': () => {
    const panel = $('#notifPanel');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) renderNotificaciones();
  },
  ir: d => {
    if (d.tab) ui.inventario.tab = d.tab;
    $('#notifPanel').hidden = true;
    irA(d.ruta);
  },
  ordenar: d => {
    const f = ui[d.scope];
    if (f.sort === d.key) f.dir *= -1; else { f.sort = d.key; f.dir = 1; }
    refrescarResultados();
  },
  'limpiar-filtros': d => { ui[d.scope] = clone(FILTROS_INICIALES[d.scope]); render(); },
  tab: d => { ui[d.scope].tab = d.tab; render(); },

  'nuevo-producto': d => abrirFormProducto(null, d.ubicacion || ''),
  'editar-producto': d => abrirFormProducto(d.id),
  'ver-producto': d => verProducto(d.id),
  'eliminar-producto': d => eliminarProducto(d.id),
  'exportar-productos': () => {
    const lista = filtrarProductos();
    const res = reservasPorProducto();
    descargar(`productos_${hoy()}.csv`, aCSV([['SKU', 'Descripción', 'Categoría', 'Proveedor', 'Unidad', 'Ubicación', 'Stock', 'Reservado', 'Disponible', 'Mínimo', 'Estado'],
      ...lista.map(p => [p.sku, p.descripcion, p.categoria, p.proveedor, p.unidad, p.ubicacion, p.stock, res.get(p.id) || 0, p.stock - (res.get(p.id) || 0), p.minimo, { ok: 'Normal', bajo: 'Bajo mínimo', sin: 'Sin stock' }[estadoStock(p)]])]), 'text/csv;charset=utf-8');
    toast(`${plural(lista.length, 'producto exportado', 'productos exportados')}.`);
  },

  ajustar: d => abrirAjuste(d.id || ''),
  reubicar: d => abrirReubicacion(d.id || ''),
  'tarea-reposicion': d => tareaReposicion(d.id, d.sugerido),

  'nueva-recepcion': d => abrirRecepcion(d.id),
  'almacenar-item': d => abrirAlmacenar(d.id, d.idx),
  'almacenar-todo': d => almacenarTodo(d.id),
  'ver-recepcion': d => verRecepcion(d.id),

  'nuevo-pedido': () => abrirPedido(),
  'ver-pedido': d => verPedido(d.id),
  picking: d => abrirPicking(d.id),
  packing: d => abrirPacking(d.id),
  despachar: d => abrirDespacho(d.id),
  'cancelar-pedido': d => cancelarPedido(d.id),

  'nueva-devolucion': () => abrirDevolucion(),

  'nueva-tarea': () => abrirFormTarea(null),
  'editar-tarea': d => abrirFormTarea(d.id),
  'eliminar-tarea': d => eliminarTarea(d.id),
  'tarea-mover': d => moverTarea(d.id, d.dir),

  'mas-historial': () => { ui.historial.limite += 100; refrescarResultados(); },
  'exportar-historial': () => {
    const lista = filtrarHistorial();
    descargar(`movimientos_${hoy()}.csv`, aCSV([['ID', 'Fecha', 'Tipo', 'SKU', 'Descripción', 'Cantidad', 'Efecto en stock', 'Stock resultante', 'Responsable', 'Referencia', 'Detalle'],
      ...lista.map(m => [m.id, fmtDateTime(m.fecha), m.tipo, m.sku, m.descripcion, m.cantidad, m.signo > 0 ? 'Entrada' : m.signo < 0 ? 'Salida' : 'Sin efecto', m.stockResultante ?? '', m.responsable, m.referencia, m.detalle])]), 'text/csv;charset=utf-8');
    toast(`${plural(lista.length, 'movimiento exportado', 'movimientos exportados')}.`);
  },

  'eliminar-personal': d => eliminarPersonal(d.id),
  'agregar-pasillo': () => {
    const L = state.layout;
    const sig = String.fromCharCode(L.pasillos[L.pasillos.length - 1].charCodeAt(0) + 1);
    L.pasillos.push(sig);
    confirmarCambios(`Pasillo ${sig} agregado (${L.estanterias * L.niveles} posiciones nuevas).`);
  },
  'quitar-pasillo': async () => {
    const L = state.layout;
    const ult = L.pasillos[L.pasillos.length - 1];
    if (L.pasillos.length <= 1 || state.productos.some(p => p.ubicacion.startsWith(ult + '-'))) return toast(`El pasillo ${ult} tiene productos ubicados.`, 'error');
    if (!(await confirmar({ titulo: `Quitar pasillo ${ult}`, mensaje: `Se eliminarán las ${L.estanterias * L.niveles} posiciones vacías del pasillo ${ult}.`, aceptar: 'Quitar', peligro: true }))) return;
    L.pasillos.pop();
    confirmarCambios(`Pasillo ${ult} eliminado.`);
  },
  'exportar-json': () => { descargar(`stockflow_backup_${hoy()}.json`, JSON.stringify(state, null, 2), 'application/json'); toast('Copia de seguridad descargada.'); },
  'reset-demo': () => resetDemo()
};

const FORMULARIOS = {
  interno(form) {
    if (!validarFormulario(form)) return;
    procesarReubicacion(form);
  },
  personal(form) {
    if (!validarFormulario(form)) return;
    const nombre = valor(form, 'nombre');
    if (state.personal.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())) { errorCampo(campo(form, 'nombre'), 'Ya existe una persona con ese nombre.'); return; }
    state.personal.push({ id: nuevoId('personal'), nombre, rol: valor(form, 'rol') });
    confirmarCambios(`${nombre} agregado al personal.`);
  }
};

/* =========================================================
   8. Inicialización
   ========================================================= */
function init() {
  $$('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon); });

  document.addEventListener('click', e => {
    const panel = $('#notifPanel');
    if (!panel.hidden && !e.target.closest('.notif')) panel.hidden = true;
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = ACCIONES[el.dataset.action];
    if (!fn) return;
    e.preventDefault();
    fn(el.dataset, el);
  });

  document.addEventListener('input', e => {
    const el = e.target.closest('[data-filter]');
    if (!el) return;
    const [scope, key] = el.dataset.filter.split('.');
    ui[scope][key] = el.value;
    if (scope === 'historial') ui.historial.limite = 100;
    refrescarResultados();
  });

  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    FORMULARIOS[form.dataset.form]?.(form);
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'importFile') { importarJSON(e.target.files[0]); e.target.value = ''; }
    if (e.target.id === 'userSelect') {
      state.usuario = e.target.value;
      guardar();
      render();
      toast(`Operando como ${state.usuario}.`, 'info');
    }
  });

  $('#globalSearch').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#globalSearchInput').value.trim();
    ui.productos = { ...clone(FILTROS_INICIALES.productos), q };
    $('#globalSearchInput').value = '';
    $('#globalSearchInput').blur();
    if (ui.route === 'productos') render(); else irA('productos');
  });

  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && !['input', 'textarea', 'select'].includes(tag) && !$('#modalRoot').children.length) {
      e.preventDefault();
      const input = $('#globalSearchInput');
      if (input.offsetParent) input.focus(); else irA('productos');
    }
  });

  window.addEventListener('hashchange', () => {
    document.body.classList.remove('sidebar-open');
    render();
    window.scrollTo(0, 0);
  });

  // Sincroniza cambios hechos en otra pestaña del mismo navegador
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const data = JSON.parse(e.newValue);
      if (esEstadoValido(data)) { state = data; render(); toast('Datos actualizados desde otra pestaña.', 'info'); }
    } catch (err) { /* ignorar */ }
  });

  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  render();
}

init();
