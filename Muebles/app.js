'use strict';

/* ==========================================================================
   Atelier Nogal · Sistema de gestión comercial para muebles a medida
   Prototipo 100% cliente: HTML5 + CSS3 + JavaScript vanilla.
   Persistencia en localStorage (clave STORE_KEY).
   ========================================================================== */

/* ---------- 1. Utilidades ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const currencyFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const money = n => currencyFmt.format(Math.round(Number(n) || 0));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round100 = n => Math.round(n / 100) * 100;
const clamp = (v, mn, mx) => Math.min(mx, Math.max(mn, v));
const sum = (arr, f = x => x) => arr.reduce((acc, x) => acc + (Number(f(x)) || 0), 0);
const uid = p => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
const todayISO = () => toISO(new Date());
function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
function fmtDate(iso, opts) {
  if (!iso) return '—';
  return parseISO(iso).toLocaleDateString('es-AR', opts || { day: '2-digit', month: 'short', year: 'numeric' });
}
const fmtShort = iso => fmtDate(iso, { day: '2-digit', month: 'short' });
const monthKey = iso => iso.slice(0, 7);
function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
}
function lastMonths(n) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(toISO(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
  return out;
}
function compactMoney(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e3) return '$' + Math.round(n / 1e3) + ' k';
  return '$' + Math.round(n);
}
function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- 2. Parámetros del negocio ---------- */

// factor: multiplicador de costo del material (ordenados de menor a mayor)
const MATERIALS = [
  { id: 'melamina', name: 'Melamina 18 mm', factor: 0.72 },
  { id: 'mdf', name: 'MDF laqueable', factor: 0.85 },
  { id: 'pino', name: 'Pino macizo', factor: 0.9 },
  { id: 'guatambu', name: 'Guatambú macizo', factor: 1.05 },
  { id: 'paraiso', name: 'Paraíso macizo', factor: 1.15 },
  { id: 'petiribi', name: 'Petiribí macizo', factor: 1.35 },
  { id: 'roble', name: 'Roble americano', factor: 1.5 },
];
const FINISHES = [
  { id: 'natural', name: 'Aceite natural', pct: 0 },
  { id: 'cera', name: 'Encerado artesanal', pct: 0.06 },
  { id: 'poliuretano', name: 'Lustre poliuretánico', pct: 0.1 },
  { id: 'laca-mate', name: 'Laca mate', pct: 0.14 },
  { id: 'laca-brillo', name: 'Laca brillante', pct: 0.2 },
];
const COLORS = [
  { id: 'natural', name: 'Natural', hex: '#d6b48a', pct: 0 },
  { id: 'miel', name: 'Miel', hex: '#c4904f', pct: 0 },
  { id: 'nogal', name: 'Nogal', hex: '#7a5233', pct: 0.03 },
  { id: 'wengue', name: 'Wengué', hex: '#4a362a', pct: 0.04 },
  { id: 'blanco', name: 'Blanco tiza', hex: '#f1ece4', pct: 0.03 },
  { id: 'grafito', name: 'Gris grafito', hex: '#55524e', pct: 0.04 },
  { id: 'salvia', name: 'Verde salvia', hex: '#8fa58a', pct: 0.07 },
  { id: 'petroleo', name: 'Azul petróleo', hex: '#2f5563', pct: 0.07 },
  { id: 'terracota', name: 'Terracota', hex: '#b86a4b', pct: 0.07 },
];
const ACCESSORIES = [
  { id: 'correderas', name: 'Correderas telescópicas con cierre suave', price: 42000 },
  { id: 'bisagras', name: 'Bisagras con cierre suave', price: 26000 },
  { id: 'led', name: 'Iluminación LED integrada', price: 78000 },
  { id: 'tiradores-cuero', name: 'Tiradores de cuero', price: 21000 },
  { id: 'tiradores-bronce', name: 'Tiradores de bronce', price: 36000 },
  { id: 'patas-hierro', name: 'Patas de hierro forjado', price: 95000 },
  { id: 'vidrio', name: 'Puertas con vidrio templado', price: 88000 },
  { id: 'cerradura', name: 'Cerradura de seguridad', price: 18000 },
  { id: 'ruedas', name: 'Ruedas con freno', price: 32000 },
  { id: 'pasacables', name: 'Pasacables y organizador', price: 14000 },
];
const CATEGORIES = ['Comedor', 'Living', 'Dormitorio', 'Cocina', 'Oficina', 'Placares'];
const CATEGORY_ART = { Comedor: 'table', Living: 'sideboard', Dormitorio: 'bed', Cocina: 'kitchen', Oficina: 'desk', Placares: 'wardrobe' };
const DIM_LIMITS = { w: [20, 400], h: [10, 280], d: [20, 220] };
const DIM_LABEL = { w: 'Ancho', h: 'Alto', d: 'Profundidad' };

const STAGES = [
  { id: 'pendiente', label: 'Pendiente', cls: 'neutral', color: '#a89b8e' },
  { id: 'diseno', label: 'Diseño', cls: 'info', color: '#5f7f99' },
  { id: 'fabricacion', label: 'Fabricación', cls: 'wood', color: '#9c6b43' },
  { id: 'terminacion', label: 'Terminación', cls: 'purple', color: '#8a6d9e' },
  { id: 'listo', label: 'Listo para entregar', cls: 'success', color: '#5d8a66' },
  { id: 'entregado', label: 'Entregado', cls: 'dark', color: '#3d4a42' },
];
const QUOTE_STATUS = {
  borrador: { label: 'Borrador', cls: 'neutral' },
  enviado: { label: 'Enviado', cls: 'info' },
  aprobado: { label: 'Aprobado', cls: 'success' },
  rechazado: { label: 'Rechazado', cls: 'danger' },
  convertido: { label: 'Convertido en pedido', cls: 'wood' },
};
const DELIVERY_STATUS = {
  programada: { label: 'Programada', cls: 'wood' },
  en_camino: { label: 'En camino', cls: 'info' },
  reprogramada: { label: 'Reprogramada', cls: 'warning' },
  entregada: { label: 'Entregada', cls: 'success' },
};
const PAY_METHODS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia bancaria' },
  { id: 'debito', label: 'Tarjeta de débito' },
  { id: 'credito', label: 'Tarjeta de crédito' },
  { id: 'billetera', label: 'Billetera virtual / QR' },
  { id: 'cheque', label: 'Cheque' },
];
const INSTALLMENTS = [{ n: 1, pct: 0 }, { n: 3, pct: 0.09 }, { n: 6, pct: 0.18 }, { n: 12, pct: 0.34 }];
const STAFF = ['Martín Gómez · Equipo 1', 'Ezequiel Ramos · Equipo 2', 'Fletes del Sur · Hernán Díaz', 'Retiro en showroom'];
const SLOTS = ['09:00 – 13:00', '13:00 – 17:00', '17:00 – 20:00'];
const PALETTE = ['#6f4a2e', '#b8925a', '#5d7a64', '#44657f', '#8a6d9e', '#b86a4b', '#a89b8e'];

const MAT = id => MATERIALS.find(m => m.id === id);
const FIN = id => FINISHES.find(f => f.id === id);
const COL = id => COLORS.find(c => c.id === id);
const ACC = id => ACCESSORIES.find(a => a.id === id);
const stageIndex = id => STAGES.findIndex(s => s.id === id);
const stageOf = id => STAGES[stageIndex(id)] || STAGES[0];
const methodLabel = id => (PAY_METHODS.find(m => m.id === id) || {}).label || id;
const sortMaterials = ids => MATERIALS.map(m => m.id).filter(id => ids.includes(id));
const sortColors = ids => COLORS.map(c => c.id).filter(id => ids.includes(id));

/* ---------- 3. Ilustraciones de productos (SVG generado) ---------- */

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('');
}

const artCache = new Map();
function furnitureArt(kind, hex) {
  const key = kind + hex;
  if (artCache.has(key)) return artCache.get(key);
  const c = hex, d = shade(hex, -0.25), dd = shade(hex, -0.45), l = shade(hex, 0.2);
  const plant = (x, y) => `<rect x="${x - 10}" y="${y - 26}" width="20" height="26" rx="7" fill="#ebe3d6"/><path d="M${x} ${y - 26}c-4-16-14-22-22-26M${x} ${y - 26}c4-18 14-24 22-28M${x} ${y - 26}c0-14 2-24 0-34" stroke="#6f8f6a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const books = (x, y, n) => Array.from({ length: n }, (_, i) => `<rect x="${x + i * 9}" y="${y - (24 + (i % 3) * 5)}" width="7" height="${24 + (i % 3) * 5}" fill="${['#b86a4b', '#44657f', '#c9a46a', '#5d7a64', '#8a6d9e'][i % 5]}"/>`).join('');
  const shapes = {
    table: `<rect x="60" y="122" width="280" height="14" rx="3" fill="${c}"/><rect x="60" y="134" width="280" height="5" fill="${d}"/><path d="M84 139l8 93h10l-2-93zM316 139l-8 93h-10l2-93z" fill="${d}"/>${plant(200, 122)}`,
    coffee: `<rect x="90" y="176" width="220" height="14" rx="5" fill="${c}"/><rect x="96" y="188" width="208" height="4" fill="${d}"/><rect x="104" y="192" width="10" height="40" fill="${dd}"/><rect x="286" y="192" width="10" height="40" fill="${dd}"/><rect x="110" y="212" width="180" height="6" fill="${d}"/><rect x="150" y="166" width="54" height="10" rx="1" fill="#b86a4b"/><rect x="155" y="158" width="44" height="8" rx="1" fill="#44657f"/>`,
    rack: `<rect x="112" y="58" width="176" height="100" rx="4" fill="#2b2522"/><rect x="118" y="64" width="164" height="88" fill="#3e4851"/><rect x="40" y="176" width="320" height="46" rx="3" fill="${c}"/><rect x="40" y="218" width="320" height="4" fill="${d}"/><path d="M146 180v38M253 180v38" stroke="${d}" stroke-width="2"/><rect x="88" y="196" width="22" height="3" rx="1" fill="${dd}"/><rect x="189" y="196" width="22" height="3" rx="1" fill="${dd}"/><rect x="290" y="196" width="22" height="3" rx="1" fill="${dd}"/>`,
    wardrobe: `<rect x="96" y="30" width="208" height="8" fill="${d}"/><rect x="100" y="38" width="200" height="192" fill="${c}"/><path d="M166.6 40v188M233.3 40v188" stroke="${d}" stroke-width="2.5"/><rect x="158" y="118" width="3" height="34" rx="1" fill="${dd}"/><rect x="172" y="118" width="3" height="34" rx="1" fill="${dd}"/><rect x="239" y="118" width="3" height="34" rx="1" fill="${dd}"/><rect x="100" y="224" width="200" height="6" fill="${d}"/>`,
    bed: `<rect x="70" y="96" width="260" height="100" rx="12" fill="${c}"/><path d="M118 104v84M166 104v84M214 104v84M262 104v84" stroke="${d}" stroke-width="2" opacity=".6"/><rect x="84" y="168" width="232" height="30" rx="8" fill="#f7f2ea"/><rect x="104" y="152" width="78" height="24" rx="10" fill="#fffaf3"/><rect x="218" y="152" width="78" height="24" rx="10" fill="#fffaf3"/><rect x="84" y="182" width="232" height="18" rx="6" fill="${l}"/><rect x="76" y="198" width="248" height="28" rx="4" fill="${d}"/>`,
    desk: `<rect x="128" y="84" width="92" height="56" rx="3" fill="#2b2522"/><rect x="133" y="89" width="82" height="44" fill="#4b5a66"/><rect x="168" y="140" width="12" height="2" fill="#2b2522"/><rect x="70" y="140" width="260" height="12" rx="2" fill="${c}"/><rect x="246" y="152" width="84" height="78" fill="${d}"/><path d="M246 178h84M246 204h84" stroke="${dd}" stroke-width="2"/><rect x="280" y="163" width="16" height="3" rx="1" fill="${l}"/><rect x="280" y="189" width="16" height="3" rx="1" fill="${l}"/><rect x="280" y="215" width="16" height="3" rx="1" fill="${l}"/><rect x="76" y="152" width="10" height="78" fill="${d}"/>`,
    shelf: `<rect x="118" y="34" width="10" height="198" fill="${d}"/><rect x="272" y="34" width="10" height="198" fill="${d}"/>${[34, 82, 130, 178, 224].map(y => `<rect x="118" y="${y}" width="164" height="8" fill="${c}"/>`).join('')}${books(134, 82, 7)}${books(200, 130, 6)}${books(140, 178, 5)}<rect x="230" y="60" width="22" height="22" rx="11" fill="#d8c6ad"/>${plant(240, 224)}`,
    walkin: `<rect x="66" y="34" width="10" height="198" fill="${d}"/><rect x="324" y="34" width="10" height="198" fill="${d}"/><rect x="196" y="34" width="8" height="198" fill="${d}"/><rect x="66" y="34" width="268" height="8" fill="${c}"/><rect x="76" y="62" width="120" height="3" fill="#8b8b8b"/>${['#b86a4b', '#44657f', '#e9e1d4', '#5d7a64', '#2b2522', '#c9a46a'].map((col, i) => `<rect x="${82 + i * 19}" y="66" width="15" height="${70 + (i % 2) * 18}" rx="3" fill="${col}"/>`).join('')}${[150, 186].map(y => `<rect x="76" y="${y}" width="120" height="6" fill="${c}"/>`).join('')}${[80, 126, 172].map(y => `<rect x="204" y="${y}" width="120" height="6" fill="${c}"/>`).join('')}<rect x="204" y="186" width="120" height="46" fill="${c}"/><path d="M204 209h120" stroke="${d}" stroke-width="2"/>${books(214, 126, 5)}`,
    sideboard: `<rect x="150" y="48" width="100" height="64" fill="#efe7dc" stroke="${d}" stroke-width="4"/><path d="M160 102l26-26 18 18 12-10 24 18" stroke="#8fa58a" stroke-width="3" fill="none"/><rect x="70" y="126" width="260" height="84" rx="3" fill="${c}"/><path d="M156.6 130v76M243.3 130v76" stroke="${d}" stroke-width="2.5"/><path d="M84 210l-6 24M316 210l6 24" stroke="${dd}" stroke-width="7" stroke-linecap="round"/>${plant(110, 126)}`,
    nightstand: `<path d="M176 126h48l-10-32h-28z" fill="#f6efe4"/><rect x="197" y="126" width="6" height="14" fill="#c9a46a"/><rect x="186" y="138" width="28" height="12" rx="3" fill="#c9a46a"/><rect x="146" y="150" width="108" height="70" rx="4" fill="${c}"/><path d="M146 182h108" stroke="${d}" stroke-width="2.5"/><rect x="190" y="164" width="20" height="4" rx="2" fill="${dd}"/><rect x="154" y="220" width="8" height="12" fill="${dd}"/><rect x="238" y="220" width="8" height="12" fill="${dd}"/>`,
    kitchen: `<rect x="50" y="40" width="300" height="64" fill="${c}"/><path d="M125 42v60M200 42v60M275 42v60" stroke="${d}" stroke-width="2"/><rect x="50" y="104" width="300" height="40" fill="#f4efe7"/><path d="M50 114h300M50 124h300M50 134h300" stroke="#e6ddcf" stroke-width="1"/><rect x="44" y="144" width="312" height="10" fill="#e3ddd3"/><rect x="50" y="154" width="300" height="76" fill="${c}"/><path d="M125 156v72M200 156v72M275 156v72M50 180h75" stroke="${d}" stroke-width="2"/><rect x="230" y="128" width="40" height="16" rx="3" fill="#bcb6ad"/>${[87, 162, 237, 312].map(x => `<rect x="${x - 10}" y="164" width="20" height="3" rx="1" fill="${dd}"/>`).join('')}`,
    bench: `<rect x="110" y="64" width="180" height="8" rx="2" fill="${d}"/>${[136, 172, 208, 244].map(x => `<circle cx="${x}" cy="80" r="4" fill="${dd}"/>`).join('')}<rect x="160" y="84" width="26" height="54" rx="6" fill="#b86a4b"/><rect x="80" y="160" width="240" height="16" rx="4" fill="${c}"/><rect x="96" y="144" width="96" height="16" rx="7" fill="#8fa58a"/><rect x="90" y="176" width="10" height="56" fill="${d}"/><rect x="300" y="176" width="10" height="56" fill="${d}"/><rect x="90" y="206" width="220" height="7" fill="${d}"/>`,
  };
  const body = shapes[kind] || shapes.shelf;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5efe6"/><stop offset="1" stop-color="#ece2d5"/></linearGradient></defs><rect width="400" height="300" fill="url(#w)"/><rect y="232" width="400" height="68" fill="#e2d5c3"/><rect y="232" width="400" height="2" fill="#d5c6b1"/><ellipse cx="200" cy="234" rx="160" ry="7" fill="#000" opacity=".07"/>${body}</svg>`;
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  artCache.set(key, uri);
  return uri;
}

// Las imágenes de los productos demo se guardan como "art:<tipo>:<color>" para no ocupar espacio.
function imgSrc(token, colorId) {
  if (!token) return furnitureArt('shelf', '#d6b48a');
  if (token.startsWith('art:')) {
    const [, kind, col] = token.split(':');
    return furnitureArt(kind, (COL(colorId) || COL(col) || COLORS[0]).hex);
  }
  return token;
}

// Vista isométrica de las medidas configuradas
function isoSVG(w, h, d, hex) {
  if (![w, h, d].every(v => Number.isFinite(v) && v > 0)) return '';
  const s = 100 / Math.max(w, h, d);
  const W = w * s, H = h * s, D = d * s, cos = 0.866, sin = 0.5;
  const P = (x, y, z) => [(x - z) * cos, (x + z) * sin - y];
  const p = [P(0, 0, 0), P(W, 0, 0), P(W, H, 0), P(0, H, 0), P(0, 0, D), P(W, 0, D), P(W, H, D), P(0, H, D)];
  const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const pad = 44;
  const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
  const vw = Math.max(...xs) - Math.min(...xs) + pad * 2, vh = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const stroke = shade(hex, -0.5);
  const poly = (idx, fill) => `<polygon points="${idx.map(i => p[i].map(n => n.toFixed(1)).join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="0.8" stroke-linejoin="round"/>`;
  const mid = (a, b) => [(p[a][0] + p[b][0]) / 2, (p[a][1] + p[b][1]) / 2];
  const t = (pt, dx, dy, txt, anchor = 'middle') => `<text x="${(pt[0] + dx).toFixed(1)}" y="${(pt[1] + dy).toFixed(1)}" text-anchor="${anchor}" font-size="9.5" font-family="Inter, sans-serif" font-weight="600" fill="#6f4a2e" stroke="none">${txt}</text>`;
  return `<svg viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" xmlns="http://www.w3.org/2000/svg">
    ${poly([3, 2, 6, 7], shade(hex, 0.22))}${poly([1, 5, 6, 2], shade(hex, -0.22))}${poly([4, 5, 6, 7], hex)}
    ${t(mid(4, 5), -6, 16, `${w} cm`)}${t(mid(5, 1), 8, 14, `${d} cm`, 'start')}${t(mid(4, 7), -8, 4, `${h} cm`, 'end')}
  </svg>`;
}

/* ---------- 4. Precios ---------- */

function dimRange(p, k) {
  const [gmin, gmax] = DIM_LIMITS[k];
  const base = p.dims[k];
  return [Math.max(gmin, Math.round(base * 0.5 / 5) * 5), Math.min(gmax, Math.round(base * 1.8 / 5) * 5)];
}
function defaultCfg(p) {
  return { w: p.dims.w, h: p.dims.h, d: p.dims.d, material: p.materials[0], finish: 'natural', color: p.colors[0], accessories: [] };
}

/**
 * Precio = base escalado por superficie (30% fijo + 70% proporcional), ajustado por material
 * relativo al material de referencia (el más económico disponible), más recargos de acabado y color
 * y el precio fijo de cada accesorio. Cada línea se redondea a $100 y el total es su suma exacta.
 */
function calcPrice(p, cfg) {
  const surf = (w, h, d) => w * h + w * d + h * d;
  const ratio = surf(cfg.w, cfg.h, cfg.d) / surf(p.dims.w, p.dims.h, p.dims.d);
  const sized = p.basePrice * (0.3 + 0.7 * ratio);
  const refMat = MAT(p.materials[0]) || MATERIALS[0];
  const mat = MAT(cfg.material) || refMat;
  const withMat = sized * (mat.factor / refMat.factor);
  const fin = FIN(cfg.finish) || FINISHES[0];
  const col = COL(cfg.color) || COLORS[0];
  const lines = [
    { label: 'Precio base (medidas estándar)', amount: round100(p.basePrice) },
    { label: 'Ajuste por medidas', amount: round100(sized - p.basePrice), sign: true },
    { label: `Material: ${mat.name}`, amount: round100(withMat - sized), sign: true },
    { label: `Acabado: ${fin.name}`, amount: round100(withMat * fin.pct), sign: true },
    { label: `Color: ${col.name}`, amount: round100(withMat * col.pct), sign: true },
    ...(cfg.accessories || []).map(ACC).filter(Boolean).map(a => ({ label: a.name, amount: a.price, sign: true })),
  ].filter((l, i) => i === 0 || l.amount !== 0);
  return { total: Math.max(0, sum(lines, l => l.amount)), lines };
}

function cfgSummary(cfg) {
  const acc = (cfg.accessories || []).map(ACC).filter(Boolean).map(a => a.name);
  return [`${cfg.w} × ${cfg.h} × ${cfg.d} cm`, MAT(cfg.material)?.name, FIN(cfg.finish)?.name, COL(cfg.color)?.name, acc.length ? acc.join(', ') : null].filter(Boolean).join(' · ');
}
function cfgShort(cfg) {
  return `${cfg.w}×${cfg.h}×${cfg.d} · ${MAT(cfg.material)?.name || ''} · ${COL(cfg.color)?.name || ''}`;
}
function cloneItem(it) {
  return { id: uid('it'), productId: it.productId, name: it.name, cfg: { ...it.cfg, accessories: [...(it.cfg.accessories || [])] }, unitPrice: it.unitPrice, qty: it.qty };
}
function docTotals(doc) {
  const subtotal = sum(doc.items, i => i.unitPrice * i.qty);
  const discount = Math.round(subtotal * (Number(doc.discountPct) || 0) / 100);
  return { subtotal, discount, total: subtotal - discount };
}
function makePayment({ amount, method, installments = 1, date, note }, defaultNote = '') {
  const inst = INSTALLMENTS.find(i => i.n === Number(installments)) || INSTALLMENTS[0];
  const pct = method === 'credito' ? inst.pct : 0;
  return { id: uid('pay'), date, amount: Math.round(amount), method, installments: method === 'credito' ? inst.n : 1, surchargePct: pct, charged: Math.round(amount * (1 + pct)), note: note || defaultNote };
}

