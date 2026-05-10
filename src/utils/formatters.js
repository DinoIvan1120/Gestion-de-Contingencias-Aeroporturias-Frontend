/**
 * Formatea un LocalDateTime que viene del backend.
 *
 * El backend usa LocalDateTime sin zona + BD en UTC.
 * Jackson serializa sin sufijo 'Z', ej: "2026-05-09T16:00:00"
 * pero el valor real en BD es UTC.
 * Al agregar 'Z' forzamos que JS lo interprete como UTC
 * y luego Intl lo convierte correctamente a Lima (UTC-5).
 */
export function formatearFecha(fecha) {
  if (!fecha) return "—";
  // Si ya trae zona (contiene + o Z), no modificar
  const raw =
    typeof fecha === "string" && !fecha.includes("Z") && !fecha.includes("+")
      ? fecha + "Z" // forzar UTC
      : fecha;
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(new Date(raw));
}

export function formatearFechaSolo(fecha) {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(fecha));
}

export function formatearMonto(monto) {
  if (monto == null) return "S/ 0.00";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(monto);
}

export function formatearCorrelativo(num) {
  if (!num) return "—";
  return `SGC-${String(num).padStart(9, "0")}`;
}
