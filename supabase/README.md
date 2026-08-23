# Preparar Supabase

1. Crea un proyecto y ejecuta, en orden, los archivos de `migrations/` desde SQL Editor o mediante Supabase CLI. Si KOVA Control ya funciona, ejecuta solamente las migraciones nuevas que aún no aplicaste; el orden manual del catálogo requiere `202608230009_product_catalog_order.sql`.
2. En **Authentication > Providers > Email**, desactiva el registro público.
3. Crea manualmente los usuarios Fabricio y Daniela. No es obligatorio definir **Display name** en Authentication: el perfil usa el nombre de metadata si existe y, en caso contrario, la parte anterior a `@` del correo.
4. Crea `.env.local` con las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_ENABLE_DEMO_MODE=false`. Este archivo es privado y Git lo ignora.
5. Inicia sesión como Fabricio y usa la pantalla inicial para crear el workspace KOVA.
6. Agrega a Daniela con su UUID desde SQL Editor:

```sql
insert into public.business_members (business_id, profile_id, role, display_name, created_by)
select b.id, 'UUID_DE_DANIELA', 'admin', 'Daniela', 'UUID_DE_FABRICIO'
from public.businesses b where b.slug = 'kova';
```

Los datos de muestra se ofrecen en el modo demo local y pueden eliminarse con **Restablecer demo**. No se mezclan automáticamente con producción.

## Activar el catálogo

La migración `202608220004_public_catalog.sql` crea:

- el contacto de WhatsApp del negocio;
- las descripciones y datos comerciales de productos;
- la RPC pública segura `get_public_catalog`.

Después de ejecutarlas, entra a KOVA Control y guarda el número en **Configuración > Catálogo y WhatsApp**. Las fotos se asocian por nombre desde `public/productos/catalogo/` y quedan disponibles en `/catalogo` tras el siguiente despliegue.

La migración `004` también conserva la primera implementación de galería en Supabase para no eliminar archivos que ya pudieran existir. La aplicación actual no la consulta: la migración `005` cambia el catálogo a imágenes locales.

## Publicar entregas

La migración `202608220007_delivery_showcase.sql` crea la tabla y el bucket público `delivery-images`. Después de aplicarla aparecerá **Entregas** en KOVA Control. Fabricio o Daniela pueden subir una foto, escribir un título y eliminar publicaciones. El navegador reduce la imagen y la convierte a WebP antes de subirla; en el catálogo se presenta con encuadre 3:4. El panel incluye búsqueda y paginación, y el catálogo carga las publicaciones en grupos de ocho.