/* ---------- 5. Datos de demostración ---------- */

const PRODUCT_SEED = [
  { code: 'MC-001', name: 'Mesa de comedor Nórdica', category: 'Comedor', art: 'table', dims: { w: 180, h: 76, d: 90 }, basePrice: 1180000, materials: ['guatambu', 'paraiso', 'petiribi', 'roble'], colors: ['natural', 'miel', 'nogal', 'wengue'], featured: true, description: 'Mesa de comedor de líneas nórdicas con tapa maciza de 3 cm y patas cónicas. Ideal para 6 a 8 comensales.' },
  { code: 'RT-002', name: 'Rack de TV flotante Línea', category: 'Living', art: 'rack', dims: { w: 200, h: 45, d: 40 }, basePrice: 640000, materials: ['melamina', 'mdf', 'paraiso', 'roble'], colors: ['nogal', 'blanco', 'grafito', 'natural'], featured: true, description: 'Rack suspendido con puertas push, pasacables oculto y estante interno regulable.' },
  { code: 'PL-003', name: 'Placard de 3 puertas corredizas', category: 'Placares', art: 'wardrobe', dims: { w: 240, h: 260, d: 60 }, basePrice: 1450000, materials: ['melamina', 'mdf', 'paraiso'], colors: ['blanco', 'natural', 'nogal', 'grafito'], description: 'Placard de piso a techo con interiores a medida: barral, cajonera y estantes. Sistema de corredizas de aluminio.' },
  { code: 'BM-004', name: 'Biblioteca modular Atelier', category: 'Living', art: 'shelf', dims: { w: 160, h: 200, d: 35 }, basePrice: 720000, materials: ['pino', 'guatambu', 'paraiso', 'roble'], colors: ['natural', 'miel', 'nogal', 'blanco', 'salvia'], featured: true, description: 'Biblioteca de módulos combinables con estantes reforzados de 25 mm. Se adapta a nichos y paredes completas.' },
  { code: 'CR-005', name: 'Cama con respaldo tapizado', category: 'Dormitorio', art: 'bed', dims: { w: 160, h: 110, d: 200 }, basePrice: 980000, materials: ['mdf', 'guatambu', 'paraiso', 'roble'], colors: ['natural', 'nogal', 'grafito', 'salvia', 'petroleo'], description: 'Base de cama con respaldo alto tapizado y estructura de madera maciza. Medidas de colchón a elección.' },
  { code: 'EH-006', name: 'Escritorio home office Studio', category: 'Oficina', art: 'desk', dims: { w: 140, h: 75, d: 65 }, basePrice: 520000, materials: ['melamina', 'mdf', 'paraiso', 'roble'], colors: ['natural', 'blanco', 'nogal', 'grafito'], description: 'Escritorio con cajonera lateral, pasacables y bandeja para teclado opcional. Pensado para jornadas largas.' },
  { code: 'AP-007', name: 'Aparador Vintage', category: 'Comedor', art: 'sideboard', dims: { w: 160, h: 80, d: 45 }, basePrice: 890000, materials: ['mdf', 'paraiso', 'petiribi', 'roble'], colors: ['nogal', 'miel', 'salvia', 'terracota', 'petroleo'], featured: true, description: 'Aparador de estilo mid-century con puertas de listones, patas inclinadas y estantes internos.' },
  { code: 'MR-008', name: 'Mesa ratona Isla', category: 'Living', art: 'coffee', dims: { w: 110, h: 42, d: 60 }, basePrice: 380000, materials: ['pino', 'paraiso', 'petiribi', 'roble'], colors: ['natural', 'miel', 'nogal', 'wengue'], description: 'Mesa ratona de tapa maciza con bandeja inferior para revistas y bordes redondeados.' },
  { code: 'ML-009', name: 'Mesa de luz Duo', category: 'Dormitorio', art: 'nightstand', dims: { w: 50, h: 55, d: 40 }, basePrice: 210000, materials: ['mdf', 'pino', 'paraiso', 'roble'], colors: ['natural', 'blanco', 'salvia', 'nogal', 'terracota'], description: 'Mesa de luz con cajón de cierre suave y nicho abierto. Precio por unidad.' },
  { code: 'BC-010', name: 'Bajo mesada y alacenas', category: 'Cocina', art: 'kitchen', dims: { w: 300, h: 90, d: 60 }, basePrice: 1950000, materials: ['melamina', 'mdf', 'guatambu'], colors: ['blanco', 'grafito', 'salvia', 'natural', 'petroleo'], description: 'Módulos de cocina a medida: bajo mesada con cajoneras y alacenas superiores. Mesada no incluida.' },
  { code: 'VS-011', name: 'Vestidor abierto modular', category: 'Placares', art: 'walkin', dims: { w: 220, h: 240, d: 55 }, basePrice: 1320000, materials: ['melamina', 'mdf', 'paraiso'], colors: ['natural', 'blanco', 'nogal', 'grafito'], description: 'Vestidor sin puertas con barrales, zapateros y cajoneras. Distribución interior a medida.' },
  { code: 'BR-012', name: 'Banco recibidor Umbral', category: 'Living', art: 'bench', dims: { w: 120, h: 48, d: 40 }, basePrice: 260000, materials: ['pino', 'paraiso', 'roble'], colors: ['natural', 'miel', 'nogal', 'salvia'], description: 'Banco para recibidor con estante zapatero y perchero de pared a juego.' },
];

const CLIENT_SEED = [
  ['Mariana López', '+54 9 11 5523-8812', 'mariana.lopez@ejemplo.com.ar', 'Av. Cabildo 2340, 5° B', 'Belgrano, CABA', 'Prefiere contacto por WhatsApp.'],
  ['Federico Giménez', '+54 9 11 4418-2290', 'fgimenez@ejemplo.com.ar', 'Gorriti 4875', 'Palermo, CABA', ''],
  ['Carolina Pérez Acosta', '+54 9 11 6032-7741', 'caro.perezacosta@ejemplo.com.ar', 'Av. del Libertador 13200, Lote 45', 'Martínez, Buenos Aires', 'Casa en barrio cerrado: avisar a guardia 24 h antes.'],
  ['Estudio Vidal & Asociados', '+54 11 4782-5510', 'compras@estudiovidal.ejemplo.com.ar', 'Arribeños 2180, Piso 3', 'Belgrano, CABA', 'Cliente corporativo. Factura A.'],
  ['Lucía Fernández', '+54 9 11 3391-0457', 'lu.fernandez@ejemplo.com.ar', 'Thames 1560, PB', 'Palermo, CABA', ''],
  ['Martín Rodríguez', '+54 9 11 5120-6683', 'martin.rodriguez@ejemplo.com.ar', 'Av. Rivadavia 5920, 8° A', 'Caballito, CABA', 'Edificio sin montacargas.'],
  ['Valentina Sosa', '+54 9 11 6744-1029', 'vale.sosa@ejemplo.com.ar', 'Pueyrredón 870', 'San Isidro, Buenos Aires', ''],
  ['Casa Alma Hotel Boutique', '+54 11 4831-2277', 'administracion@casaalma.ejemplo.com.ar', 'Honduras 5501', 'Palermo Soho, CABA', 'Equipamiento de 8 habitaciones en etapas.'],
  ['Juan Pablo Medina', '+54 9 11 4256-9318', 'jpmedina@ejemplo.com.ar', 'Av. Santa Fe 3410, 2° C', 'Recoleta, CABA', ''],
  ['Sofía Herrera', '+54 9 11 3870-5562', 'sofi.herrera@ejemplo.com.ar', 'Moldes 1945', 'Belgrano, CABA', ''],
  ['Diego Castro', '+54 9 11 5698-3301', 'dcastro@ejemplo.com.ar', 'Belgrano 455', 'Vicente López, Buenos Aires', ''],
  ['Paula Benítez', '+54 9 11 4011-7724', 'paula.benitez@ejemplo.com.ar', 'Av. San Juan 2780, 4° D', 'San Cristóbal, CABA', 'Pagos en cuotas con tarjeta.'],
];

function buildSeed() {
  const rnd = mulberry32(41027);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const T = todayISO();
  const data = { version: 1, counters: { quote: 0, sale: 0 }, products: [], clients: [], quotes: [], sales: [], deliveries: [] };

  data.products = PRODUCT_SEED.map((p, i) => ({
    id: 'p' + (i + 1), code: p.code, name: p.name, category: p.category, description: p.description,
    dims: { ...p.dims }, basePrice: p.basePrice, materials: sortMaterials(p.materials), colors: p.colors.slice(),
    images: [`art:${p.art}:${p.colors[0]}`], featured: !!p.featured, createdAt: addDays(T, -330 + i * 5),
  }));
  data.clients = CLIENT_SEED.map((c, i) => ({
    id: 'c' + (i + 1), name: c[0], phone: c[1], email: c[2], address: c[3], city: c[4], notes: c[5], createdAt: addDays(T, -300 + i * 7),
  }));

  const makeItem = p => {
    const vary = k => {
      const [mn, mx] = dimRange(p, k);
      return clamp(Math.round(p.dims[k] * (1 + pick([-0.15, -0.1, 0, 0, 0, 0.1, 0.2])) / 5) * 5, mn, mx);
    };
    const cfg = { w: vary('w'), h: p.dims.h, d: vary('d'), material: pick(p.materials), finish: pick(FINISHES).id, color: pick(p.colors), accessories: rnd() < 0.55 ? [pick(ACCESSORIES).id] : [] };
    return { id: uid('it'), productId: p.id, name: p.name, cfg, unitPrice: calcPrice(p, cfg).total, qty: p.id === 'p9' ? 2 : 1 };
  };
  const makeItems = () => {
    const n = rnd() < 0.35 ? 2 : 1, used = new Set(), items = [];
    while (items.length < n) {
      const p = pick(data.products);
      if (used.has(p.id)) continue;
      used.add(p.id);
      items.push(makeItem(p));
    }
    return items;
  };
  const history = (start, stageId, end) => {
    const idx = stageIndex(stageId), span = Math.max(1, daysBetween(start, end));
    return STAGES.slice(0, idx + 1).map((s, i) => ({ stage: s.id, date: addDays(start, Math.round(span * i / Math.max(1, idx))) }));
  };

  // Ventas distribuidas en los últimos 7 meses (de más antigua a más reciente)
  const ages = [212, 198, 186, 173, 161, 150, 139, 127, 116, 104, 95, 86, 77, 69, 61, 54, 47, 42, 38, 33, 28, 23, 19, 14, 10, 6, 3, 1];
  let upcomingOffset = 1;
  ages.forEach((age, i) => {
    const date = addDays(T, -age);
    const client = data.clients[(i * 5 + 3) % data.clients.length];
    const stage = age >= 45 ? 'entregado' : age >= 36 ? 'listo' : age >= 26 ? 'terminacion' : age >= 15 ? 'fabricacion' : age >= 7 ? 'diseno' : 'pendiente';
    const sale = { id: 's' + (i + 1), number: '', clientId: client.id, date, estimatedDate: addDays(date, 40), items: makeItems(), discountPct: pick([0, 0, 0, 5, 5, 10]), notes: '', payments: [], quoteId: null, createdAt: date };
    const total = docTotals(sale).total;
    const anticipo = round100(total * pick([0.4, 0.5, 0.5, 0.6]));
    const m1 = pick(['transferencia', 'efectivo', 'credito', 'debito', 'billetera']);
    sale.payments.push(makePayment({ amount: anticipo, method: m1, installments: m1 === 'credito' ? pick([1, 3, 6]) : 1, date }, 'Anticipo'));

    let delivDate = null;
    if (stage === 'entregado') {
      delivDate = addDays(date, Math.min(40, age - 2));
      if (i !== 9) sale.payments.push(makePayment({ amount: total - anticipo, method: pick(['transferencia', 'efectivo', 'debito']), date: delivDate }, 'Saldo contra entrega'));
    }
    if (age === 42) sale.estimatedDate = addDays(T, -2); // un pedido fuera de plazo para la demo
    sale.items.forEach(it => { it.stage = stage; it.history = history(date, stage, delivDate || addDays(T, -1)); });
    data.sales.push(sale);

    const base = { saleId: sale.id, slot: pick(SLOTS), address: `${client.address}, ${client.city}`, phone: client.phone, responsible: pick(STAFF.slice(0, 3)), notes: '' };
    if (stage === 'entregado') {
      data.deliveries.push({ id: uid('d'), ...base, date: delivDate, status: 'entregada', deliveredAt: delivDate, createdAt: addDays(delivDate, -7) });
    } else if (stage === 'listo') {
      const isToday = upcomingOffset === 1;
      data.deliveries.push({ id: uid('d'), ...base, date: isToday ? T : addDays(T, upcomingOffset), status: isToday ? 'en_camino' : 'programada', createdAt: addDays(T, -3) });
      upcomingOffset += 2;
    } else if (stage === 'terminacion' && age >= 30) {
      data.deliveries.push({ id: uid('d'), ...base, date: addDays(T, 6 + (i % 3)), status: 'programada', createdAt: addDays(T, -2) });
    }
  });

  // Presupuestos: tres ya convertidos en las ventas más recientes y otros en distintos estados
  const quotes = [];
  [19, 23, 26].forEach(si => {
    const s = data.sales[si];
    const date = addDays(s.date, -6);
    const q = { id: uid('q'), clientId: s.clientId, date, validUntil: addDays(date, 15), items: s.items.map(cloneItem), discountPct: s.discountPct, notes: '', status: 'convertido', saleId: s.id, history: [{ status: 'borrador', date }, { status: 'enviado', date }, { status: 'aprobado', date: s.date }, { status: 'convertido', date: s.date }] };
    s.quoteId = q.id;
    quotes.push(q);
  });
  const defs = [['aprobado', 6], ['aprobado', 3], ['enviado', 9], ['enviado', 4], ['enviado', 13], ['borrador', 0], ['rechazado', 52], ['enviado', 34], ['rechazado', 75]];
  defs.forEach(([status, age], i) => {
    const date = addDays(T, -age);
    const h = [{ status: 'borrador', date }];
    if (status !== 'borrador') h.push({ status: 'enviado', date });
    if (status === 'aprobado' || status === 'rechazado') h.push({ status, date: addDays(date, 2) });
    quotes.push({ id: uid('q'), clientId: data.clients[(i * 7 + 1) % data.clients.length].id, date, validUntil: addDays(date, 15), items: makeItems(), discountPct: pick([0, 5, 10]), notes: i === 0 ? 'Cliente solicita entrega antes de fin de mes.' : '', status, saleId: null, history: h });
  });
  quotes.sort((a, b) => a.date.localeCompare(b.date));
  quotes.forEach((q, i) => { q.number = 'P-' + (1001 + i); q.createdAt = q.date; });
  data.quotes = quotes;
  data.counters.quote = quotes.length;
  data.sales.forEach((s, i) => { s.number = 'V-' + (2001 + i); });
  data.counters.sale = data.sales.length;
  return data;
}

/* ---------- 6. Persistencia ---------- */

const STORE_KEY = 'atelierNogal.v1';
let db = null;

const isValidDB = d => d && d.version === 1 && d.counters && ['products', 'clients', 'quotes', 'sales', 'deliveries'].every(k => Array.isArray(d[k]));
function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidDB(parsed)) { db = parsed; return; }
    }
  } catch (e) {
    console.warn('No se pudieron leer los datos guardados', e);
  }
  db = buildSeed();
  saveDB(true);
}
function saveDB(silent = false) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    if (!silent) toast('No se pudieron guardar los cambios: el almacenamiento del navegador está lleno. Eliminá imágenes pesadas o exportá un respaldo.', 'error');
    return false;
  }
}
// Guarda, re-renderiza la vista y los detalles abiertos y muestra una notificación
function commit(msg, type = 'success') {
  const ok = saveDB();
  refresh();
  refreshModals();
  if (msg && ok) toast(msg, type);
  return ok;
}
function nextNumber(kind) {
  db.counters[kind] += 1;
  return kind === 'quote' ? 'P-' + (1000 + db.counters.quote) : 'V-' + (2000 + db.counters.sale);
}

const byId = (arr, id) => arr.find(x => x.id === id);
const getProduct = id => byId(db.products, id);
const getClient = id => byId(db.clients, id);
const getQuote = id => byId(db.quotes, id);
const getSale = id => byId(db.sales, id);
const getDelivery = id => byId(db.deliveries, id);
const clientName = id => getClient(id)?.name || 'Cliente eliminado';

const salePaid = s => sum(s.payments, p => p.amount);
const saleBalance = s => Math.max(0, docTotals(s).total - salePaid(s));
function saleStage(s) {
  if (!s.items.length) return 'pendiente';
  if (s.items.every(i => i.stage === 'entregado')) return 'entregado';
  return STAGES[Math.min(...s.items.filter(i => i.stage !== 'entregado').map(i => stageIndex(i.stage)))].id;
}
const saleReady = s => s.items.every(i => ['listo', 'entregado'].includes(i.stage));
const isSaleLate = s => saleStage(s) !== 'entregado' && s.estimatedDate < todayISO();
const activeDelivery = saleId => db.deliveries.find(d => d.saleId === saleId && d.status !== 'entregada');
const isQuoteExpired = q => ['borrador', 'enviado'].includes(q.status) && q.validUntil < todayISO();
const allPayments = () => db.sales.flatMap(s => s.payments.map(p => ({ ...p, sale: s })));
const productionItems = () => db.sales.flatMap(s => s.items.map(item => ({ sale: s, item })));
const categories = () => [...new Set([...CATEGORIES, ...db.products.map(p => p.category)])].sort((a, b) => a.localeCompare(b, 'es'));

/* ---------- 7. Componentes de interfaz ---------- */

const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const badge = (label, cls = 'neutral') => `<span class="badge ${cls === 'neutral' ? '' : 'badge-' + cls}">${esc(label)}</span>`;
const stageBadge = id => badge(stageOf(id).label, stageOf(id).cls);
const quoteBadge = q => badge(QUOTE_STATUS[q.status].label, QUOTE_STATUS[q.status].cls) + (isQuoteExpired(q) ? ' ' + badge('Vencido', 'danger') : '');
const deliveryBadge = d => badge(DELIVERY_STATUS[d.status].label, DELIVERY_STATUS[d.status].cls);
function payBadge(s) {
  const bal = saleBalance(s);
  if (bal === 0) return badge('Pagado', 'success');
  if (salePaid(s) === 0) return badge('Sin cobros', 'danger');
  return badge('Saldo ' + compactMoney(bal), 'warning');
}
const emptyHTML = (ic, title, text = '') => `<div class="empty">${icon(ic)}<strong>${esc(title)}</strong>${esc(text)}</div>`;
const swatch = id => { const c = COL(id); return c ? `<span class="swatch" style="background:${c.hex}" title="${esc(c.name)}"></span>` : ''; };

// Campo de formulario con etiqueta, ayuda y mensaje de error
function F(label, control, { req = false, full = false, hint = '', cls = '' } = {}) {
  return `<div class="field ${full ? 'full' : ''} ${cls}"><label>${esc(label)}${req ? ' <span class="req">*</span>' : ''}</label>${control}${hint ? `<div class="hint">${hint}</div>` : ''}<div class="field-error"></div></div>`;
}
function setError(el, msg) {
  const f = el && el.closest('.field');
  if (!f) return;
  let er = f.querySelector('.field-error');
  if (!er) { er = document.createElement('div'); er.className = 'field-error'; f.appendChild(er); }
  er.textContent = msg || '';
  f.classList.toggle('invalid', !!msg);
}
const clearErrors = root => $$('.field.invalid', root).forEach(f => f.classList.remove('invalid'));
// Acumula errores de validación y enfoca el primero
function validator(root) {
  clearErrors(root);
  let first = null;
  return {
    check(cond, el, msg) { if (!cond) { setError(el, msg); first = first || el; } return cond; },
    ok() {
      if (!first) return true;
      if (first.focus && first.tagName) first.focus();
      toast('Revisá los campos marcados.', 'error');
      return false;
    },
  };
}
const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RX_PHONE = /^\+?[\d\s()-]{8,20}$/;

