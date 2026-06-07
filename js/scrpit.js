// Menú hamburguesa
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Formulario de contacto
const form = document.getElementById('contactForm');
form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Gracias por contactarnos. Te responderemos a la brevedad.');
    form.reset();
});

// ========== DEMO DE CARRITO ==========
function initCarritoDemo() {
    let carrito = [];

    function actualizarUI() {
        const lista = document.getElementById('lista-carrito');
        const totalSpan = document.getElementById('total-carrito');
        let total = 0;
        lista.innerHTML = '';
        carrito.forEach((item, idx) => {
            total += item.precio * item.cantidad;
            const li = document.createElement('li');
            li.innerHTML = `${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad} 
                <button class="eliminar-item" data-idx="${idx}" style="background:#f97316; border:none; color:white; border-radius:1rem; padding:2px 8px;">X</button>`;
            lista.appendChild(li);
        });
        totalSpan.innerText = `Total: $${total}`;
        recalcularConEnvio(total);

        document.querySelectorAll('.eliminar-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = btn.getAttribute('data-idx');
                const itemRemovido = carrito[parseInt(idx)];
                const productoDiv = document.querySelector(`.producto-item[data-id="${itemRemovido.id}"]`);
                if (productoDiv) {
                    let stockSpan = productoDiv.querySelector('.stock-display');
                    stockSpan.innerText = parseInt(stockSpan.innerText) + itemRemovido.cantidad;
                    const btnAgregar = productoDiv.querySelector('.btn-agregar');
                    if (btnAgregar) btnAgregar.disabled = false;
                }
                carrito.splice(parseInt(idx), 1);
                actualizarUI();
            });
        });
    }

    function recalcularConEnvio(subtotal) {
        const envioSelect = document.getElementById('tipo-envio');
        if (envioSelect) {
            let costo = parseInt(envioSelect.value);
            document.getElementById('total-con-envio').innerText = `Total con envío: $${subtotal + costo}`;
        }
    }

    window.agregarAlCarrito = function(boton) {
        const productoDiv = boton.closest('.producto-item');
        const id = productoDiv.getAttribute('data-id');
        const nombre = productoDiv.getAttribute('data-nombre');
        const precio = parseInt(productoDiv.getAttribute('data-precio'));
        const stockSpan = productoDiv.querySelector('.stock-display');
        let stockActual = parseInt(stockSpan.innerText);
        if (stockActual <= 0) {
            alert('Sin stock');
            return;
        }
        const existente = carrito.find(item => item.id === id);
        if (existente) {
            existente.cantidad++;
        } else {
            carrito.push({ id, nombre, precio, cantidad: 1 });
        }
        stockSpan.innerText = stockActual - 1;
        if (stockSpan.innerText == 0) boton.disabled = true;
        actualizarUI();
    };

    document.querySelectorAll('.btn-agregar').forEach(btn => {
        btn.removeEventListener('click', () => {});
        btn.addEventListener('click', () => window.agregarAlCarrito(btn));
    });

    document.getElementById('vaciar-carrito').addEventListener('click', () => {
        carrito.forEach(item => {
            const productoDiv = document.querySelector(`.producto-item[data-id="${item.id}"]`);
            if (productoDiv) {
                let stockSpan = productoDiv.querySelector('.stock-display');
                stockSpan.innerText = parseInt(stockSpan.innerText) + item.cantidad;
                const btn = productoDiv.querySelector('.btn-agregar');
                if (btn) btn.disabled = false;
            }
        });
        carrito = [];
        actualizarUI();
    });

    const envioSelect = document.getElementById('tipo-envio');
    if (envioSelect) envioSelect.addEventListener('change', () => {
        let total = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
        recalcularConEnvio(total);
    });
    actualizarUI();
}

window.addEventListener('DOMContentLoaded', initCarritoDemo);