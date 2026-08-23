# Imágenes locales de productos

La web lee la estructura existente dentro de `catalogo` y asocia las carpetas por nombre de producto:

```text
public/productos/
  catalogo/
    Kova Alba/
      1.png
      2.png
      3.png
    Outfit-Kova Alba/
      1.png
      2.png
      3.png
```

Reglas:

- usa imágenes cuadradas `1:1`;
- admite AVIF, WebP, JPG, JPEG y PNG;
- usa nombres numéricos (`1`, `2`, `3`...) para controlar el orden;
- el nombre de la carpeta debe coincidir con el nombre del producto en KOVA Control, sin importar mayúsculas o minúsculas;
- para outfits, agrega el prefijo `Outfit-` al nombre de la carpeta del producto;
- ejecuta `npm run build` y vuelve a desplegar después de agregar o cambiar fotos.

El manifiesto `manifest.json` se genera automáticamente. No lo edites manualmente.