function toast(msg, type = 'success', opts = {}) {
  const root = $('#toast-root');
  while (root.children.length > 3) root.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = { success: 'check', error: 'x', warning: 'alert', info: 'bell' }[type] || 'check';
  el.innerHTML = `<span class="t-icon">${icon(ic)}</span><span class="t-msg">${esc(msg)}</span>${opts.actionLabel ? `<button type="button">${esc(opts.actionLabel)}</button>` : ''}`;
  root.appendChild(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
  if (opts.actionLabel) el.querySelector('button').addEventListener('click', () => { close(); opts.onAction(); });
  setTimeout(close, opts.actionLabel ? 8000 : type === 'error' ? 5000 : 3600);
}

const modalStack = [];
function openModal({ title = '', subtitle = '', body = '', footer = '', size = '', backdropClose = false, onClose = null } = {}) {
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true"><div class="modal-head"><div><h3 data-m-title></h3><p data-m-sub></p></div><button type="button" class="icon-btn sm" data-close aria-label="Cerrar">${icon('x')}</button></div><div class="modal-body" data-m-body></div><div class="modal-foot" data-m-foot></div></div>`;
  $('#modal-root').appendChild(back);
  const entry = { el: back, onClose, rerender: null };
  modalStack.push(entry);
  setModalContent(back, { title, subtitle, body, footer });
  let downOnBack = false;
  back.addEventListener('mousedown', e => { downOnBack = e.target === back; });
  back.addEventListener('click', e => {
    if (e.target === back && downOnBack && backdropClose) closeModal(back);
    else if (e.target.closest('[data-close]')) closeModal(back);
  });
  document.body.style.overflow = 'hidden';
  if (window.innerWidth > 760) {
    setTimeout(() => { const f = back.querySelector('.modal-body input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([disabled]), .modal-body select:not([disabled])'); f && f.focus(); }, 60);
  }
  return back;
}
function setModalContent(el, { title, subtitle, body, footer }) {
  if (title !== undefined) $('[data-m-title]', el).textContent = title;
  if (subtitle !== undefined) { const s = $('[data-m-sub]', el); s.innerHTML = subtitle; s.hidden = !subtitle; }
  if (body !== undefined) $('[data-m-body]', el).innerHTML = body;
  if (footer !== undefined) { const f = $('[data-m-foot]', el); f.innerHTML = footer; f.hidden = !footer; }
}
const modalEntry = el => modalStack.find(m => m.el === el);
function closeModal(el) {
  const idx = el ? modalStack.findIndex(m => m.el === el) : modalStack.length - 1;
  if (idx < 0) return;
  const [m] = modalStack.splice(idx, 1);
  m.el.remove();
  if (m.onClose) m.onClose();
  if (!modalStack.length) document.body.style.overflow = '';
}
const closeAllModals = () => { while (modalStack.length) closeModal(); };
const refreshModals = () => modalStack.slice().forEach(m => m.rerender && m.rerender());

function confirmDialog({ title = '¿Confirmar acción?', message = '', confirmText = 'Confirmar', danger = false }) {
  return new Promise(resolve => {
    let done = false;
    const m = openModal({
      title, size: 'sm',
      body: `<div class="confirm-icon ${danger ? 'danger' : ''}">${icon(danger ? 'trash' : 'alert')}</div><p>${message}</p>`,
      footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText)}</button>`,
      onClose: () => { if (!done) resolve(false); },
    });
    $('[data-ok]', m).addEventListener('click', () => { done = true; resolve(true); closeModal(m); });
    setTimeout(() => $('[data-ok]', m).focus(), 70);
  });
}

/* ---------- 8. Gráficos (SVG) ---------- */

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
function barChart({ labels, series, height = 250, axisFmt = compactMoney, tipFmt = money }) {
  const W = 640, H = height, pl = 60, pr = 10, pt = 14, pb = 30;
  const max = niceMax(Math.max(0, ...series.flatMap(s => s.values)));
  const iw = W - pl - pr, ih = H - pt - pb, gw = iw / labels.length;
  const bw = Math.min(30, (gw * 0.7 - (series.length - 1) * 4) / series.length);
  let g = '';
  for (let i = 0; i <= 4; i++) {
    const y = pt + ih - ih * i / 4;
    g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${axisFmt(max * i / 4)}</text>`;
  }
  labels.forEach((lab, i) => {
    const gx = pl + gw * i + gw / 2;
    const totalW = bw * series.length + (series.length - 1) * 4;
    series.forEach((s, j) => {
      const v = s.values[i] || 0, h = Math.max(0, ih * v / max);
      g += `<rect class="bar" x="${(gx - totalW / 2 + j * (bw + 4)).toFixed(1)}" y="${(pt + ih - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${s.color}"><title>${esc(s.name)} · ${esc(lab)}: ${tipFmt(v)}</title></rect>`;
    });
    g += `<text x="${gx}" y="${H - 9}" text-anchor="middle">${esc(lab)}</text>`;
  });
  const legend = series.length > 1 ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de barras">${g}</svg></div>${legend}`;
}
function donutChart(segments, centerValue, centerLabel) {
  const total = sum(segments, s => s.value), R = 58, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = total ? segments.filter(s => s.value > 0).map(s => {
    const len = C * s.value / total;
    const el = `<circle r="${R}" cx="80" cy="80" fill="none" stroke="${s.color}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)"><title>${esc(s.label)}: ${s.display ?? s.value}</title></circle>`;
    off += len;
    return el;
  }).join('') : `<circle r="${R}" cx="80" cy="80" fill="none" stroke="#ebe1d3" stroke-width="22"/>`;
  return `<div class="donut-wrap"><div class="chart"><svg viewBox="0 0 160 160" role="img" aria-label="Gráfico de anillo">${arcs}<text x="80" y="80" text-anchor="middle" style="font-size:21px;font-weight:700;fill:#2a221d">${esc(centerValue)}</text><text x="80" y="97" text-anchor="middle">${esc(centerLabel)}</text></svg></div>
    <div class="donut-legend">${segments.map(s => `<div><i style="background:${s.color}"></i>${esc(s.label)}<b>${s.display ?? s.value}</b></div>`).join('')}</div></div>`;
}
function hBars(rows, emptyText = 'Sin datos para el período') {
  if (!rows.length) return emptyHTML('chart', emptyText);
  const max = Math.max(1, ...rows.map(r => r.value));
  return `<div class="hbars">${rows.map(r => `<div><div class="hbar-top"><span>${esc(r.label)}</span><span>${r.display}</span></div><div class="hbar-track"><span style="width:${(r.value / max * 100).toFixed(1)}%;${r.color ? `background:${r.color}` : ''}"></span></div></div>`).join('')}</div>`;
}
function kpi({ label, value, foot = '', ic = 'chart', tone = '', href = '' }) {
  return `<div class="card kpi ${href ? 'link' : ''}" ${href ? `data-action="go" data-href="${href}" role="link" tabindex="0"` : ''}>
    <div class="kpi-top"><span class="kpi-label">${esc(label)}</span><span class="kpi-icon ${tone}">${icon(ic)}</span></div>
    <div class="kpi-value">${value}</div><div class="kpi-foot">${foot}</div></div>`;
}
function delta(cur, prev) {
  if (!prev) return cur ? '<span class="delta up">▲ nuevo</span>' : '';
  const pct = Math.round((cur - prev) / prev * 100);
  return `<span class="delta ${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span> vs. mes anterior`;
}

/* ---------- 9. Router y navegación ---------- */

const ui = {
  route: 'dashboard', param: null,
  catalog: { q: '', cat: '', mat: '', color: '', pmin: '', pmax: '', sort: 'name' },
  clients: { q: '' },
  quotes: { q: '', status: '' },
  sales: { q: '', pay: '', stage: '' },
  prod: { q: '', showDelivered: false },
  deliv: { q: '', status: 'activas' },
  reports: { months: 6 },
  cfgState: null, cfgParam: null, cfgApi: null,
};

const ROUTES = {
  dashboard: { title: 'Panel general', sub: () => 'Resumen del negocio · ' + fmtDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), render: renderDashboard },
  catalogo: { title: 'Catálogo de productos', sub: 'Muebles base con materiales, colores, medidas e imágenes', render: renderCatalog },
  personalizar: { title: 'Personalización', sub: 'Configurador de muebles a medida con precio en tiempo real', render: renderConfiguratorPage },
  clientes: { title: 'Clientes', sub: 'Registro de clientes e historial de compras', render: renderClients },
  presupuestos: { title: 'Presupuestos', sub: 'Cotizaciones personalizadas y conversión en pedidos', render: renderQuotes },
  ventas: { title: 'Ventas y pedidos', sub: 'Operaciones, anticipos, saldos y medios de pago', render: renderSales },
  produccion: { title: 'Producción', sub: 'Seguimiento del taller por etapa · arrastrá las tarjetas o usá las flechas', render: renderProduction },
  entregas: { title: 'Entregas', sub: 'Agenda logística, responsables y estados de envío', render: renderDeliveries },
  reportes: { title: 'Reportes', sub: 'Indicadores comerciales y operativos', render: renderReports },
};

const view = () => $('#view');

function navigate() {
  const [r, param] = decodeURIComponent(location.hash.slice(1)).split('/');
  const route = ROUTES[r] ? r : 'dashboard';
  ui.route = route;
  ui.param = param || null;
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === route));
  const def = ROUTES[route];
  $('#page-title').textContent = def.title;
  $('#page-sub').textContent = typeof def.sub === 'function' ? def.sub() : def.sub;
  document.title = `${def.title} · Atelier Nogal`;
  document.body.classList.remove('sidebar-open');
  $('#alerts-panel').hidden = true;
  def.render(ui.param);
  updateChrome();
  window.scrollTo(0, 0);
}
function refresh() {
  ROUTES[ui.route].render(ui.param);
  updateChrome();
}

function computeAlerts() {
  const T = todayISO(), out = [];
  db.deliveries.filter(d => d.status !== 'entregada' && d.date < T).forEach(d => {
    const s = getSale(d.saleId);
    out.push({ tone: 'danger', ic: 'truck', title: `Entrega atrasada · ${s?.number || ''}`, text: `Programada para el ${fmtDate(d.date)} · ${clientName(s?.clientId)}`, href: 'entregas' });
  });
  db.deliveries.filter(d => d.status !== 'entregada' && d.date === T).forEach(d => {
    const s = getSale(d.saleId);
    out.push({ tone: 'info', ic: 'truck', title: `Entrega hoy · ${s?.number || ''}`, text: `${d.slot} · ${clientName(s?.clientId)}`, href: 'entregas' });
  });
  db.sales.filter(isSaleLate).forEach(s => out.push({ tone: 'danger', ic: 'tool', title: `Pedido fuera de plazo · ${s.number}`, text: `Entrega estimada ${fmtDate(s.estimatedDate)} · ${stageOf(saleStage(s)).label}`, href: 'produccion' }));
  db.sales.filter(s => saleStage(s) === 'listo' && !activeDelivery(s.id)).forEach(s => out.push({ tone: 'warning', ic: 'calendar', title: `Listo sin entrega programada · ${s.number}`, text: clientName(s.clientId), href: 'entregas' }));
  db.quotes.filter(q => q.status === 'enviado' && !isQuoteExpired(q) && daysBetween(T, q.validUntil) <= 3).forEach(q => out.push({ tone: 'warning', ic: 'file', title: `Presupuesto por vencer · ${q.number}`, text: `Vence el ${fmtDate(q.validUntil)} · ${clientName(q.clientId)}`, href: 'presupuestos' }));
  db.quotes.filter(q => q.status === 'aprobado').forEach(q => out.push({ tone: 'info', ic: 'check', title: `Aprobado sin convertir · ${q.number}`, text: `${clientName(q.clientId)} · ${money(docTotals(q).total)}`, href: 'presupuestos' }));
  return out;
}
function updateChrome() {
  const T = todayISO();
  const setBadge = (id, n) => { $('#' + id).textContent = n > 0 ? n : ''; };
  setBadge('badge-presupuestos', db.quotes.filter(q => (q.status === 'enviado' && !isQuoteExpired(q)) || q.status === 'aprobado').length);
  setBadge('badge-produccion', productionItems().filter(x => !['listo', 'entregado'].includes(x.item.stage)).length);
  setBadge('badge-entregas', db.deliveries.filter(d => d.status !== 'entregada' && d.date <= addDays(T, 7)).length);
  const alerts = computeAlerts();
  const cnt = $('#alerts-count');
  cnt.textContent = alerts.length;
  cnt.hidden = !alerts.length;
  $('#alerts-panel').innerHTML = `<h4>Alertas operativas</h4>${alerts.length ? alerts.map(a => `<a class="alert-item ${a.tone}" href="#${a.href}" data-action="alert-go" data-href="${a.href}">${icon(a.ic)}<div><strong>${esc(a.title)}</strong><span>${esc(a.text)}</span></div></a>`).join('') : emptyHTML('check', 'Todo en orden', 'No hay alertas pendientes.')}`;
}

/* ---------- 10. Acciones globales (delegación de eventos) ---------- */

const actions = {
  go: d => { location.hash = d.href; },
  'toggle-sidebar': () => document.body.classList.toggle('sidebar-open'),
  'close-sidebar': () => document.body.classList.remove('sidebar-open'),
  'toggle-alerts': () => { const p = $('#alerts-panel'); p.hidden = !p.hidden; },
  'alert-go': d => { $('#alerts-panel').hidden = true; location.hash = d.href; },
  'new-quote': () => openDocEditor('quote'),
  'new-sale': () => openDocEditor('sale'),
  'open-data': () => openDataModal(),
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-action]');
  if (!e.target.closest('.alerts-wrap')) $('#alerts-panel').hidden = true;
  if (!t || t.disabled) return;
  const fn = actions[t.dataset.action];
  if (fn) { e.preventDefault(); fn(t.dataset, t, e); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modalStack.length) { closeModal(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=link][data-action]')) { e.preventDefault(); e.target.click(); }
});

/* ---------- 11. Dashboard ---------- */

