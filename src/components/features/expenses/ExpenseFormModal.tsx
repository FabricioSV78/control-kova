import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useWorkspace } from '../../../hooks/useWorkspace'
import type { Expense, ExpensePayer } from '../../../types/domain'
import { formatCurrency, roundMoney } from '../../../utils/format'
import { Button } from '../../ui/Button'
import { Input, Select, Textarea } from '../../ui/FormField'
import { Modal } from '../../ui/Modal'

const expenseSchema = z.object({
  date: z.string().min(1, 'Selecciona una fecha.'),
  category: z.string().min(1, 'Selecciona una categoría.'),
  concept: z.string().trim().min(2, 'Escribe el concepto del gasto.').max(180),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor que cero.'),
  unitPrice: z.coerce.number().min(0, 'El precio no puede ser negativo.'),
  paidBy: z.enum(['Fabricio', 'Daniela', 'Negocio', 'Compartido']),
  fabricioAmount: z.coerce.number().min(0),
  danielaAmount: z.coerce.number().min(0),
  notes: z.string().max(500),
})
type ExpenseForm = z.infer<typeof expenseSchema>
const localDate = (value?: string) => value ? value.slice(0, 10) : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

export function ExpenseFormModal({ expense, onClose }: { expense?: Expense; onClose: () => void }) {
  const { data, service, refresh } = useWorkspace()
  const fabricio = expense?.contributions.find((item) => item.partner === 'Fabricio')?.amount ?? 0
  const daniela = expense?.contributions.find((item) => item.partner === 'Daniela')?.amount ?? 0
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense ? { date: localDate(expense.spentAt), category: expense.category, concept: expense.concept, quantity: expense.quantity, unitPrice: expense.unitPrice, paidBy: expense.paidBy, fabricioAmount: fabricio, danielaAmount: daniela, notes: expense.notes ?? '' } : { date: localDate(), category: data?.categories[0]?.name ?? '', concept: '', quantity: 1, unitPrice: 0, paidBy: 'Fabricio', fabricioAmount: 0, danielaAmount: 0, notes: '' },
  })
  const [quantity, unitPrice, paidBy, fabricioAmount, danielaAmount] = useWatch({ control, name: ['quantity', 'unitPrice', 'paidBy', 'fabricioAmount', 'danielaAmount'] })
  const total = roundMoney((Number(quantity) || 0) * (Number(unitPrice) || 0))
  const sharedTotal = roundMoney((Number(fabricioAmount) || 0) + (Number(danielaAmount) || 0))

  const submit = async (values: ExpenseForm) => {
    if (values.paidBy === 'Compartido' && roundMoney(values.fabricioAmount + values.danielaAmount) !== total) {
      toast.error(`El aporte de Fabricio y Daniela debe sumar ${formatCurrency(total)}.`)
      return
    }
    try {
      const contributions = values.paidBy === 'Compartido' ? [{ partner: 'Fabricio' as const, amount: values.fabricioAmount }, { partner: 'Daniela' as const, amount: values.danielaAmount }] : []
      const input = { spentAt: new Date(`${values.date}T12:00:00-05:00`).toISOString(), category: values.category, concept: values.concept, quantity: values.quantity, unitPrice: values.unitPrice, paidBy: values.paidBy as ExpensePayer, notes: values.notes, contributions }
      if (expense) await service.updateExpense(expense.id, input)
      else await service.createExpense(input)
      await refresh()
      toast.success(expense ? 'Gasto actualizado correctamente.' : 'Gasto registrado correctamente.')
      onClose()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo guardar el gasto.')
    }
  }

  return <Modal open onClose={onClose} title={expense ? 'Editar gasto' : 'Nuevo gasto'} description="Registra el egreso una sola vez e indica quién lo financió." size="lg">
    <form className="space-y-5" onSubmit={(event) => void handleSubmit(submit)(event)}>
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Fecha" type="date" required error={errors.date?.message} {...register('date')} /><Select label="Categoría" required error={errors.category?.message} {...register('category')}>{data?.categories.filter((item) => item.isActive).map((category) => <option key={category.id}>{category.name}</option>)}</Select></div>
      <Input label="Concepto" placeholder="Ej. Publicidad Facebook" required error={errors.concept?.message} {...register('concept')} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]"><Input label="Cantidad" type="number" min="0.001" step="0.001" required error={errors.quantity?.message} {...register('quantity')} /><Input label="Precio unitario" type="number" min="0" step="0.01" required error={errors.unitPrice?.message} {...register('unitPrice')} /><div className="rounded-xl bg-stone-950 px-4 py-3 text-white"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total</p><p className="mt-1 font-display text-xl font-extrabold">{formatCurrency(total)}</p></div></div>
      <Select label="¿Quién pagó?" required error={errors.paidBy?.message} {...register('paidBy')}><option>Fabricio</option><option>Daniela</option><option>Negocio</option><option>Compartido</option></Select>
      {paidBy === 'Compartido' && <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold">Distribución del aporte</h3><p className="text-xs text-stone-400">Ambos importes deben sumar {formatCurrency(total)}.</p></div><span className={`text-xs font-bold ${sharedTotal === total ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(sharedTotal)} / {formatCurrency(total)}</span></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Fabricio" type="number" min="0" step="0.01" {...register('fabricioAmount')} /><Input label="Daniela" type="number" min="0" step="0.01" {...register('danielaAmount')} /></div></div>}
      <Textarea label="Notas" placeholder="Opcional" error={errors.notes?.message} {...register('notes')} />
      <div className="flex justify-end gap-3 border-t border-stone-100 pt-5"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" loading={isSubmitting}>{expense ? 'Guardar cambios' : 'Registrar gasto'}</Button></div>
    </form>
  </Modal>
}
