/* eslint-disable */
/* global document, window, console */

/* =========================================================
   LILI BOTÁNICA - SCRIPT PRINCIPAL (DEMO)
   ========================================================= */

// ====== CATEGORÍAS Y SUBCATEGORÍAS ======
const categorias = {
    cremas: {
        nombre: "Cremas",
        icono: "fa-spa",
        subcategorias: {
            faciales: "Faciales",
            corporales: "Corporales",
            manos: "Manos y Pies",
            antiarrugas: "Anti-arrugas"
        }
    },
    perfumes: {
        nombre: "Perfumes",
        icono: "fa-spray-can",
        subcategorias: {
            mujer: "Mujer",
            hombre: "Hombre",
            unisex: "Unisex",
            infantiles: "Infantiles"
        }
    },
    maquillaje: {
        nombre: "Maquillaje",
        icono: "fa-paint-brush",
        subcategorias: {
            rostro: "Rostro",
            labios: "Labios",
            unas: "Uñas"
        }
    },
    cabello: {
        nombre: "Cabello",
        icono: "fa-wind",
        subcategorias: {
            shampoo: "Shampoo",
            acondicionador: "Acondicionador",
            tratamientos: "Tratamientos"
        }
    },
    cuidado: {
        nombre: "Cuidado Personal",
        icono: "fa-hand-holding-heart",
        subcategorias: {
            corporal: "Corporal",
            solar: "Protección Solar",
            higiene: "Higiene",
            aceites: "Aceites"
        }
    }
};