function renderDashboard() {
  const T = todayISO(), mk = monthKey(T), [pmk] = lastMonths(2);
  const salesIn = k => db.sales.filter(s => monthKey(s.date) === k);
  const totM = sum(salesIn(mk), s => docTotals(s).total), totP = sum(salesIn(pmk), s => docTotals(s).total);
  const pays = allPayments();
  const incM = sum(pays.filter(p => monthKey(p.date) === mk), p => p.amount), incP = sum(pays.filter(p => monthKey(p.date) === pmk), p => p.amount);
  const pendQ = db.quotes.filter(q => (['borrador', 'enviado'].includes(q.status) && !isQuoteExpired(q)) || q.status === 'aprobado');
  const approved = pendQ.filter(q => q.status === 'aprobado').length;
  const inProd = productionItems().filter(x => ['diseno', 'fabricacion', 'terminacion'].includes(x.item.stage));
  const upcoming = db.deliveries.filter(d => d.status !== 'entregada' && d.date >= T && d.date <= addDays(T, 7)).sort((a, b) => a.date.localeCompare(b.date));
  const receivable = sum(db.sales, saleBalance);
  const active = db.sales.filter(s => saleStage(s) !== 'entregado');
  const alerts = computeAlerts().length;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const months = lastMonths(6);
  const featured = db.products.filter(p => p.featured);
  const latest = db.sales.slice().sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number)).slice(0, 6);
  const stageCounts = STAGES.slice(0, 5).map(s => ({ ...s, n: productionItems().filter(x => x.item.stage === s.id).length }));
  const maxStage = Math.max(1, ...stageCounts.map(s => s.n));

  view().innerHTML = `<div class="stack">
    <section class="hero">
      <div><h2>${greet}</h2><p>${active.length} pedidos activos · ${upcoming.length} entregas en los próximos 7 días · ${alerts} alerta${alerts === 1 ? '' : 's'} operativa${alerts === 1 ? '' : 's'}</p></div>
      <div class="row"><a class="btn btn-secondary" href="#personalizar">${icon('sliders')}Configurar mueble</a><button type="button" class="btn btn-primary" data-action="new-quote">${icon('plus')}Nuevo presupuesto</button></div>
    </section>
    <section class="kpis">
      ${kpi({ label: 'Ventas del mes', value: money(totM), foot: `${salesIn(mk).length} operaciones · ${delta(totM, totP)}`, ic: 'bag', href: 'ventas' })}
      ${kpi({ label: 'Ingresos cobrados del mes', value: money(incM), foot: delta(incM, incP), ic: 'cash', tone: 'sage', href: 'reportes' })}
      ${kpi({ label: 'Presupuestos pendientes', value: pendQ.length, foot: `${money(sum(pendQ, q => docTotals(q).total))} · ${approved} aprobado${approved === 1 ? '' : 's'} por convertir`, ic: 'file', tone: 'info', href: 'presupuestos' })}
      ${kpi({ label: 'Muebles en fabricación', value: inProd.length, foot: `${db.sales.filter(isSaleLate).length} pedido(s) fuera de plazo`, ic: 'tool', tone: 'warning', href: 'produccion' })}
      ${kpi({ label: 'Entregas próximas (7 días)', value: upcoming.length, foot: upcoming[0] ? `Próxima: ${fmtShort(upcoming[0].date)}` : 'Sin entregas programadas', ic: 'truck', href: 'entregas' })}
      ${kpi({ label: 'Saldo por cobrar', value: money(receivable), foot: `${db.sales.filter(s => saleBalance(s) > 0).length} pedidos con saldo`, ic: 'card', tone: 'danger', href: 'ventas' })}
    </section>
    <section class="grid grid-main">
      <div class="card"><div class="card-head"><div><h3>Ventas e ingresos</h3><p>Últimos 6 meses</p></div><a class="btn btn-ghost btn-sm" href="#reportes">Ver reportes</a></div>
        <div class="card-body">${barChart({ labels: months.map(monthLabel), series: [
          { name: 'Ventas', color: '#9c6b43', values: months.map(k => sum(salesIn(k), s => docTotals(s).total)) },
          { name: 'Cobros', color: '#5d7a64', values: months.map(k => sum(pays.filter(p => monthKey(p.date) === k), p => p.amount)) },
        ] })}</div></div>
      <div class="card"><div class="card-head"><div><h3>Taller</h3><p>Muebles por etapa</p></div><a class="btn btn-ghost btn-sm" href="#produccion">Abrir tablero</a></div>
        <div class="card-body"><div class="hbars">${stageCounts.map(s => `<div><div class="hbar-top"><span>${s.label}</span><span>${s.n}</span></div><div class="hbar-track"><span style="width:${s.n / maxStage * 100}%;background:${s.color}"></span></div></div>`).join('')}</div></div></div>
    </section>
    <section class="grid grid-main">
      <div class="card"><div class="card-head"><div><h3>Últimas ventas</h3><p>Operaciones más recientes</p></div><a class="btn btn-ghost btn-sm" href="#ventas">Ver todas</a></div>
        <div class="table-wrap section-gap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th class="right">Total</th><th>Pago</th><th>Producción</th></tr></thead><tbody>
        ${latest.map(s => `<tr class="clickable" data-action="sale-view" data-id="${s.id}"><td><span class="strong">${s.number}</span><span class="sub">${fmtDate(s.date)}</span></td><td>${esc(clientName(s.clientId))}</td><td class="right num strong">${money(docTotals(s).total)}</td><td>${payBadge(s)}</td><td>${stageBadge(saleStage(s))}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card"><div class="card-head"><div><h3>Próximas entregas</h3><p>Agenda de los próximos 7 días</p></div></div>
        <div class="card-body">${upcoming.length ? `<div class="list">${upcoming.map(d => {
          const s = getSale(d.saleId);
          return `<div class="list-item"><div class="date-chip"><b>${parseISO(d.date).getDate()}</b><small>${fmtDate(d.date, { month: 'short' })}</small></div><div class="grow"><strong>${esc(clientName(s?.clientId))}</strong><span class="sub">${s?.number} · ${esc(d.slot)} · ${esc(d.address)}</span></div>${deliveryBadge(d)}</div>`;
        }).join('')}</div>` : emptyHTML('truck', 'Sin entregas próximas', 'Programalas desde el módulo Entregas.')}</div></div>
    </section>
    <section class="card"><div class="card-head"><div><h3>Productos destacados</h3><p>Los más elegidos del showroom · clic para personalizar</p></div><a class="btn btn-ghost btn-sm" href="#catalogo">Ir al catálogo</a></div>
      <div class="card-body">${featured.length ? `<div class="featured-row">${featured.map(p => `<div class="mini-product" data-action="go" data-href="personalizar/${p.id}" role="link" tabindex="0"><img src="${imgSrc(p.images[0])}" alt="${esc(p.name)}"><div><strong>${esc(p.name)}</strong><span>Desde ${money(p.basePrice)}</span></div></div>`).join('')}</div>` : emptyHTML('star', 'Sin productos destacados', 'Marcá productos con la estrella en el catálogo.')}</div></section>
  </div>`;
}

/* ---------- 12. Catálogo ---------- */

function renderCatalog() {
  const f = ui.catalog;
  view().innerHTML = `
    <div class="toolbar">
      <div class="search">${icon('search')}<input type="search" id="cat-q" placeholder="Buscar por nombre, código, descripción o medidas…" value="${esc(f.q)}" aria-label="Buscar productos"></div>
      <span class="spacer"></span>
      <button type="button" class="btn btn-primary" data-action="product-new">${icon('plus')}Nuevo producto</button>
    </div>
    <div class="toolbar">
      <select id="cat-cat" aria-label="Categoría"><option value="">Todas las categorías</option>${categories().map(c => `<option ${f.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select id="cat-mat" aria-label="Material"><option value="">Todos los materiales</option>${MATERIALS.map(m => `<option value="${m.id}" ${f.mat === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}</select>
      <select id="cat-color" aria-label="Color"><option value="">Todos los colores</option>${COLORS.map(c => `<option value="${c.id}" ${f.color === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
      <input type="number" id="cat-pmin" class="input" style="width:140px" placeholder="Precio mín." min="0" step="10000" value="${esc(f.pmin)}" aria-label="Precio mínimo">
      <input type="number" id="cat-pmax" class="input" style="width:140px" placeholder="Precio máx." min="0" step="10000" value="${esc(f.pmax)}" aria-label="Precio máximo">
      <select id="cat-sort" aria-label="Orden">
        <option value="name" ${f.sort === 'name' ? 'selected' : ''}>Nombre A–Z</option>
        <option value="price-asc" ${f.sort === 'price-asc' ? 'selected' : ''}>Precio menor a mayor</option>
        <option value="price-desc" ${f.sort === 'price-desc' ? 'selected' : ''}>Precio mayor a menor</option>
        <option value="featured" ${f.sort === 'featured' ? 'selected' : ''}>Destacados primero</option>
      </select>
      <button type="button" class="btn btn-ghost btn-sm" data-action="catalog-clear">${icon('refresh')}Limpiar filtros</button>
    </div>
    <p class="muted small" id="cat-count"></p>
    <div id="cat-results" class="section-gap"></div>`;
  const bind = (id, key) => $('#' + id).addEventListener('input', e => { ui.catalog[key] = e.target.value; drawCatalog(); });
  bind('cat-q', 'q'); bind('cat-cat', 'cat'); bind('cat-mat', 'mat'); bind('cat-color', 'color'); bind('cat-pmin', 'pmin'); bind('cat-pmax', 'pmax'); bind('cat-sort', 'sort');
  drawCatalog();
}
function drawCatalog() {
  const f = ui.catalog, q = f.q.trim().toLowerCase();
  let list = db.products.filter(p => {
    const hay = `${p.name} ${p.code} ${p.description} ${p.category} ${p.dims.w}x${p.dims.h}x${p.dims.d} ${p.dims.w}×${p.dims.h}×${p.dims.d}`.toLowerCase();
    return (!q || hay.includes(q)) && (!f.cat || p.category === f.cat) && (!f.mat || p.materials.includes(f.mat)) && (!f.color || p.colors.includes(f.color))
      && (f.pmin === '' || p.basePrice >= Number(f.pmin)) && (f.pmax === '' || p.basePrice <= Number(f.pmax));
  });
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name, 'es'),
    'price-asc': (a, b) => a.basePrice - b.basePrice,
    'price-desc': (a, b) => b.basePrice - a.basePrice,
    featured: (a, b) => (b.featured - a.featured) || a.name.localeCompare(b.name, 'es'),
  };
  list = list.sort(sorters[f.sort] || sorters.name);
  $('#cat-count').textContent = `${list.length} de ${db.products.length} productos`;
  $('#cat-results').innerHTML = list.length ? `<div class="product-grid">${list.map(p => `
    <article class="card product-card">
      <div class="pc-media" data-action="product-view" data-id="${p.id}">
        <img src="${imgSrc(p.images[0])}" alt="${esc(p.name)}" loading="lazy">
        <span class="chip">${esc(p.category)}</span>
        ${p.images.length > 1 ? `<span class="img-count">${icon('image')}${p.images.length}</span>` : ''}
        <button type="button" class="star-btn ${p.featured ? 'on' : ''}" data-action="product-feature" data-id="${p.id}" title="${p.featured ? 'Quitar de destacados' : 'Marcar como destacado'}" aria-label="Destacado">${icon('star')}</button>
      </div>
      <div class="pc-body">
        <span class="pc-code">${esc(p.code)}</span>
        <h3>${esc(p.name)}</h3>
        <span class="pc-dims">${p.dims.w} × ${p.dims.h} × ${p.dims.d} cm · ${p.materials.length} materiales</span>
        <div class="swatches">${p.colors.map(swatch).join('')}</div>
        <div class="pc-foot">
          <div><small>Desde</small><strong>${money(p.basePrice)}</strong></div>
          <div class="actions">
            <button type="button" class="icon-btn sm" data-action="go" data-href="personalizar/${p.id}" title="Personalizar">${icon('sliders')}</button>
            <button type="button" class="icon-btn sm" data-action="product-edit" data-id="${p.id}" title="Editar">${icon('edit')}</button>
            <button type="button" class="icon-btn sm danger" data-action="product-delete" data-id="${p.id}" title="Eliminar">${icon('trash')}</button>
          </div>
        </div>
      </div>
    </article>`).join('')}</div>` : `<div class="card">${emptyHTML('search', 'No hay productos que coincidan', 'Probá con otros filtros o creá un producto nuevo.')}</div>`;
}

Object.assign(actions, {
  'catalog-clear': () => { ui.catalog = { q: '', cat: '', mat: '', color: '', pmin: '', pmax: '', sort: 'name' }; renderCatalog(); },
  'product-new': () => openProductForm(null),
  'product-edit': d => openProductForm(getProduct(d.id)),
  'product-view': d => openProductView(d.id),
  'product-feature': d => {
    const p = getProduct(d.id);
    p.featured = !p.featured;
    commit(p.featured ? `"${p.name}" ahora es destacado.` : `"${p.name}" ya no es destacado.`);
  },
  'product-delete': async d => {
    const p = getProduct(d.id);
    const openUse = db.quotes.filter(q => ['borrador', 'enviado', 'aprobado'].includes(q.status) && q.items.some(i => i.productId === p.id)).length;
    const ok = await confirmDialog({
      title: 'Eliminar producto', danger: true, confirmText: 'Eliminar',
      message: `¿Eliminar <b>${esc(p.name)}</b> (${esc(p.code)}) del catálogo?${openUse ? `<br><br>Aparece en ${openUse} presupuesto(s) abierto(s): se conservarán con su precio, pero no podrán reconfigurarse.` : ''} Las ventas existentes no se modifican.`,
    });
    if (!ok) return;
    db.products = db.products.filter(x => x.id !== p.id);
    commit(`Producto "${p.name}" eliminado.`);
  },
});

function openProductView(id) {
  const p = getProduct(id);
  if (!p) return;
  const m = openModal({
    title: p.name, subtitle: `${esc(p.code)} · ${esc(p.category)}`, size: 'lg', backdropClose: true,
    body: `<div class="grid grid-2">
      <div><div class="gallery-main"><img id="pv-main" src="${imgSrc(p.images[0])}" alt="${esc(p.name)}"></div>
        ${p.images.length > 1 ? `<div class="gallery-thumbs">${p.images.map((im, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-img="${i}"><img src="${imgSrc(im)}" alt=""></button>`).join('')}</div>` : ''}</div>
      <div class="stack" style="gap:14px">
        <p>${esc(p.description)}</p>
        <dl class="spec-list">
          <dt>Medidas estándar</dt><dd>${p.dims.w} × ${p.dims.h} × ${p.dims.d} cm (an × al × prof)</dd>
          <dt>Materiales</dt><dd>${p.materials.map(id => `<span class="tag">${MAT(id)?.name}</span>`).join('')}</dd>
          <dt>Colores</dt><dd><div class="swatches">${p.colors.map(id => `${swatch(id)}`).join('')}</div><span class="small muted">${p.colors.map(id => COL(id)?.name).join(', ')}</span></dd>
          <dt>Precio base</dt><dd class="strong">${money(p.basePrice)}</dd>
          <dt>Destacado</dt><dd>${p.featured ? 'Sí' : 'No'}</dd>
        </dl>
      </div></div>`,
    footer: `<button type="button" class="btn btn-ghost" data-action="product-edit" data-id="${p.id}">${icon('edit')}Editar</button><a class="btn btn-primary" href="#personalizar/${p.id}">${icon('sliders')}Personalizar</a>`,
  });
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-img]');
    if (b) {
      $('#pv-main', m).src = imgSrc(p.images[Number(b.dataset.img)]);
      $$('[data-img]', m).forEach(x => x.classList.toggle('active', x === b));
    }
    if (e.target.closest('a[href^="#personalizar"]')) closeAllModals();
  });
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error(`"${file.name}" no es una imagen.`)); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, 720 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * sc);
        cv.height = Math.round(img.height * sc);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error(`No se pudo leer "${file.name}".`));
      img.src = fr.result;
    };
    fr.onerror = () => reject(new Error(`No se pudo leer "${file.name}".`));
    fr.readAsDataURL(file);
  });
}

function openProductForm(product) {
  const isNew = !product;
  const p = product ? structuredClone(product) : { code: '', name: '', category: '', description: '', dims: { w: '', h: '', d: '' }, basePrice: '', materials: [], colors: [], images: [], featured: false };
  let images = p.images.slice();
  const m = openModal({
    title: isNew ? 'Nuevo producto' : `Editar ${p.name}`, subtitle: 'Los campos con * son obligatorios.', size: 'lg',
    body: `<form id="pf" class="form-grid" novalidate>
      ${F('Código', `<input name="code" value="${esc(p.code)}" maxlength="12" placeholder="Ej.: MC-013">`, { req: true, hint: 'Único, letras, números y guiones.' })}
      ${F('Nombre', `<input name="name" value="${esc(p.name)}" maxlength="60">`, { req: true })}
      ${F('Categoría', `<input name="category" list="pf-cats" value="${esc(p.category)}" maxlength="30" placeholder="Elegí o escribí una categoría"><datalist id="pf-cats">${categories().map(c => `<option value="${esc(c)}">`).join('')}</datalist>`, { req: true })}
      ${F('Precio base', `<div class="input-group"><input name="basePrice" type="number" min="1" step="1000" value="${esc(p.basePrice)}"><span class="addon">ARS</span></div>`, { req: true, hint: 'Medidas estándar y el material más económico seleccionado.' })}
      ${F('Descripción', `<textarea name="description" maxlength="400">${esc(p.description)}</textarea>`, { req: true, full: true })}
      <div class="full form-grid form-grid-3">
        ${['w', 'h', 'd'].map(k => F(`${DIM_LABEL[k]} estándar`, `<div class="input-group"><input name="dim-${k}" type="number" min="${DIM_LIMITS[k][0]}" max="${DIM_LIMITS[k][1]}" step="1" value="${esc(p.dims[k])}"><span class="addon">cm</span></div>`, { req: true, hint: `Entre ${DIM_LIMITS[k][0]} y ${DIM_LIMITS[k][1]} cm` })).join('')}
      </div>
      <div class="field full"><label>Materiales disponibles <span class="req">*</span></label><div class="check-grid">${MATERIALS.map(mt => `<label class="check"><input type="checkbox" name="materials" value="${mt.id}" ${p.materials.includes(mt.id) ? 'checked' : ''}>${mt.name}</label>`).join('')}</div><div class="field-error"></div></div>
      <div class="field full"><label>Colores disponibles <span class="req">*</span></label><div class="check-grid">${COLORS.map(c => `<label class="check"><input type="checkbox" name="colors" value="${c.id}" ${p.colors.includes(c.id) ? 'checked' : ''}><span class="swatch" style="background:${c.hex}"></span>${c.name}</label>`).join('')}</div><div class="field-error"></div></div>
      <div class="field full"><label>Imágenes</label>
        <div class="img-manager" id="pf-imgs"></div>
        <div class="row" style="margin-top:8px">
          <input class="input" id="pf-url" placeholder="Pegá la URL de una imagen (https://…)" style="flex:1;min-width:200px">
          <button type="button" class="btn btn-secondary btn-sm" id="pf-add-url">${icon('plus')}Agregar URL</button>
          <label class="btn btn-secondary btn-sm">${icon('upload')}Subir archivos<input type="file" id="pf-files" accept="image/*" multiple hidden></label>
        </div>
        <div class="hint">La primera imagen es la portada. Si no cargás ninguna se genera una ilustración según la categoría. Las fotos se optimizan a 720 px.</div><div class="field-error"></div></div>
      <label class="check full" style="max-width:260px"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}>${icon('star')}Producto destacado</label>
    </form>`,
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-save>${icon('check')}${isNew ? 'Crear producto' : 'Guardar cambios'}</button>`,
  });
  const form = $('#pf', m);
  const drawImgs = () => {
    $('#pf-imgs', m).innerHTML = images.length ? images.map((im, i) => `<div class="img-thumb"><img src="${imgSrc(im)}" alt="">${i === 0 ? '<span class="cover">Portada</span>' : ''}<button type="button" data-rm="${i}" title="Quitar">${icon('x')}</button></div>`).join('') : `<div class="img-thumb" style="display:grid;place-items:center;color:var(--muted)">${icon('image')}</div>`;
  };
  drawImgs();
  $('#pf-imgs', m).addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { images.splice(Number(b.dataset.rm), 1); drawImgs(); } });
  $('#pf-add-url', m).addEventListener('click', () => {
    const inp = $('#pf-url', m), v = inp.value.trim();
    if (!/^https?:\/\/\S+$/i.test(v)) { setError(inp, 'Ingresá una URL válida que empiece con http:// o https://'); return; }
    setError(inp, '');
    images.push(v);
    inp.value = '';
    drawImgs();
  });
  $('#pf-files', m).addEventListener('change', async e => {
    const files = [...e.target.files];
    for (const file of files) {
      try { images.push(await readImageFile(file)); } catch (err) { toast(err.message, 'error'); }
    }
    e.target.value = '';
    drawImgs();
  });
  $('[data-save]', m).addEventListener('click', () => {
    const el = n => form.elements[n];
    const val = n => el(n).value.trim();
    const v = validator(form);
    const code = val('code').toUpperCase();
    v.check(/^[A-Z0-9-]{2,12}$/.test(code), el('code'), 'Código inválido (2 a 12 caracteres: letras, números o guiones).')
      && v.check(!db.products.some(x => x.code.toUpperCase() === code && x.id !== product?.id), el('code'), 'Ya existe un producto con ese código.');
    v.check(val('name').length >= 3, el('name'), 'Ingresá un nombre de al menos 3 caracteres.');
    v.check(val('category').length >= 3, el('category'), 'Indicá la categoría.');
    const price = Number(val('basePrice'));
    v.check(val('basePrice') !== '' && Number.isFinite(price) && price > 0 && price <= 100000000, el('basePrice'), 'Ingresá un precio mayor a $0.');
    v.check(val('description').length >= 10, el('description'), 'La descripción debe tener al menos 10 caracteres.');
    const dims = {};
    ['w', 'h', 'd'].forEach(k => {
      const n = Number(val('dim-' + k));
      dims[k] = n;
      v.check(val('dim-' + k) !== '' && Number.isInteger(n) && n >= DIM_LIMITS[k][0] && n <= DIM_LIMITS[k][1], el('dim-' + k), `Valor entero entre ${DIM_LIMITS[k][0]} y ${DIM_LIMITS[k][1]}.`);
    });
    const mats = $$('[name=materials]:checked', form).map(x => x.value);
    const cols = $$('[name=colors]:checked', form).map(x => x.value);
    v.check(mats.length > 0, $('[name=materials]', form), 'Seleccioná al menos un material.');
    v.check(cols.length > 0, $('[name=colors]', form), 'Seleccioná al menos un color.');
    if (!v.ok()) return;
    const data = {
      code, name: val('name'), category: val('category'), description: val('description'), dims, basePrice: Math.round(price),
      materials: sortMaterials(mats), colors: sortColors(cols), featured: el('featured').checked,
      images: images.length ? images : [`art:${CATEGORY_ART[val('category')] || 'shelf'}:${sortColors(cols)[0]}`],
    };
    if (isNew) db.products.push({ id: uid('p'), ...data, createdAt: todayISO() });
    else Object.assign(getProduct(product.id), data);
    closeModal(m);
    commit(isNew ? `Producto "${data.name}" creado.` : `Producto "${data.name}" actualizado.`);
  });
}

/* ---------- 13. Configurador ---------- */

/**
 * Monta el configurador en un contenedor. state = { productId, cfg, qty, itemId? } se modifica en el lugar,
 * por lo que la selección se conserva si la vista se vuelve a dibujar.
 */
function mountConfigurator(container, state, { showProductPicker = true, actionsHTML = '' } = {}) {
  const product = () => getProduct(state.productId);

  function render() {
    const p = product();
    if (!p) { container.innerHTML = emptyHTML('sofa', 'Producto no disponible', 'El producto fue eliminado del catálogo.'); return; }
    if (!p.materials.includes(state.cfg.material)) state.cfg.material = p.materials[0];
    if (!p.colors.includes(state.cfg.color)) state.cfg.color = p.colors[0];
    state.cfg.accessories = (state.cfg.accessories || []).filter(ACC);
    const c = state.cfg, ref = MAT(p.materials[0]);
    container.innerHTML = `<div class="configurator">
      <div class="cfg-preview">
        <div class="cfg-stage"><img data-cfg-img src="${imgSrc(p.images[0], c.color)}" alt="${esc(p.name)}"><div class="cfg-iso"><div data-cfg-iso></div><div class="iso-cap">Volumen a escala</div></div></div>
        <div class="price-box" data-cfg-price></div>
        ${actionsHTML ? `<div class="cfg-actions">${actionsHTML}</div>` : ''}
      </div>
      <div class="cfg-options">
        <div class="cfg-section">
          ${showProductPicker ? F('Mueble base', `<select data-k="product">${db.products.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)} · ${esc(x.code)}</option>`).join('')}</select>`) : `<h3 class="serif" style="font-size:24px">${esc(p.name)}</h3><span class="pc-code">${esc(p.code)} · ${esc(p.category)}</span>`}
          <p class="muted small" style="margin-top:8px">${esc(p.description)}</p>
        </div>
        <div class="cfg-section"><h4>Medidas <span>centímetros</span></h4>
          ${['w', 'h', 'd'].map(k => {
            const [mn, mx] = dimRange(p, k);
            return `<div class="dim-row field" data-dim="${k}"><label>${DIM_LABEL[k]}</label><input type="range" min="${mn}" max="${mx}" step="5" value="${clamp(c[k], mn, mx)}" data-k="${k}" data-role="range" aria-label="${DIM_LABEL[k]}"><div class="input-group"><input type="number" min="${mn}" max="${mx}" step="1" value="${Number.isFinite(c[k]) ? c[k] : ''}" data-k="${k}" data-role="num" aria-label="${DIM_LABEL[k]} en cm"><span class="addon">cm</span></div><div class="hint">Rango admitido ${mn}–${mx} cm · estándar ${p.dims[k]} cm</div><div class="field-error"></div></div>`;
          }).join('')}
        </div>
        <div class="cfg-section"><h4>Material</h4><div class="opt-grid">${p.materials.map(id => {
          const mt = MAT(id), rel = Math.round((mt.factor / ref.factor - 1) * 100);
          return `<label class="opt ${c.material === id ? 'selected' : ''}"><input type="radio" name="cfg-mat-${container.id}" data-k="material" value="${id}" ${c.material === id ? 'checked' : ''}><strong>${mt.name}</strong><span>${rel ? `+${rel}%` : 'Precio base'}</span></label>`;
        }).join('')}</div></div>
        <div class="cfg-section"><h4>Acabado</h4><div class="opt-grid">${FINISHES.map(fn => `<label class="opt ${c.finish === fn.id ? 'selected' : ''}"><input type="radio" name="cfg-fin-${container.id}" data-k="finish" value="${fn.id}" ${c.finish === fn.id ? 'checked' : ''}><strong>${fn.name}</strong><span>${fn.pct ? `+${Math.round(fn.pct * 100)}%` : 'Incluido'}</span></label>`).join('')}</div></div>
        <div class="cfg-section"><h4>Color <span data-cfg-colorname>${esc(COL(c.color)?.name)}</span></h4><div class="color-opts">${p.colors.map(id => {
          const co = COL(id);
          return `<label class="color-opt ${c.color === id ? 'selected' : ''}"><input type="radio" name="cfg-col-${container.id}" data-k="color" value="${id}" ${c.color === id ? 'checked' : ''}><span class="dot" style="background:${co.hex}"></span>${co.name}<em>${co.pct ? `+${Math.round(co.pct * 100)}%` : 'Sin cargo'}</em></label>`;
        }).join('')}</div></div>
        <div class="cfg-section"><h4>Accesorios</h4><div class="check-grid">${ACCESSORIES.map(a => `<label class="check"><input type="checkbox" data-k="acc" value="${a.id}" ${c.accessories.includes(a.id) ? 'checked' : ''}><span>${a.name}<br><span class="muted small">+ ${money(a.price)}</span></span></label>`).join('')}</div></div>
        <div class="cfg-section"><h4>Cantidad</h4><div class="field" data-qty-field style="max-width:160px"><input type="number" class="input" data-k="qty" min="1" max="99" step="1" value="${state.qty}" aria-label="Cantidad"><div class="field-error"></div></div></div>
      </div></div>`;
    bind();
    update();
  }

  function bind() {
    $('[data-k=product]', container)?.addEventListener('change', e => {
      const p = getProduct(e.target.value);
      state.productId = p.id;
      state.cfg = defaultCfg(p);
      render();
    });
    $$('[data-role]', container).forEach(inp => inp.addEventListener('input', () => {
      const row = inp.closest('.dim-row');
      const k = inp.dataset.k;
      if (inp.dataset.role === 'range') $('[data-role=num]', row).value = inp.value;
      else if (inp.value !== '') $('[data-role=range]', row).value = inp.value;
      state.cfg[k] = inp.value === '' ? NaN : Number(inp.value);
      update();
    }));
    $$('input[type=radio][data-k]', container).forEach(r => r.addEventListener('change', () => {
      state.cfg[r.dataset.k] = r.value;
      $$(`input[name="${r.name}"]`, container).forEach(x => x.closest('label').classList.toggle('selected', x.checked));
      update();
    }));
    $$('[data-k=acc]', container).forEach(cb => cb.addEventListener('change', () => {
      state.cfg.accessories = $$('[data-k=acc]:checked', container).map(x => x.value);
      update();
    }));
    $('[data-k=qty]', container).addEventListener('input', e => {
      state.qty = e.target.value === '' ? NaN : Number(e.target.value);
      update();
    });
  }

  function errors() {
    const p = product(), errs = {};
    ['w', 'h', 'd'].forEach(k => {
      const v = state.cfg[k], [mn, mx] = dimRange(p, k);
      if (!Number.isInteger(v)) errs[k] = 'Ingresá un número entero de centímetros.';
      else if (v < mn || v > mx) errs[k] = `${DIM_LABEL[k]} fuera de rango: debe estar entre ${mn} y ${mx} cm.`;
    });
    if (!Number.isInteger(state.qty) || state.qty < 1 || state.qty > 99) errs.qty = 'La cantidad debe ser un entero entre 1 y 99.';
    return errs;
  }

  function update() {
    const p = product();
    if (!p) return;
    const errs = errors(), c = state.cfg;
    ['w', 'h', 'd'].forEach(k => setError($(`[data-dim=${k}] [data-role=num]`, container), errs[k] || ''));
    setError($('[data-k=qty]', container), errs.qty || '');
    $('[data-cfg-img]', container).src = imgSrc(p.images[0], c.color);
    $('[data-cfg-colorname]', container).textContent = COL(c.color)?.name || '';
    const dimsOk = !errs.w && !errs.h && !errs.d;
    $('[data-cfg-iso]', container).innerHTML = dimsOk ? isoSVG(c.w, c.h, c.d, COL(c.color)?.hex || '#d6b48a') : '';
    const box = $('[data-cfg-price]', container);
    if (Object.keys(errs).length) {
      box.innerHTML = `<div class="invalid">${icon('alert')} Corregí los valores marcados para calcular el precio.</div><div class="total"><span>Precio estimado</span><strong>—</strong></div>`;
      return;
    }
    const pr = calcPrice(p, c);
    box.innerHTML = `<div class="lines">${pr.lines.map(l => `<div><span>${esc(l.label)}</span><span class="num">${l.sign ? (l.amount < 0 ? '− ' : '+ ') : ''}${money(Math.abs(l.amount))}</span></div>`).join('')}</div>
      <div class="total"><span>Precio estimado${state.qty > 1 ? ` (× ${state.qty})` : ''}</span><strong>${money(pr.total * state.qty)}</strong></div>
      <div class="small" style="color:#cdb79c;margin-top:4px">Unitario ${money(pr.total)} · Precios finales en pesos con IVA incluido</div>`;
  }

  render();
  return {
    getItem() {
      const p = product();
      if (!p) return null;
      const errs = errors();
      if (Object.keys(errs).length) { update(); toast('Revisá las medidas y la cantidad del mueble.', 'error'); return null; }
      return { id: state.itemId || uid('it'), productId: p.id, name: p.name, cfg: { ...state.cfg, accessories: [...state.cfg.accessories] }, unitPrice: calcPrice(p, state.cfg).total, qty: state.qty };
    },
  };
}

function renderConfiguratorPage(param) {
  if (!db.products.length) {
    view().innerHTML = `<div class="card">${emptyHTML('sofa', 'No hay productos en el catálogo', 'Creá un producto para poder personalizarlo.')}</div>`;
    return;
  }
  if (param && param !== ui.cfgParam && getProduct(param)) {
    ui.cfgParam = param;
    ui.cfgState = { productId: param, cfg: defaultCfg(getProduct(param)), qty: 1 };
  }
  if (!ui.cfgState || !getProduct(ui.cfgState.productId)) {
    const p = db.products.find(x => x.featured) || db.products[0];
    ui.cfgState = { productId: p.id, cfg: defaultCfg(p), qty: 1 };
  }
  view().innerHTML = `
    <div class="card card-pad" style="margin-bottom:18px"><div class="row space-between"><div><h3 class="serif" style="font-size:22px">Elegí un mueble base</h3><p class="muted small">Luego ajustá medidas, materiales, acabados, colores y accesorios.</p></div></div>
      <div class="strip section-gap" id="cfg-strip">${db.products.map(p => `<div class="mini-product ${p.id === ui.cfgState.productId ? 'active' : ''}" data-action="cfg-pick" data-id="${p.id}" role="button" tabindex="0"><img src="${imgSrc(p.images[0])}" alt=""><div><strong>${esc(p.name)}</strong><span>Desde ${money(p.basePrice)}</span></div></div>`).join('')}</div>
    </div>
    <div class="card card-pad" id="cfg-page"></div>`;
  ui.cfgApi = mountConfigurator($('#cfg-page'), ui.cfgState, {
    showProductPicker: false,
    actionsHTML: `<button type="button" class="btn btn-primary" data-action="cfg-new-quote">${icon('file')}Crear presupuesto</button>
      <div class="grid grid-2" style="gap:8px"><button type="button" class="btn btn-secondary" data-action="cfg-add-quote">${icon('plus')}Agregar a presupuesto</button><button type="button" class="btn btn-secondary" data-action="cfg-new-sale">${icon('bag')}Registrar venta</button></div>`,
  });
  const active = $('#cfg-strip .active');
  if (active) $('#cfg-strip').scrollLeft = active.offsetLeft - 20;
}

Object.assign(actions, {
  'cfg-pick': d => {
    const p = getProduct(d.id);
    ui.cfgState = { productId: p.id, cfg: defaultCfg(p), qty: 1 };
    ui.cfgParam = p.id;
    if (location.hash !== '#personalizar/' + p.id) history.replaceState(null, '', '#personalizar/' + p.id);
    ui.param = p.id;
    renderConfiguratorPage(p.id);
  },
  'cfg-new-quote': () => { const it = ui.cfgApi?.getItem(); if (it) openDocEditor('quote', null, { items: [it] }); },
  'cfg-new-sale': () => { const it = ui.cfgApi?.getItem(); if (it) openDocEditor('sale', null, { items: [it] }); },
  'cfg-add-quote': () => {
    const it = ui.cfgApi?.getItem();
    if (!it) return;
    const open = db.quotes.filter(q => ['borrador', 'enviado'].includes(q.status)).sort((a, b) => b.date.localeCompare(a.date));
    if (!open.length) { toast('No hay presupuestos en borrador o enviados. Creá uno nuevo.', 'warning'); return; }
    const m = openModal({
      title: 'Agregar a un presupuesto', subtitle: `${esc(it.name)} · ${money(it.unitPrice * it.qty)}`, size: 'sm',
      body: `<div class="radio-list">${open.map((q, i) => `<label class="check"><span><input type="radio" name="tq" value="${q.id}" ${i === 0 ? 'checked' : ''}> <b>${q.number}</b> · ${esc(clientName(q.clientId))}</span><span class="muted small">${money(docTotals(q).total)}</span></label>`).join('')}</div>
        <p class="hint" style="margin-top:10px">Solo se listan presupuestos en borrador o enviados.</p>`,
      footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-ok>Agregar</button>`,
    });
    $('[data-ok]', m).addEventListener('click', () => {
      const q = getQuote($('[name=tq]:checked', m).value);
      q.items.push({ ...it, id: uid('it') });
      q.updatedAt = todayISO();
      closeModal(m);
      commit(`Mueble agregado al presupuesto ${q.number}.`);
      openQuoteDetail(q.id);
    });
  },
});

