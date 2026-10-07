'use strict';

const header = document.querySelector('.header');
const toggle = document.querySelector('.hamburger');
const menu = document.querySelector('.nav-menu');

function closeMenu() {
    menu.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
}

if (header && toggle && menu) {
    header.classList.add('menu-enhanced');
    toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        menu.classList.toggle('active', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.classList.contains('active')) {
            closeMenu();
            toggle.focus();
        }
    });
    document.addEventListener('click', event => {
        if (!header.contains(event.target)) closeMenu();
    });
    window.matchMedia('(max-width: 800px)').addEventListener('change', closeMenu);
}

const form = document.getElementById('contactForm');
const service = document.getElementById('servicio');
const message = document.getElementById('mensaje');
const status = document.getElementById('form-status');
const whatsapp = document.querySelector('.whatsapp-float');

// El destino se toma del enlace existente para mantener un único número de contacto.
if (form && service && message && status && whatsapp) {
    document.querySelectorAll('[data-service], [data-plan]').forEach(link => {
        link.addEventListener('click', () => {
            if (link.dataset.plan) {
                service.value = link.dataset.plan === 'Plan Mayorista' ? 'mayorista' : 'ecommerce';
                if (!message.value.trim()) message.value = `Hola, me gustaría consultar el ${link.dataset.plan}.`;
            } else {
                service.value = link.dataset.service;
            }
            status.replaceChildren();
        });
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const name = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('telefono').value.trim();
        if (!name || !message.value.trim()) {
            status.textContent = 'Completá tu nombre y contanos tu idea para preparar la consulta.';
            (!name ? document.getElementById('nombre') : message).focus();
            return;
        }
        const text = [
            'Hola LS Nexo Digital, quiero consultar por un proyecto.',
            `Nombre: ${name}`,
            `Email: ${email}`,
            ...(phone ? [`Teléfono: ${phone}`] : []),
            `Servicio: ${service.options[service.selectedIndex].text}`,
            '',
            message.value.trim()
        ].join('\n');
        const url = new URL(whatsapp.href);
        url.searchParams.set('text', text);
        const fallback = document.createElement('a');
        fallback.href = url.href;
        fallback.target = '_blank';
        fallback.rel = 'noopener noreferrer';
        fallback.textContent = 'Abrir consulta en WhatsApp';
        status.replaceChildren('Tu mensaje está preparado. Revisalo y envialo desde WhatsApp. Si no se abrió, ', fallback, '.');
        window.open(url.href, '_blank', 'noopener,noreferrer');
    });
}

// Un mismo estado mantiene sincronizados el menú y los puntos laterales.
const sections = [...document.querySelectorAll('main section[id]')];
const sectionLinks = [...document.querySelectorAll('.nav-link, .section-dot')];
const backToTop = document.querySelector('.back-to-top');
let scrollUpdatePending = false;

function updateSectionNavigation() {
    scrollUpdatePending = false;
    if (!sections.length) return;
    const marker = header ? header.getBoundingClientRect().bottom + 100 : 180;
    let current = sections[0];
    for (const section of sections) {
        if (section.getBoundingClientRect().top <= marker) current = section;
    }
    // Al llegar al pie, mantener Contacto seleccionado incluso en pantallas altas.
    if (window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1];
    }
    sectionLinks.forEach(link => {
        if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
    if (backToTop) backToTop.hidden = window.scrollY < 350;
}

function scheduleNavigationUpdate() {
    if (scrollUpdatePending) return;
    scrollUpdatePending = true;
    window.requestAnimationFrame(updateSectionNavigation);
}

if (backToTop) {
    backToTop.addEventListener('click', () => {
        // Devolver también el foco al inicio antes de ocultar el botón.
        const title = document.getElementById('hero-title');
        if (title) {
            title.setAttribute('tabindex', '-1');
            title.focus({ preventScroll: true });
        }
    });
}
window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
window.addEventListener('resize', scheduleNavigationUpdate);
window.addEventListener('load', scheduleNavigationUpdate);
updateSectionNavigation();
