import { zodResolver } from '@hookform/resolvers/zod'
import { FolderOpen, Images } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { outfitImageFolder, productImageFolder } from '../../../services/productImages'
import type { Product } from '../../../types/domain'
import { Button } from '../../ui/Button'
import { Input, Textarea } from '../../ui/FormField'
import { Modal } from '../../ui/Modal'

const schema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre del producto.').max(150),
  description: z.string().trim().max(600, 'Máximo 600 caracteres.'),
  sku: z.string().trim().max(50),
  category: z.string().trim().min(2, 'Escribe una categoría.').max(80),
  salePrice: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  estimatedCost: z.coerce.number().min(0, 'El costo no puede ser negativo.'),
})

type ProductForm = z.infer<typeof schema>
export function ProductFormModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { service, refresh } = useWorkspace()
  const { control, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? { name: product.name, description: product.description ?? '', sku: product.sku ?? '', category: product.category, salePrice: product.salePrice, estimatedCost: product.estimatedCost }
      : { name: '', description: '', sku: '', category: 'Pulseras', salePrice: 29, estimatedCost: 0 },
  })
  const productName = useWatch({ control, name: 'name' })
  const imageFolder = productImageFolder(productName)
  const outfitFolder = outfitImageFolder(productName)

  const submit = async (values: ProductForm) => {
    try {
      if (product) await service.updateProduct(product.id, values)
      else await service.createProduct(values)
      await refresh()
      toast.success(product ? 'Producto actualizado.' : 'Producto creado correctamente.')
      onClose()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo guardar el producto.')
    }
  }

  return (
    <Modal open onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'} description="Información comercial que aparecerá en el catálogo público." size="lg">
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(submit)(event)}>
        <div className="grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
          <Input label="Nombre" required placeholder="KOVA Urban Black" error={errors.name?.message} {...register('name')} />
          <Input label="SKU" placeholder="Opcional" error={errors.sku?.message} {...register('sku')} />
        </div>
        <Textarea label="Descripción para el catálogo" placeholder="Materiales, estilo y detalles de esta pulsera…" error={errors.description?.message} {...register('description')} />
        <Input label="Categoría" required error={errors.category?.message} {...register('category')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Precio de venta" type="number" min="0" step="0.01" required error={errors.salePrice?.message} {...register('salePrice')} />
          <Input label="Costo estimado" type="number" min="0" step="0.01" required error={errors.estimatedCost?.message} {...register('estimatedCost')} />
        </div>
        <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-stone-700 shadow-sm"><FolderOpen className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Carpetas de imágenes</p>
              <code className="mt-2 block overflow-x-auto rounded-lg bg-stone-900 px-3 py-2 text-xs text-white">public{imageFolder ?? '/productos/catalogo/Nombre del producto/'}</code>
              <code className="mt-2 block overflow-x-auto rounded-lg bg-stone-800 px-3 py-2 text-xs text-white">public{outfitFolder ?? '/productos/catalogo/Outfit-Nombre del producto/'}</code>
              <p className="mt-2 text-xs leading-5 text-stone-500">El nombre de las carpetas debe coincidir con el producto. Las fotos se muestran en orden numérico.</p>
            </div>
          </div>
          {product && (product.images.length > 0 || product.outfitImages.length > 0) ? <div className="mt-4 grid gap-4 sm:grid-cols-2"><MediaPreview title="Producto" images={product.images} /><MediaPreview title="Outfits" images={product.outfitImages} /></div> : <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-stone-400"><Images className="size-4" />Las fotos aparecerán aquí después del despliegue.</div>}
        </section>
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{product ? 'Guardar cambios' : 'Crear producto'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function MediaPreview({ title, images }: { title: string; images: Product['images'] }) {
  return <div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">{title} · {images.length}</p><div className="grid grid-cols-4 gap-2">{images.slice(0, 4).map((image) => <div key={image.id} className="aspect-square overflow-hidden rounded-lg bg-stone-200"><img src={image.url} alt="" className="h-full w-full object-cover" /></div>)}</div></div>
}
