import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useWorkspace } from '../../../hooks/useWorkspace'
import type { Sale } from '../../../types/domain'
import { formatCurrency, roundMoney } from '../../../utils/format'
import { Button } from '../../ui/Button'
import { Input, Select, Textarea } from '../../ui/FormField'
import { Modal } from '../../ui/Modal'

const saleSchema = z.object({
  date: z.string().min(1, 'Selecciona una fecha.'),
  paymentMethod: z.string().min(1, 'Selecciona un medio de pago.'),
  customerName: z.string().max(100, 'Máximo 100 caracteres.'),
  notes: z.string().max(500, 'Máximo 500 caracteres.'),
  items: z.array(z.object({
    productId: z.string().min(1, 'Selecciona un producto.'),
    wristMeasurementCm: z.coerce.number().min(5, 'Mínimo 5 cm.').max(50, 'Máximo 50 cm.'),
    quantity: z.coerce.number().positive('La cantidad debe ser mayor que cero.'),
    unitPrice: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  })).min(1, 'Agrega al menos un producto.'),
})

type SaleForm = z.infer<typeof saleSchema>
const localDate = (value?: string) => value ? value.slice(0, 10) : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

export function SaleFormModal({ sale, onClose }: { sale?: Sale; onClose: () => void }) {
  const { data, service, refresh } = useWorkspace()
  const { register, control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: sale ? {
      date: localDate(sale.soldAt), paymentMethod: sale.paymentMethod, customerName: sale.customerName ?? '', notes: sale.notes ?? '',
      items: sale.items.map((item) => ({ productId: item.productId, wristMeasurementCm: item.wristMeasurementCm ?? 17, quantity: item.quantity, unitPrice: item.unitPrice })),
    } : { date: localDate(), paymentMethod: data?.paymentMethods[0]?.name ?? '', customerName: '', notes: '', items: [{ productId: '', wristMeasurementCm: 17, quantity: 1, unitPrice: 0 }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' })
  const total = roundMoney(items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0))
  const products = data?.products.filter((product) => product.status === 'active') ?? []

  const submit = async (values: SaleForm) => {
    if (!data) return
    try {
      const input = { soldAt: new Date(`${values.date}T12:00:00-05:00`).toISOString(), paymentMethod: values.paymentMethod, customerName: values.customerName, notes: values.notes, items: values.items }
      if (sale) await service.updateSale(sale.id, input)
      else await service.createSale(input)
      await refresh()
      toast.success(sale ? 'Venta actualizada correctamente.' : 'Venta registrada correctamente.')
      onClose()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo guardar la venta.')
    }
  }

  return (
    <Modal open onClose={onClose} title={sale ? `Editar venta #${String(sale.saleNumber).padStart(4, '0')}` : 'Nueva venta'} description="Registra cada modelo con la medida exacta de la muñeca del cliente." size="xl">
      <form onSubmit={(event) => void handleSubmit(submit)(event)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Fecha" type="date" required error={errors.date?.message} {...register('date')} />
          <Select label="Medio de pago" required error={errors.paymentMethod?.message} {...register('paymentMethod')}>{data?.paymentMethods.filter((method) => method.isActive).map((method) => <option key={method.id}>{method.name}</option>)}</Select>
          <Input label="Cliente" placeholder="Opcional" error={errors.customerName?.message} {...register('customerName')} />
          <div className="rounded-xl bg-stone-950 px-4 py-3 text-white"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total</p><p className="mt-1 font-display text-xl font-extrabold">{formatCurrency(total)}</p></div>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between"><div><h3 className="font-display text-sm font-bold">Pulseras a elaborar</h3><p className="text-xs text-stone-400">Cada unidad se prepara a pedido según la medida indicada.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => append({ productId: '', wristMeasurementCm: 17, quantity: 1, unitPrice: 0 })}><Plus className="size-4" />Agregar</Button></div>
          <div className="space-y-3">
            {fields.map((field, index) => {
              const lineTotal = roundMoney((Number(items[index]?.quantity) || 0) * (Number(items[index]?.unitPrice) || 0))
              return <div key={field.id} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[minmax(0,1.6fr)_105px_90px_120px_105px_40px] sm:items-end">
                <Select label={`Modelo ${index + 1}`} required error={errors.items?.[index]?.productId?.message} {...register(`items.${index}.productId`)} onChange={(event) => { const product = products.find((candidate) => candidate.id === event.target.value); setValue(`items.${index}.productId`, event.target.value, { shouldValidate: true }); if (product) setValue(`items.${index}.unitPrice`, product.salePrice) }}><option value="">Seleccionar…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</Select>
                <Input label="Muñeca (cm)" type="number" min="5" max="50" step="0.1" required error={errors.items?.[index]?.wristMeasurementCm?.message} {...register(`items.${index}.wristMeasurementCm`)} />
                <Input label="Cantidad" type="number" min="0.001" step="0.001" required error={errors.items?.[index]?.quantity?.message} {...register(`items.${index}.quantity`)} />
                <Input label="Precio unitario" type="number" min="0" step="0.01" required error={errors.items?.[index]?.unitPrice?.message} {...register(`items.${index}.unitPrice`)} />
                <div><p className="mb-2 text-sm font-semibold">Subtotal</p><div className="flex h-11 items-center rounded-xl border border-stone-200 bg-white px-3 text-sm font-bold tabular-nums">{formatCurrency(lineTotal)}</div></div>
                <Button type="button" variant="ghost" size="icon" disabled={fields.length === 1} onClick={() => remove(index)} aria-label="Quitar producto"><Trash2 className="size-4" /></Button>
              </div>
            })}
          </div>
          {errors.items?.root?.message && <p className="mt-2 text-xs font-medium text-red-600">{errors.items.root.message}</p>}
        </section>

        <Textarea label="Notas" placeholder="Detalles opcionales de la venta" error={errors.notes?.message} {...register('notes')} />
        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-3 border-t border-stone-100 bg-white px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6"><p className="hidden text-sm font-semibold text-stone-500 sm:block">{fields.length} producto{fields.length === 1 ? '' : 's'} · {formatCurrency(total)}</p><div className="ml-auto flex gap-3"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={isSubmitting}>{sale ? 'Guardar cambios' : 'Registrar venta'}</Button></div></div>
      </form>
    </Modal>
  )
}
