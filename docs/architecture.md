# Arquitectura de KOVA Control

## Decisiones principales

- **Cliente:** React + Vite + TypeScript estricto. React Router controla las rutas y Tailwind CSS el sistema visual.
- **Datos:** Supabase/PostgreSQL es la fuente persistente. Los componentes llaman hooks; los hooks usan un contrato `KovaService`; solo la implementación del servicio conoce Supabase.
- **Modo demo:** cuando faltan variables de Supabase se habilita una implementación local del mismo contrato. Los datos viven en `localStorage`, se pueden restablecer y reproducen exactamente S/ 58.00 de ingresos y S/ 126.50 de egresos.
- **Seguridad:** RLS filtra por `business_members`. Las mutaciones contables críticas usan funciones `security definer` que vuelven a comprobar membresía y realizan todos los cambios dentro de una transacción.
- **Auditoría:** una venta o gasto se anula lógicamente en PostgreSQL; no desaparece. El modo demo lo quita de la vista activa pero conserva el evento de anulación.

## Modelo y relaciones

```text
auth.users 1──1 profiles
profiles 1──N business_members N──1 businesses
businesses 1──N products
businesses 1──N delivery_showcase
businesses 1──N sales 1──N sale_items N──1 products
businesses 1──N expenses 1──N expense_contributions
businesses 1──N activity_log
businesses 1──N expense_categories
businesses 1──N payment_methods
businesses 1──N import_batches
```

`sale_items.wrist_measurement_cm` conserva la medida que se usará para elaborar cada pulsera. No existe stock de productos terminados: `products` funciona como catálogo de modelos, precios y costos estimados.

Las fotos son archivos estáticos en `public/productos/catalogo/`. Antes de cada build, un script genera un manifiesto que enlaza las carpetas con cada producto por su nombre normalizado. Las carpetas con prefijo `Outfit-` forman una galería independiente. Cloudflare distribuye los archivos desde el edge con caché prolongada y una versión en la URL para evitar archivos obsoletos.

Las fotos de pedidos entregados siguen un flujo diferente porque se administran desde la aplicación publicada. El cliente las redimensiona y convierte a WebP; luego se almacenan en el bucket `delivery-images` y su título se registra en `delivery_showcase`. Se presentan en formato 3:4, con paginación en el panel y carga progresiva en el catálogo.

La ruta pública `/catalogo` no consulta directamente las tablas administrativas. Usa `get_public_catalog`, una RPC que entrega exclusivamente nombre comercial, WhatsApp, modelos activos, SKU, precios, descripciones y la galería publicada de entregas. El costo estimado nunca forma parte de esa respuesta.

`products.sort_order` conserva la posición elegida en el panel. La función `reorder_products` valida la membresía y actualiza el orden de las tarjetas; `get_public_catalog` devuelve los modelos siguiendo esa misma posición.

`expenses.total` es el único importe que participa en egresos. `expense_contributions` únicamente reparte ese importe entre Fabricio y Daniela, de modo que nunca se duplica el gasto.

## Operaciones atómicas

- `create_sale`: bloquea la numeración del negocio, valida productos y exige una medida de muñeca entre 5 y 50 cm por ítem.
- `update_sale`: reemplaza modelos y medidas del pedido en la misma transacción.
- `void_sale`: anula la venta y conserva su auditoría.
- `create_expense` / `update_expense`: validan que el reparto compartido coincida exactamente con el gasto.

## Flujo de la aplicación

1. Supabase Auth restaura la sesión; no existe pantalla de registro.
2. Se busca el primer workspace del usuario en `business_members`.
3. Los datos compartidos de KOVA se cargan en el contexto de workspace.
4. Una página abre un formulario rápido y valida datos localmente.
5. El servicio ejecuta la RPC o mutación autorizada.
6. El contexto vuelve a cargar datos y las métricas, tablas e historial se actualizan.

## Estructura

```text
src/
  app/          proveedores y rutas
  components/   ui, layout y componentes funcionales
  contexts/     autenticación y workspace
  hooks/        acceso tipado a contextos y métricas
  lib/          entorno y cliente Supabase
  pages/        una entrada por sección del menú
  services/     contrato, Supabase, demo, CSV
  types/        dominio y tipos generados de base de datos
  utils/        moneda, fechas, filtros y descargas
supabase/
  migrations/   esquema, RLS y funciones transaccionales
docs/           arquitectura, seguridad y despliegue
```

## Variables de entorno

```env
VITE_SUPABASE_URL=https://proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=clave-anonima-publica
VITE_ENABLE_DEMO_MODE=true
```

La `service_role` no se usa ni debe exponerse en Vite.
