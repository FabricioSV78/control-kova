import { Eye, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ExpenseDetailModal } from '../components/features/expenses/ExpenseDetailModal'
import { ExpenseFormModal } from '../components/features/expenses/ExpenseFormModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { Pagination } from '../components/ui/Pagination'
import { SearchInput } from '../components/ui/SearchInput'
import { useWorkspace } from '../hooks/useWorkspace'
import type { Expense } from '../types/domain'
import { formatCurrency, formatDate } from '../utils/format'

const PAGE_SIZE = 9
export function ExpensesPage() {
  const { data, service, refresh } = useWorkspace()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(params.get('new') === '1')
  const [editing, setEditing] = useState<Expense>()
  const [viewing, setViewing] = useState<Expense>()
  const [deleting, setDeleting] = useState<Expense>()
  const [deletingNow, setDeletingNow] = useState(false)
  const [search, setSearch] = useState('')
  const [payer, setPayer] = useState('Todos')
  const [category, setCategory] = useState('Todas')
  const [page, setPage] = useState(1)
  const expenses = useMemo(() => { const query = search.toLowerCase(); return (data?.expenses ?? []).filter((expense) => (!query || expense.concept.toLowerCase().includes(query) || expense.category.toLowerCase().includes(query)) && (payer === 'Todos' || expense.paidBy === payer) && (category === 'Todas' || expense.category === category)) }, [category, data?.expenses, payer, search])
  const pageCount = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE)); const visible = expenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const closeForm = () => { setFormOpen(false); setEditing(undefined); if (params.get('new')) navigate('/gastos', { replace: true }) }
  const remove = async () => { if (!deleting) return; setDeletingNow(true); try { await service.voidExpense(deleting.id); await refresh(); toast.success('Gasto eliminado correctamente.'); setDeleting(undefined) } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'No se pudo eliminar.') } finally { setDeletingNow(false) } }
  return <div className="space-y-7"><PageHeader eyebrow="Egresos" title="Gastos" description="Registra compras y servicios sin duplicar el aporte de quien pagó." actions={<Button onClick={() => setFormOpen(true)}><Plus className="size-4" />Nuevo gasto</Button>} />
    <div className="grid gap-3 sm:grid-cols-[minmax(250px,1fr)_180px_180px]"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Buscar concepto o categoría…" /><select value={payer} onChange={(event) => { setPayer(event.target.value); setPage(1) }} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"><option>Todos</option><option>Fabricio</option><option>Daniela</option><option>Negocio</option><option>Compartido</option></select><select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }} className="h-11 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold"><option>Todas</option>{data?.categories.map((item) => <option key={item.id}>{item.name}</option>)}</select></div>
    <Card className="overflow-hidden">{expenses.length === 0 ? <EmptyState icon={ReceiptText} title="Todavía no tienes gastos registrados" description={search ? 'Prueba con otra búsqueda o filtro.' : 'Registra el primer gasto del negocio.'} action={!search ? 'Registrar primer gasto' : undefined} onAction={!search ? () => setFormOpen(true) : undefined} /> : <><div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="border-b border-stone-100 bg-stone-50/70 text-[11px] font-bold uppercase tracking-wider text-stone-400"><tr><th className="px-5 py-3.5">Fecha</th><th className="px-5 py-3.5">Concepto</th><th className="px-5 py-3.5">Categoría</th><th className="px-5 py-3.5">Pagado por</th><th className="px-5 py-3.5 text-right">Total</th><th className="px-5 py-3.5 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-stone-100">{visible.map((expense) => <tr key={expense.id} className="hover:bg-stone-50/70"><td className="whitespace-nowrap px-5 py-4 text-sm text-stone-500">{formatDate(expense.spentAt)}</td><td className="px-5 py-4"><p className="text-sm font-bold">{expense.concept}</p><p className="text-xs text-stone-400">{expense.quantity} × {formatCurrency(expense.unitPrice)}</p></td><td className="px-5 py-4"><Badge>{expense.category}</Badge></td><td className="px-5 py-4 text-sm font-semibold">{expense.paidBy}</td><td className="px-5 py-4 text-right text-sm font-extrabold">{formatCurrency(expense.total)}</td><td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setViewing(expense)}><Eye className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setEditing(expense)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(expense)}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table></div><div className="divide-y divide-stone-100 md:hidden">{visible.map((expense) => <article key={expense.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-stone-400">{formatDate(expense.spentAt)} · {expense.category}</p><p className="mt-1 font-bold">{expense.concept}</p><p className="mt-1 text-xs text-stone-400">Pagado por {expense.paidBy}</p></div><strong>{formatCurrency(expense.total)}</strong></div><div className="mt-3 flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => setViewing(expense)}><Eye className="size-4" />Ver</Button><Button variant="ghost" size="icon" onClick={() => setEditing(expense)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(expense)}><Trash2 className="size-4" /></Button></div></article>)}</div></>}</Card>
    <Pagination page={page} pageCount={pageCount} total={expenses.length} onChange={setPage} />
    {(formOpen || editing) && <ExpenseFormModal expense={editing} onClose={closeForm} />}{viewing && <ExpenseDetailModal expense={viewing} onClose={() => setViewing(undefined)} />}<ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(undefined)} onConfirm={remove} loading={deletingNow} title="¿Seguro que deseas eliminar este gasto?" description="El egreso y sus aportes dejarán de contabilizarse. El historial conservará la anulación." />
  </div>
}
