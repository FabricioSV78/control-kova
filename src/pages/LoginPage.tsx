import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/FormField'
import { useAuth } from '../hooks/useAuth'
import { env, hasSupabaseConfig } from '../lib/env'

export function LoginPage() {
  const { user, login, loginDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  if (user) return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success('Bienvenido a KOVA Control.')
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-stone-950 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -left-24 top-1/4 size-96 rounded-full bg-stone-800/40 blur-3xl" />
        <div className="relative flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-white font-display text-xl font-black text-stone-950">K</span><div><p className="font-display text-xl font-extrabold text-white">KOVA</p><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-500">Control</p></div></div>
        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-stone-500">Finanzas claras. Decisiones simples.</p>
          <h1 className="font-display text-5xl font-extrabold leading-[1.08] tracking-[-0.04em] text-white xl:text-6xl">Todo KOVA,<br />en un solo lugar.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-stone-400">Ventas a pedido, medidas de muñeca, gastos y aportes compartidos para que Fabricio y Daniela siempre vean los mismos números.</p>
        </div>
        <p className="relative text-xs text-stone-600">KOVA Control · PEN · America/Lima</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-kova-50 px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-stone-950 font-display text-lg font-black text-white">K</span><div><p className="font-display font-extrabold">KOVA</p><p className="text-[9px] font-bold uppercase tracking-[0.25em] text-stone-400">Control</p></div></div>
          <div className="mb-7">
            <div className="mb-4 grid size-11 place-items-center rounded-2xl border border-stone-200 bg-white"><LockKeyhole className="size-5" /></div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Bienvenido</h2>
            <p className="mt-2 text-sm text-stone-500">Ingresa con tu cuenta autorizada de KOVA.</p>
          </div>
          {hasSupabaseConfig ? (
            <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
              <Input id="email" name="email" label="Correo" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" required />
              <Input id="password" name="password" label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" required />
              <Button className="mt-2 w-full" size="lg" loading={submitting}>Entrar <ArrowRight className="size-4" /></Button>
            </form>
          ) : env.demoModeEnabled ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-5 text-stone-700" /><div><p className="font-bold">Modo demostración</p><p className="mt-1 text-sm leading-6 text-stone-500">Explora todas las funciones con los datos de ejemplo solicitados. Los cambios se guardan solo en este navegador.</p></div></div>
              <Button className="mt-5 w-full" size="lg" onClick={loginDemo}>Entrar a la demo <ArrowRight className="size-4" /></Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Configura las variables de Supabase para iniciar sesión.</div>
          )}
          <p className="mt-7 text-center text-xs leading-5 text-stone-400">El registro público está deshabilitado.<br />Solo Fabricio y Daniela pueden acceder.</p>
        </div>
      </section>
    </main>
  )
}
