import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Download,
  Send,
  Save,
  X,
  Hotel,
  Bus,
  UtensilsCrossed,
  FileText,
  CheckSquare,
  Square,
  Plus,
  Minus,
} from "lucide-react";
import {
  useReporteDetalle,
  useActualizarServicios,
  useRegenerarPdf,
  useDescargarActualizado, // ← AGREGAR
} from "../../hooks/useReportes";
import { useObtenerUrlDescarga } from "../../hooks/useAtenciones"; // ← AGREGAR
import { useProveedores } from "../../hooks/useProveedores";
import { formatearMonto, formatearFecha } from "../../utils/formatters";
import Badge from "../../components/ui/Badge.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import styles from "./ReporteDetallePage.module.css";

const fmt = (v) => formatearMonto(v ?? 0);

/* ── Checkbox toggle ── */
function Chk({ checked, onChange, label, color = "#7C3AED" }) {
  return (
    <button
      className={[styles.chkBtn, checked ? styles.chkBtnActive : ""].join(" ")}
      style={checked ? { borderColor: color, background: `${color}12` } : {}}
      onClick={() => onChange(!checked)}
    >
      {checked ? (
        <CheckSquare size={15} color={color} />
      ) : (
        <Square size={15} color="var(--text-400)" />
      )}
      <span>{label}</span>
    </button>
  );
}