// ====== PRODUCTOS ======
const productos = [
    // CREMAS FACIALES
    { id: 1, nombre: "Crema Facial de Caléndula", categoria: "cremas", subcategoria: "faciales", precio: "$8.500", descripcion: "Hidratación diaria con caléndula y aloe, elaborada en pequeños lotes.", img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500" },

    // CREMAS CORPORALES
    { id: 3, nombre: "Crema Corporal de Karité y Avena", categoria: "cremas", subcategoria: "corporales", precio: "$7.200", descripcion: "Nutrición intensa para piel seca, sin parabenos.", img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=500" },
    { id: 4, nombre: "Crema Reafirmante de Café", categoria: "cremas", subcategoria: "corporales", precio: "$10.500", descripcion: "Con extracto de café y centella asiática para mejorar la firmeza.", img: "https://images.unsplash.com/photo-1556228852-6d35a585d566?w=500" },

    // CREMAS MANOS Y PIES
    { id: 5, nombre: "Crema de Manos de Lavanda", categoria: "cremas", subcategoria: "manos", precio: "$4.500", descripcion: "Suavidad y protección con lavanda de cultivo local.", img: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500" },
    { id: 6, nombre: "Bálsamo de Pies Menta y Romero", categoria: "cremas", subcategoria: "manos", precio: "$5.200", descripcion: "Hidratación reparadora con efecto refrescante.", img: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500" },

    // ANTIARRUGAS
    { id: 7, nombre: "Crema Anti-edad de Rosa Mosqueta", categoria: "cremas", subcategoria: "antiarrugas", precio: "$12.900", descripcion: "Rosa mosqueta patagónica para atenuar líneas de expresión.", img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500" },
    { id: 8, nombre: "Sérum de Ácido Hialurónico", categoria: "cremas", subcategoria: "antiarrugas", precio: "$15.500", descripcion: "Concentrado liviano de rápida absorción.", img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500" },

    // PERFUMES MUJER
    { id: 9, nombre: "Perfume Jazmín del Paraná", categoria: "perfumes", subcategoria: "mujer", precio: "$15.900", descripcion: "Fragancia floral con notas de jazmín y azahar.", img: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=500" },

    // PERFUMES HOMBRE
    { id: 11, nombre: "Perfume Quebracho", categoria: "perfumes", subcategoria: "hombre", precio: "$18.500", descripcion: "Notas amaderadas intensas y duraderas.", img: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500" },
    { id: 12, nombre: "Perfume Cítricos del Litoral", categoria: "perfumes", subcategoria: "hombre", precio: "$16.200", descripcion: "Mandarina y pomelo para el día a día.", img: "https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=500" },

    // PERFUMES UNISEX
    { id: 13, nombre: "Eau de Toilette Yerba y Menta", categoria: "perfumes", subcategoria: "unisex", precio: "$13.200", descripcion: "Fragancia fresca y versátil para cualquier ocasión.", img: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=500" },

    // PERFUMES INFANTILES
    { id: 14, nombre: "Colonia Infantil de Manzanilla", categoria: "perfumes", subcategoria: "infantiles", precio: "$8.900", descripcion: "Suave y sin alcohol, ideal para los más chicos.", img: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=500" },

    // MAQUILLAJE ROSTRO
    { id: 15, nombre: "Base Líquida Natural", categoria: "maquillaje", subcategoria: "rostro", precio: "$9.800", descripcion: "Cobertura liviana con aceite de jojoba.", img: "https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=500" },
    { id: 16, nombre: "Polvo Compacto Mineral", categoria: "maquillaje", subcategoria: "rostro", precio: "$7.500", descripcion: "Acabado mate con pigmentos minerales.", img: "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=500" },

    // MAQUILLAJE LABIOS
    { id: 19, nombre: "Labial Mate Malbec", categoria: "maquillaje", subcategoria: "labios", precio: "$5.500", descripcion: "Color intenso con manteca de cacao.", img: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500" },
    { id: 20, nombre: "Gloss de Miel y Almendras", categoria: "maquillaje", subcategoria: "labios", precio: "$4.900", descripcion: "Brillo e hidratación para tus labios.", img: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=500" },

    // MAQUILLAJE UÑAS
    { id: 21, nombre: "Esmalte Vegano", categoria: "maquillaje", subcategoria: "unas", precio: "$4.200", descripcion: "Fórmula libre de tóxicos y de secado rápido.", img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500" },

    // CABELLO SHAMPOO
    { id: 22, nombre: "Shampoo Sólido de Ortiga", categoria: "cabello", subcategoria: "shampoo", precio: "$6.500", descripcion: "Limpieza profunda sin envase plástico.", img: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500" },
    { id: 23, nombre: "Shampoo Anticaspa de Árbol de Té", categoria: "cabello", subcategoria: "shampoo", precio: "$7.200", descripcion: "Control de la caspa con aceite de árbol de té.", img: "https://images.unsplash.com/photo-1631730359585-38a4935cbec4?w=500" },

    // CABELLO ACONDICIONADOR
    { id: 24, nombre: "Acondicionador de Palta", categoria: "cabello", subcategoria: "acondicionador", precio: "$6.800", descripcion: "Repara el cabello dañado de medios a puntas.", img: "https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=500" },

    // CABELLO TRATAMIENTOS
    { id: 25, nombre: "Máscara Capilar de Coco", categoria: "cabello", subcategoria: "tratamientos", precio: "$8.200", descripcion: "Tratamiento nutritivo semanal.", img: "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=500" },
    { id: 26, nombre: "Aceite Capilar de Argán", categoria: "cabello", subcategoria: "tratamientos", precio: "$9.500", descripcion: "Nutrición y brillo sin enjuague.", img: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500" },

    // CUIDADO CORPORAL
    { id: 28, nombre: "Jabón Artesanal de Avena", categoria: "cuidado", subcategoria: "corporal", precio: "$3.900", descripcion: "Saponificado en frío, para todo tipo de piel.", img: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=500" },
    { id: 29, nombre: "Exfoliante de Azúcar y Limón", categoria: "cuidado", subcategoria: "corporal", precio: "$6.500", descripcion: "Renueva tu piel con ingredientes naturales.", img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500" },

    // CUIDADO SOLAR
    { id: 30, nombre: "Protector Solar Mineral FPS 50", categoria: "cuidado", subcategoria: "solar", precio: "$9.200", descripcion: "Filtros minerales, apto para piel sensible.", img: "https://images.unsplash.com/photo-1556228852-6d35a585d566?w=500" },
    { id: 31, nombre: "Gel After Sun de Aloe", categoria: "cuidado", subcategoria: "solar", precio: "$7.500", descripcion: "Calma e hidrata la piel después del sol.", img: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=500" },

    // CUIDADO HIGIENE
    { id: 32, nombre: "Desodorante Natural en Crema", categoria: "cuidado", subcategoria: "higiene", precio: "$5.500", descripcion: "Protección sin aluminio con bicarbonato y coco.", img: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=500" },
    { id: 33, nombre: "Gel de Ducha de Eucalipto", categoria: "cuidado", subcategoria: "higiene", precio: "$5.200", descripcion: "Espuma suave y aroma relajante.", img: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500" },

    // CUIDADO ACEITES
    { id: 34, nombre: "Aceite Corporal de Almendras", categoria: "cuidado", subcategoria: "aceites", precio: "$7.500", descripcion: "Hidratación y luminosidad natural.", img: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=500" },
    { id: 35, nombre: "Aceite Esencial de Lavanda", categoria: "cuidado", subcategoria: "aceites", precio: "$8.900", descripcion: "Aroma relajante para masajes y difusores.", img: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500" }
];

// ====== ESTADO ======
let categoriaActual = 'todos';
let subcategoriaActual = null;
let textoBusqueda = '';

// ====== DOM ======
const categoriasContainer = document.getElementById('categoriasPrincipales');
const subcategoriasContainer = document.getElementById('subcategorias');
const productosGrid = document.getElementById('productosGrid');
const resultadosInfo = document.getElementById('resultadosInfo');
const sinResultados = document.getElementById('sinResultados');

const buscadorInput = document.getElementById('buscadorInput');
const buscadorClear = document.getElementById('buscadorClear');
const buscadorSugerencias = document.getElementById('buscadorSugerencias');
const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

/* =========================================================
   UTILIDADES
   ========================================================= */
function normalizar(str) {
    return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function escaparHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function resaltarTexto(texto, busqueda) {
    if (!busqueda) {
        return escaparHTML(texto);
    }
    const textoNorm = normalizar(texto);
    const busqNorm = normalizar(busqueda);
    const idx = textoNorm.indexOf(busqNorm);

    if (idx === -1) {
        return escaparHTML(texto);
    }

    const antes = texto.substring(0, idx);
    const match = texto.substring(idx, idx + busqueda.length);
    const despues = texto.substring(idx + busqueda.length);

    return escaparHTML(antes) + '<mark>' + escaparHTML(match) + '</mark>' + escaparHTML(despues);
}

/* =========================================================
   RENDER CATEGORÍAS PRINCIPALES
   ========================================================= */
function renderCategoriasPrincipales() {
    if (!categoriasContainer) {
        return;
    }
    categoriasContainer.innerHTML = '';

    const btnTodos = document.createElement('button');
    btnTodos.className = 'cat-btn' + (categoriaActual === 'todos' ? ' active' : '');
    btnTodos.dataset.categoria = 'todos';
    btnTodos.innerHTML = '<i class="fas fa-th-large"></i><span>Todos</span>';
    btnTodos.addEventListener('click', function() {
        seleccionarCategoria('todos', btnTodos);
    });
    categoriasContainer.appendChild(btnTodos);

    Object.entries(categorias).forEach(function(entry) {
        const key = entry[0];
        const cat = entry[1];

        const btn = document.createElement('button');
        btn.className = 'cat-btn' + (categoriaActual === key ? ' active' : '');
        btn.dataset.categoria = key;
        btn.innerHTML = '<i class="fas ' + cat.icono + '"></i><span>' + cat.nombre + '</span>';
        btn.addEventListener('click', function() {
            seleccionarCategoria(key, btn);
        });
        categoriasContainer.appendChild(btn);
    });
}

/* =========================================================
   SELECCIONAR CATEGORÍA
   ========================================================= */
function seleccionarCategoria(categoria, btn) {
    const todosBtn = document.querySelectorAll('.cat-btn');
    todosBtn.forEach(function(b) {
        b.classList.remove('active');
    });
    if (btn) {
        btn.classList.add('active');
    }

    categoriaActual = categoria;
    subcategoriaActual = null;

    renderSubcategorias(categoria);
    renderProductos();
}

/* =========================================================
   RENDER SUBCATEGORÍAS
   ========================================================= */
function renderSubcategorias(categoria) {
    if (!subcategoriasContainer) {
        return;
    }
    subcategoriasContainer.innerHTML = '';

    if (categoria === 'todos' || !categorias[categoria]) {
        return;
    }

    const subcats = categorias[categoria].subcategorias;

    const btnTodas = document.createElement('button');
    btnTodas.className = 'sub-btn' + (!subcategoriaActual ? ' active' : '');
    btnTodas.textContent = 'Todas';
    btnTodas.dataset.subcategoria = 'todas';
    btnTodas.addEventListener('click', function() {
        const todosSub = document.querySelectorAll('.sub-btn');
        todosSub.forEach(function(b) {
            b.classList.remove('active');
        });
        btnTodas.classList.add('active');
        subcategoriaActual = null;
        renderProductos();
    });
    subcategoriasContainer.appendChild(btnTodas);

    Object.entries(subcats).forEach(function(entry) {
        const key = entry[0];
        const label = entry[1];

        const btn = document.createElement('button');
        btn.className = 'sub-btn' + (subcategoriaActual === key ? ' active' : '');
        btn.textContent = label;
        btn.dataset.subcategoria = key;
        btn.addEventListener('click', function() {
            const todosSub = document.querySelectorAll('.sub-btn');
            todosSub.forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            subcategoriaActual = key;
            renderProductos();
        });
        subcategoriasContainer.appendChild(btn);
    });
}

/* =========================================================
   FILTRAR PRODUCTOS
   ========================================================= */
function filtrarProductos() {
    let filtrados = productos;

    if (categoriaActual !== 'todos') {
        filtrados = filtrados.filter(function(p) {
            return p.categoria === categoriaActual;
        });
    }

    if (subcategoriaActual) {
        filtrados = filtrados.filter(function(p) {
            return p.subcategoria === subcategoriaActual;
        });
    }

    if (textoBusqueda.trim()) {
        const busq = normalizar(textoBusqueda.trim());
        filtrados = filtrados.filter(function(p) {
            const nombre = normalizar(p.nombre);
            const desc = normalizar(p.descripcion);
            const catNom = normalizar(categorias[p.categoria].nombre);
            const subNom = normalizar(categorias[p.categoria].subcategorias[p.subcategoria]);
            return nombre.indexOf(busq) !== -1 ||
                desc.indexOf(busq) !== -1 ||
                catNom.indexOf(busq) !== -1 ||
                subNom.indexOf(busq) !== -1;
        });
    }

    return filtrados;
}

/* =========================================================
   RENDER PRODUCTOS
   ========================================================= */
function renderProductos() {
    if (!productosGrid) {
        return;
    }
    productosGrid.innerHTML = '';

    if (sinResultados) {
        sinResultados.style.display = 'none';
    }

    const filtrados = filtrarProductos();

    if (resultadosInfo) {
        const partes = [];

        if (categoriaActual === 'todos') {
            partes.push('<strong>todas las categorías</strong>');
        } else {
            partes.push('<strong>' + categorias[categoriaActual].nombre + '</strong>');
            if (subcategoriaActual) {
                partes.push('› <strong>' + categorias[categoriaActual].subcategorias[subcategoriaActual] + '</strong>');
            }
        }

        if (textoBusqueda.trim()) {
            partes.push('· búsqueda: "<strong>' + escaparHTML(textoBusqueda.trim()) + '</strong>"');
        }

        const total = filtrados.length;
        const etiqueta = total === 1 ? 'producto' : 'productos';
        resultadosInfo.innerHTML = 'Mostrando ' + partes.join(' ') + ' (' + total + ' ' + etiqueta + ')';
    }

    if (filtrados.length === 0) {
        if (sinResultados) {
            sinResultados.style.display = 'block';
        }
        return;
    }

    filtrados.forEach(function(producto) {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML =
            '<div class="producto-img">' +
            '<span class="producto-categoria">' + categorias[producto.categoria].subcategorias[producto.subcategoria] + '</span>' +
            '<img src="' + producto.img + '" alt="' + escaparHTML(producto.nombre) + '" loading="lazy">' +
            '</div>' +
            '<div class="producto-info">' +
            '<h3>' + resaltarTexto(producto.nombre, textoBusqueda.trim()) + '</h3>' +
            '<p>' + resaltarTexto(producto.descripcion, textoBusqueda.trim()) + '</p>' +
            '<div class="producto-precio">' + producto.precio + '</div>' +
            '</div>';

        card.addEventListener('click', function() {
            abrirModal(producto);
        });
        productosGrid.appendChild(card);
    });
}

/* =========================================================
   RENDER DROPDOWN DEL MENÚ
   ========================================================= */
function renderDropdownMenu() {
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (!dropdownMenu) {
        return;
    }

    dropdownMenu.innerHTML = '';

    const itemTodos = document.createElement('div');
    itemTodos.className = 'dropdown-categoria';
    itemTodos.innerHTML = '<a href="#productos" data-categoria="todos"><span><i class="fas fa-th-large"></i> Ver todos</span></a>';
    itemTodos.querySelector('a').addEventListener('click', function(e) {
        e.preventDefault();
        irACategoria('todos');
    });
    dropdownMenu.appendChild(itemTodos);

    Object.entries(categorias).forEach(function(entry) {
        const key = entry[0];
        const cat = entry[1];

        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown-categoria';

        const linkCat = document.createElement('a');
        linkCat.href = '#productos';
        linkCat.innerHTML =
            '<span><i class="fas ' + cat.icono + '"></i> ' + cat.nombre + '</span>' +
            '<i class="fas fa-chevron-right"></i>';

        linkCat.addEventListener('click', function(e) {
            e.preventDefault();

            if (window.innerWidth <= 768) {
                wrapper.classList.toggle('open');
                return;
            }

            irACategoria(key);
        });

        wrapper.appendChild(linkCat);

        const submenu = document.createElement('div');
        submenu.className = 'dropdown-submenu';

        const linkTodas = document.createElement('a');
        linkTodas.href = '#productos';
        linkTodas.textContent = 'Ver todas las ' + cat.nombre.toLowerCase();
        linkTodas.addEventListener('click', function(e) {
            e.preventDefault();
            irACategoria(key);
        });
        submenu.appendChild(linkTodas);

        Object.entries(cat.subcategorias).forEach(function(subEntry) {
            const subKey = subEntry[0];
            const subLabel = subEntry[1];

            const linkSub = document.createElement('a');
            linkSub.href = '#productos';
            linkSub.textContent = subLabel;
            linkSub.addEventListener('click', function(e) {
                e.preventDefault();
                irASubcategoria(key, subKey);
            });
            submenu.appendChild(linkSub);
        });

        wrapper.appendChild(submenu);
        dropdownMenu.appendChild(wrapper);
    });
}

/* =========================================================
   NAVEGAR A CATEGORÍA / SUBCATEGORÍA
   ========================================================= */
function irACategoria(categoriaKey) {
    categoriaActual = categoriaKey;
    subcategoriaActual = null;

    renderCategoriasPrincipales();
    renderSubcategorias(categoriaKey);
    renderProductos();
    scrollAProductos();
}

function irASubcategoria(categoriaKey, subcategoriaKey) {
    categoriaActual = categoriaKey;
    subcategoriaActual = subcategoriaKey;

    renderCategoriasPrincipales();
    renderSubcategorias(categoriaKey);
    renderProductos();
    scrollAProductos();
}

function scrollAProductos() {
    const seccion = document.getElementById('productos');
    if (!seccion) {
        return;
    }
    const offset = 70;
    const top = seccion.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });

    const h = document.querySelector('.hamburger');
    const nm = document.querySelector('.nav-menu');
    const nd = document.querySelector('.nav-dropdown');
    if (h) { h.classList.remove('active'); }
    if (nm) { nm.classList.remove('active'); }
    if (nd) { nd.classList.remove('open'); }
}

/* =========================================================
   BUSCADOR — SUGERENCIAS
   ========================================================= */
function renderSugerencias(query) {
    if (!buscadorSugerencias) {
        return;
    }

    const q = query.trim();

    if (!q) {
        buscadorSugerencias.classList.remove('visible');
        buscadorSugerencias.innerHTML = '';
        return;
    }

    const qNorm = normalizar(q);
    const matches = productos.filter(function(p) {
        const nombre = normalizar(p.nombre);
        const desc = normalizar(p.descripcion);
        const catNom = normalizar(categorias[p.categoria].nombre);
        const subNom = normalizar(categorias[p.categoria].subcategorias[p.subcategoria]);
        return nombre.indexOf(qNorm) !== -1 ||
            desc.indexOf(qNorm) !== -1 ||
            catNom.indexOf(qNorm) !== -1 ||
            subNom.indexOf(qNorm) !== -1;
    }).slice(0, 6);

    buscadorSugerencias.innerHTML = '';

    if (matches.length === 0) {
        buscadorSugerencias.innerHTML =
            '<div class="sugerencia-vacio">' +
            '<i class="fas fa-search"></i>' +
            'No se encontraron productos para "<strong>' + escaparHTML(q) + '</strong>"' +
            '</div>';
        buscadorSugerencias.classList.add('visible');
        return;
    }

    matches.forEach(function(p) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sugerencia-item';

        const catNom = categorias[p.categoria].nombre;
        const subNom = categorias[p.categoria].subcategorias[p.subcategoria];

        btn.innerHTML =
            '<img src="' + p.img + '" alt="" class="sugerencia-img">' +
            '<div class="sugerencia-info">' +
            '<div class="sugerencia-nombre">' + resaltarTexto(p.nombre, q) + '</div>' +
            '<div class="sugerencia-cat">' + catNom + ' › ' + subNom + '</div>' +
            '</div>' +
            '<div class="sugerencia-precio">' + p.precio + '</div>';

        btn.addEventListener('click', function() {
            abrirModal(p);
            buscadorSugerencias.classList.remove('visible');
        });

        buscadorSugerencias.appendChild(btn);
    });

    buscadorSugerencias.classList.add('visible');
}

/* =========================================================
   BUSCADOR — EVENTOS
   ========================================================= */
if (buscadorInput) {
    buscadorInput.addEventListener('input', function(e) {
        textoBusqueda = e.target.value;

        if (buscadorClear) {
            if (textoBusqueda.length > 0) {
                buscadorClear.classList.add('visible');
            } else {
                buscadorClear.classList.remove('visible');
            }
        }

        renderSugerencias(textoBusqueda);
        renderProductos();
    });

    buscadorInput.addEventListener('focus', function() {
        if (textoBusqueda.trim()) {
            renderSugerencias(textoBusqueda);
        }
    });

    buscadorInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (buscadorSugerencias) {
                buscadorSugerencias.classList.remove('visible');
            }
        }
        if (e.key === 'Escape') {
            if (buscadorSugerencias) {
                buscadorSugerencias.classList.remove('visible');
            }
        }
    });
}

if (buscadorClear) {
    buscadorClear.addEventListener('click', function() {
        buscadorInput.value = '';
        textoBusqueda = '';
        buscadorClear.classList.remove('visible');
        if (buscadorSugerencias) {
            buscadorSugerencias.classList.remove('visible');
        }
        renderProductos();
        buscadorInput.focus();
    });
}

document.addEventListener('click', function(e) {
    const wrapper = document.querySelector('.buscador-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        if (buscadorSugerencias) {
            buscadorSugerencias.classList.remove('visible');
        }
    }
});

if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener('click', function() {
        categoriaActual = 'todos';
        subcategoriaActual = null;
        textoBusqueda = '';
        if (buscadorInput) {
            buscadorInput.value = '';
        }
        if (buscadorClear) {
            buscadorClear.classList.remove('visible');
        }

        renderCategoriasPrincipales();
        renderSubcategorias('todos');
        renderProductos();
    });
}

/* =========================================================
   MODAL PRODUCTO
   ========================================================= */
const modal = document.getElementById('productModal');
const modalImg = document.getElementById('modalImg');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalPrecio = document.getElementById('modalPrecio');
const modalWsp = document.getElementById('modalWsp');
const modalBreadcrumb = document.getElementById('modalBreadcrumb');
const modalClose = document.querySelector('.modal-close');

function abrirModal(producto) {
    const nombreCat = categorias[producto.categoria].nombre;
    const nombreSub = categorias[producto.categoria].subcategorias[producto.subcategoria];

    if (modalImg) {
        modalImg.src = producto.img;
        modalImg.alt = producto.nombre;
    }
    if (modalBreadcrumb) {
        modalBreadcrumb.innerHTML = '<span>' + nombreCat + '</span> › ' + nombreSub;
    }
    if (modalTitle) {
        modalTitle.textContent = producto.nombre;
    }
    if (modalDesc) {
        modalDesc.textContent = producto.descripcion;
    }
    if (modalPrecio) {
        modalPrecio.textContent = producto.precio;
    }

    const mensaje = encodeURIComponent(
        'Hola! Me interesa este producto:\n\n' +
        '🛍️ ' + producto.nombre + '\n' +
        '📂 ' + nombreCat + ' › ' + nombreSub + '\n' +
        '💰 ' + producto.precio
    );
    if (modalWsp) {
        modalWsp.href = '#contacto';
    }

    if (modal) {
        modal.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.style.overflow = '';
}

if (modalClose) {
    modalClose.addEventListener('click', cerrarModal);
}

if (modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModal();
    }
});

/* =========================================================
   HAMBURGUESA Y DROPDOWN EN MÓVIL
   ========================================================= */
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const dropdownToggle = document.querySelector('.dropdown-toggle');

if (hamburger) {
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        if (navMenu) {
            navMenu.classList.toggle('active');
        }
    });
}

document.querySelectorAll('.nav-menu a').forEach(function(link) {
    if (!link.classList.contains('dropdown-toggle') && !link.closest('.dropdown-menu')) {
        link.addEventListener('click', function() {
            if (hamburger) {
                hamburger.classList.remove('active');
            }
            if (navMenu) {
                navMenu.classList.remove('active');
            }
        });
    }
});

if (dropdownToggle) {
    dropdownToggle.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            const navDropdown = document.querySelector('.nav-dropdown');
            if (navDropdown) {
                navDropdown.classList.toggle('open');
            }
        }
    });
}

/* =========================================================
   FORMULARIO CONTACTO
   ========================================================= */
const form = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const categoria = document.getElementById('categoriaForm').value;
        const mensaje = document.getElementById('mensaje').value.trim();

        if (!nombre || !email || !mensaje) {
            alert('Por favor completa los campos obligatorios');
            return;
        }

        if (formMessage) {
            formMessage.style.display = 'block';
            formMessage.className = 'form-message success';
            formMessage.textContent = '¡Gracias ' + nombre + '! Esta es una consulta de demostración. No se enviaron ni guardaron tus datos.';
        }

        form.reset();

        setTimeout(function() {
            if (formMessage) {
                formMessage.style.display = 'none';
                formMessage.className = 'form-message';
            }
        }, 5000);
    });
}

/* =========================================================
   SCROLL SUAVE
   ========================================================= */
document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href === '#' || href.length < 2) {
            return;
        }

        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            const offset = 70;
            const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
            window.scrollTo({ top: top, behavior: 'smooth' });
        }
    });
});

/* =========================================================
   HEADER SCROLL
   ========================================================= */
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (!header) {
        return;
    }
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 4px 30px rgba(0,0,0,0.1)';
    } else {
        header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    }
});

/* =========================================================
   INICIALIZAR
   ========================================================= */
renderCategoriasPrincipales();
renderDropdownMenu();
renderSubcategorias('todos');
renderProductos();