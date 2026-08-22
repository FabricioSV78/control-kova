import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useWorkspace } from '../../../hooks/useWorkspace'
import { fileHash, previewExpensesCsv, previewSalesCsv, type PreviewRow } from '../../../services/csv'
import type { ExpenseInput, SaleInput } from '../../../types/domain'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'

type ImportType = 'sales' | 'expenses'
type Preview = PreviewRow<SaleInput | ExpenseInput>

export function ImportCsvModal({ type, onClose }: { type: ImportType; onClose: () => void }) {
  const { data, service, refresh } = useWorkspace(); const [file, setFile] = useState<File>(); const [hash, setHash] = useState(''); const [rows, setRows] = useState<Preview[]>([]); const [loading, setLoading] = useState(false); const [duplicate, setDuplicate] = useState(false)
  const valid = rows.filter((row) => row.value && row.errors.length === 0); const invalid = rows.filter((row) => row.errors.length > 0)
  const selectFile = async (selected?: File) => {
    if (!selected || !data) return
    setLoading(true); setDuplicate(false)
    try { const text = await selected.text(); const nextHash = await fileHash(text); const repeated = await service.hasImportBatch(type, nextHash); const preview = type === 'sales' ? previewSalesCsv(text, data) : previewExpensesCsv(text, data); setFile(selected); setHash(nextHash); setDuplicate(repeated); setRows(preview) }
    catch (reason) { toast.error(reason instanceof Error ? reason.message : 'No pudimos leer el archivo.') }
    finally { setLoading(false) }
  }
  const importRows = async () => {
    if (!file || duplicate || invalid.length || !valid.length) return
    setLoading(true)
    try {
      for (const row of valid) {
        if (!row.value) continue
        if (type === 'sales') await service.createSale(row.value as SaleInput)
        else await service.createExpense(row.value as ExpenseInput)
      }
      await service.saveImportBatch(type, file.name, hash, valid.length); await refresh(); toast.success(`${valid.length} ${type === 'sales' ? 'ventas importadas' : 'gastos importados'} correctamente.`); onClose()
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : 'La importación no pudo completarse.') }
    finally { setLoading(false) }
  }
  return <Modal open onClose={onClose} title={type === 'sales' ? 'Importar ventas' : 'Importar gastos'} description="Revisa los registros antes de agregarlos a KOVA." size="xl"><div className="space-y-5"><label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 px-5 py-8 text-center transition hover:border-stone-400"><input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} /><span className="grid size-11 place-items-center rounded-xl bg-white shadow-sm"><Upload className="size-5" /></span><span className="mt-3 text-sm font-bold">{file?.name ?? 'Seleccionar archivo CSV'}</span><span className="mt-1 text-xs text-stone-400">Máximo recomendado: 500 filas</span></label>{duplicate && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle className="size-5 shrink-0" /><span>Este mismo archivo ya fue importado. Selecciona otro archivo para evitar duplicados.</span></div>}{rows.length > 0 && <><div className="flex flex-wrap gap-3"><span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><CheckCircle2 className="size-4" />{valid.length} válidos</span>{invalid.length > 0 && <span className="flex items-center gap-1.5 text-sm font-bold text-red-600"><AlertCircle className="size-4" />{invalid.length} con errores</span>}</div><div className="max-h-72 overflow-auto rounded-2xl border border-stone-200"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-stone-50 text-stone-400"><tr><th className="px-3 py-2">Fila</th><th className="px-3 py-2">Contenido</th><th className="px-3 py-2">Estado</th></tr></thead><tbody className="divide-y divide-stone-100">{rows.slice(0, 20).map((row) => <tr key={row.rowNumber}><td className="px-3 py-2 font-bold">{row.rowNumber}</td><td className="max-w-md px-3 py-2 text-stone-500">{Object.values(row.raw).filter(Boolean).slice(0, 4).join(' · ')}</td><td className={`px-3 py-2 font-semibold ${row.errors.length ? 'text-red-600' : 'text-emerald-700'}`}>{row.errors.join(', ') || 'Listo'}</td></tr>)}</tbody></table></div>{rows.length > 20 && <p className="text-xs text-stone-400">Mostrando las primeras 20 de {rows.length} filas.</p>}</>}
      <div className="flex justify-end gap-3 border-t border-stone-100 pt-5"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={loading} disabled={!valid.length || Boolean(invalid.length) || duplicate} onClick={() => void importRows()}><FileSpreadsheet className="size-4" />Importar {valid.length || ''} registros</Button></div></div></Modal>
}
