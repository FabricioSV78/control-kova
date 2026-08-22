export function LoadingState() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Cargando">
      <div className="h-9 w-52 rounded-lg bg-stone-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 rounded-2xl bg-stone-200/80" />)}
      </div>
      <div className="h-80 rounded-2xl bg-stone-200/80" />
    </div>
  )
}
