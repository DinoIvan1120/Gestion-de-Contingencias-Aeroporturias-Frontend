export function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(fecha))
}

export function formatearFechaSolo(fecha) {
  if (!fecha) return '—'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(fecha))
}

export function formatearMonto(monto) {
  if (monto == null) return 'S/ 0.00'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(monto)
}

export function formatearCorrelativo(num) {
  if (!num) return '—'
  return `SGC-${String(num).padStart(9, '0')}`
}
