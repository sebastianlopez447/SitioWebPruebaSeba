'use strict';

const needsForm = document.getElementById('needs-form');
const sendStatus = document.getElementById('send-status');

function buildSummary() {
    return ['RELEVAMIENTO DE PROYECTO · LS Nexo Digital', '',
        ...Array.from(new FormData(needsForm), ([label, value]) =>
            `${label}: ${String(value).trim() || 'A definir'}`)
    ].join('\n\n');
}

function validateAnswers() {
    for (const field of needsForm.querySelectorAll('[required]')) {
        field.setCustomValidity(field.value.trim() ? '' : 'Completá este campo.');
    }
    return needsForm.reportValidity();
}

needsForm.addEventListener('input', event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
    sendStatus.replaceChildren();
});

needsForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!validateAnswers()) return;
    const summary = buildSummary();
    const channel = event.submitter?.value || 'whatsapp';
    const url = channel === 'email'
        ? `mailto:info@lsnexodigital.com.ar?subject=${encodeURIComponent('Nuevo proyecto · ' + needsForm.elements.namedItem('Negocio').value.trim())}&body=${encodeURIComponent(summary)}`
        : `https://api.whatsapp.com/send?phone=5491133275667&text=${encodeURIComponent(summary)}`;
    // Los límites de enlaces varían entre aplicaciones. Conservar el texto como archivo evita perder respuestas largas.
    if (url.length > (channel === 'email' ? 7500 : 14000)) {
        sendStatus.textContent = 'Tus respuestas son extensas para abrirlas en un enlace. Descargá el resumen con el botón de arriba y adjuntalo a tu mensaje. ';
        const contact = document.createElement('a');
        contact.href = channel === 'email' ? 'mailto:info@lsnexodigital.com.ar?subject=Relevamiento%20de%20proyecto' : 'https://api.whatsapp.com/send?phone=5491133275667';
        contact.textContent = channel === 'email' ? 'Abrir email' : 'Abrir WhatsApp';
        sendStatus.append(contact);
        return;
    }
    const retry = document.createElement('a');
    retry.href = url;
    retry.textContent = channel === 'email' ? 'Volver a abrir el email' : 'Volver a abrir WhatsApp';
    sendStatus.replaceChildren('Mensaje preparado. Revisalo y confirmá el envío en tu aplicación. Si no se abrió, ', retry, '. También podés descargar el resumen y adjuntarlo manualmente.');
    if (channel === 'email') window.location.assign(url);
    else {
        retry.target = '_blank';
        retry.rel = 'noopener noreferrer';
        retry.click();
    }
});

document.getElementById('download-summary').addEventListener('click', () => {
    if (!validateAnswers()) return;
    const url = URL.createObjectURL(new Blob([buildSummary()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'necesidades-del-proyecto.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    sendStatus.textContent = 'Resumen preparado para descargar. Podés adjuntarlo a tu email o WhatsApp.';
});
