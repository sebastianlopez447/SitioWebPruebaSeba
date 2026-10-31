# StockFlow WMS — prototipo de gestión de depósito

Prototipo web interactivo que simula la administración y la operación diaria de un depósito logístico.
Está hecho con **HTML5, CSS3 y JavaScript vanilla**: sin frameworks, sin backend y sin dependencias externas (funciona sin conexión).

```
Deposito/
├── index.html   Estructura: menú lateral, barra superior, contenedores de modales y notificaciones
├── styles.css   Diseño responsive con modo claro/oscuro automático
└── app.js       Lógica: datos, reglas de stock, vistas, formularios y persistencia
```

## Cómo ejecutarlo

**Opción 1: abrir el archivo.** Hacé doble clic en `index.html`. Funciona en Chrome, Edge y Firefox actuales.

**Opción 2: servidor local (recomendado).** Desde la carpeta `Deposito`:

```bash
python -m http.server 8080
```

o bien:

```bash
npx serve .
```

Después abrí `http://localhost:8080`.

> Los datos se guardan en el `localStorage` del navegador **para ese origen**. Si lo abrís como archivo y después con el servidor, cada uno tiene sus propios datos.

## Módulos

| Sección | Qué permite hacer |
|---|---|
| **Panel de control** | Indicadores (productos almacenados, stock disponible, bajo mínimo, pedidos pendientes, tareas del día, mercadería en muelle), gráfico de entradas/salidas de 7 días, ocupación por pasillo, flujo de pedidos, stock por categoría, stock crítico, movimientos recientes y tareas del día. Todas las tarjetas llevan a su sección. |
| **Productos** | Alta, edición, baja, búsqueda, filtros (categoría, proveedor, estado de stock), orden por columnas y exportación a CSV. Valida SKU único y que la ubicación esté libre. |
| **Inventario** | Existencias (físico, reservado, disponible, en recepción), **mapa de ubicaciones** por pasillo/estantería/nivel, alertas de stock crítico con cantidad sugerida y creación de tarea de reposición, ajustes manuales (ingreso, egreso o conteo físico) con motivo. |
| **Recepción** | Registro de remitos con varias líneas; la mercadería queda "en muelle" hasta almacenarla (total o parcial) en la ubicación del producto. |
| **Movimientos internos** | Reubicación de un artículo a una posición libre, con motivo e historial. |
| **Pedidos y despacho** | Tablero por etapas: creación (reserva stock) → **picking** con lista ordenada por ubicación → **packing** (bultos, peso, verificación) → **despacho** (transportista y guía). Cancelación con liberación de reserva o reingreso de stock. |
| **Devoluciones** | Sobre pedidos despachados, sin superar lo despachado. Mercadería apta reingresa al stock; la no apta se registra como descarte. |
| **Tareas** | Tablero Pendiente / En proceso / Completada con responsable, prioridad, fecha, filtros y aviso de vencidas. |
| **Historial** | Registro automático de cada operación (fecha, tipo, producto, cantidad, stock resultante, responsable, referencia). Filtros por texto, tipo, responsable y rango de fechas; exportación a CSV. |
| **Configuración** | Personal (alta/baja), ampliación del layout (agregar/quitar pasillos), copia de seguridad JSON (exportar/importar) y **restablecer la demostración**. |

El selector de usuario de la barra superior define quién figura como responsable en cada movimiento.
La campana reúne avisos de stock crítico, pedidos con entrega vencida, tareas vencidas y recepciones sin almacenar.
Atajo: `/` enfoca el buscador global.

## Reglas de coherencia de datos

- El **stock físico** solo se modifica a través de `aplicarStock()`, que rechaza cualquier resultado negativo.
- **Reservado** (pedidos pendientes) y **en recepción** (muelle) no se guardan: se calculan siempre a partir de los documentos, así no pueden desincronizarse.
- **Disponible = físico − reservado.** Un pedido no puede pedir más que lo disponible, y un ajuste no puede dejar el stock por debajo de lo reservado.
- El picking descuenta stock; packing y despacho solo cambian el estado del pedido y quedan en el historial.
- No se puede eliminar un producto con reservas, mercadería en muelle o pedidos en preparación. Si tiene stock, se registra una baja.
- Cada ubicación admite un solo SKU. El historial guarda SKU y descripción para conservar la trazabilidad aunque el producto se elimine.

## Puntos de extensión

- `state` es un objeto JSON plano con `version`: se puede reemplazar `cargar()` / `guardar()` por llamadas a una API REST sin tocar las vistas.
- Las vistas se registran en `VISTAS` y las acciones en `ACCIONES` (delegación por `data-action`). Para sumar un módulo alcanza con agregar una entrada en cada uno y un enlace en el menú.
- Catálogos (motivos, transportes, unidades, embalajes) están como constantes al inicio de `app.js`.

## Limitaciones de un prototipo sin backend

- **Datos locales a un navegador.** No se comparten entre equipos ni usuarios; borrar los datos del sitio borra todo (por eso hay exportación JSON).
- **Sin autenticación ni permisos.** Cualquiera puede elegir cualquier usuario; el "responsable" es declarativo.
- **Sin concurrencia real.** Dos pestañas se sincronizan por el evento `storage`, pero no hay bloqueos ni transacciones: el último que guarda gana.
- **Capacidad limitada.** `localStorage` admite unos 5 MB; con uso intensivo el historial terminaría llenándolo.
- **Simplificaciones de dominio:** una sola ubicación por SKU, sin lotes, vencimientos, números de serie, unidades de manipulación ni picking parcial; sin integración con lectores de código de barras, impresoras de etiquetas, ERP o transportistas.
- **Datos ficticios.** Los movimientos iniciales son históricos de ejemplo: no muestran stock resultante.