function openConfiguratorModal({ item = null, onConfirm }) {
  const p0 = item ? getProduct(item.productId) : (db.products.find(x => x.featured) || db.products[0]);
  if (!p0) { toast(item ? 'El producto ya no existe en el catálogo.' : 'No hay productos en el catálogo.', 'error'); return; }
  const state = item ? { productId: item.productId, cfg: structuredClone(item.cfg), qty: item.qty, itemId: item.id } : { productId: p0.id, cfg: defaultCfg(p0), qty: 1 };
  const m = openModal({
    title: item ? 'Editar mueble' : 'Configurar mueble', subtitle: 'Ajustá medidas, materiales y accesorios. El precio se recalcula al instante.', size: 'xl',
    body: '<div class="cfg-modal" id="cfgm"></div>',
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-ok>${icon('check')}${item ? 'Guardar cambios' : 'Agregar mueble'}</button>`,
  });
  const api = mountConfigurator($('#cfgm', m), state, { showProductPicker: !item });
  $('[data-ok]', m).addEventListener('click', () => {
    const it = api.getItem();
    if (!it) return;
    closeModal(m);
    onConfirm(it);
  });
}

/* ---------- 14. Clientes ---------- */

function clientStats(c) {
  const sales = db.sales.filter(s => s.clientId === c.id);
  const last = sales.map(s => s.date).sort().pop();
  return { sales, count: sales.length, total: sum(sales, s => docTotals(s).total), balance: sum(sales, saleBalance), last, quotes: db.quotes.filter(q => q.clientId === c.id) };
}

function renderClients() {
  const T = todayISO();
  const withBal = db.clients.filter(c => clientStats(c).balance > 0).length;
  const buyers = db.clients.filter(c => clientStats(c).count > 0).length;
  view().innerHTML = `
    <section class="kpis">
      ${kpi({ label: 'Clientes registrados', value: db.clients.length, foot: `${buyers} con compras`, ic: 'users' })}
      ${kpi({ label: 'Nuevos este mes', value: db.clients.filter(c => monthKey(c.createdAt) === monthKey(T)).length, foot: 'Altas del mes en curso', ic: 'plus', tone: 'sage' })}
      ${kpi({ label: 'Con saldo pendiente', value: withBal, foot: money(sum(db.sales, saleBalance)) + ' a cobrar', ic: 'card', tone: 'warning' })}
      ${kpi({ label: 'Compra promedio por cliente', value: money(buyers ? sum(db.sales, s => docTotals(s).total) / buyers : 0), foot: 'Histórico acumulado', ic: 'chart', tone: 'info' })}
    </section>
    <div class="toolbar section-gap">
      <div class="search">${icon('search')}<input type="search" id="cl-q" placeholder="Buscar por nombre, teléfono, correo o localidad…" value="${esc(ui.clients.q)}" aria-label="Buscar clientes"></div>
      <span class="spacer"></span>
      <button type="button" class="btn btn-primary" data-action="client-new">${icon('plus')}Nuevo cliente</button>
    </div>
    <div class="card" id="cl-results"></div>`;
  $('#cl-q').addEventListener('input', e => { ui.clients.q = e.target.value; drawClients(); });
  drawClients();
}
function drawClients() {
  const q = ui.clients.q.trim().toLowerCase();
  const list = db.clients.filter(c => !q || `${c.name} ${c.phone} ${c.email} ${c.city} ${c.address}`.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  $('#cl-results').innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Cliente</th><th>Teléfono</th><th>Localidad</th><th class="right">Compras</th><th class="right">Total comprado</th><th class="right">Saldo</th><th>Última compra</th><th></th></tr></thead><tbody>
    ${list.map(c => {
      const st = clientStats(c);
      return `<tr class="clickable" data-action="client-view" data-id="${c.id}"><td><span class="strong">${esc(c.name)}</span><span class="sub">${esc(c.email)}</span></td><td class="nowrap">${esc(c.phone)}</td><td>${esc(c.city)}</td><td class="right num">${st.count}</td><td class="right num strong">${money(st.total)}</td><td class="right num">${st.balance ? `<span style="color:var(--warning);font-weight:600">${money(st.balance)}</span>` : '—'}</td><td class="nowrap">${st.last ? fmtDate(st.last) : '—'}</td>
        <td><div class="actions"><button type="button" class="icon-btn sm" data-action="client-edit" data-id="${c.id}" title="Editar">${icon('edit')}</button><button type="button" class="icon-btn sm danger" data-action="client-delete" data-id="${c.id}" title="Eliminar">${icon('trash')}</button></div></td></tr>`;
    }).join('')}</tbody></table></div>` : emptyHTML('users', 'Sin resultados', 'No encontramos clientes con ese criterio.');
}

function openClientForm(client, onSaved) {
  const isNew = !client;
  const c = client || { name: '', phone: '', email: '', address: '', city: '', notes: '' };
  const m = openModal({
    title: isNew ? 'Nuevo cliente' : `Editar ${c.name}`, subtitle: 'Los campos con * son obligatorios.',
    body: `<form class="form-grid" novalidate>
      ${F('Nombre o razón social', `<input name="name" value="${esc(c.name)}" maxlength="80" autocomplete="off">`, { req: true, full: true })}
      ${F('Teléfono', `<input name="phone" type="tel" value="${esc(c.phone)}" maxlength="20" placeholder="+54 9 11 1234-5678">`, { req: true })}
      ${F('Correo electrónico', `<input name="email" type="email" value="${esc(c.email)}" maxlength="80" placeholder="nombre@dominio.com">`, { req: true })}
      ${F('Dirección', `<input name="address" value="${esc(c.address)}" maxlength="100" placeholder="Calle, número, piso y depto.">`, { req: true })}
      ${F('Localidad', `<input name="city" value="${esc(c.city)}" maxlength="60" placeholder="Barrio, ciudad">`, { req: true })}
      ${F('Notas internas', `<textarea name="notes" maxlength="300">${esc(c.notes)}</textarea>`, { full: true })}
    </form>`,
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-save>${icon('check')}${isNew ? 'Registrar cliente' : 'Guardar cambios'}</button>`,
  });
  const form = $('form', m);
  $('[data-save]', m).addEventListener('click', () => {
    const el = n => form.elements[n], val = n => el(n).value.trim();
    const v = validator(form);
    v.check(val('name').length >= 3, el('name'), 'Ingresá al menos 3 caracteres.');
    v.check(RX_PHONE.test(val('phone')) && val('phone').replace(/\D/g, '').length >= 8, el('phone'), 'Teléfono inválido (mínimo 8 dígitos).');
    v.check(RX_EMAIL.test(val('email')), el('email'), 'Correo electrónico inválido.')
      && v.check(!db.clients.some(x => x.email.toLowerCase() === val('email').toLowerCase() && x.id !== client?.id), el('email'), 'Ya hay un cliente con ese correo.');
    v.check(val('address').length >= 5, el('address'), 'Ingresá la dirección completa.');
    v.check(val('city').length >= 2, el('city'), 'Indicá la localidad.');
    if (!v.ok()) return;
    const data = { name: val('name'), phone: val('phone'), email: val('email').toLowerCase(), address: val('address'), city: val('city'), notes: val('notes') };
    let saved;
    if (isNew) { saved = { id: uid('c'), ...data, createdAt: todayISO() }; db.clients.push(saved); }
    else { saved = getClient(client.id); Object.assign(saved, data); }
    closeModal(m);
    commit(isNew ? `Cliente ${data.name} registrado.` : `Datos de ${data.name} actualizados.`);
    if (onSaved) onSaved(saved);
  });
}

function openClientDetail(id) {
  const m = openModal({ size: 'lg', backdropClose: true });
  const draw = () => {
    const c = getClient(id);
    if (!c) { closeModal(m); return; }
    const st = clientStats(c);
    setModalContent(m, {
      title: c.name, subtitle: `Cliente desde ${fmtDate(c.createdAt)}`,
      body: `<div class="info-strip">
          <div><small>Teléfono</small><strong>${esc(c.phone)}</strong></div>
          <div><small>Correo</small><strong style="word-break:break-all">${esc(c.email)}</strong></div>
          <div><small>Dirección</small><strong>${esc(c.address)}, ${esc(c.city)}</strong></div>
        </div>
        ${c.notes ? `<div class="callout section-gap">${icon('alert')}<span>${esc(c.notes)}</span></div>` : ''}
        <div class="kpis section-gap">
          ${kpi({ label: 'Compras', value: st.count, ic: 'bag' })}
          ${kpi({ label: 'Total comprado', value: money(st.total), ic: 'cash', tone: 'sage' })}
          ${kpi({ label: 'Saldo pendiente', value: money(st.balance), ic: 'card', tone: st.balance ? 'warning' : '' })}
        </div>
        <div class="form-section"><h4>Historial de compras</h4><div class="card">${st.sales.length ? `<div class="table-wrap"><table class="table table-compact"><thead><tr><th>Pedido</th><th>Fecha</th><th>Muebles</th><th class="right">Total</th><th>Pago</th><th>Estado</th></tr></thead><tbody>
          ${st.sales.slice().sort((a, b) => b.date.localeCompare(a.date)).map(s => `<tr class="clickable" data-action="sale-view" data-id="${s.id}"><td class="strong">${s.number}</td><td class="nowrap">${fmtDate(s.date)}</td><td>${s.items.map(i => esc(i.name) + (i.qty > 1 ? ` ×${i.qty}` : '')).join('<br>')}</td><td class="right num">${money(docTotals(s).total)}</td><td>${payBadge(s)}</td><td>${stageBadge(saleStage(s))}</td></tr>`).join('')}
          </tbody></table></div>` : emptyHTML('bag', 'Sin compras registradas')}</div></div>
        <div class="form-section"><h4>Presupuestos</h4><div class="card">${st.quotes.length ? `<div class="table-wrap"><table class="table table-compact"><thead><tr><th>N°</th><th>Fecha</th><th class="right">Total</th><th>Estado</th></tr></thead><tbody>
          ${st.quotes.slice().sort((a, b) => b.date.localeCompare(a.date)).map(q => `<tr class="clickable" data-action="quote-view" data-id="${q.id}"><td class="strong">${q.number}</td><td class="nowrap">${fmtDate(q.date)}</td><td class="right num">${money(docTotals(q).total)}</td><td>${quoteBadge(q)}</td></tr>`).join('')}
          </tbody></table></div>` : emptyHTML('file', 'Sin presupuestos')}</div></div>`,
      footer: `<div class="left"><button type="button" class="btn btn-ghost" data-action="client-edit" data-id="${c.id}">${icon('edit')}Editar</button></div>
        <button type="button" class="btn btn-secondary" data-action="client-new-quote" data-id="${c.id}">${icon('file')}Nuevo presupuesto</button>
        <button type="button" class="btn btn-primary" data-action="client-new-sale" data-id="${c.id}">${icon('bag')}Nueva venta</button>`,
    });
  };
  modalEntry(m).rerender = draw;
  draw();
}

Object.assign(actions, {
  'client-new': () => openClientForm(null),
  'client-edit': d => openClientForm(getClient(d.id)),
  'client-view': d => openClientDetail(d.id),
  'client-new-quote': d => openDocEditor('quote', null, { clientId: d.id }),
  'client-new-sale': d => openDocEditor('sale', null, { clientId: d.id }),
  'client-delete': async d => {
    const c = getClient(d.id);
    const st = clientStats(c);
    if (st.count || st.quotes.length) {
      toast(`No se puede eliminar a ${c.name}: tiene ${st.count} venta(s) y ${st.quotes.length} presupuesto(s) asociados.`, 'error');
      return;
    }
    const ok = await confirmDialog({ title: 'Eliminar cliente', danger: true, confirmText: 'Eliminar', message: `¿Eliminar a <b>${esc(c.name)}</b> del registro? Esta acción no se puede deshacer.` });
    if (!ok) return;
    db.clients = db.clients.filter(x => x.id !== c.id);
    commit(`Cliente ${c.name} eliminado.`);
  },
});

/* ---------- 15. Editor de presupuestos y ventas ---------- */

const clientOptions = sel => `<option value="">Seleccioná un cliente…</option>${db.clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}`;

function paymentFieldsHTML({ amount = '', method = 'transferencia', label = 'Importe', note = '' } = {}) {
  return `<div class="form-grid">
    ${F(label, `<div class="input-group"><input type="number" name="payAmount" min="0" step="100" value="${amount}"><span class="addon">ARS</span></div>`, { req: true })}
    ${F('Medio de pago', `<select name="payMethod">${PAY_METHODS.map(pm => `<option value="${pm.id}" ${pm.id === method ? 'selected' : ''}>${pm.label}</option>`).join('')}</select>`)}
    ${F('Cuotas', `<select name="payInstallments">${INSTALLMENTS.map(i => `<option value="${i.n}">${i.n === 1 ? '1 pago' : i.n + ' cuotas'}${i.pct ? ` (recargo ${Math.round(i.pct * 100)}%)` : ' sin recargo'}</option>`).join('')}</select>`)}
    ${F('Fecha de cobro', `<input type="date" name="payDate" value="${todayISO()}" max="${todayISO()}">`)}
    ${F('Referencia / nota', `<input name="payNote" maxlength="80" value="${esc(note)}" placeholder="Ej.: N° de operación">`, { full: true })}
    <div class="full callout" data-pay-summary></div>
  </div>`;
}
function bindPaymentFields(root) {
  const amountEl = $('[name=payAmount]', root), methodEl = $('[name=payMethod]', root), instEl = $('[name=payInstallments]', root);
  const dateEl = $('[name=payDate]', root), noteEl = $('[name=payNote]', root), summary = $('[data-pay-summary]', root);
  const update = () => {
    const isCred = methodEl.value === 'credito';
    instEl.closest('.field').style.display = isCred ? '' : 'none';
    if (!isCred) instEl.value = '1';
    const amt = Number(amountEl.value) || 0;
    const inst = INSTALLMENTS.find(i => i.n === Number(instEl.value)) || INSTALLMENTS[0];
    const charged = Math.round(amt * (1 + (isCred ? inst.pct : 0)));
    if (amt <= 0) summary.innerHTML = `${icon('alert')}<span>Sin cobro: no se registrará ningún pago en este paso.</span>`;
    else if (isCred && inst.n > 1) summary.innerHTML = `${icon('card')}<span>El cliente abona <b>${money(charged)}</b> en ${inst.n} cuotas de <b>${money(charged / inst.n)}</b> (recargo ${Math.round(inst.pct * 100)}%). Se imputan ${money(amt)} al saldo. Simulación: no se procesa ningún cobro real.</span>`;
    else summary.innerHTML = `${icon('cash')}<span>Se registra un cobro de <b>${money(amt)}</b> por ${esc(methodLabel(methodEl.value).toLowerCase())}. Simulación: no se procesa ningún cobro real.</span>`;
  };
  [amountEl, methodEl, instEl].forEach(el => { el.addEventListener('input', update); el.addEventListener('change', update); });
  update();
  return {
    amountEl, dateEl, update,
    read: () => ({ amount: amountEl.value === '' ? NaN : Number(amountEl.value), method: methodEl.value, installments: Number(instEl.value), date: dateEl.value, note: noteEl.value.trim() }),
  };
}
// Valida los datos de un cobro y devuelve true si son correctos
function checkPayment(v, pay, api, { max, minDate, required }) {
  if (required || pay.amount !== 0) {
    v.check(Number.isFinite(pay.amount) && pay.amount >= 0, api.amountEl, 'Ingresá un importe válido.')
      && v.check(!required || pay.amount > 0, api.amountEl, 'El importe debe ser mayor a $0.')
      && v.check(pay.amount <= max, api.amountEl, `No puede superar ${money(max)}.`)
      && v.check(Number.isInteger(pay.amount), api.amountEl, 'Ingresá un importe sin centavos.');
  }
  if (pay.amount > 0) {
    v.check(!!pay.date, api.dateEl, 'Indicá la fecha de cobro.')
      && v.check(pay.date <= todayISO(), api.dateEl, 'La fecha no puede ser futura.')
      && v.check(!minDate || pay.date >= minDate, api.dateEl, `No puede ser anterior al ${fmtDate(minDate)}.`);
  }
}

function itemsTable(items, { showStage = false } = {}) {
  return `<div class="table-wrap"><table class="table table-compact"><thead><tr><th>Mueble</th><th class="right">Cant.</th><th class="right">Unitario</th><th class="right">Subtotal</th>${showStage ? '<th>Producción</th>' : ''}</tr></thead><tbody>
    ${items.map(it => `<tr><td><div class="item-name">${esc(it.name)}</div><div class="item-cfg">${esc(cfgSummary(it.cfg))}</div></td><td class="right num">${it.qty}</td><td class="right num">${money(it.unitPrice)}</td><td class="right num strong">${money(it.unitPrice * it.qty)}</td>
      ${showStage ? `<td style="min-width:150px">${stageBadge(it.stage)}<div class="stage-steps" style="margin-top:6px">${STAGES.map((s, i) => `<i class="${i <= stageIndex(it.stage) ? 'on' : ''}"></i>`).join('')}</div></td>` : ''}</tr>`).join('')}
  </tbody></table></div>`;
}
function totalsHTML(doc, extra = '') {
  const t = docTotals(doc);
  return `<div class="totals"><div><span class="muted">Subtotal</span><span class="num">${money(t.subtotal)}</span></div>
    <div><span class="muted">Descuento (${doc.discountPct || 0}%)</span><span class="num">− ${money(t.discount)}</span></div>
    <div class="grand"><span>Total</span><span class="num">${money(t.total)}</span></div>${extra}</div>`;
}

function openDocEditor(kind, existing = null, preset = {}) {
  const isQuote = kind === 'quote';
  if (!db.products.length) { toast('Primero cargá productos en el catálogo.', 'error'); return; }
  const T = todayISO();
  const d = existing ? structuredClone(existing) : {
    clientId: preset.clientId || '', date: T, validUntil: addDays(T, 15), estimatedDate: addDays(T, 35),
    items: (preset.items || []).map(it => ({ ...it, id: uid('it') })), discountPct: 0, notes: '',
  };
  let payTouched = false;
  const title = isQuote ? (existing ? `Editar presupuesto ${existing.number}` : 'Nuevo presupuesto') : 'Nueva venta';
  const m = openModal({
    title, subtitle: isQuote ? 'Cotización personalizada con muebles configurados.' : 'Registrá la operación, el anticipo y el medio de pago. Los muebles ingresan a producción como “Pendiente”.', size: 'lg',
    body: `<form novalidate>
      <div class="form-grid form-grid-3">
        ${F('Cliente', `<div class="row" style="flex-wrap:nowrap"><select name="clientId">${clientOptions(d.clientId)}</select><button type="button" class="icon-btn" data-new-client title="Registrar cliente nuevo" aria-label="Nuevo cliente">${icon('plus')}</button></div>`, { req: true })}
        ${F(isQuote ? 'Fecha' : 'Fecha de venta', `<input type="date" name="date" value="${d.date}">`, { req: true })}
        ${isQuote ? F('Válido hasta', `<input type="date" name="validUntil" value="${d.validUntil}">`, { req: true }) : F('Entrega estimada', `<input type="date" name="estimatedDate" value="${d.estimatedDate}">`, { req: true, hint: 'Plazo habitual: 30 a 45 días.' })}
      </div>
      <div class="form-section">
        <div class="row space-between" style="margin-bottom:10px"><h4 style="margin:0">Muebles configurados</h4><button type="button" class="btn btn-secondary btn-sm" data-add-item>${icon('plus')}Agregar mueble</button></div>
        <div class="field" data-items-field><div class="card doc-items" data-items></div><div class="field-error"></div></div>
      </div>
      <div class="form-grid form-section">
        <div class="stack" style="gap:14px">
          ${F('Descuento', `<div class="input-group"><input type="number" name="discountPct" min="0" max="40" step="0.5" value="${d.discountPct}"><span class="addon">%</span></div>`, { hint: 'Entre 0% y 40%.' })}
          ${F('Observaciones', `<textarea name="notes" maxlength="500" placeholder="Condiciones especiales, detalles de instalación…">${esc(d.notes)}</textarea>`)}
        </div>
        <div data-totals></div>
      </div>
      ${isQuote ? '' : `<div class="form-section"><h4>Anticipo</h4>${paymentFieldsHTML({ label: 'Importe del anticipo', note: 'Anticipo' })}</div>`}
    </form>`,
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-save>${icon('check')}${isQuote ? 'Guardar presupuesto' : 'Registrar venta'}</button>`,
  });
  const form = $('form', m);
  const pay = isQuote ? null : bindPaymentFields(form);
  if (pay) pay.amountEl.addEventListener('input', () => { payTouched = true; });

  const drawTotals = () => {
    const t = docTotals(d);
    if (pay && !payTouched) { pay.amountEl.value = round100(t.total * 0.5) || ''; pay.update(); }
    $('[data-totals]', m).innerHTML = totalsHTML(d, pay ? `<div><span class="muted">Saldo luego del anticipo</span><span class="num">${money(Math.max(0, t.total - (Number(pay.amountEl.value) || 0)))}</span></div>` : '');
  };
  const drawItems = () => {
    $('[data-items]', m).innerHTML = d.items.length ? `<div class="table-wrap"><table class="table table-compact"><thead><tr><th>Mueble</th><th class="right">Cant.</th><th class="right">Unitario</th><th class="right">Subtotal</th><th></th></tr></thead><tbody>
      ${d.items.map((it, i) => `<tr><td><div class="item-name">${esc(it.name)}</div><div class="item-cfg">${esc(cfgSummary(it.cfg))}</div></td>
        <td class="right"><input type="number" class="input qty-input" min="1" max="99" step="1" value="${it.qty}" data-qty="${i}" aria-label="Cantidad"></td>
        <td class="right num">${money(it.unitPrice)}</td><td class="right num strong" data-sub="${i}">${money(it.unitPrice * it.qty)}</td>
        <td><div class="actions" style="flex-wrap:nowrap"><button type="button" class="icon-btn sm" data-edit-item="${i}" title="${getProduct(it.productId) ? 'Reconfigurar' : 'El producto ya no existe'}" ${getProduct(it.productId) ? '' : 'disabled'}>${icon('edit')}</button><button type="button" class="icon-btn sm danger" data-del-item="${i}" title="Quitar">${icon('trash')}</button></div></td></tr>`).join('')}
      </tbody></table></div>` : emptyHTML('sofa', 'Sin muebles', 'Agregá al menos un mueble configurado.');
    drawTotals();
  };
  drawItems();

  m.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-add-item')) openConfiguratorModal({ onConfirm: it => { d.items.push(it); drawItems(); setError($('[data-items-field]', m), ''); } });
    else if (t.dataset.editItem !== undefined) { const i = Number(t.dataset.editItem); openConfiguratorModal({ item: d.items[i], onConfirm: it => { d.items[i] = it; drawItems(); } }); }
    else if (t.dataset.delItem !== undefined) { d.items.splice(Number(t.dataset.delItem), 1); drawItems(); }
    else if (t.hasAttribute('data-new-client')) openClientForm(null, c => { form.elements.clientId.innerHTML = clientOptions(c.id); d.clientId = c.id; setError(form.elements.clientId, ''); });
  });
  m.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.qty !== undefined) {
      const i = Number(t.dataset.qty), n = Number(t.value);
      d.items[i].qty = t.value === '' ? NaN : n;
      $(`[data-sub="${i}"]`, m).textContent = Number.isInteger(n) && n > 0 ? money(d.items[i].unitPrice * n) : '—';
      drawTotals();
    } else if (t.name === 'discountPct') {
      const n = Number(t.value);
      d.discountPct = Number.isFinite(n) ? clamp(n, 0, 40) : 0;
      drawTotals();
    } else if (t.name === 'payAmount') drawTotals();
  });

  $('[data-save]', m).addEventListener('click', () => {
    const el = n => form.elements[n];
    const v = validator(form);
    const clientId = el('clientId').value, date = el('date').value;
    v.check(!!getClient(clientId), el('clientId'), 'Seleccioná un cliente.');
    v.check(!!date, el('date'), 'Indicá la fecha.');
    if (!isQuote) v.check(!date || date <= T, el('date'), 'La fecha de venta no puede ser futura.');
    const endName = isQuote ? 'validUntil' : 'estimatedDate', end = el(endName).value;
    v.check(!!end, el(endName), 'Fecha obligatoria.') && v.check(!date || end >= date, el(endName), 'Debe ser igual o posterior a la fecha del documento.');
    const itemsField = $('[data-items-field]', m);
    v.check(d.items.length > 0, itemsField, 'Agregá al menos un mueble.')
      && v.check(d.items.every(it => Number.isInteger(it.qty) && it.qty >= 1 && it.qty <= 99), itemsField, 'Las cantidades deben ser enteros entre 1 y 99.');
    const disc = el('discountPct').value === '' ? 0 : Number(el('discountPct').value);
    v.check(Number.isFinite(disc) && disc >= 0 && disc <= 40, el('discountPct'), 'El descuento debe estar entre 0% y 40%.');
    let payment = null;
    if (pay) {
      payment = pay.read();
      checkPayment(v, payment, pay, { max: docTotals({ ...d, discountPct: disc }).total, minDate: date, required: false });
    }
    if (!v.ok()) return;

    const fields = { clientId, date, items: d.items, discountPct: disc, notes: el('notes').value.trim() };
    if (isQuote) {
      fields.validUntil = end;
      if (existing) {
        Object.assign(getQuote(existing.id), fields, { updatedAt: T });
        closeModal(m);
        commit(`Presupuesto ${existing.number} actualizado.`);
      } else {
        const q = { id: uid('q'), number: nextNumber('quote'), status: 'borrador', saleId: null, ...fields, createdAt: T, history: [{ status: 'borrador', date: T }] };
        db.quotes.push(q);
        closeModal(m);
        commit(`Presupuesto ${q.number} creado como borrador.`);
        openQuoteDetail(q.id);
      }
    } else {
      const s = createSale({ ...fields, estimatedDate: end }, payment);
      closeModal(m);
      commit(`Venta ${s.number} registrada${payment && payment.amount > 0 ? ` con anticipo de ${money(payment.amount)}` : ''}.`);
      openSaleDetail(s.id);
    }
  });
}

