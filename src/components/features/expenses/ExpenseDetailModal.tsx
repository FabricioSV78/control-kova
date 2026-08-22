import type { Expense } from '../../../types/domain'
import { formatCurrency, formatDate } from '../../../utils/format'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'

export function ExpenseDetailModal({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  return <Modal open onClose={onClose} title={expense.concept} description={`${formatDate(expense.spentAt)} · ${expense.category}`}><div className="space-y-5"><div className="grid grid-cols-2 gap-3"><Info label="Cantidad" value={String(expense.quantity)} /><Info label="Precio unitario" value={formatCurrency(expense.unitPrice)} /><Info label="Pagado por" value={expense.paidBy} /><Info label="Total" value={formatCurrency(expense.total)} strong /></div>{expense.contributions.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-400">Aportes</p><div className="space-y-2">{expense.contributions.map((item) => <div key={item.id} className="flex justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm"><span>{item.partner}</span><strong>{formatCurrency(item.amount)}</strong></div>)}</div></div>}{expense.notes && <div><Badge>Nota</Badge><p className="mt-2 text-sm text-stone-600">{expense.notes}</p></div>}<p className="text-xs text-stone-400">Registrado por {expense.createdByName}</p></div></Modal>
}
function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p><p className={`mt-1 text-sm ${strong ? 'font-extrabold' : 'font-semibold'}`}>{value}</p></div> }
