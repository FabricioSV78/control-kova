# Seguridad y políticas RLS

Las migraciones habilitan RLS en todas las tablas públicas. La función auxiliar `is_business_member` consulta `business_members` con un `search_path` fijo; evita recursión entre políticas y nunca confía en un `business_id` enviado por React.

## Alcance de cada grupo de políticas

- **profiles:** cada usuario edita únicamente su perfil y puede ver a quienes comparten workspace para mostrar autores.
- **businesses / business_members:** cualquier integrante puede ver KOVA; solo `owner` o `admin` mantiene el workspace y sus miembros. Nadie puede retirarse a sí mismo accidentalmente mediante la política de borrado.
- **products / catálogos:** los miembros pueden leer y mantener productos, categorías y medios de pago. El `with check` impide mover filas a un negocio ajeno.
- **sales, sale_items, expenses, contributions y activity_log:** poseen política de lectura para miembros, pero no políticas directas de escritura. Solo las RPC transaccionales pueden modificarlas.
- **import_batches:** los miembros ven lotes y solo insertan lotes atribuidos a su propio `auth.uid()`.

## Claves y autenticación

La aplicación usa exclusivamente la URL y la clave anónima pública. Supabase Auth debe tener desactivado **Allow new users to sign up**. Fabricio y Daniela se crean desde el panel de Supabase; el trigger `on_auth_user_created` crea sus perfiles. El primer usuario crea KOVA desde la aplicación y luego un administrador agrega al segundo usuario a `business_members`.

Las funciones `security definer` tienen `search_path = public`, permisos públicos revocados y ejecución concedida solo a `authenticated`. Cada una vuelve a validar `auth.uid()` antes de tocar datos.

Las RPC de ventas validan también que cada pulsera tenga una medida de muñeca entre 5 y 50 cm. La migración de producción bajo pedido conserva como `null` las medidas de ventas históricas que fueron creadas antes de incorporar este dato, pero no permite nuevos pedidos sin medida.
