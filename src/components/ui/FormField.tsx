import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface FieldShellProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}

function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  return (
    <label className="block text-sm font-semibold text-stone-800">
      <span>{label}{required && <span className="ml-1 text-red-600">*</span>}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span> : hint ? <span className="mt-1.5 block text-xs font-normal text-stone-500">{hint}</span> : null}
    </label>
  )
}

const fieldClass = 'mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200 disabled:bg-stone-100'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; hint?: string }
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, required, className, ...props }, ref) => (
  <FieldShell label={label} error={error} hint={hint} required={required}>
    <input ref={ref} required={required} className={cn(fieldClass, className)} {...props} />
  </FieldShell>
))
Input.displayName = 'Input'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label: string; error?: string; hint?: string }
export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, hint, required, className, children, ...props }, ref) => (
  <FieldShell label={label} error={error} hint={hint} required={required}>
    <select ref={ref} required={required} className={cn(fieldClass, 'appearance-none', className)} {...props}>{children}</select>
  </FieldShell>
))
Select.displayName = 'Select'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label: string; error?: string; hint?: string }
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, hint, required, className, ...props }, ref) => (
  <FieldShell label={label} error={error} hint={hint} required={required}>
    <textarea ref={ref} required={required} className={cn(fieldClass, 'h-24 resize-none py-3', className)} {...props} />
  </FieldShell>
))
Textarea.displayName = 'Textarea'
