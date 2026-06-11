'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

type ToastProps = {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'error'
  duration?: number
}

type Toast = ToastProps & {
  id: string
  open: boolean
}

// ─── Global store (minimal, function-based) ────────────────────
// Allows calling toast() imperatively from anywhere, while Toaster
// subscribes to changes via useSyncExternalStore.

let toasts: Toast[] = []
const listeners = new Set<(toasts: Toast[]) => void>()
let toastCount = 0

function subscribeToToasts(cb: (toasts: Toast[]) => void) {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

function getToasts(): Toast[] {
  return toasts
}

function addToast(props: ToastProps): string {
  const id = String(++toastCount)
  toasts = [{ ...props, id, open: true }, ...toasts].slice(0, 5)
  listeners.forEach(fn => fn([...toasts]))

  // Close after duration (default 3s)
  const dismissAfter = props.duration ?? 3000
  setTimeout(() => {
    toasts = toasts.map(t => (t.id === id ? { ...t, open: false } : t))
    listeners.forEach(fn => fn([...toasts]))
  }, dismissAfter)

  // Remove from DOM after animation (+300ms for close animation)
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    listeners.forEach(fn => fn([...toasts]))
  }, dismissAfter + 300)

  return id
}

// ─── Imperative API ────────────────────────────────────────────

export function toast(props: ToastProps) {
  const id = addToast(props)
  return { id }
}

// ─── Provider (thin wrapper around Radix) ─────────────────────

export const ToastProvider = ToastPrimitives.Provider

// ─── Styled Viewport ───────────────────────────────────────────

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col-reverse gap-2 p-4 outline-none',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = 'ToastViewport'

// ─── Toaster (renders into viewport, subscribes to global store) ──

export function Toaster() {
  const snapshot = React.useSyncExternalStore(subscribeToToasts, getToasts, getToasts)

  if (snapshot.length === 0) return null

  return (
    <ToastViewport>
      {snapshot.map(t => (
        <ToastPrimitives.Root
          key={t.id}
          open={t.open}
          onOpenChange={(open) => {
            if (!open) {
              toasts = toasts.map(s => (s.id === t.id ? { ...s, open: false } : s))
              setTimeout(() => {
                toasts = toasts.filter(s => s.id !== t.id)
                listeners.forEach(fn => fn([...toasts]))
              }, 300)
            }
          }}
          className={cn(
            'pointer-events-auto flex w-full items-center justify-between gap-4 rounded-xl border p-4 shadow-lg',
            'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-top-2',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-top-2',
            t.variant === 'success'
              ? 'border-green-500/50 bg-green-900/20'
              : t.variant === 'error'
                ? 'border-red-500/50 bg-red-900/20'
                : 'border-border bg-surface-elevated'
          )}
        >
          <div className="flex-1 min-w-0">
            <ToastPrimitives.Title className="text-sm font-medium text-white">
              {t.title}
            </ToastPrimitives.Title>
            {t.description && (
              <ToastPrimitives.Description className="text-sm text-zinc-400 mt-0.5">
                {t.description}
              </ToastPrimitives.Description>
            )}
          </div>
          <ToastPrimitives.Close className="shrink-0 rounded-md p-1 text-zinc-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </ToastPrimitives.Close>
        </ToastPrimitives.Root>
      ))}
    </ToastViewport>
  )
}