/* ── Stepper ── */
function Stepper({ label, value, onChange, min = 0 }) {
  return (
    <div className={styles.stepper}>
      <span className={styles.stepLabel}>{label}</span>
      <div className={styles.stepCtrl}>
        <button
          className={styles.stepMinus}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus size={13} />
        </button>
        <span className={styles.stepVal}>{value}</span>
        <button className={styles.stepPlus} onClick={() => onChange(value + 1)}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Panel de desglose (modo vista) ── */
function Desglose({ d }) {
  return (
    <div className={styles.desglose}>
      <div className={styles.desgloseHeader}>
        <FileText size={22} color="#7C3AED" />
        <span>Desglose de Costos del Servicio</span>
      </div>

      {/* Hotel */}
      {d.hotel && (
        <div className={styles.svBloque}>
          <div className={styles.svBloqueHeader}>
            <Hotel size={17} color="#22c55e" />
            <span>Hotel: {d.hotel.proveedorNombre}</span>
            <span className={styles.svSubtotal} style={{ color: "#22c55e" }}>
              {fmt(d.hotel.subtotal)}
            </span>
          </div>

          {/* ── AGREGAR ESTO — fechas de estadía ── */}
          {(d.hotel.fechaIngreso || d.hotel.fechaSalida) && (
            <div className={styles.svDetalle}>
              <p className={styles.svSubHead}>Fechas de estadía:</p>
              <div className={styles.svLinea}>
                <span>📅 Check-in</span>
                <span>{d.hotel.fechaIngreso ?? "—"}</span>
              </div>
              <div className={styles.svLinea}>
                <span>📅 Check-out</span>
                <span>{d.hotel.fechaSalida ?? "—"}</span>
              </div>
            </div>
          )}
          {/* ── FIN ── */}
          {d.hotel.cantidadHabitaciones > 0 && (
            <div className={styles.svDetalle}>
              <p className={styles.svSubHead}>Habitaciones:</p>
              <div className={styles.svLinea}>
                <span>
                  {d.hotel.cantidadHabitaciones} × {d.hotel.tipoHabitacion} (
                  {fmt(d.hotel.precioHabitacion)})
                </span>
                <span>
                  {fmt(
                    (d.hotel.precioHabitacion ?? 0) *
                      (d.hotel.cantidadHabitaciones ?? 1),
                  )}
                </span>
              </div>
            </div>
          )}
          {(d.hotel.desayuno ||
            d.hotel.almuerzo ||
            d.hotel.cena ||
            d.hotel.snack) && (
            <div className={styles.svDetalle}>
              <p className={styles.svSubHead}>Servicios de Alimentación:</p>
              {d.hotel.desayuno && (
                <div className={styles.svLinea}>
                  <span>Desayuno</span>
                  <span>{fmt(d.hotel.precioDesayuno)}</span>
                </div>
              )}
              {d.hotel.almuerzo && (
                <div className={styles.svLinea}>
                  <span>Almuerzo</span>
                  <span>{fmt(d.hotel.precioAlmuerzo)}</span>
                </div>
              )}
              {d.hotel.cena && (
                <div className={styles.svLinea}>
                  <span>Cena</span>
                  <span>{fmt(d.hotel.precioCena)}</span>
                </div>
              )}
              {d.hotel.snack && (
                <div className={styles.svLinea}>
                  <span>Snack</span>
                  <span>{fmt(d.hotel.precioSnack)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transporte */}
      {d.transporte && (
        <div className={styles.svBloque}>
          <div className={styles.svBloqueHeader}>
            <Bus size={17} color="#3b82f6" />
            <span>Transporte: {d.transporte.proveedorNombre}</span>
            <span className={styles.svSubtotal} style={{ color: "#3b82f6" }}>
              {fmt(d.transporte.subtotal)}
            </span>
          </div>
          <div className={styles.svDetalle}>
            <div className={styles.svLinea}>
              <span>
                Traslado{" "}
                {d.transporte.tipoTransporte === "INDIVIDUAL"
                  ? "Individual"
                  : "Grupal"}
              </span>
              {/* ── AGREGAR cantidad ── */}
              {d.transporte.cantidadPasajeros > 0 && (
                <span>{d.transporte.cantidadPasajeros} pax</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restaurante */}
      {d.restaurante && (
        <div className={styles.svBloque}>
          <div className={styles.svBloqueHeader}>
            <UtensilsCrossed size={17} color="#f97316" />
            <span>Restaurante: {d.restaurante.proveedorNombre}</span>
            <span className={styles.svSubtotal} style={{ color: "#f97316" }}>
              {fmt(d.restaurante.subtotal)}
            </span>
          </div>
          <div className={styles.svDetalle}>
            {/* ── AGREGAR cantidad de cubiertos ── */}
            {(d.restaurante.cantidadPasajeros ?? 0) > 0 && (
              <div className={styles.svLinea}>
                <span>Cantidad de cubiertos</span>
                <span>{d.restaurante.cantidadPasajeros}</span>
              </div>
            )}
            {d.restaurante.desayuno && (
              <div className={styles.svLinea}>
                <span>🌅 Desayuno</span>
                <span>{fmt(d.restaurante.precioDesayuno)}</span>
              </div>
            )}
            {d.restaurante.almuerzo && (
              <div className={styles.svLinea}>
                <span>😋 Almuerzo</span>
                <span>{fmt(d.restaurante.precioAlmuerzo)}</span>
              </div>
            )}
            {d.restaurante.cena && (
              <div className={styles.svLinea}>
                <span>🌙 Cena</span>
                <span>{fmt(d.restaurante.precioCena)}</span>
              </div>
            )}
            {d.restaurante.snack && (
              <div className={styles.svLinea}>
                <span>Snack</span>
                <span>{fmt(d.restaurante.precioSnack)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Total */}
      <div className={styles.totalBar}>
        <span>TOTAL GENERAL</span>
        <span>{fmt(d.totalGeneral)}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PANEL DE EDICIÓN
   ══════════════════════════════════════ */
function PanelEdicion({
  d,
  hoteles,
  transportes,
  restaurantes,
  onGuardar,
  onCancelar,
  saving,
}) {
  /* Estado del formulario: inicializado con los valores actuales */
  const [hotelRid, setHotelRid] = useState(
    String(d.hotel?.vueloRecursoId ?? ""), // ← forzar string
  );
  const [tipoHab, setTipoHab] = useState(d.hotel?.tipoHabitacion ?? "SIMPLE");
  const [cantHab, setCantHab] = useState(d.hotel?.cantidadHabitaciones ?? 1);
  const [hDes, setHDes] = useState(d.hotel?.desayuno ?? false);
  const [hAlm, setHAlm] = useState(d.hotel?.almuerzo ?? false);
  const [hCena, setHCena] = useState(d.hotel?.cena ?? false);
  const [hSnack, setHSnack] = useState(d.hotel?.snack ?? false);

  const [transRid, setTransRid] = useState(
    String(d.transporte?.vueloRecursoId ?? ""),
  );

  const [tipoTrans, setTipoTrans] = useState(
    d.transporte?.tipoTransporte ?? "INDIVIDUAL",
  );
  const [cantPax, setCantPax] = useState(d.transporte?.cantidadPasajeros ?? 1);

  const [restRid, setRestRid] = useState(
    String(d.restaurante?.vueloRecursoId ?? ""),
  );

  const [cantRest, setCantRest] = useState(
    d.restaurante?.cantidadPasajeros ?? 1, // ← ahora cantidadPasajeros viene del backend
  );
  const [rDes, setRDes] = useState(d.restaurante?.desayuno ?? false);
  const [rAlm, setRAlm] = useState(d.restaurante?.almuerzo ?? false);
  const [rCena, setRCena] = useState(d.restaurante?.cena ?? false);

  // Helper para normalizar LocalDate de Java (puede llegar como array o string)
  const toIsoDate = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) {
      const [y, m, d] = v;
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return v;
  };

  const handleGuardar = () => {
    const body = {};
    if (hotelRid) {
      body.hotelVueloRecursoId = Number(hotelRid);
      body.tipoHabitacion = tipoHab;
      body.cantidadHabitaciones = cantHab;
      body.hotelDesayuno = hDes;
      body.hotelAlmuerzo = hAlm;
      body.hotelCena = hCena;
      body.hotelSnack = hSnack;
      // Después:
      body.fechaIngreso = toIsoDate(d.hotel?.fechaIngreso);
      body.fechaSalida = toIsoDate(d.hotel?.fechaSalida);
    }
    if (transRid) {
      body.transporteVueloRecursoId = Number(transRid);
      body.tipoTransporte = tipoTrans;
      body.cantidadPasajeros = cantPax;
    }
    if (restRid) {
      body.restauranteVueloRecursoId = Number(restRid);
      body.restauranteDesayuno = rDes;
      body.restauranteAlmuerzo = rAlm;
      body.restauranteCena = rCena;
      body.cantidadCubiertos = cantRest; // ← AGREGAR
    }
    onGuardar(body);
  };

  return (
    <div className={styles.editPanel}>
      {/* HOTEL */}
      <div className={styles.editBloque} style={{ borderColor: "#22c55e22" }}>
        <div className={styles.editBloqueHeader} style={{ color: "#16A34A" }}>
          <Hotel size={16} /> Hotel
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Proveedor</label>
          <select
            className={styles.editSelect}
            value={hotelRid}
            onChange={(e) => setHotelRid(e.target.value)}
          >
            <option value="">Seleccionar hotel...</option>
            {hoteles.map((h) => (
              <option
                key={h.vueloRecursoId ?? h.id}
                value={String(h.vueloRecursoId ?? h.id)} // ← forzar string
              >
                {h.proveedorNombre ?? h.nombreProveedor ?? h.nombre}
              </option>
            ))}
          </select>
        </div>
        {hotelRid && (
          <>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Tipo de Habitación</label>
              <div className={styles.radioGroup}>
                {["SIMPLE", "DOBLE", "MATRIMONIAL"].map((t) => (
                  <label
                    key={t}
                    className={[
                      styles.radioBtn,
                      tipoHab === t ? styles.radioBtnActive : "",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      value={t}
                      checked={tipoHab === t}
                      onChange={() => setTipoHab(t)}
                      style={{ display: "none" }}
                    />
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.stepperRow}>
              <Stepper
                label="Cantidad de Habitaciones"
                value={cantHab}
                onChange={setCantHab}
                min={1}
              />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Servicios del Hotel</label>
              <div className={styles.chkRow}>
                <Chk
                  checked={hDes}
                  onChange={setHDes}
                  label="Desayuno"
                  color="#22c55e"
                />
                <Chk
                  checked={hAlm}
                  onChange={setHAlm}
                  label="Almuerzo"
                  color="#22c55e"
                />
                <Chk
                  checked={hSnack}
                  onChange={setHSnack}
                  label="Snack"
                  color="#22c55e"
                />
                <Chk
                  checked={hCena}
                  onChange={setHCena}
                  label="Cena"
                  color="#22c55e"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* TRANSPORTE */}
      <div className={styles.editBloque} style={{ borderColor: "#3b82f622" }}>
        <div className={styles.editBloqueHeader} style={{ color: "#3b82f6" }}>
          <Bus size={16} /> Transporte
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Proveedor</label>
          <select
            className={styles.editSelect}
            value={transRid}
            onChange={(e) => setTransRid(e.target.value)}
          >
            <option value="">Seleccionar transporte...</option>
            {transportes.map((t) => (
              <option
                key={t.vueloRecursoId ?? t.id}
                value={String(t.vueloRecursoId ?? t.id)} // ← AGREGAR String()
              >
                {t.proveedorNombre ?? t.nombreProveedor ?? t.nombre}
              </option>
            ))}
          </select>
        </div>
        {transRid && (
          <>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Tipo de Transporte</label>
              <div className={styles.radioGroup}>
                {["INDIVIDUAL", "GRUPAL"].map((t) => (
                  <label
                    key={t}
                    className={[
                      styles.radioBtn,
                      tipoTrans === t ? styles.radioBtnActive : "",
                    ].join(" ")}
                    style={{
                      borderColor:
                        tipoTrans === t ? "#3b82f6" : "var(--border)",
                      background: tipoTrans === t ? "#EFF6FF" : "",
                    }}
                  >
                    <input
                      type="radio"
                      value={t}
                      checked={tipoTrans === t}
                      onChange={() => setTipoTrans(t)}
                      style={{ display: "none" }}
                    />
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>
            <Stepper
              label="Cantidad de Pasajeros"
              value={cantPax}
              onChange={setCantPax}
              min={1}
            />
          </>
        )}
      </div>

      {/* RESTAURANTE */}
      <div className={styles.editBloque} style={{ borderColor: "#f9731622" }}>
        <div className={styles.editBloqueHeader} style={{ color: "#f97316" }}>
          <UtensilsCrossed size={16} /> Restaurante
        </div>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Proveedor</label>
          <select
            className={styles.editSelect}
            value={restRid}
            onChange={(e) => setRestRid(e.target.value)}
          >
            <option value="">Seleccionar restaurante...</option>
            {restaurantes.map((r) => (
              <option
                key={r.vueloRecursoId ?? r.id}
                value={String(r.vueloRecursoId ?? r.id)} // ← AGREGAR String()
              >
                {r.proveedorNombre ?? r.nombreProveedor ?? r.nombre}
              </option>
            ))}
          </select>
        </div>
        {restRid && (
          <div className={styles.editField}>
            <label className={styles.editLabel}>
              Servicios del Restaurante
            </label>
            {/* ── AGREGAR stepper de cubiertos ── */}
            <Stepper
              label="Cantidad de cubiertos"
              value={cantRest}
              onChange={setCantRest}
              min={1}
            />
            <div className={styles.chkRow}>
              <Chk
                checked={rDes}
                onChange={setRDes}
                label="🌅 Desayuno"
                color="#f97316"
              />
              <Chk
                checked={rAlm}
                onChange={setRAlm}
                label="😋 Almuerzo"
                color="#f97316"
              />
              <Chk
                checked={rCena}
                onChange={setRCena}
                label="🌙 Cena"
                color="#f97316"
              />
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className={styles.editActions}>
        <button className={styles.btnCancelar} onClick={onCancelar}>
          <X size={15} /> Cancelar
        </button>
        <button
          className={styles.btnGuardar}
          onClick={handleGuardar}
          disabled={saving}
        >
          {saving ? <Spinner size="sm" /> : <Save size={15} />}
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PÁGINA PRINCIPAL
   ══════════════════════════════════════ */
export default function ReporteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: d, isLoading, error } = useReporteDetalle(id);
  const actualizar = useActualizarServicios();
  const regenerar = useRegenerarPdf();

  /* Proveedores activos para los selectores de edición */
  const { data: hPage } = useProveedores({ tipo: "HOTEL", page: 0, size: 50 });
  const { data: tPage } = useProveedores({
    tipo: "TRANSPORTE",
    page: 0,
    size: 50,
  });
  const { data: rPage } = useProveedores({
    tipo: "RESTAURANTE",
    page: 0,
    size: 50,
  });
  const hoteles = hPage?.content ?? [];
  const transportes = tPage?.content ?? [];
  const restaurantes = rPage?.content ?? [];

  const [editMode, setEditMode] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const [emailModal, setEmailModal] = useState({ open: false, correo: "" });

  // Dentro del componente, junto a los otros hooks:
  const descargar = useObtenerUrlDescarga();

  // Handler de descarga:
  const handleDescargarPdf = async () => {
    try {
      const res = await descargar.mutateAsync(d.atencionId);
      const url = res.data?.downloadUrl;
      if (url) window.open(url, "_blank");
      else
        showModal("error", "Error", "No se pudo obtener la URL de descarga.");
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al descargar PDF.",
      );
    }
  };

  // Dentro del componente, junto a los otros hooks:
  const descargarActualizado = useDescargarActualizado();

  // Agregar handler:
  const handleDescargarActualizado = async () => {
    try {
      const res = await descargarActualizado.mutateAsync(d.atencionId);
      const url = res.data?.data?.downloadUrl;
      if (url) window.open(url, "_blank");
      else
        showModal("error", "Error", "No se pudo generar la URL de descarga.");
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al generar PDF actualizado.",
      );
    }
  };

  const showModal = (type, title, msg) =>
    setModal({ open: true, type, title, message: msg });

  const handleGuardar = async (body) => {
    try {
      await actualizar.mutateAsync({ id: d.atencionId, ...body });
      setEditMode(false);
      showModal(
        "success",
        "Actualizado",
        "Los servicios del voucher fueron actualizados correctamente.",
      );
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al actualizar.",
      );
    }
  };

  // Reemplazar handleRegenerarPdf:
  const handleAbrirModalEmail = () => {
    setEmailModal({ open: true, correo: d.correoPasajero ?? "" });
  };

  const handleConfirmarEnvioEmail = async () => {
    const correo = emailModal.correo.trim();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      showModal(
        "error",
        "Correo inválido",
        "Ingresa un correo electrónico válido.",
      );
      return;
    }
    setEmailModal({ open: false, correo: "" });
    try {
      await regenerar.mutateAsync(d.atencionId);
      showModal(
        "success",
        "PDF enviado",
        `El PDF fue regenerado y enviado a ${correo}.`,
      );
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al enviar PDF.",
      );
    }
  };
  if (isLoading)
    return (
      <div className={styles.centered}>
        <Spinner size="lg" />
      </div>
    );
  if (error || !d)
    return (
      <div className={styles.centered}>
        <p className={styles.errMsg}>No se encontró el voucher solicitado.</p>
        <button className={styles.btnVolver} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Volver
        </button>
      </div>
    );

  return (
    <div className={styles.page}>
      {/* ─── Header morado (como la imagen) ─── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitulo}>
            {editMode
              ? `Editar Servicios — Ticket #${d.atencionId}`
              : `Información General — Ticket #${d.atencionId}`}
          </h1>
          <p className={styles.headerSub}>
            {d.aerolinea ?? "Plus Ultra Airlines"}
          </p>
        </div>
        <button className={styles.btnVolver} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Volver
        </button>
      </div>

      {/* ─── Card de información general ─── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitulo}>
          Información general — Ticket #{d.atencionId}
        </h2>
        {d.generadoPor && (
          <div className={styles.generadoPor}>
            Generado por: <span>{d.generadoPor}</span>
          </div>
        )}
        <div className={styles.metaGrid}>
          <div>
            <strong>Fecha de creación:</strong> {formatearFecha(d.createdAt)}
          </div>
          <div>
            <strong>Fecha de actualización:</strong>{" "}
            {formatearFecha(d.updatedAt)}
          </div>
          <div>
            <strong>Correlativo:</strong> {d.correlativo}
          </div>
          <div>
            <strong>Estado:</strong>{" "}
            <Badge
              label={d.estado ?? "ACTIVO"}
              variant={d.estado === "ANULADO" ? "danger" : "success"}
            />
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoField}>
            <label>Nombre comercial (Empresa)</label>
            <div className={styles.infoVal}>{d.aerolinea ?? "—"}</div>
          </div>
          <div className={styles.infoField}>
            <label>Pasajero</label>
            <div className={styles.infoVal}>
              {d.apellidoPasajero}/{d.nombrePasajero}
            </div>
          </div>
          <div className={styles.infoField}>
            <label>Correo electrónico</label>
            <div className={styles.infoVal}>{d.correoPasajero ?? "—"}</div>
          </div>
          <div className={styles.infoField}>
            <label>PNR</label>
            <div className={styles.infoVal}>{d.pnr}</div>
          </div>

          {editMode ? (
            <>
              <div className={styles.infoField}>
                <label>Hotel</label>
                <div className={styles.infoVal}>
                  {d.hotel?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Transporte</label>
                <div className={styles.infoVal}>
                  {d.transporte?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Restaurante</label>
                <div className={styles.infoVal}>
                  {d.restaurante?.proveedorNombre ?? "—"}
                </div>
              </div>
              {/* ── AGREGAR ── */}
              {d.hotel && (
                <>
                  <div className={styles.infoField}>
                    <label>Check-in</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaIngreso ?? "—"}
                    </div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Check-out</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaSalida ?? "—"}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className={styles.infoField}>
                <label>Hotel</label>
                <div className={styles.infoVal}>
                  {d.hotel?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Transporte</label>
                <div className={styles.infoVal}>
                  {d.transporte?.proveedorNombre ?? "—"}
                </div>
              </div>
              <div className={styles.infoField}>
                <label>Restaurante</label>
                <div className={styles.infoVal}>
                  {d.restaurante?.proveedorNombre ?? "—"}
                </div>
              </div>
              {/* ── Check-in / Check-out — visibles siempre ── */}
              {d.hotel && (
                <>
                  <div className={styles.infoField}>
                    <label>Check-in</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaIngreso ?? "—"}
                    </div>
                  </div>
                  <div className={styles.infoField}>
                    <label>Check-out</label>
                    <div className={styles.infoVal}>
                      {d.hotel.fechaSalida ?? "—"}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className={[styles.infoField, styles.span3].join(" ")}>
            <label>Lugar de Emisión</label>
            <div className={styles.infoVal}>{d.lugarEmision ?? "—"}</div>
          </div>
        </div>

        {/* Panel de edición (se muestra debajo del formulario al activar) */}
        {editMode && (
          <PanelEdicion
            d={d}
            hoteles={
              d.hotel
                ? [
                    {
                      vueloRecursoId: d.hotel.vueloRecursoId,
                      proveedorNombre: d.hotel.proveedorNombre,
                    },
                  ]
                : []
            }
            transportes={
              d.transporte
                ? [
                    {
                      vueloRecursoId: d.transporte.vueloRecursoId,
                      proveedorNombre: d.transporte.proveedorNombre,
                    },
                  ]
                : []
            }
            restaurantes={
              d.restaurante
                ? [
                    {
                      vueloRecursoId: d.restaurante.vueloRecursoId,
                      proveedorNombre: d.restaurante.proveedorNombre,
                    },
                  ]
                : []
            }
            onGuardar={handleGuardar}
            onCancelar={() => setEditMode(false)}
            saving={actualizar.isPending}
          />
        )}

        {/* Desglose */}
        <Desglose d={d} />

        {/* Botones de acción */}
        {!editMode && (
          <div className={styles.acciones}>
            <button
              className={styles.btnEditar}
              onClick={() => setEditMode(true)}
            >
              <Edit2 size={15} /> Editar información
            </button>
            {/* ── AGREGAR — Descargar PDF ── */}
            <button
              className={styles.btnDescargar}
              onClick={handleDescargarPdf}
              disabled={descargar.isPending}
            >
              {descargar.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Download size={15} />
              )}
              {descargar.isPending
                ? "Descargando..."
                : "Descargar PDF Original"}
            </button>

            {/* Descarga el PDF que está en S3 — el último generado */}
            {/* Regenera con cambios actuales y descarga — SIN email */}
            <button
              className={styles.btnDescargarActualizado}
              onClick={handleDescargarActualizado} // ← CORREGIR (antes era handleDescargarPdf)
              disabled={descargarActualizado.isPending}
            >
              {descargarActualizado.isPending ? (
                <Spinner size="sm" />
              ) : (
                <Download size={15} />
              )}
              {descargarActualizado.isPending
                ? "Generando..."
                : "Descargar PDF Actualizado"}
            </button>
            {/* <button
              className={styles.btnDescargar}
              onClick={() => d.pdfUrl && window.open(d.pdfUrl, "_blank")}
            >
              <Download size={15} /> Descargar PDF
            </button> */}
            <button
              className={styles.btnEnviar}
              onClick={handleAbrirModalEmail} // ← CAMBIAR
              disabled={regenerar.isPending}
            >
              {regenerar.isPending ? <Spinner size="sm" /> : <Send size={15} />}
              {regenerar.isPending
                ? "Enviando..."
                : "Enviar PDF actualizado Email"}
            </button>
          </div>
        )}
      </div>

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
      {/* ─── Modal correo para enviar PDF ─── */}
      {emailModal.open && (
        <div className={styles.emailModalOverlay}>
          <div className={styles.emailModalBox}>
            <h3 className={styles.emailModalTitle}>
              <Send size={17} /> Enviar PDF al Pasajero
            </h3>
            <p className={styles.emailModalDesc}>
              Confirma el correo al que se enviará el voucher PDF actualizado.
            </p>
            <input
              className={styles.emailModalInput}
              type="email"
              placeholder="correo@ejemplo.com"
              value={emailModal.correo}
              onChange={(e) =>
                setEmailModal((m) => ({ ...m, correo: e.target.value }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" && handleConfirmarEnvioEmail()
              }
              autoFocus
            />
            <div className={styles.emailModalActions}>
              <button
                className={styles.emailModalCancel}
                onClick={() => setEmailModal({ open: false, correo: "" })}
              >
                Cancelar
              </button>
              <button
                className={styles.emailModalConfirm}
                onClick={handleConfirmarEnvioEmail}
                disabled={!emailModal.correo.trim() || regenerar.isPending}
              >
                {regenerar.isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Send size={14} />
                )}
                {regenerar.isPending ? "Enviando..." : "Confirmar y Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
