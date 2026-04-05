import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ message, sub, emoji = '🎉', duration = 4000 }) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, sub, emoji }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none max-w-lg mx-auto px-4">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }) {
  return (
    <div
      onClick={() => onDismiss(toast.id)}
      className="pointer-events-auto w-full bg-white rounded-3xl shadow-card-hover px-4 py-3.5 flex items-center gap-3.5 cursor-pointer"
      style={{ animation: 'slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      {/* Left accent */}
      <div className="w-0.5 h-8 rounded-full bg-brand-gradient shrink-0" />
      <span className="text-2xl shrink-0">{toast.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900 leading-tight">{toast.message}</p>
        {toast.sub && <p className="text-xs text-gray-400 truncate mt-0.5">{toast.sub}</p>}
      </div>
    </div>
  )
}
