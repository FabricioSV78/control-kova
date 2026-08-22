# Preparar Supabase

1. Crea un proyecto y ejecuta, en orden, los archivos de `migrations/` desde SQL Editor o mediante Supabase CLI.
2. En **Authentication > Providers > Email**, desactiva el registro público.
3. Crea manualmente los usuarios Fabricio y Daniela con su `full_name` en metadata.
4. Configura `.env.local` a partir de `.env.example`.
5. Inicia sesión como Fabricio y usa la pantalla inicial para crear el workspace KOVA.
6. Agrega a Daniela con su UUID desde SQL Editor:

```sql
insert into public.business_members (business_id, profile_id, role, display_name, created_by)
select b.id, 'UUID_DE_DANIELA', 'admin', 'Daniela', 'UUID_DE_FABRICIO'
from public.businesses b where b.slug = 'kova';
```

Los datos de muestra se ofrecen en el modo demo local y pueden eliminarse con **Restablecer demo**. No se mezclan automáticamente con producción.