function createSale({ clientId, date, estimatedDate, items, discountPct, notes, quoteId = null }, payment) {
  const s = {
    id: uid('s'), number: nextNumber('sale'), clientId, date, estimatedDate, discountPct, notes, quoteId, payments: [], createdAt: todayISO(),
    items: items.map(it => ({ ...cloneItem(it), stage: 'pendiente', history: [{ stage: 'pendiente', date: todayISO() }] })),
  };
  if (payment && payment.amount > 0) s.payments.push(makePayment(payment, 'Anticipo'));
  db.sales.push(s);
  return s;
}

/* ---------- 16. Presupuestos ---------- */

function renderQuotes() {
  const T = todayISO(), f = ui.quotes;
  const decided = db.quotes.filter(q => ['aprobado', 'convertido', 'rechazado'].includes(q.status));
  const won = decided.filter(q => q.status !== 'rechazado').length;
  const sent = db.quotes.filter(q => q.status === 'enviado' && !isQuoteExpired(q));
  const approved = db.quotes.filter(q => q.status === 'aprobado');
  const monthQ = db.quotes.filter(q => monthKey(q.date) === monthKey(T));
  const count = st => st === 'vencido' ? db.quotes.filter(isQuoteExpired).length : st ? db.quotes.filter(q => q.status === st).length : db.quotes.length;
  const chip = (st, label) => `<button type="button" class="chip-btn ${f.status === st ? 'active' : ''}" data-action="quotes-filter" data-status="${st}">${label}<em>${count(st)}</em></button>`;
  view().innerHTML = `
    <section class="kpis">
      ${kpi({ label: 'Esperando respuesta', value: sent.length, foot: money(sum(sent, q => docTotals(q).total)) + ' cotizados', ic: 'file', tone: 'info' })}
      ${kpi({ label: 'Aprobados por convertir', value: approved.length, foot: money(sum(approved, q => docTotals(q).total)), ic: 'check', tone: 'sage' })}
      ${kpi({ label: 'Tasa de aprobación', value: decided.length ? Math.round(won / decided.length * 100) + '%' : '—', foot: `${won} de ${decided.length} presupuestos resueltos`, ic: 'chart' })}
      ${kpi({ label: 'Cotizado este mes', value: money(sum(monthQ, q => docTotals(q).total)), foot: `${monthQ.length} presupuestos emitidos`, ic: 'cash', tone: 'warning' })}
    </section>
    <div class="toolbar section-gap">
      <div class="search">${icon('search')}<input type="search" id="q-q" placeholder="Buscar por número o cliente…" value="${esc(f.q)}" aria-label="Buscar presupuestos"></div>
      <span class="spacer"></span>
      <button type="button" class="btn btn-primary" data-action="new-quote">${icon('plus')}Nuevo presupuesto</button>
    </div>
    <div class="chips" style="margin-bottom:16px">${chip('', 'Todos')}${Object.entries(QUOTE_STATUS).map(([k, s]) => chip(k, s.label)).join('')}${chip('vencido', 'Vencidos')}</div>
    <div class="card" id="q-results"></div>`;
  $('#q-q').addEventListener('input', e => { ui.quotes.q = e.target.value; drawQuotes(); });
  drawQuotes();
}
function drawQuotes() {
  const f = ui.quotes, q = f.q.trim().toLowerCase();
  const list = db.quotes.filter(x => (f.status === 'vencido' ? isQuoteExpired(x) : !f.status || x.status === f.status) && (!q || `${x.number} ${clientName(x.clientId)}`.toLowerCase().includes(q)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
  $('#q-results').innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>N°</th><th>Cliente</th><th>Fecha</th><th>Válido hasta</th><th class="right">Total</th><th>Estado</th><th></th></tr></thead><tbody>
    ${list.map(x => `<tr class="clickable" data-action="quote-view" data-id="${x.id}"><td><span class="strong">${x.number}</span><span class="sub">${x.items.length} mueble${x.items.length === 1 ? '' : 's'}</span></td><td>${esc(clientName(x.clientId))}</td><td class="nowrap">${fmtDate(x.date)}</td><td class="nowrap">${fmtDate(x.validUntil)}</td><td class="right num strong">${money(docTotals(x).total)}</td><td>${quoteBadge(x)}</td>
      <td><div class="actions" style="flex-wrap:nowrap">
        ${['borrador', 'enviado'].includes(x.status) ? `<button type="button" class="icon-btn sm" data-action="quote-edit" data-id="${x.id}" title="Editar">${icon('edit')}</button>` : ''}
        ${x.status === 'aprobado' ? `<button type="button" class="btn btn-success btn-sm" data-action="quote-convert" data-id="${x.id}">${icon('arrow')}Convertir</button>` : ''}
        <button type="button" class="icon-btn sm" data-action="quote-print" data-id="${x.id}" title="Imprimir / PDF">${icon('printer')}</button>
      </div></td></tr>`).join('')}
  </tbody></table></div>` : emptyHTML('file', 'No hay presupuestos', 'Cambiá el filtro o creá un presupuesto nuevo.');
}

function openQuoteDetail(id) {
  const m = openModal({ size: 'lg', backdropClose: true });
  const draw = () => {
    const q = getQuote(id);
    if (!q) { closeModal(m); return; }
    const c = getClient(q.clientId), sale = q.saleId ? getSale(q.saleId) : null;
    const btn = (to, label, cls = 'btn-secondary', ic = 'check') => `<button type="button" class="btn ${cls}" data-action="quote-status" data-id="${q.id}" data-to="${to}">${icon(ic)}${label}</button>`;
    const statusBtns = {
      borrador: `<button type="button" class="btn btn-secondary" data-action="quote-edit" data-id="${q.id}">${icon('edit')}Editar</button>${btn('enviado', 'Marcar como enviado', 'btn-primary', 'arrow')}`,
      enviado: `<button type="button" class="btn btn-secondary" data-action="quote-edit" data-id="${q.id}">${icon('edit')}Editar</button>${btn('rechazado', 'Rechazado', 'btn-soft-danger', 'x')}${btn('aprobado', 'Aprobado', 'btn-success')}`,
      aprobado: `${btn('enviado', 'Volver a enviado', 'btn-ghost', 'left')}<button type="button" class="btn btn-primary" data-action="quote-convert" data-id="${q.id}">${icon('arrow')}Convertir en pedido</button>`,
      rechazado: btn('borrador', 'Reabrir como borrador', 'btn-secondary', 'refresh'),
      convertido: sale ? `<button type="button" class="btn btn-primary" data-action="sale-view" data-id="${sale.id}">${icon('bag')}Ver pedido ${sale.number}</button>` : '',
    }[q.status];
    setModalContent(m, {
      title: `Presupuesto ${q.number}`, subtitle: esc(clientName(q.clientId)),
      body: `<div class="info-strip">
          <div><small>Cliente</small><strong>${esc(c?.name || 'Cliente eliminado')}</strong></div>
          <div><small>Fecha</small><strong>${fmtDate(q.date)}</strong></div>
          <div><small>Válido hasta</small><strong>${fmtDate(q.validUntil)}</strong></div>
          <div><small>Estado</small><div>${quoteBadge(q)}</div></div>
        </div>
        ${sale ? `<div class="callout success section-gap">${icon('check')}<span>Convertido en el pedido <b>${sale.number}</b> el ${fmtDate(sale.date)}.</span></div>` : ''}
        ${isQuoteExpired(q) ? `<div class="callout warning section-gap">${icon('alert')}<span>Este presupuesto venció el ${fmtDate(q.validUntil)}. Al aprobarlo se extenderá su validez 15 días con los mismos precios.</span></div>` : ''}
        <div class="card section-gap doc-items">${itemsTable(q.items)}</div>
        <div class="row section-gap" style="align-items:flex-start;gap:20px">
          <div style="flex:1;min-width:220px">${q.notes ? `<div class="label">Observaciones</div><p class="muted" style="margin-top:4px">${esc(q.notes)}</p>` : ''}
            ${q.history?.length ? `<div class="label" style="margin-top:12px">Historial</div><div class="timeline" style="margin-top:4px">${q.history.map(h => `<span><b>${QUOTE_STATUS[h.status]?.label}</b> ${fmtShort(h.date)}</span>`).join('')}</div>` : ''}</div>
          ${totalsHTML(q)}
        </div>`,
      footer: `<div class="left">
          ${q.status !== 'convertido' ? `<button type="button" class="icon-btn danger" data-action="quote-delete" data-id="${q.id}" title="Eliminar">${icon('trash')}</button>` : ''}
          <button type="button" class="icon-btn" data-action="quote-dup" data-id="${q.id}" title="Duplicar">${icon('copy')}</button>
          <button type="button" class="icon-btn" data-action="quote-print" data-id="${q.id}" title="Imprimir / guardar PDF">${icon('printer')}</button>
        </div>${statusBtns}`,
    });
  };
  modalEntry(m).rerender = draw;
  draw();
}

async function setQuoteStatus(id, to) {
  const q = getQuote(id), T = todayISO();
  const allowed = { borrador: ['enviado'], enviado: ['aprobado', 'rechazado', 'borrador'], aprobado: ['enviado'], rechazado: ['borrador'], convertido: [] };
  if (!allowed[q.status].includes(to)) { toast('Ese cambio de estado no está permitido.', 'error'); return; }
  if (to === 'aprobado' && isQuoteExpired(q)) {
    const ok = await confirmDialog({ title: 'Presupuesto vencido', message: `El presupuesto <b>${q.number}</b> venció el ${fmtDate(q.validUntil)}. ¿Extender la validez 15 días y marcarlo como aprobado?`, confirmText: 'Extender y aprobar' });
    if (!ok) return;
    q.validUntil = addDays(T, 15);
  }
  if (to === 'rechazado') {
    const ok = await confirmDialog({ title: 'Marcar como rechazado', message: `¿El cliente rechazó el presupuesto <b>${q.number}</b>? Podrás reabrirlo más adelante.`, confirmText: 'Marcar rechazado', danger: true });
    if (!ok) return;
  }
  q.status = to;
  q.history = q.history || [];
  q.history.push({ status: to, date: T });
  commit(`Presupuesto ${q.number}: ${QUOTE_STATUS[to].label.toLowerCase()}.`, to === 'rechazado' ? 'warning' : 'success');
  if (to === 'aprobado') toast('Ya podés convertirlo en pedido.', 'info', { actionLabel: 'Convertir', onAction: () => openConvertQuote(q.id) });
}

function openConvertQuote(id) {
  const q = getQuote(id);
  if (!q || q.status !== 'aprobado') { toast('Solo se pueden convertir presupuestos aprobados.', 'error'); return; }
  if (!getClient(q.clientId)) { toast('El cliente del presupuesto ya no existe.', 'error'); return; }
  const t = docTotals(q), T = todayISO();
  const m = openModal({
    title: `Convertir ${q.number} en pedido`, subtitle: `${esc(clientName(q.clientId))} · Total ${money(t.total)}`, size: 'lg',
    body: `<form novalidate>
      <div class="callout">${icon('alert')}<span>Se creará una venta con los ${q.items.length} mueble(s) del presupuesto y se enviarán a producción en estado “Pendiente”.</span></div>
      <div class="form-grid section-gap">${F('Entrega estimada', `<input type="date" name="estimatedDate" value="${addDays(T, 35)}">`, { req: true, hint: 'Plazo habitual: 30 a 45 días.' })}</div>
      <div class="form-section"><h4>Anticipo</h4>${paymentFieldsHTML({ amount: round100(t.total * 0.5), label: 'Importe del anticipo', note: 'Anticipo' })}</div>
    </form>`,
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-ok>${icon('check')}Crear pedido</button>`,
  });
  const form = $('form', m), pay = bindPaymentFields(form);
  $('[data-ok]', m).addEventListener('click', () => {
    const v = validator(form), est = form.elements.estimatedDate;
    v.check(!!est.value, est, 'Indicá la fecha estimada.') && v.check(est.value >= T, est, 'Debe ser hoy o posterior.');
    const payment = pay.read();
    checkPayment(v, payment, pay, { max: t.total, minDate: q.date, required: false });
    if (!v.ok()) return;
    const s = createSale({ clientId: q.clientId, date: T, estimatedDate: est.value, items: q.items, discountPct: q.discountPct, notes: q.notes, quoteId: q.id }, payment);
    q.status = 'convertido';
    q.saleId = s.id;
    q.history = q.history || [];
    q.history.push({ status: 'convertido', date: T });
    closeAllModals();
    commit(`Pedido ${s.number} creado a partir de ${q.number}.`);
    openSaleDetail(s.id);
  });
}

function printQuote(id) {
  const q = getQuote(id), c = getClient(q.clientId), t = docTotals(q);
  $('#print-area').innerHTML = `<div class="print-doc">
    <header><div><h1>Atelier Nogal</h1><div>Muebles a medida · Showroom Palermo</div><div>Buenos Aires, Argentina</div></div>
      <div style="text-align:right"><h2 style="margin:0">Presupuesto ${q.number}</h2><div>Fecha: ${fmtDate(q.date)}</div><div>Válido hasta: ${fmtDate(q.validUntil)}</div></div></header>
    <div><b>Cliente:</b> ${esc(c?.name || '—')}<br>${esc(c ? `${c.address}, ${c.city}` : '')}<br>${esc(c ? `${c.phone} · ${c.email}` : '')}</div>
    <table><thead><tr><th>Mueble y configuración</th><th class="r">Cant.</th><th class="r">Unitario</th><th class="r">Subtotal</th></tr></thead><tbody>
      ${q.items.map(it => `<tr><td><b>${esc(it.name)}</b><br><span style="color:#666">${esc(cfgSummary(it.cfg))}</span></td><td class="r">${it.qty}</td><td class="r">${money(it.unitPrice)}</td><td class="r">${money(it.unitPrice * it.qty)}</td></tr>`).join('')}
    </tbody></table>
    <table style="width:auto;margin-left:auto"><tbody>
      <tr><td>Subtotal</td><td class="r">${money(t.subtotal)}</td></tr>
      <tr><td>Descuento (${q.discountPct || 0}%)</td><td class="r">− ${money(t.discount)}</td></tr>
      <tr><td><b>Total</b></td><td class="r"><b>${money(t.total)}</b></td></tr>
    </tbody></table>
    ${q.notes ? `<p><b>Observaciones:</b> ${esc(q.notes)}</p>` : ''}
    <footer>Precios en pesos argentinos con IVA incluido. Para iniciar la fabricación se requiere un anticipo del 50%; el saldo se abona contra entrega.
      Plazo estimado de fabricación: 30 a 45 días desde la confirmación. Documento generado por el prototipo de gestión Atelier Nogal.</footer>
  </div>`;
  window.print();
}

Object.assign(actions, {
  'quotes-filter': d => { ui.quotes.status = d.status; renderQuotes(); },
  'quote-view': d => openQuoteDetail(d.id),
  'quote-edit': d => {
    const q = getQuote(d.id);
    if (!['borrador', 'enviado'].includes(q.status)) { toast('Solo se pueden editar presupuestos en borrador o enviados.', 'error'); return; }
    openDocEditor('quote', q);
  },
  'quote-status': d => setQuoteStatus(d.id, d.to),
  'quote-convert': d => openConvertQuote(d.id),
  'quote-print': d => printQuote(d.id),
  'quote-dup': d => {
    const q = getQuote(d.id), T = todayISO();
    const copy = { id: uid('q'), number: nextNumber('quote'), clientId: q.clientId, date: T, validUntil: addDays(T, 15), items: q.items.map(cloneItem), discountPct: q.discountPct, notes: q.notes, status: 'borrador', saleId: null, createdAt: T, history: [{ status: 'borrador', date: T }] };
    db.quotes.push(copy);
    closeAllModals();
    commit(`Presupuesto duplicado como ${copy.number}.`);
    openQuoteDetail(copy.id);
  },
  'quote-delete': async d => {
    const q = getQuote(d.id);
    if (q.status === 'convertido') { toast('No se puede eliminar un presupuesto convertido en pedido.', 'error'); return; }
    const ok = await confirmDialog({ title: 'Eliminar presupuesto', danger: true, confirmText: 'Eliminar', message: `¿Eliminar el presupuesto <b>${q.number}</b> de ${esc(clientName(q.clientId))}? Esta acción no se puede deshacer.` });
    if (!ok) return;
    db.quotes = db.quotes.filter(x => x.id !== q.id);
    commit(`Presupuesto ${q.number} eliminado.`);
  },
});

/* ---------- 17. Ventas ---------- */

