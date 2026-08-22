import type { Sale } from '../../../types/domain'
import { formatCurrency, formatDate } from '../../../utils/format'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'

export function SaleDetailModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  return <Modal open onClose={onClose} title={`Venta #${String(sale.saleNumber).padStart(4, '0')}`} description={`${formatDate(sale.soldAt)} · ${sale.paymentMethod}`} size="lg"><div className="space-y-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Info label="Cliente" value={sale.customerName ?? 'Sin cliente'} /><Info label="Registrada por" value={sale.createdByName} /><Info label="Total" value={formatCurrency(sale.total)} strong /></div><div className="overflow-hidden rounded-2xl border border-stone-200"><div className="grid grid-cols-[1fr_auto] bg-stone-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-stone-400"><span>Pulsera a elaborar</span><span>Subtotal</span></div>{sale.items.map((item) => <div key={item.id} className="flex items-center justify-between border-t border-stone-100 px-4 py-3"><div><p className="text-sm font-bold">{item.productName}</p><p className="text-xs text-stone-400">Muñeca: {item.wristMeasurementCm === null ? 'sin medida' : `${item.wristMeasurementCm} cm`} · {item.quantity} × {formatCurrency(item.unitPrice)}</p></div><p className="text-sm font-bold">{formatCurrency(item.lineTotal)}</p></div>)}</div>{sale.notes && <div><Badge>Nota</Badge><p className="mt-2 text-sm text-stone-600">{sale.notes}</p></div>}</div></Modal>
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</p><p className={`mt-1 truncate text-sm ${strong ? 'font-extrabold' : 'font-semibold'}`}>{value}</p></div> }
