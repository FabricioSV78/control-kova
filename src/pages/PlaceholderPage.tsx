import { Construction } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'

export function PlaceholderPage({ title }: { title: string }) {
  return <div className="space-y-7"><PageHeader eyebrow="KOVA Control" title={title} /><Card className="grid min-h-80 place-items-center p-8 text-center"><div><Construction className="mx-auto size-7 text-stone-400" /><p className="mt-3 text-sm font-semibold text-stone-500">Esta sección está entrando en construcción.</p></div></Card></div>
}
