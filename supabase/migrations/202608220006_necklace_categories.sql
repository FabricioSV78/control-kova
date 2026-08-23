-- KOVA Noctis 45 y KOVA Eclipse 45 son collares, no pulseras.
update public.products as product
set category = 'Collares'
from public.businesses as business
where product.business_id = business.id
  and business.slug = 'kova'
  and lower(trim(product.name)) in ('kova noctis 45', 'kova eclipse 45');
