# Atelier Nogal · Gestión de muebles a medida (prototipo)

Prototipo web navegable de un sistema comercial para una tienda que fabrica y vende muebles a medida.
Está hecho solo con **HTML5, CSS3 y JavaScript vanilla**: no tiene frameworks, backend ni base de datos externa.
Los datos se guardan en el navegador (`localStorage`).

## Cómo ejecutarlo

### Opción 1: abrir el archivo
Hacé doble clic en `index.html`. Funciona en cualquier navegador moderno (Chrome, Edge, Firefox, Safari).

### Opción 2: servidor local (recomendada)
Así la URL es estable y los datos guardados no se mezclan con otros archivos locales. Desde esta carpeta:

```bash
python -m http.server 8765
```

Después abrí <http://localhost:8765>. También sirve `npx serve .` u otro servidor estático cualquiera.

> Si no hay conexión a internet, la app funciona igual: solo usa una tipografía del sistema en lugar de Google Fonts.

## Módulos

| Módulo | Qué podés hacer |
|---|---|
| **Panel general** | KPI de ventas, ingresos, presupuestos pendientes, muebles en fabricación, entregas próximas y saldo por cobrar. Gráfico de 6 meses, taller por etapa, últimas ventas y productos destacados. |
| **Catálogo** | Alta, edición y baja de productos. Búsqueda por nombre, código, descripción o medidas. Filtros por categoría, material, color y rango de precio. Varias imágenes por producto (URL o archivo) y productos destacados. |
| **Personalización** | Configurador con medidas (alto, ancho y profundidad, con rangos validados), material, acabado, color y accesorios. El precio se recalcula al instante con el detalle de cada ajuste, y una vista isométrica muestra el volumen a escala. Desde acá se crea un presupuesto, se agrega el mueble a un presupuesto existente o se registra una venta. |
| **Clientes** | Registro con validación de teléfono y correo (sin duplicados), ficha con historial de compras, presupuestos y saldo. |
| **Presupuestos** | Cotizaciones con muebles configurados, cantidades, descuento y totales. Estados: borrador → enviado → aprobado / rechazado → convertido en pedido. Vencimientos, duplicado, impresión o PDF, y conversión en venta con anticipo. |
| **Ventas** | Registro de operaciones con cliente, muebles, descuento, anticipo y medios de pago simulados (efectivo, transferencia, débito, crédito en cuotas con recargo, billetera virtual o cheque). Cobros parciales, anulación de cobros y saldos. |
| **Producción** | Tablero kanban con las etapas pendiente, diseño, fabricación, terminación, listo para entregar y entregado. Las tarjetas se mueven arrastrándolas o con las flechas, y cada mueble guarda su historial. |
| **Entregas** | Agenda semanal y listado con fecha, franja horaria, dirección, responsable y estado (programada, en camino, reprogramada o entregada). |
| **Reportes** | Ventas frente a ingresos por mes, pedidos según estado, productos más vendidos, facturación por categoría, medios de pago y embudo de presupuestos. Exportación a CSV. |
| **Datos y respaldo** | Exportar o importar todos los datos en JSON y restablecer los datos de demostración. |

## Reglas de sincronización

- Un presupuesto solo se convierte en pedido si está **aprobado**. Al convertirlo pasa a "Convertido" y queda vinculado a la venta. Si esa venta se elimina, el presupuesto vuelve a "Aprobado".
- Toda venta nueva ingresa a producción con sus muebles en **Pendiente**.
- Un pedido solo se despacha ("En camino") o se confirma como entregado cuando **todos** sus muebles están listos. Al confirmar la entrega, los muebles pasan a **Entregado**. Si queda saldo, se ofrece registrar el cobro en ese momento.
- La etapa "Entregado" no se asigna a mano en el tablero: se marca al confirmar la entrega, así producción y logística no quedan desfasadas.
- Los saldos, estados de pago, historial del cliente, alertas y reportes se calculan siempre a partir de los mismos datos.

## Cómo se calcula el precio

```
precio = precio base × (0,3 + 0,7 × superficie configurada / superficie estándar)
         × (factor del material / factor del material de referencia)
         × (1 + recargo del acabado + recargo del color)
         + accesorios
```

El material de referencia es el más económico que tiene habilitado cada producto, y cada línea se redondea a $100.
Los factores, recargos y precios de accesorios están en las constantes `MATERIALS`, `FINISHES`, `COLORS` y `ACCESSORIES` de `app.js`.

## Estructura

```
index.html   Estructura, menú lateral e íconos SVG
styles.css   Diseño visual y responsive (escritorio, tablet y celular)
app.js       Datos de demostración, persistencia, router y todos los módulos
```

Para volver a los datos iniciales, usá **Datos y respaldo → Restablecer** o borrá la clave `atelierNogal.v1` del `localStorage`.

## Cómo seguir

El acceso a datos está concentrado en `loadDB`, `saveDB` y `commit` dentro de `app.js`. Para pasar a un sistema comercial completo, esas funciones se pueden reemplazar por llamadas a una API REST con base de datos, sin rehacer la interfaz. Después se pueden sumar usuarios y permisos, facturación electrónica y un gateway de pagos real.

Todos los nombres, clientes, importes y operaciones son ficticios. No se procesa ningún pago real.
