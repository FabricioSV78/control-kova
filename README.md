# KOVA Control

Aplicación responsive para administrar pedidos de pulseras con medida de muñeca, ventas, gastos, aportes de socios, productos, historial y reportes de KOVA. Incluye un catálogo público conectado a los productos del panel.

## Inicio rápido

```bash
npm install
npm run dev
```

Sin variables válidas de Supabase, la aplicación ofrece un modo demo local. Incluye los datos solicitados y muestra:

- Ingresos: S/ 58.00
- Egresos: S/ 126.50
- Ganancia neta: -S/ 68.50
- Aporte Fabricio: S/ 117.00
- Aporte Daniela: S/ 9.50

Los cambios demo permanecen en el navegador y pueden restablecerse desde Configuración.

## Conectar Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta en orden los archivos de [supabase/migrations](./supabase/migrations).
3. Desactiva el registro público en Authentication > Providers > Email.
4. Crea manualmente a Fabricio y Daniela.
5. Crea un archivo local llamado `.env.local` y configura:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
VITE_ENABLE_DEMO_MODE=false
```

Nunca agregues una `SUPABASE_SERVICE_ROLE_KEY` a este proyecto. Las instrucciones para crear el workspace y asociar a Daniela están en [supabase/README.md](./supabase/README.md).

## Catálogo público

El catálogo vive en `/catalogo`. Solo muestra productos activos y permite:

- ordenar los modelos arrastrando sus tarjetas desde **Productos**;
- publicar galerías cuadradas de producto y colecciones de outfits;
- mostrar una galería 3:4 de pedidos enviados o entregados;
- buscar y filtrar modelos por categoría;
- registrar nombre, ciudad de Perú y medida de muñeca;
- abrir WhatsApp con toda la información del pedido ya escrita.

La sección **Entregas** del panel permite subir estas fotos y su texto sin modificar el repositorio. Las imágenes se optimizan a WebP y se guardan en Supabase Storage.

El número receptor se configura dentro de **Configuración > Catálogo y WhatsApp**. Debe incluir el código de país y escribirse solo con dígitos, por ejemplo `51987654321`.

### Imágenes de productos

Las fotos se sirven desde Cloudflare Pages, no desde Supabase Storage. El vínculo se realiza mediante el nombre del producto:

```text
public/productos/catalogo/Kova Alba/1.png
public/productos/catalogo/Kova Alba/2.png
public/productos/catalogo/Outfit-Kova Alba/1.png
```

1. El nombre de la carpeta debe coincidir con el producto de KOVA Control.
2. Usa el prefijo `Outfit-` para las imágenes de combinaciones.
3. Agrega imágenes `1:1` numeradas desde `1` en adelante.
4. Sube los archivos al repositorio y vuelve a desplegar.

`npm run dev` y `npm run build` generan automáticamente `public/productos/manifest.json`. Como Cloudflare Pages es un despliegue estático, las fotos no pueden escribirse en esa carpeta desde el navegador publicado.

## Comandos

```bash
npm run dev        # desarrollo
npm run typecheck  # TypeScript estricto
npm run lint       # calidad estática
npm test           # pruebas unitarias
npm run build      # bundle de producción
npm run preview    # vista previa de dist
```

## Despliegue en Cloudflare Pages

La SPA ya incluye `_redirects` para React Router y cabeceras defensivas compatibles con Pages. La configuración de producción se administra desde el panel de Cloudflare para que las variables de build no sean sustituidas por archivos del repositorio.

En Cloudflare Pages configura:

- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `22`
- Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENABLE_DEMO_MODE=false`

También puedes hacer una carga directa después de compilar:

```bash
npx wrangler pages deploy dist --project-name kova-control
```

## Documentación

- [Arquitectura y modelo de datos](./docs/architecture.md)
- [RLS y seguridad](./docs/security.md)
- [Despliegue en Cloudflare Pages](./docs/deployment.md)
- [Configuración de Supabase](./supabase/README.md)

## CSV

Desde Configuración puedes descargar plantillas, previsualizar importaciones y exportar ventas, gastos, historial o un reporte mensual. La plantilla de ventas exige `medida_muneca_cm` porque cada pulsera se elabora a pedido. Los archivos importados se identifican mediante SHA-256 para reducir duplicados accidentales.
