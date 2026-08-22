import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useWorkspace } from '../../../hooks/useWorkspace'
import type { Product } from '../../../types/domain'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/FormField'
import { Modal } from '../../ui/Modal'

const schema = z.object({
  name: z.string().trim().min(2, 'Escribe el nombre del producto.').max(150),
  sku: z.string().trim().max(50),
  category: z.string().trim().min(2, 'Escribe una categoría.').max(80),
  salePrice: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  estimatedCost: z.coerce.number().min(0, 'El costo no puede ser negativo.'),
  imageUrl: z.union([z.literal(''), z.string().url('Ingresa una URL válida.')]),
})

type ProductForm = z.infer<typeof schema>

export function ProductFormModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { service, refresh } = useWorkspace()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? { name: product.name, sku: product.sku ?? '', category: product.category, salePrice: product.salePrice, estimatedCost: product.estimatedCost, imageUrl: product.imageUrl ?? '' }
      : { name: '', sku: '', category: 'Pulseras', salePrice: 29, estimatedCost: 0, imageUrl: '' },
  })

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
    <Modal open onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'} description="Información comercial del modelo disponible para pedidos." size="lg">
      <form className="space-y-5" onSubmit={(event) => void handleSubmit(submit)(event)}>
        <div className="grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
          <Input label="Nombre" required placeholder="KOVA Urban Black" error={errors.name?.message} {...register('name')} />
          <Input label="SKU" placeholder="Opcional" error={errors.sku?.message} {...register('sku')} />
        </div>
        <Input label="Categoría" required error={errors.category?.message} {...register('category')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Precio de venta" type="number" min="0" step="0.01" required error={errors.salePrice?.message} {...register('salePrice')} />
          <Input label="Costo estimado" type="number" min="0" step="0.01" required error={errors.estimatedCost?.message} {...register('estimatedCost')} />
        </div>
        <Input label="URL de imagen" placeholder="Opcional" error={errors.imageUrl?.message} {...register('imageUrl')} />
        <div className="flex justify-end gap-3 border-t border-stone-100 pt-5">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isSubmitting}>{product ? 'Guardar cambios' : 'Crear producto'}</Button>
        </div>
      </form>
    </Modal>
  )
}