function renderSales() {
  const T = todayISO(), f = ui.sales;
  const monthSales = db.sales.filter(s => monthKey(s.date) === monthKey(T));
  const active = db.sales.filter(s => saleStage(s) !== 'entregado');
  const chip = (val, label) => `<button type="button" class="chip-btn ${f.pay === val ? 'active' : ''}" data-action="sales-pay" data-val="${val}">${label}</button>`;
  view().innerHTML = `
    <section class="kpis">
      ${kpi({ label: 'Vendido este mes', value: money(sum(monthSales, s => docTotals(s).total)), foot: `${monthSales.length} operaciones`, ic: 'bag' })}
      ${kpi({ label: 'Cobrado este mes', value: money(sum(allPayments().filter(p => monthKey(p.date) === monthKey(T)), p => p.amount)), foot: 'Anticipos y saldos', ic: 'cash', tone: 'sage' })}
      ${kpi({ label: 'Saldo por cobrar', value: money(sum(db.sales, saleBalance)), foot: `${db.sales.filter(s => saleBalance(s) > 0).length} pedidos con saldo`, ic: 'card', tone: 'warning' })}
      ${kpi({ label: 'Pedidos activos', value: active.length, foot: `${active.filter(isSaleLate).length} fuera de plazo`, ic: 'tool', tone: 'info' })}
    </section>
    <div class="toolbar section-gap">
      <div class="search">${icon('search')}<input type="search" id="s-q" placeholder="Buscar por número, cliente o mueble…" value="${esc(f.q)}" aria-label="Buscar ventas"></div>
      <select id="s-stage" aria-label="Estado de producción"><option value="">Toda la producción</option>${STAGES.map(s => `<option value="${s.id}" ${f.stage === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select>
      <span class="spacer"></span>
      <button type="button" class="btn btn-primary" data-action="new-sale">${icon('plus')}Nueva venta</button>
    </div>
    <div class="chips" style="margin-bottom:16px">${chip('', 'Todas')}${chip('saldo', 'Con saldo pendiente')}${chip('pagado', 'Pagadas')}</div>
    <div class="card" id="s-results"></div>`;
  $('#s-q').addEventListener('input', e => { ui.sales.q = e.target.value; drawSales(); });
  $('#s-stage').addEventListener('change', e => { ui.sales.stage = e.target.value; drawSales(); });
  drawSales();
}
function drawSales() {
  const f = ui.sales, q = f.q.trim().toLowerCase();
  const list = db.sales.filter(s => {
    const bal = saleBalance(s);
    return (!q || `${s.number} ${clientName(s.clientId)} ${s.items.map(i => i.name).join(' ')}`.toLowerCase().includes(q))
      && (!f.stage || saleStage(s) === f.stage) && (!f.pay || (f.pay === 'saldo' ? bal > 0 : bal === 0));
  }).sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
  $('#s-results').innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th class="right">Total</th><th class="right">Cobrado</th><th>Pago</th><th>Producción</th><th>Entrega est.</th><th></th></tr></thead><tbody>
    ${list.map(s => {
      const t = docTotals(s);
      return `<tr class="clickable" data-action="sale-view" data-id="${s.id}"><td><span class="strong">${s.number}</span><span class="sub">${fmtDate(s.date)} · ${s.items.length} mueble${s.items.length === 1 ? '' : 's'}</span></td><td>${esc(clientName(s.clientId))}</td><td class="right num strong">${money(t.total)}</td><td class="right num">${money(salePaid(s))}</td><td>${payBadge(s)}</td><td>${stageBadge(saleStage(s))}</td>
        <td class="nowrap">${fmtDate(s.estimatedDate)}${isSaleLate(s) ? ' ' + badge('Atrasado', 'danger') : ''}</td>
        <td><div class="actions" style="flex-wrap:nowrap">${saleBalance(s) > 0 ? `<button type="button" class="icon-btn sm" data-action="sale-pay" data-id="${s.id}" title="Registrar cobro">${icon('cash')}</button>` : ''}<button type="button" class="icon-btn sm" data-action="sale-view" data-id="${s.id}" title="Ver detalle">${icon('eye')}</button></div></td></tr>`;
    }).join('')}
  </tbody></table></div>` : emptyHTML('bag', 'No hay ventas', 'Cambiá los filtros o registrá una venta nueva.');
}

function openSaleDetail(id) {
  const m = openModal({ size: 'lg', backdropClose: true });
  const draw = () => {
    const s = getSale(id);
    if (!s) { closeModal(m); return; }
    const c = getClient(s.clientId), t = docTotals(s), paid = salePaid(s), bal = saleBalance(s), st = saleStage(s);
    const del = activeDelivery(s.id) || db.deliveries.filter(d => d.saleId === s.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    const quote = s.quoteId ? getQuote(s.quoteId) : null;
    setModalContent(m, {
      title: `Pedido ${s.number}`, subtitle: `${esc(c?.name || 'Cliente eliminado')}${quote ? ` · originado en ${quote.number}` : ''}`,
      body: `<div class="info-strip">
          <div><small>Fecha de venta</small><strong>${fmtDate(s.date)}</strong></div>
          <div><small>Entrega estimada</small><strong>${fmtDate(s.estimatedDate)}</strong>${isSaleLate(s) ? ' ' + badge('Atrasado', 'danger') : ''}</div>
          <div><small>Producción</small><div>${stageBadge(st)}</div></div>
          <div><small>Pago</small><div>${payBadge(s)}</div></div>
        </div>
        <div class="card section-gap doc-items">${itemsTable(s.items, { showStage: true })}</div>
        <div class="grid grid-2 section-gap">
          <div class="card card-pad"><div class="row space-between" style="margin-bottom:10px"><h4 class="serif" style="font-size:19px">Cobros</h4>${bal > 0 ? `<button type="button" class="btn btn-secondary btn-sm" data-action="sale-pay" data-id="${s.id}">${icon('plus')}Registrar cobro</button>` : ''}</div>
            ${s.payments.length ? `<div class="list">${s.payments.slice().sort((a, b) => a.date.localeCompare(b.date)).map(p => `<div class="list-item"><div class="grow"><strong>${money(p.amount)}</strong><span class="sub">${fmtDate(p.date)} · ${esc(methodLabel(p.method))}${p.installments > 1 ? ` en ${p.installments} cuotas (abonó ${money(p.charged)})` : ''}${p.note ? ' · ' + esc(p.note) : ''}</span></div><button type="button" class="icon-btn sm danger" data-action="payment-delete" data-sale="${s.id}" data-id="${p.id}" title="Anular cobro">${icon('x')}</button></div>`).join('')}</div>` : emptyHTML('cash', 'Sin cobros registrados')}
            <div class="totals" style="margin-top:12px;max-width:none">
              <div><span class="muted">Subtotal</span><span class="num">${money(t.subtotal)}</span></div>
              <div><span class="muted">Descuento (${s.discountPct || 0}%)</span><span class="num">− ${money(t.discount)}</span></div>
              <div><span class="muted">Total</span><span class="num strong">${money(t.total)}</span></div>
              <div><span class="muted">Cobrado</span><span class="num">${money(paid)}</span></div>
              <div class="grand"><span>Saldo</span><span class="num" style="color:${bal ? 'var(--warning)' : 'var(--success)'}">${money(bal)}</span></div>
            </div>
            <div class="progress" style="margin-top:10px"><span style="width:${t.total ? Math.min(100, paid / t.total * 100) : 0}%"></span></div>
          </div>
          <div class="card card-pad"><h4 class="serif" style="font-size:19px;margin-bottom:10px">Entrega</h4>
            ${del ? `<dl class="spec-list">
                <dt>Estado</dt><dd>${deliveryBadge(del)}</dd>
                <dt>Fecha</dt><dd>${fmtDate(del.date)} · ${esc(del.slot)}</dd>
                <dt>Dirección</dt><dd>${esc(del.address)}</dd>
                <dt>Responsable</dt><dd>${esc(del.responsible)}</dd>
              </dl>
              ${del.status !== 'entregada' ? `<div class="row" style="margin-top:12px"><button type="button" class="btn btn-secondary btn-sm" data-action="delivery-edit" data-id="${del.id}">${icon('edit')}Editar</button>${del.status !== 'en_camino' ? `<button type="button" class="btn btn-secondary btn-sm" data-action="delivery-status" data-id="${del.id}" data-to="en_camino">${icon('truck')}En camino</button>` : ''}<button type="button" class="btn btn-success btn-sm" data-action="delivery-status" data-id="${del.id}" data-to="entregada">${icon('check')}Confirmar entrega</button></div>` : ''}`
              : `${emptyHTML('truck', 'Sin entrega programada', st === 'listo' ? 'El pedido está listo para entregar.' : 'Podés programarla aunque siga en producción.')}<div class="row" style="justify-content:center"><button type="button" class="btn btn-primary btn-sm" data-action="delivery-new" data-sale="${s.id}">${icon('calendar')}Programar entrega</button></div>`}
            <div class="label" style="margin-top:14px">Destino</div><p class="muted small">${esc(c ? `${c.address}, ${c.city} · ${c.phone}` : '—')}</p>
          </div>
        </div>
        ${s.notes ? `<div class="callout section-gap">${icon('alert')}<span>${esc(s.notes)}</span></div>` : ''}`,
      footer: `<div class="left"><button type="button" class="icon-btn danger" data-action="sale-delete" data-id="${s.id}" title="Eliminar venta">${icon('trash')}</button><button type="button" class="btn btn-ghost" data-action="sale-edit" data-id="${s.id}">${icon('edit')}Editar datos</button></div>
        ${quote ? `<button type="button" class="btn btn-ghost" data-action="quote-view" data-id="${quote.id}">${icon('file')}Ver ${quote.number}</button>` : ''}
        <button type="button" class="btn btn-secondary" data-action="go-close" data-href="produccion">${icon('tool')}Ver en producción</button>
        ${bal > 0 ? `<button type="button" class="btn btn-primary" data-action="sale-pay" data-id="${s.id}">${icon('cash')}Registrar cobro</button>` : ''}`,
    });
  };
  modalEntry(m).rerender = draw;
  draw();
}

function openPaymentModal(saleId, { note = '' } = {}) {
  const s = getSale(saleId), bal = saleBalance(s);
  if (bal <= 0) { toast(`El pedido ${s.number} no tiene saldo pendiente.`, 'info'); return; }
  const m = openModal({
    title: `Registrar cobro · ${s.number}`, subtitle: `${esc(clientName(s.clientId))} · Saldo pendiente ${money(bal)}`,
    body: `<form novalidate>${paymentFieldsHTML({ amount: bal, label: 'Importe a cobrar', note: note || (bal === saleBalance(s) && salePaid(s) > 0 ? 'Saldo' : '') })}</form>`,
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-ok>${icon('check')}Registrar cobro</button>`,
  });
  const form = $('form', m), pay = bindPaymentFields(form);
  $('[data-ok]', m).addEventListener('click', () => {
    const v = validator(form), p = pay.read();
    checkPayment(v, p, pay, { max: bal, minDate: s.date, required: true });
    if (!v.ok()) return;
    s.payments.push(makePayment(p, 'Cobro'));
    closeModal(m);
    const rest = saleBalance(s);
    commit(rest ? `Cobro de ${money(p.amount)} registrado. Saldo restante: ${money(rest)}.` : `Cobro registrado. El pedido ${s.number} quedó saldado.`);
  });
}

function openSaleEdit(id) {
  const s = getSale(id), paid = salePaid(s);
  const m = openModal({
    title: `Editar datos · ${s.number}`, subtitle: 'Los muebles no se modifican porque ya ingresaron a producción.',
    body: `<form class="form-grid" novalidate>
      ${F('Entrega estimada', `<input type="date" name="estimatedDate" value="${s.estimatedDate}">`, { req: true })}
      ${F('Descuento', `<div class="input-group"><input type="number" name="discountPct" min="0" max="40" step="0.5" value="${s.discountPct}"><span class="addon">%</span></div>`, { hint: paid ? `El total no puede quedar por debajo de lo cobrado (${money(paid)}).` : 'Entre 0% y 40%.' })}
      ${F('Observaciones', `<textarea name="notes" maxlength="500">${esc(s.notes)}</textarea>`, { full: true })}
    </form>`,
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-ok>${icon('check')}Guardar</button>`,
  });
  const form = $('form', m);
  $('[data-ok]', m).addEventListener('click', () => {
    const v = validator(form), el = n => form.elements[n];
    const est = el('estimatedDate').value, disc = el('discountPct').value === '' ? 0 : Number(el('discountPct').value);
    v.check(!!est, el('estimatedDate'), 'Fecha obligatoria.') && v.check(est >= s.date, el('estimatedDate'), 'No puede ser anterior a la venta.');
    v.check(Number.isFinite(disc) && disc >= 0 && disc <= 40, el('discountPct'), 'El descuento debe estar entre 0% y 40%.')
      && v.check(docTotals({ ...s, discountPct: disc }).total >= paid, el('discountPct'), `Con ese descuento el total quedaría por debajo de lo cobrado (${money(paid)}).`);
    if (!v.ok()) return;
    Object.assign(s, { estimatedDate: est, discountPct: disc, notes: el('notes').value.trim() });
    closeModal(m);
    commit(`Pedido ${s.number} actualizado.`);
  });
}

Object.assign(actions, {
  'sales-pay': d => { ui.sales.pay = d.val; renderSales(); },
  'sale-view': d => openSaleDetail(d.id),
  'sale-pay': d => openPaymentModal(d.id),
  'sale-edit': d => openSaleEdit(d.id),
  'go-close': d => { closeAllModals(); location.hash = d.href; },
  'payment-delete': async d => {
    const s = getSale(d.sale), p = s.payments.find(x => x.id === d.id);
    const ok = await confirmDialog({ title: 'Anular cobro', danger: true, confirmText: 'Anular cobro', message: `¿Anular el cobro de <b>${money(p.amount)}</b> del ${fmtDate(p.date)} (${esc(methodLabel(p.method))})? El saldo del pedido aumentará en ese importe.` });
    if (!ok) return;
    s.payments = s.payments.filter(x => x.id !== p.id);
    commit(`Cobro anulado. Saldo actual: ${money(saleBalance(s))}.`, 'warning');
  },
  'sale-delete': async d => {
    const s = getSale(d.id);
    if (saleStage(s) === 'entregado') { toast('No se puede eliminar un pedido ya entregado.', 'error'); return; }
    const ok = await confirmDialog({
      title: 'Eliminar venta', danger: true, confirmText: 'Eliminar venta',
      message: `¿Eliminar el pedido <b>${s.number}</b> de ${esc(clientName(s.clientId))}? Se quitará de producción${s.payments.length ? `, se eliminarán ${s.payments.length} cobro(s) registrados` : ''} y se cancelarán sus entregas.${s.quoteId ? ' El presupuesto de origen volverá a estado “Aprobado”.' : ''}`,
    });
    if (!ok) return;
    const q = s.quoteId && getQuote(s.quoteId);
    if (q) { q.status = 'aprobado'; q.saleId = null; q.history = q.history || []; q.history.push({ status: 'aprobado', date: todayISO() }); }
    db.deliveries = db.deliveries.filter(x => x.saleId !== s.id);
    db.sales = db.sales.filter(x => x.id !== s.id);
    commit(`Pedido ${s.number} eliminado.`, 'warning');
  },
});

/* ---------- 18. Producción ---------- */

function renderProduction() {
  const T = todayISO(), f = ui.prod;
  const items = productionItems();
  view().innerHTML = `
    <section class="kpis">
      ${STAGES.slice(0, 5).map((s, i) => kpi({ label: s.label, value: items.filter(x => x.item.stage === s.id).length, foot: 'muebles', ic: ['file', 'edit', 'tool', 'star', 'check'][i], tone: ['', 'info', 'warning', '', 'sage'][i] })).join('')}
    </section>
    <div class="toolbar section-gap">
      <div class="search">${icon('search')}<input type="search" id="p-q" placeholder="Buscar por pedido, cliente o mueble…" value="${esc(f.q)}" aria-label="Buscar en producción"></div>
      <label class="check"><input type="checkbox" id="p-del" ${f.showDelivered ? 'checked' : ''}>Mostrar todos los entregados</label>
    </div>
    <div class="kanban" id="kanban"></div>`;
  $('#p-q').addEventListener('input', e => { ui.prod.q = e.target.value; drawKanban(); });
  $('#p-del').addEventListener('change', e => { ui.prod.showDelivered = e.target.checked; drawKanban(); });
  drawKanban();
}
function drawKanban() {
  const T = todayISO(), f = ui.prod, q = f.q.trim().toLowerCase();
  const items = productionItems().filter(({ sale, item }) => (!q || `${sale.number} ${clientName(sale.clientId)} ${item.name}`.toLowerCase().includes(q))
    && (item.stage !== 'entregado' || f.showDelivered || (item.history.at(-1)?.date || '') >= addDays(T, -30)));
  $('#kanban').innerHTML = STAGES.map(st => {
    const col = items.filter(x => x.item.stage === st.id).sort((a, b) => a.sale.estimatedDate.localeCompare(b.sale.estimatedDate));
    if (st.id === 'entregado') col.reverse();
    return `<div class="k-col" data-stage="${st.id}">
      <div class="k-col-head"><h4><i style="background:${st.color}"></i>${st.label}</h4><span>${col.length}</span></div>
      ${col.length ? col.map(({ sale, item }) => {
        const idx = stageIndex(item.stage), late = isSaleLate(sale);
        return `<div class="k-card" draggable="${item.stage !== 'entregado'}" data-sale="${sale.id}" data-item="${item.id}">
          <div class="k-top"><span>${sale.number}</span>${late ? badge('Atrasado', 'danger') : ''}</div>
          <h5>${esc(item.name)}${item.qty > 1 ? ` × ${item.qty}` : ''}</h5>
          <p>${esc(clientName(sale.clientId))}</p>
          <p>${esc(cfgShort(item.cfg))}</p>
          <div class="stage-steps">${STAGES.map((s, i) => `<i class="${i <= idx ? 'on' : ''}"></i>`).join('')}</div>
          <div class="k-foot">
            <span class="k-date ${late ? 'late' : ''}" title="Entrega estimada">${icon('calendar')}${fmtShort(sale.estimatedDate)}</span>
            <div class="actions" style="flex-wrap:nowrap">
              <button type="button" class="icon-btn sm" data-action="sale-view" data-id="${sale.id}" title="Ver pedido">${icon('eye')}</button>
              <button type="button" class="icon-btn sm" data-action="stage-move" data-sale="${sale.id}" data-item="${item.id}" data-dir="-1" title="Etapa anterior" ${idx === 0 || item.stage === 'entregado' ? 'disabled' : ''}>${icon('left')}</button>
              <button type="button" class="icon-btn sm" data-action="stage-move" data-sale="${sale.id}" data-item="${item.id}" data-dir="1" title="Etapa siguiente" ${idx >= 4 ? 'disabled' : ''}>${icon('right')}</button>
            </div>
          </div></div>`;
      }).join('') : `<div class="k-empty">${st.id === 'entregado' ? 'Las entregas confirmadas aparecen aquí' : 'Sin muebles en esta etapa'}</div>`}
    </div>`;
  }).join('');

  $$('.k-card[draggable=true]').forEach(card => {
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', `${card.dataset.sale}|${card.dataset.item}`); e.dataTransfer.effectAllowed = 'move'; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });
  $$('.k-col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const [sid, iid] = e.dataTransfer.getData('text/plain').split('|');
      if (sid && iid) moveItemStage(sid, iid, col.dataset.stage);
    });
  });
}

function moveItemStage(saleId, itemId, to) {
  const s = getSale(saleId), it = s?.items.find(i => i.id === itemId);
  if (!it || it.stage === to) return;
  if (it.stage === 'entregado') { toast('Ese mueble ya fue entregado.', 'warning'); return; }
  if (to === 'entregado') {
    toast('La entrega se confirma desde el módulo Entregas, para mantener sincronizados pedidos y envíos.', 'warning', { actionLabel: 'Ir a Entregas', onAction: () => { location.hash = 'entregas'; } });
    return;
  }
  const del = activeDelivery(s.id);
  if (del && del.status === 'en_camino' && stageIndex(to) < stageIndex('listo')) { toast(`El pedido ${s.number} ya está en camino; no puede volver a taller.`, 'error'); return; }
  it.stage = to;
  it.history.push({ stage: to, date: todayISO() });
  saveDB();
  refresh();
  refreshModals();
  if (to === 'listo' && saleReady(s)) {
    toast(`Pedido ${s.number} completo y listo para entregar.`, 'success', del ? {} : { actionLabel: 'Programar entrega', onAction: () => openDeliveryModal(null, { saleId: s.id }) });
  } else toast(`${it.name} (${s.number}) → ${stageOf(to).label}.`);
}

actions['stage-move'] = d => {
  const s = getSale(d.sale), it = s.items.find(i => i.id === d.item);
  const idx = stageIndex(it.stage) + Number(d.dir);
  if (idx >= 0 && idx < STAGES.length) moveItemStage(d.sale, d.item, STAGES[idx].id);
};

/* ---------- 19. Entregas ---------- */

function renderDeliveries() {
  const T = todayISO(), f = ui.deliv;
  const active = db.deliveries.filter(d => d.status !== 'entregada');
  const readyNoDel = db.sales.filter(s => saleStage(s) === 'listo' && !activeDelivery(s.id));
  const days = Array.from({ length: 7 }, (_, i) => addDays(T, i));
  const chip = (val, label) => `<button type="button" class="chip-btn ${f.status === val ? 'active' : ''}" data-action="deliv-filter" data-val="${val}">${label}</button>`;
  view().innerHTML = `
    <section class="kpis">
      ${kpi({ label: 'Programadas', value: active.filter(d => ['programada', 'reprogramada'].includes(d.status)).length, foot: 'Pendientes de salida', ic: 'calendar' })}
      ${kpi({ label: 'En camino', value: active.filter(d => d.status === 'en_camino').length, foot: 'Despachadas hoy', ic: 'truck', tone: 'info' })}
      ${kpi({ label: 'Atrasadas', value: active.filter(d => d.date < T).length, foot: 'Fecha vencida sin confirmar', ic: 'alert', tone: 'danger' })}
      ${kpi({ label: 'Entregadas este mes', value: db.deliveries.filter(d => d.status === 'entregada' && monthKey(d.deliveredAt || d.date) === monthKey(T)).length, foot: 'Confirmadas', ic: 'check', tone: 'sage' })}
    </section>
    ${readyNoDel.length ? `<div class="callout warning section-gap">${icon('alert')}<span><b>${readyNoDel.length} pedido(s) listos sin entrega programada:</b> ${readyNoDel.map(s => `<a href="#" data-action="delivery-new" data-sale="${s.id}">${s.number} · ${esc(clientName(s.clientId))}</a>`).join(' · ')}</span></div>` : ''}
    <div class="card section-gap"><div class="card-head"><div><h3>Agenda de la semana</h3><p>Entregas de los próximos 7 días</p></div><button type="button" class="btn btn-primary" data-action="delivery-new">${icon('plus')}Programar entrega</button></div>
      <div class="card-body"><div class="week">${days.map(day => {
        const list = db.deliveries.filter(d => d.date === day).sort((a, b) => a.slot.localeCompare(b.slot));
        return `<div class="day ${day === T ? 'today' : ''}"><div class="day-head">${fmtDate(day, { weekday: 'short' })}<strong>${parseISO(day).getDate()}</strong></div>
          ${list.map(d => { const s = getSale(d.saleId); return `<div class="day-item ${d.status}" data-action="delivery-edit" data-id="${d.id}" role="button" tabindex="0" title="${esc(DELIVERY_STATUS[d.status].label)}"><strong>${s?.number}</strong>${esc(clientName(s?.clientId))}<br><span class="muted">${esc(d.slot)}</span></div>`; }).join('') || '<span class="small muted">—</span>'}</div>`;
      }).join('')}</div></div></div>
    <div class="toolbar section-gap">
      <div class="search">${icon('search')}<input type="search" id="d-q" placeholder="Buscar por pedido, cliente, dirección o responsable…" value="${esc(f.q)}" aria-label="Buscar entregas"></div>
      <div class="chips">${chip('activas', 'Activas')}${chip('programada', 'Programadas')}${chip('en_camino', 'En camino')}${chip('reprogramada', 'Reprogramadas')}${chip('entregada', 'Entregadas')}${chip('', 'Todas')}</div>
    </div>
    <div class="card" id="d-results"></div>`;
  $('#d-q').addEventListener('input', e => { ui.deliv.q = e.target.value; drawDeliveries(); });
  drawDeliveries();
}
function drawDeliveries() {
  const T = todayISO(), f = ui.deliv, q = f.q.trim().toLowerCase();
  const list = db.deliveries.filter(d => {
    const s = getSale(d.saleId);
    const okStatus = f.status === 'activas' ? d.status !== 'entregada' : !f.status || d.status === f.status;
    return okStatus && (!q || `${s?.number} ${clientName(s?.clientId)} ${d.address} ${d.responsible}`.toLowerCase().includes(q));
  }).sort((a, b) => f.status === 'entregada' || !f.status ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  $('#d-results').innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Pedido</th><th>Dirección</th><th>Responsable</th><th>Producción</th><th>Estado</th><th></th></tr></thead><tbody>
    ${list.map(d => {
      const s = getSale(d.saleId), late = d.status !== 'entregada' && d.date < T;
      return `<tr><td class="nowrap"><span class="strong">${fmtDate(d.date)}</span><span class="sub">${esc(d.slot)}</span></td>
        <td><a href="#" class="strong" data-action="sale-view" data-id="${s?.id}">${s?.number}</a><span class="sub">${esc(clientName(s?.clientId))}</span></td>
        <td style="min-width:200px">${esc(d.address)}<span class="sub">${esc(d.phone || '')}</span></td><td>${esc(d.responsible)}</td>
        <td>${s ? stageBadge(saleStage(s)) : '—'}</td><td>${deliveryBadge(d)}${late ? ' ' + badge('Atrasada', 'danger') : ''}</td>
        <td><div class="actions" style="flex-wrap:nowrap">${d.status !== 'entregada' ? `
          ${d.status !== 'en_camino' ? `<button type="button" class="icon-btn sm" data-action="delivery-status" data-id="${d.id}" data-to="en_camino" title="Marcar en camino">${icon('truck')}</button>` : ''}
          <button type="button" class="icon-btn sm" data-action="delivery-status" data-id="${d.id}" data-to="entregada" title="Confirmar entrega">${icon('check')}</button>
          <button type="button" class="icon-btn sm" data-action="delivery-reprogram" data-id="${d.id}" title="Reprogramar">${icon('calendar')}</button>
          <button type="button" class="icon-btn sm" data-action="delivery-edit" data-id="${d.id}" title="Editar">${icon('edit')}</button>
          <button type="button" class="icon-btn sm danger" data-action="delivery-delete" data-id="${d.id}" title="Cancelar entrega">${icon('trash')}</button>` : `<span class="small muted">Entregado ${fmtShort(d.deliveredAt || d.date)}</span>`}</div></td></tr>`;
    }).join('')}
  </tbody></table></div>` : emptyHTML('truck', 'No hay entregas para mostrar', 'Cambiá el filtro o programá una entrega nueva.');
}

function openDeliveryModal(delivery, { saleId = null, reprogram = false } = {}) {
  const T = todayISO(), isNew = !delivery;
  if (delivery && delivery.status === 'entregada') { toast('Esta entrega ya fue confirmada.', 'info'); return; }
  const eligible = db.sales.filter(s => saleStage(s) !== 'entregado' && (!activeDelivery(s.id) || delivery?.saleId === s.id)).sort((a, b) => a.estimatedDate.localeCompare(b.estimatedDate));
  if (isNew && saleId && activeDelivery(saleId)) { toast('Ese pedido ya tiene una entrega activa.', 'warning'); return; }
  if (isNew && !eligible.length) { toast('No hay pedidos pendientes de entrega.', 'warning'); return; }
  const d = delivery ? { ...delivery } : { saleId: saleId || eligible.find(s => saleReady(s))?.id || eligible[0].id, date: addDays(T, 2), slot: SLOTS[0], address: '', phone: '', responsible: '', notes: '', status: 'programada' };
  const fillFromSale = sid => { const c = getClient(getSale(sid)?.clientId); return c ? { address: `${c.address}, ${c.city}`, phone: c.phone } : { address: '', phone: '' }; };
  if (isNew) Object.assign(d, fillFromSale(d.saleId));
  const m = openModal({
    title: isNew ? 'Programar entrega' : reprogram ? 'Reprogramar entrega' : 'Editar entrega',
    subtitle: reprogram ? 'Elegí la nueva fecha y franja horaria.' : 'Los campos con * son obligatorios.',
    body: `<form class="form-grid" novalidate>
      ${F('Pedido', `<select name="saleId" ${isNew ? '' : 'disabled'}>${eligible.map(s => `<option value="${s.id}" ${s.id === d.saleId ? 'selected' : ''}>${s.number} · ${esc(clientName(s.clientId))} · ${stageOf(saleStage(s)).label}</option>`).join('')}</select>`, { req: true, full: true })}
      <div class="full" data-ready-info></div>
      ${F('Fecha', `<input type="date" name="date" value="${d.date}" ${isNew || reprogram ? `min="${T}"` : ''}>`, { req: true })}
      ${F('Franja horaria', `<select name="slot">${SLOTS.map(x => `<option ${x === d.slot ? 'selected' : ''}>${x}</option>`).join('')}</select>`, { req: true })}
      ${F('Dirección de entrega', `<input name="address" value="${esc(d.address)}" maxlength="140">`, { req: true, full: true })}
      ${F('Teléfono de contacto', `<input name="phone" type="tel" value="${esc(d.phone)}" maxlength="20">`, { req: true })}
      ${F('Responsable', `<input name="responsible" list="staff-list" value="${esc(d.responsible)}" maxlength="60" placeholder="Equipo o transportista"><datalist id="staff-list">${STAFF.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`, { req: true })}
      ${!isNew && !reprogram ? F('Estado', `<select name="status">${['programada', 'en_camino', 'reprogramada'].map(x => `<option value="${x}" ${x === d.status ? 'selected' : ''}>${DELIVERY_STATUS[x].label}</option>`).join('')}</select>`, { hint: 'Para confirmar la entrega usá el botón “Confirmar entrega”.' }) : ''}
      ${F('Indicaciones', `<textarea name="notes" maxlength="300" placeholder="Acceso, horarios del edificio, montacargas…">${esc(d.notes)}</textarea>`, { full: true })}
    </form>`,
    footer: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="button" class="btn btn-primary" data-ok>${icon('check')}${isNew ? 'Programar' : 'Guardar'}</button>`,
  });
  const form = $('form', m);
  const info = () => {
    const s = getSale(form.elements.saleId.value);
    $('[data-ready-info]', m).innerHTML = s ? (saleReady(s)
      ? `<div class="callout success">${icon('check')}<span>Todos los muebles del pedido están listos para entregar.</span></div>`
      : `<div class="callout warning">${icon('alert')}<span>El pedido sigue en <b>${stageOf(saleStage(s)).label.toLowerCase()}</b> (entrega estimada ${fmtDate(s.estimatedDate)}). Podés programarla, pero solo podrás despacharla cuando todo esté listo.</span></div>`) : '';
  };
  info();
  form.elements.saleId.addEventListener('change', e => {
    const fill = fillFromSale(e.target.value);
    form.elements.address.value = fill.address;
    form.elements.phone.value = fill.phone;
    info();
  });
  $('[data-ok]', m).addEventListener('click', () => {
    const el = n => form.elements[n], val = n => el(n).value.trim();
    const v = validator(form);
    const s = getSale(el('saleId').value);
    v.check(!!s, el('saleId'), 'Seleccioná un pedido.');
    v.check(!!val('date'), el('date'), 'Indicá la fecha.')
      && v.check(!(isNew || reprogram) || val('date') >= T, el('date'), 'La fecha no puede ser anterior a hoy.')
      && v.check(!s || val('date') >= s.date, el('date'), 'No puede ser anterior a la fecha de venta.')
      && v.check(!reprogram || val('date') !== delivery.date || val('slot') !== delivery.slot, el('date'), 'Elegí una fecha o franja distinta a la actual.');
    v.check(val('address').length >= 8, el('address'), 'Ingresá la dirección completa.');
    v.check(RX_PHONE.test(val('phone')), el('phone'), 'Teléfono inválido.');
    v.check(val('responsible').length >= 3, el('responsible'), 'Indicá el responsable de la entrega.');
    const status = reprogram ? 'reprogramada' : (el('status')?.value || d.status);
    if (status === 'en_camino' && s && !saleReady(s)) v.check(false, el('status'), 'No se puede despachar: hay muebles en producción.');
    if (!v.ok()) return;
    const data = { saleId: s.id, date: val('date'), slot: val('slot'), address: val('address'), phone: val('phone'), responsible: val('responsible'), notes: val('notes'), status };
    if (!isNew && !reprogram && status === 'programada' && data.date !== delivery.date) data.status = 'reprogramada';
    if (isNew) db.deliveries.push({ id: uid('d'), ...data, createdAt: T });
    else Object.assign(getDelivery(delivery.id), data);
    closeModal(m);
    commit(isNew ? `Entrega de ${s.number} programada para el ${fmtDate(data.date)}.` : reprogram ? `Entrega de ${s.number} reprogramada para el ${fmtDate(data.date)}.` : `Entrega de ${s.number} actualizada.`);
  });
}

