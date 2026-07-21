// ==========================================
// 1. MENÚ HAMBURGUESA
// ==========================================
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ==========================================
// 2. HEADER CON EFECTO AL SCROLL
// ==========================================
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ==========================================
// 3. FORMULARIO DE CONTACTO
// ==========================================
const form = document.getElementById('contactForm');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Gracias por contactarnos. Te responderemos a la brevedad.');
        form.reset();
    });
}

// ==========================================
// 4. EFECTO DE ESCRITURA (TYPED TITLE)
// ==========================================
function typeWriter(element, text, speed = 70) {
    let i = 0;
    element.innerHTML = '';

    function type() {
        if (i < text.length) {
            if (text[i] === '<') {
                let tag = '';
                while (text[i] !== '>') {
                    tag += text[i];
                    i++;
                }
                tag += text[i];
                element.innerHTML += tag;
                i++;
                type();
            } else {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
    }
    type();
}

document.addEventListener('DOMContentLoaded', function() {
    const heroTitle = document.getElementById('typed-title');
    if (heroTitle) {
        const originalHTML = heroTitle.innerHTML;
        typeWriter(heroTitle, originalHTML, 60);
    }
});

// ==========================================
// 5. EFECTO DE PARTÍCULAS CON CANVAS
// ==========================================
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const numParticles = 50;
    let animationId;

    function resizeCanvas() {
        const hero = canvas.parentElement;
        canvas.width = hero.offsetWidth;
        canvas.height = hero.offsetHeight;
    }

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(59, 130, 246, ${this.opacity})`;
            ctx.fill();
        }
    }

    function init() {
        resizeCanvas();
        particles = [];
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - distance / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        animationId = requestAnimationFrame(animate);
    }

    init();
    animate();

    window.addEventListener('resize', () => {
        resizeCanvas();
        particles.forEach(p => p.reset());
    });
}

// ==========================================
// 6. REVELADO DE ELEMENTOS AL HACER SCROLL
// ==========================================
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
}

// ==========================================
// 7. CONTADOR ANIMADO (ESTADÍSTICAS)
// ==========================================
function initCounters() {
    const counters = document.querySelectorAll('.counter');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const parent = element.closest('.stat-item');
                if (!parent) return;
                const target = parseInt(parent.getAttribute('data-count'));
                let current = 0;
                const increment = Math.ceil(target / 50);
                const duration = 1500;
                const stepTime = Math.floor(duration / 50);

                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    element.textContent = current;
                }, stepTime);

                counterObserver.unobserve(element);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

// ==========================================
// 8. EFECTO PARALLAX SUAVE EN EL HERO
// ==========================================
function initParallax() {
    window.addEventListener('scroll', () => {
        const hero = document.querySelector('.hero');
        if (hero) {
            const scrolled = window.pageYOffset;
            const shapes = hero.querySelectorAll('.shape');
            shapes.forEach((shape, index) => {
                const speed = 0.03 + (index * 0.02);
                shape.style.transform = `translateY(${scrolled * speed}px)`;
            });
        }
    });
}

// ==========================================
// 9. DEMO DE CARRITO DE COMPRAS
// ==========================================
function initCarritoDemo() {
    let carrito = [];

    function actualizarUI() {
        const lista = document.getElementById('lista-carrito');
        const totalSpan = document.getElementById('total-carrito');
        let total = 0;
        if (lista) lista.innerHTML = '';

        carrito.forEach((item, idx) => {
            total += item.precio * item.cantidad;
            const li = document.createElement('li');
            li.innerHTML = `${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad} 
                <button class="eliminar-item" data-idx="${idx}" style="background:#f97316; border:none; color:white; border-radius:1rem; padding:2px 8px; margin-left:8px; cursor:pointer; transition:all 0.3s;">X</button>`;
            if (lista) lista.appendChild(li);
        });

        if (totalSpan) totalSpan.innerText = `Total: $${total}`;
        recalcularConEnvio(total);

        document.querySelectorAll('.eliminar-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const idx = this.getAttribute('data-idx');
                const itemRemovido = carrito[parseInt(idx)];
                const productoDiv = document.querySelector(`.producto-item[data-id="${itemRemovido.id}"]`);
                if (productoDiv) {
                    let stockSpan = productoDiv.querySelector('.stock-display');
                    if (stockSpan) {
                        stockSpan.innerText = parseInt(stockSpan.innerText) + itemRemovido.cantidad;
                    }
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
        const totalConEnvioSpan = document.getElementById('total-con-envio');
        if (envioSelect && totalConEnvioSpan) {
            let costo = parseInt(envioSelect.value);
            totalConEnvioSpan.innerText = `Total con envío: $${subtotal + costo}`;
        }
    }

    function agregarAlCarrito(boton) {
        const productoDiv = boton.closest('.producto-item');
        if (!productoDiv) return;

        const id = productoDiv.getAttribute('data-id');
        const nombre = productoDiv.getAttribute('data-nombre');
        const precio = parseInt(productoDiv.getAttribute('data-precio'));
        const stockSpan = productoDiv.querySelector('.stock-display');
        if (!stockSpan) return;

        let stockActual = parseInt(stockSpan.innerText);
        if (stockActual <= 0) {
            alert('Sin stock disponible');
            return;
        }

        const existente = carrito.find(item => item.id === id);
        if (existente) {
            existente.cantidad++;
        } else {
            carrito.push({ id, nombre, precio, cantidad: 1 });
        }

        stockSpan.innerText = stockActual - 1;
        if (stockSpan.innerText == 0) {
            boton.disabled = true;
        }
        actualizarUI();
    }

    document.querySelectorAll('.btn-agregar').forEach(btn => {
        btn.addEventListener('click', function() {
            agregarAlCarrito(this);
        });
    });

    const vaciarBtn = document.getElementById('vaciar-carrito');
    if (vaciarBtn) {
        vaciarBtn.addEventListener('click', () => {
            carrito.forEach(item => {
                const productoDiv = document.querySelector(`.producto-item[data-id="${item.id}"]`);
                if (productoDiv) {
                    let stockSpan = productoDiv.querySelector('.stock-display');
                    if (stockSpan) {
                        stockSpan.innerText = parseInt(stockSpan.innerText) + item.cantidad;
                    }
                    const btn = productoDiv.querySelector('.btn-agregar');
                    if (btn) btn.disabled = false;
                }
            });
            carrito = [];
            actualizarUI();
        });
    }

    const envioSelect = document.getElementById('tipo-envio');
    if (envioSelect) {
        envioSelect.addEventListener('change', () => {
            let total = carrito.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
            recalcularConEnvio(total);
        });
    }

    actualizarUI();
}

// ==========================================
// 10. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    initParticles();
    initScrollReveal();
    initCounters();
    initParallax();
    initCarritoDemo();
});