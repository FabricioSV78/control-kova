# Despliegue en Cloudflare Pages

## Opción recomendada: integración Git

1. Publica el repositorio en GitHub o GitLab.
2. En Cloudflare abre **Workers & Pages > Create > Pages > Connect to Git**.
3. Selecciona el repositorio y configura:

   - Framework preset: `Vite`.
   - Production branch: la rama principal del repositorio.
   - Build command: `npm run build`.
   - Build output directory: `dist`.
   - Root directory: `/`.

4. En **Settings > Environment variables**, agrega en Production:

   ```text
   VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
   VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANONIMA_O_PUBLICABLE
   VITE_ENABLE_DEMO_MODE=false
   ```

   Repite las variables para Preview si usarás despliegues de ramas. No agregues nunca `SUPABASE_SERVICE_ROLE_KEY`: las variables `VITE_*` quedan incluidas en el JavaScript del navegador.

5. Despliega. Cada rama o pull request obtiene una URL de vista previa.

Cloudflare detectará Node 22 mediante `.nvmrc`. El build se detendrá con un mensaje claro si falta la configuración de Supabase o si el modo demo está habilitado accidentalmente en Pages.

`public/_redirects` genera la regla `/* /index.html 200`, necesaria para que una recarga directa de `/ventas` o `/reportes` vuelva al router de React en vez de responder 404.

## Supabase Auth

Después de obtener el dominio definitivo, agrégalo en Supabase > Authentication > URL Configuration:

- **Site URL:** `https://kova-control.pages.dev` o tu dominio personalizado.
- **Redirect URLs:** el mismo dominio de producción y las URLs de preview que vayas a utilizar.

La clave anónima/publicable puede estar en el cliente porque las tablas están protegidas por RLS. La clave `service_role` nunca debe utilizarse en Vite ni en Cloudflare Pages.

## Verificación previa

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Comprueba también que el resultado incluya `dist/_redirects` y `dist/_headers`. El primero evita errores 404 al recargar rutas como `/ventas`; el segundo aplica CSP, HSTS y otras cabeceras defensivas.

## Opción alternativa: carga directa

Después de iniciar sesión con Wrangler (`npx wrangler login`), ejecuta:

```bash
npm run deploy:pages
```

El comando compila y publica `dist` en el proyecto `kova-control`. La primera vez, Wrangler puede solicitar crear el proyecto o confirmar la cuenta.

No hay Pages Functions: los archivos son estáticos y el navegador se conecta directamente a Supabase con la clave anónima, protegida por RLS.