async function setDeliveryStatus(id, to) {
  const d = getDelivery(id), s = getSale(d.saleId), T = todayISO();
  if (to === 'en_camino' || to === 'entregada') {
    const pending = s.items.filter(i => !['listo', 'entregado'].includes(i.stage));
    if (pending.length) {
      toast(`No se puede ${to === 'en_camino' ? 'despachar' : 'confirmar'}: ${pending.length} mueble(s) de ${s.number} siguen en producción (${[...new Set(pending.map(i => stageOf(i.stage).label))].join(', ')}).`, 'error', { actionLabel: 'Ver producción', onAction: () => { closeAllModals(); location.hash = 'produccion'; } });
      return;
    }
  }
  if (to === 'entregada') {
    const bal = saleBalance(s);
    const ok = await confirmDialog({
      title: 'Confirmar entrega', confirmText: 'Confirmar entrega',
      message: `Se marcará el pedido <b>${s.number}</b> como entregado a <b>${esc(clientName(s.clientId))}</b> y sus muebles pasarán a “Entregado”.${bal ? `<br><br>El pedido tiene un saldo pendiente de <b>${money(bal)}</b>; a continuación podrás registrar el cobro.` : ''}`,
    });
    if (!ok) return;
    d.status = 'entregada';
    d.deliveredAt = T;
    s.items.forEach(i => { if (i.stage !== 'entregado') { i.stage = 'entregado'; i.history.push({ stage: 'entregado', date: T }); } });
    commit(`Pedido ${s.number} entregado.`);
    if (bal) openPaymentModal(s.id, { note: 'Saldo contra entrega' });
    return;
  }
  d.status = to;
  if (to === 'en_camino') d.dispatchedAt = T;
  commit(`Entrega de ${s.number}: ${DELIVERY_STATUS[to].label.toLowerCase()}.`);
}

Object.assign(actions, {
  'deliv-filter': d => { ui.deliv.status = d.val; renderDeliveries(); },
  'delivery-new': d => openDeliveryModal(null, { saleId: d.sale || null }),
  'delivery-edit': d => openDeliveryModal(getDelivery(d.id)),
  'delivery-reprogram': d => openDeliveryModal(getDelivery(d.id), { reprogram: true }),
  'delivery-status': d => setDeliveryStatus(d.id, d.to),
  'delivery-delete': async d => {
    const del = getDelivery(d.id), s = getSale(del.saleId);
    if (del.status === 'entregada') { toast('Las entregas confirmadas no se pueden eliminar.', 'error'); return; }
    const ok = await confirmDialog({ title: 'Cancelar entrega', danger: true, confirmText: 'Cancelar entrega', message: `¿Cancelar la entrega del pedido <b>${s?.number}</b> programada para el ${fmtDate(del.date)}? El pedido quedará sin entrega programada.` });
    if (!ok) return;
    db.deliveries = db.deliveries.filter(x => x.id !== del.id);
    commit('Entrega cancelada.', 'warning');
  },
});

/* ---------- 20. Reportes ---------- */

function renderReports() {
  const n = ui.reports.months, months = lastMonths(n), from = months[0] + '-01';
  const sales = db.sales.filter(s => s.date >= from);
  const pays = allPayments().filter(p => p.date >= from);
  const salesTotal = sum(sales, s => docTotals(s).total);
  const quotesIn = db.quotes.filter(q => q.date >= from);
  const decided = quotesIn.filter(q => ['aprobado', 'convertido', 'rechazado'].includes(q.status));
  const conv = decided.length ? Math.round(quotesIn.filter(q => q.status === 'convertido').length / decided.length * 100) : 0;

  const prodAgg = {}, catAgg = {};
  sales.forEach(s => s.items.forEach(it => {
    const rev = it.unitPrice * it.qty * (1 - (s.discountPct || 0) / 100);
    const key = it.productId;
    prodAgg[key] = prodAgg[key] || { label: it.name, units: 0, revenue: 0 };
    prodAgg[key].units += it.qty;
    prodAgg[key].revenue += rev;
    const cat = getProduct(it.productId)?.category || 'Otros';
    catAgg[cat] = (catAgg[cat] || 0) + rev;
  }));
  const top = Object.values(prodAgg).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 6);
  const cats = Object.entries(catAgg).sort((a, b) => b[1] - a[1]);
  const stageSeg = STAGES.map(st => ({ label: st.label, value: sales.filter(s => saleStage(s) === st.id).length, color: st.color }));
  const methods = PAY_METHODS.map(pm => ({ label: pm.label, value: sum(pays.filter(p => p.method === pm.id), p => p.amount) })).filter(r => r.value > 0).sort((a, b) => b.value - a.value);
  const funnel = [
    { label: 'Presupuestos emitidos', value: quotesIn.length },
    { label: 'Enviados al cliente', value: quotesIn.filter(q => q.status !== 'borrador').length },
    { label: 'Aprobados', value: quotesIn.filter(q => ['aprobado', 'convertido'].includes(q.status)).length },
    { label: 'Convertidos en pedido', value: quotesIn.filter(q => q.status === 'convertido').length },
  ];
  const chip = v => `<button type="button" class="chip-btn ${n === v ? 'active' : ''}" data-action="reports-period" data-val="${v}">Últimos ${v} meses</button>`;

  view().innerHTML = `
    <div class="toolbar"><div class="chips">${chip(3)}${chip(6)}${chip(12)}</div><span class="spacer"></span>
      <button type="button" class="btn btn-secondary" data-action="reports-csv">${icon('download')}Exportar ventas (CSV)</button></div>
    <section class="kpis">
      ${kpi({ label: 'Facturación del período', value: money(salesTotal), foot: `${sales.length} ventas`, ic: 'bag' })}
      ${kpi({ label: 'Ingresos cobrados', value: money(sum(pays, p => p.amount)), foot: 'Anticipos y saldos', ic: 'cash', tone: 'sage' })}
      ${kpi({ label: 'Ticket promedio', value: money(sales.length ? salesTotal / sales.length : 0), foot: 'Por operación', ic: 'chart', tone: 'info' })}
      ${kpi({ label: 'Conversión de presupuestos', value: conv + '%', foot: `${decided.length} presupuestos resueltos`, ic: 'file', tone: 'warning' })}
      ${kpi({ label: 'Saldo por cobrar', value: money(sum(db.sales, saleBalance)), foot: 'Total de la cartera', ic: 'card', tone: 'danger' })}
    </section>
    <section class="grid grid-main section-gap">
      <div class="card"><div class="card-head"><div><h3>Ventas e ingresos por mes</h3><p>Facturado vs. cobrado</p></div></div>
        <div class="card-body">${barChart({ labels: months.map(monthLabel), series: [
          { name: 'Ventas', color: '#9c6b43', values: months.map(k => sum(sales.filter(s => monthKey(s.date) === k), s => docTotals(s).total)) },
          { name: 'Ingresos', color: '#5d7a64', values: months.map(k => sum(pays.filter(p => monthKey(p.date) === k), p => p.amount)) },
        ] })}</div></div>
      <div class="card"><div class="card-head"><div><h3>Pedidos según estado</h3><p>Ventas del período</p></div></div>
        <div class="card-body">${donutChart(stageSeg, String(sales.length), 'pedidos')}</div></div>
    </section>
    <section class="grid grid-2 section-gap">
      <div class="card"><div class="card-head"><div><h3>Productos más vendidos</h3><p>Unidades y facturación</p></div></div>
        <div class="card-body">${hBars(top.map(t => ({ label: t.label, value: t.units, display: `${t.units} u · ${compactMoney(t.revenue)}` })))}</div></div>
      <div class="card"><div class="card-head"><div><h3>Facturación por categoría</h3><p>Participación en ventas</p></div></div>
        <div class="card-body">${cats.length ? donutChart(cats.map(([label, value], i) => ({ label, value: Math.round(value), color: PALETTE[i % PALETTE.length], display: compactMoney(value) })), compactMoney(salesTotal), 'facturado') : emptyHTML('chart', 'Sin datos')}</div></div>
    </section>
    <section class="grid grid-2 section-gap">
      <div class="card"><div class="card-head"><div><h3>Medios de pago</h3><p>Importes cobrados</p></div></div>
        <div class="card-body">${hBars(methods.map((r, i) => ({ ...r, display: money(r.value), color: PALETTE[i % PALETTE.length] })))}</div></div>
      <div class="card"><div class="card-head"><div><h3>Embudo comercial</h3><p>Presupuestos del período</p></div></div>
        <div class="card-body">${hBars(funnel.map((r, i) => ({ ...r, display: String(r.value), color: ['#a89b8e', '#5f7f99', '#5d8a66', '#6f4a2e'][i] })))}</div></div>
    </section>`;
}

Object.assign(actions, {
  'reports-period': d => { ui.reports.months = Number(d.val); renderReports(); },
  'reports-csv': () => {
    const from = lastMonths(ui.reports.months)[0] + '-01';
    const rows = db.sales.filter(s => s.date >= from).sort((a, b) => a.date.localeCompare(b.date));
    const cell = v => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['Pedido', 'Fecha', 'Cliente', 'Muebles', 'Subtotal', 'Descuento %', 'Total', 'Cobrado', 'Saldo', 'Producción', 'Entrega estimada'].map(cell).join(';')];
    rows.forEach(s => {
      const t = docTotals(s);
      lines.push([s.number, s.date, clientName(s.clientId), s.items.map(i => `${i.name} x${i.qty}`).join(' | '), t.subtotal, s.discountPct, t.total, salePaid(s), saleBalance(s), stageOf(saleStage(s)).label, s.estimatedDate].map(cell).join(';'));
    });
    download(`ventas-atelier-nogal-${todayISO()}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    toast(`Se exportaron ${rows.length} ventas.`);
  },
});

/* ---------- 21. Datos y respaldo ---------- */

function openDataModal() {
  const bytes = new Blob([JSON.stringify(db)]).size;
  const m = openModal({
    title: 'Datos y respaldo', subtitle: 'Toda la información se guarda en este navegador (localStorage).', backdropClose: true,
    body: `<div class="info-strip">
        <div><small>Productos</small><strong>${db.products.length}</strong></div><div><small>Clientes</small><strong>${db.clients.length}</strong></div>
        <div><small>Presupuestos</small><strong>${db.quotes.length}</strong></div><div><small>Ventas</small><strong>${db.sales.length}</strong></div>
        <div><small>Entregas</small><strong>${db.deliveries.length}</strong></div><div><small>Espacio usado</small><strong>${(bytes / 1024).toFixed(0)} KB</strong></div>
      </div>
      <div class="list section-gap">
        <div class="list-item"><div class="grow"><strong>Exportar respaldo</strong><span class="sub">Descarga un archivo JSON con todos los datos.</span></div><button type="button" class="btn btn-secondary btn-sm" data-export>${icon('download')}Exportar</button></div>
        <div class="list-item"><div class="grow"><strong>Importar respaldo</strong><span class="sub">Reemplaza los datos actuales por los de un archivo exportado.</span></div><button type="button" class="btn btn-secondary btn-sm" data-import>${icon('upload')}Importar</button></div>
        <div class="list-item"><div class="grow"><strong>Restablecer datos de demostración</strong><span class="sub">Borra los cambios y vuelve a cargar los datos ficticios.</span></div><button type="button" class="btn btn-soft-danger btn-sm" data-reset>${icon('refresh')}Restablecer</button></div>
      </div>`,
  });
  $('[data-export]', m).addEventListener('click', () => {
    download(`atelier-nogal-respaldo-${todayISO()}.json`, JSON.stringify(db, null, 2), 'application/json');
    toast('Respaldo exportado.');
  });
  $('[data-import]', m).addEventListener('click', () => $('#import-file').click());
  $('[data-reset]', m).addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Restablecer demo', danger: true, confirmText: 'Restablecer', message: 'Se eliminarán <b>todos</b> los cambios realizados y se cargarán nuevamente los datos de demostración. ¿Continuar?' });
    if (!ok) return;
    db = buildSeed();
    ui.cfgState = null;
    closeAllModals();
    commit('Datos de demostración restablecidos.');
  });
}

$('#import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const fr = new FileReader();
  fr.onload = async () => {
    let data;
    try { data = JSON.parse(fr.result); } catch { toast('El archivo no es un JSON válido.', 'error'); return; }
    if (!isValidDB(data)) { toast('El archivo no corresponde a un respaldo de Atelier Nogal.', 'error'); return; }
    const ok = await confirmDialog({ title: 'Importar respaldo', confirmText: 'Importar', message: `Se reemplazarán los datos actuales por los del archivo <b>${esc(file.name)}</b> (${data.products.length} productos, ${data.clients.length} clientes, ${data.sales.length} ventas). ¿Continuar?` });
    if (!ok) return;
    db = data;
    ui.cfgState = null;
    closeAllModals();
    commit('Respaldo importado correctamente.');
  };
  fr.readAsText(file);
});

/* ---------- 22. Inicio ---------- */

loadDB();
window.addEventListener('hashchange', navigate);
navigate();
