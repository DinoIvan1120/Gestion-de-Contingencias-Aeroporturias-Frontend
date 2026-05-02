import { useState, useEffect, useRef } from "react";
import {
  Plane,
  Hotel,
  Bus,
  UtensilsCrossed,
  Save,
  Edit2,
  Trash2,
  CheckCircle,
  Calendar,
  User,
  Package,
  AlertCircle,
} from "lucide-react";
import { useVuelos } from "../../hooks/useVuelos";
import { useProveedores } from "../../hooks/useProveedores";
import {
  useRegistrosHoy,
  useMisRegistros,
  useRegistrarVueloDiario,
  useActualizarRegistro,
  useEliminarRegistro,
} from "../../hooks/useRegistrosDiarios";
import { TIPOS_CONTINGENCIA } from "../../utils/constants";
import { formatearMonto } from "../../utils/formatters";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import styles from "./LiderVueloPage.module.css";

/* ── Helpers ── */
const BADGE_MAP = {
  CANCELACION: "danger",
  DEMORA: "warning",
  REPROGRAMADO: "warning",
  PROGRAMADO: "info",
};
const HOY = new Date().toISOString().slice(0, 10);

const EMPTY_REC = {
  hotelId: "",
  simples: 0,
  dobles: 0,
  matrimoniales: 0,
  transporteId: "",
  transCapacidad: 0,
  restauranteId: "",
  restCapacidad: 0,
};

function buildRecursos(rec) {
  const list = [];
  if (rec.hotelId)
    list.push({
      proveedorId: Number(rec.hotelId),
      habitacionesSimples: Number(rec.simples) || 0,
      habitacionesDobles: Number(rec.dobles) || 0,
      habitacionesMatrimoniales: Number(rec.matrimoniales) || 0,
    });
  if (rec.transporteId)
    list.push({
      proveedorId: Number(rec.transporteId),
      capacidadTotal: Number(rec.transCapacidad) || 0,
    });
  if (rec.restauranteId)
    list.push({
      proveedorId: Number(rec.restauranteId),
      capacidadTotal: Number(rec.restCapacidad) || 0,
    });
  return list;
}

function recFromRegistro(r) {
  if (!r?.recursos?.length) return EMPTY_REC;
  const hotel = r.recursos.find((x) => x.proveedorTipo === "HOTEL");
  const trans = r.recursos.find((x) => x.proveedorTipo === "TRANSPORTE");
  const rest = r.recursos.find((x) => x.proveedorTipo === "RESTAURANTE");
  return {
    hotelId: hotel ? String(hotel.proveedorId) : "",
    simples: hotel?.habitacionesSimples ?? 0,
    dobles: hotel?.habitacionesDobles ?? 0,
    matrimoniales: hotel?.habitacionesMatrimoniales ?? 0,
    transporteId: trans ? String(trans.proveedorId) : "",
    transCapacidad: trans?.capacidadTotal ?? 0,
    restauranteId: rest ? String(rest.proveedorId) : "",
    restCapacidad: rest?.capacidadTotal ?? 0,
  };
}

/* ── Sub-componente: Card de un registro diario ── */
function RegistroCard({ r, onEditar, onEliminar }) {
  const v = r.vueloItinerario;
  const hoy = r.fechaRegistro === HOY;

  return (
    <div className={[styles.rCard, hoy ? styles.rCardHoy : ""].join(" ")}>
      {/* Encabezado */}
      <div className={styles.rCardTop}>
        <div className={styles.rCardInfo}>
          <span className={styles.rCodigo}>{v?.codigoVuelo ?? "—"}</span>
          <span className={styles.rRuta}>
            {v?.origen} → {v?.destino}
          </span>
          <Badge
            label={v?.tipoContingencia ?? "N/A"}
            variant={BADGE_MAP[v?.tipoContingencia] ?? "neutral"}
          />
        </div>
        <div className={styles.rCardMeta}>
          <span className={styles.rFecha}>
            <Calendar size={12} /> {r.fechaRegistro}
          </span>
          {hoy && <span className={styles.rHoyTag}>Hoy</span>}
        </div>
      </div>

      {/* Aerolínea + hora */}
      <p className={styles.rAero}>
        {v?.aerolinea} {v?.horaVuelo ? `· ${v.horaVuelo}` : ""}
      </p>

      {/* Contadores de recursos */}
      {r.recursos?.length > 0 && (
        <div className={styles.rContadores}>
          {r.totalHoteles > 0 && (
            <span className={styles.rContador}>
              <Hotel size={13} /> {r.totalHoteles} hotel
              {r.totalHoteles !== 1 ? "es" : ""}
            </span>
          )}
          {r.totalTransportes > 0 && (
            <span className={styles.rContador}>
              <Bus size={13} /> {r.totalTransportes} transporte
              {r.totalTransportes !== 1 ? "s" : ""}
            </span>
          )}
          {r.totalRestaurantes > 0 && (
            <span className={styles.rContador}>
              <UtensilsCrossed size={13} /> {r.totalRestaurantes} restaurante
              {r.totalRestaurantes !== 1 ? "s" : ""}
            </span>
          )}
          {r.totalHabitaciones > 0 && (
            <span className={styles.rContador}>
              <Package size={13} /> {r.totalHabitaciones} hab.
            </span>
          )}
        </div>
      )}

      {/* Observaciones */}
      {r.observaciones && <p className={styles.rObs}>{r.observaciones}</p>}

      {/* Líder que registró */}
      <p className={styles.rLider}>
        <User size={11} /> {r.registradoPorNombre ?? "—"}
      </p>

      {/* Acciones */}
      <div className={styles.rActions}>
        <button className={styles.rEditBtn} onClick={() => onEditar(r)}>
          <Edit2 size={13} /> Editar
        </button>
        <button className={styles.rDelBtn} onClick={() => onEliminar(r.id)}>
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PÁGINA PRINCIPAL
   ══════════════════════════════════════════════════ */
export default function LiderVueloPage() {
  /* ── Datos base ─────────────────────────────────── */
  const { data: pageData } = useVuelos({ page: 0, size: 200 });
  const vuelos = pageData?.content ?? [];

  /* Proveedores — se cargan INDEPENDIENTEMENTE del vuelo */
  const { data: hotelesPage } = useProveedores({
    tipo: "HOTEL",
    page: 0,
    size: 50,
  });
  const { data: transportesPage } = useProveedores({
    tipo: "TRANSPORTE",
    page: 0,
    size: 50,
  });
  const { data: restaurantesPage } = useProveedores({
    tipo: "RESTAURANTE",
    page: 0,
    size: 50,
  });
  //const hoteles = hotelesPage?.content ?? [];
  //const transportes = transportesPage?.content ?? [];
  //const restaurantes = restaurantesPage?.content ?? [];

  const hoteles = (hotelesPage?.content ?? []).filter((p) => p.estado === 1);
  const transportes = (transportesPage?.content ?? []).filter(
    (p) => p.estado === 1,
  );
  const restaurantes = (restaurantesPage?.content ?? []).filter(
    (p) => p.estado === 1,
  );

  /* Registros del día y del historial */
  const { data: registrosHoy = [], isLoading: loadingHoy } = useRegistrosHoy();
  const { data: misRegistrosPage, isLoading: loadingHist } = useMisRegistros({
    size: 30,
  });
  const misRegistros = misRegistrosPage?.content ?? [];

  /* Mutaciones */
  const registrar = useRegistrarVueloDiario();
  const actualizar = useActualizarRegistro();
  const eliminar = useEliminarRegistro();
  const loading = registrar.isPending || actualizar.isPending;

  /* ── Estado del formulario ──────────────────────── */
  const [vueloSelId, setVueloSelId] = useState(""); // combo itinerario
  const [vueloSel, setVueloSel] = useState(null); // objeto vuelo seleccionado
  const [fechaReg, setFechaReg] = useState(HOY);
  const [obs, setObs] = useState("");
  const [rec, setRec] = useState(EMPTY_REC);
  const [editId, setEditId] = useState(null); // id del
  // registro en edición

  // Bandera para indicar que vueloSelId fue cambiado PROGRAMÁTICAMENTE (desde handleEditar)
  // y no por el usuario tocando el combobox → el useEffect NO debe resetear rec/obs/editId
  const isEditingRef = useRef(false);
  const [errors, setErrors] = useState({});

  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const [confirm, setConfirm] = useState({ open: false, id: null });

  const showModal = (type, title, message) =>
    setModal({ open: true, type, title, message });

  /* Al seleccionar un vuelo del combo, autocompletar y resetear recursos 
  SOLO si el cambio vino del usuario (no de handleEditar*/
  useEffect(() => {
    if (isEditingRef.current) {
      //El cambio vino del handleEditar -> no resetear, solo limpiar la bandera
      isEditingRef.current = false;
      return;
    }
    if (!vueloSelId) {
      setVueloSel(null);
      return;
    }
    const v = vuelos.find((x) => String(x.id) === String(vueloSelId));
    setVueloSel(v ?? null);
    setRec(EMPTY_REC);
    setObs("");
    setEditId(null);
    setErrors({});
  }, [vueloSelId]);

  /* ── Helpers de recursos ── */
  const setR = (k, v) => setRec((r) => ({ ...r, [k]: v }));
  const totalHab = rec.simples + rec.dobles + rec.matrimoniales;

  /* ── Validación ── */
  const validate = () => {
    const e = {};
    if (!vueloSelId) e.vuelo = "Selecciona un vuelo del itinerario";
    if (!fechaReg) e.fechaReg = "La fecha es requerida";
    setErrors(e);
    return !Object.keys(e).length;
  };

  /* ── Guardar (crear o actualizar) ── */
  const handleGuardar = async () => {
    if (!validate()) return;
    const payload = {
      vueloItinerarioId: Number(vueloSelId),
      fechaRegistro: fechaReg,
      observaciones: obs || "",
      recursos: buildRecursos(rec),
    };
    try {
      if (editId) {
        const res = await actualizar.mutateAsync({ id: editId, ...payload });
        const d = res.data.data;
        showModal(
          "success",
          "Registro actualizado",
          `${d.vueloItinerario?.codigoVuelo} actualizado con ${d.recursos?.length ?? 0} recurso(s).`,
        );
      } else {
        const res = await registrar.mutateAsync(payload);
        const d = res.data.data;
        showModal(
          "success",
          "Vuelo registrado",
          `${d.vueloItinerario?.codigoVuelo} registrado para ${d.fechaRegistro} con ${d.recursos?.length ?? 0} recurso(s).`,
        );
      }
      /* Reset formulario */
      setVueloSelId("");
      setVueloSel(null);
      setRec(EMPTY_REC);
      setObs("");
      setEditId(null);
      setErrors({});
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  /* ── Editar un registro existente ── */
  const handleEditar = (r) => {
    isEditingRef.current = true;
    setVueloSelId(String(r.vueloItinerario?.id ?? ""));
    setVueloSel(r.vueloItinerario);
    setFechaReg(r.fechaRegistro ?? HOY);
    setObs(r.observaciones ?? "");
    setRec(recFromRegistro(r));
    setEditId(r.id);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ── Eliminar ── */
  const handleEliminar = async () => {
    try {
      await eliminar.mutateAsync(confirm.id);
      showModal(
        "success",
        "Registro eliminado",
        "El registro fue eliminado correctamente.",
      );
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    } finally {
      setConfirm({ open: false, id: null });
    }
  };

  /* ── Agrupar historial por fecha ── */
  const historialPorFecha = misRegistros.reduce((acc, r) => {
    const fecha = r.fechaRegistro;
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(r);
    return acc;
  }, {});

  /* ── Registros del día que NO se muestran en el formulario (los recién guardados) ── */
  const registrosDelDia = registrosHoy;

  return (
    <div className={styles.page}>
      {/* ══════════════════════════════════════
          ENCABEZADO
          ══════════════════════════════════════ */}
      <div className={styles.pageHeader}>
        <Plane size={24} color="var(--rol-lider)" />
        <div>
          <h1 className={styles.pageTitle}>Registro de Vuelo</h1>
          <p className={styles.pageSub}>
            Selecciona un vuelo del itinerario y habilita los recursos del día
          </p>
        </div>
        {editId && (
          <div className={styles.editBadge}>
            <Edit2 size={14} /> Editando registro
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          1 — SELECTOR DE ITINERARIO (combobox)
          ══════════════════════════════════════ */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>✈ Itinerario de vuelos</h2>
        <p className={styles.cardNote}>
          Selecciona el vuelo del itinerario cargado por el administrador. Los
          campos se autocompletan automáticamente.
        </p>

        <select
          className={[
            styles.select,
            errors.vuelo ? styles.selectError : "",
          ].join(" ")}
          value={vueloSelId}
          onChange={(e) => setVueloSelId(e.target.value)}
        >
          <option value="">— Selecciona un vuelo del itinerario —</option>
          {vuelos.map((v) => (
            <option key={v.id} value={v.id}>
              ✈ {v.codigoVuelo} · {v.aerolinea} · {v.origen} → {v.destino} ·{" "}
              {v.fechaVuelo?.slice(0, 10)} · {v.tipoContingencia}
            </option>
          ))}
        </select>
        {errors.vuelo && (
          <p className={styles.fieldErr}>
            <AlertCircle size={13} /> {errors.vuelo}
          </p>
        )}

        {/* Vista previa del vuelo seleccionado */}
        {vueloSel && (
          <div className={styles.vueloPreview}>
            <div className={styles.vpGrid}>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Aerolínea</span>
                <span className={styles.vpVal}>{vueloSel.aerolinea}</span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Código</span>
                <span className={styles.vpVal}>
                  <strong>{vueloSel.codigoVuelo}</strong>
                </span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Ruta</span>
                <span className={styles.vpVal}>
                  {vueloSel.origen} → {vueloSel.destino}
                </span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Fecha vuelo</span>
                <span className={styles.vpVal}>
                  {vueloSel.fechaVuelo?.slice(0, 10)}
                </span>
              </div>
              <div className={styles.vpItem}>
                <span className={styles.vpLabel}>Contingencia</span>
                <Badge
                  label={vueloSel.tipoContingencia}
                  variant={BADGE_MAP[vueloSel.tipoContingencia] ?? "neutral"}
                />
              </div>
              {vueloSel.observaciones && (
                <div className={styles.vpItem} style={{ gridColumn: "1/-1" }}>
                  <span className={styles.vpLabel}>Obs. vuelo</span>
                  <span className={styles.vpVal}>{vueloSel.observaciones}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          2 — FECHA + OBSERVACIONES DEL REGISTRO
          ══════════════════════════════════════ */}
      {vueloSel && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>📋 Datos del Registro</h2>
          <div className={styles.regGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Fecha de registro <span className={styles.req}>*</span>
              </label>
              <input
                type="date"
                value={fechaReg}
                onChange={(e) => {
                  setFechaReg(e.target.value);
                  setErrors((er) => ({ ...er, fechaReg: "" }));
                }}
                className={[
                  styles.inputDate,
                  errors.fechaReg ? styles.inputError : "",
                ].join(" ")}
              />
              {errors.fechaReg && (
                <p className={styles.fieldErr}>
                  <AlertCircle size={13} /> {errors.fechaReg}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Observaciones del registro
              </label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                rows={2}
                placeholder="Notas adicionales del líder para este registro..."
                className={styles.textarea}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          3 — HABILITAR RECURSOS
          (se muestran SIEMPRE, independiente del vuelo)
          ══════════════════════════════════════ */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerLabel}>
          🛠 Habilitar Recursos del Día
        </span>
        <span className={styles.dividerLine} />
      </div>

      <div className={styles.recursosGrid}>
        {/* HOTEL */}
        <div className={styles.card}>
          <div className={styles.resourceHeader}>
            <Hotel size={18} color="var(--rol-lider)" />
            <h3 className={styles.cardTitle}>Hotel</h3>
          </div>
          <select
            className={styles.select}
            value={rec.hotelId}
            onChange={(e) => setR("hotelId", e.target.value)}
          >
            <option value="">Sin hotel asignado</option>
            {hoteles.map((h) => (
              <option key={h.id} value={h.id}>
                {h.nombre}
              </option>
            ))}
          </select>
          {rec.hotelId && (
            <div className={styles.habGrid}>
              {[
                { k: "simples", l: "Hab. Simples", d: "1 persona" },
                { k: "dobles", l: "Hab. Dobles", d: "2 camas" },
                { k: "matrimoniales", l: "Matrimoniales", d: "1 cama doble" },
              ].map(({ k, l, d }) => (
                <div key={k} className={styles.habRow}>
                  <div>
                    <span className={styles.habLabel}>{l}</span>
                    <span className={styles.habDesc}>{d}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={rec[k]}
                    onChange={(e) =>
                      setR(k, Math.max(0, Number(e.target.value)))
                    }
                    className={styles.numInput}
                  />
                </div>
              ))}
              {totalHab > 0 && (
                <p className={styles.resumenBar}>
                  Total: {totalHab} hab. — {rec.simples}S · {rec.dobles}D ·{" "}
                  {rec.matrimoniales}M
                </p>
              )}
            </div>
          )}
        </div>

        {/* TRANSPORTE */}
        <div className={styles.card}>
          <div className={styles.resourceHeader}>
            <Bus size={18} color="var(--rol-lider)" />
            <h3 className={styles.cardTitle}>Transporte</h3>
          </div>
          <select
            className={styles.select}
            value={rec.transporteId}
            onChange={(e) => setR("transporteId", e.target.value)}
          >
            <option value="">Sin transporte asignado</option>
            {transportes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
          {rec.transporteId && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Capacidad total (pax)</label>
              <input
                type="number"
                min="0"
                value={rec.transCapacidad}
                onChange={(e) =>
                  setR("transCapacidad", Math.max(0, Number(e.target.value)))
                }
                placeholder="Ej: 45"
                className={styles.numInput}
                style={{ width: "100%", textAlign: "left" }}
              />
            </div>
          )}
        </div>

        {/* RESTAURANTE */}
        <div className={styles.card}>
          <div className={styles.resourceHeader}>
            <UtensilsCrossed size={18} color="var(--rol-lider)" />
            <h3 className={styles.cardTitle}>Restaurante</h3>
          </div>
          <select
            className={styles.select}
            value={rec.restauranteId}
            onChange={(e) => setR("restauranteId", e.target.value)}
          >
            <option value="">Sin restaurante asignado</option>
            {restaurantes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
          {rec.restauranteId && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Capacidad total (cubiertos)
              </label>
              <input
                type="number"
                min="0"
                value={rec.restCapacidad}
                onChange={(e) =>
                  setR("restCapacidad", Math.max(0, Number(e.target.value)))
                }
                placeholder="Ej: 80"
                className={styles.numInput}
                style={{ width: "100%", textAlign: "left" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          BOTÓN GUARDAR
          ══════════════════════════════════════ */}
      <div className={styles.guardadoBar}>
        {editId && (
          <button
            className={styles.cancelarBtn}
            onClick={() => {
              setVueloSelId("");
              setVueloSel(null);
              setRec(EMPTY_REC);
              setObs("");
              setEditId(null);
              setErrors({});
            }}
          >
            Cancelar edición
          </button>
        )}
        <button
          className={styles.guardarBtn}
          onClick={handleGuardar}
          disabled={loading}
        >
          {loading ? (
            <span className={styles.spinnerInline} />
          ) : (
            <Save size={18} />
          )}
          {loading
            ? "Guardando..."
            : editId
              ? "Guardar cambios"
              : "Guardar información de vuelo"}
        </button>
      </div>

      {/* ══════════════════════════════════════
          4 — REGISTROS DEL DÍA (cards)
          ══════════════════════════════════════ */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerLabel}>
          <CheckCircle size={14} /> Registros del Día — {HOY}
        </span>
        <span className={styles.dividerLine} />
      </div>

      {loadingHoy ? (
        <div className={styles.spinnerWrap}>
          <Spinner size="lg" />
        </div>
      ) : registrosDelDia.length === 0 ? (
        <div className={styles.emptyState}>
          <Plane size={32} color="var(--text-300)" />
          <p>No hay vuelos registrados para hoy todavía.</p>
        </div>
      ) : (
        <div className={styles.registrosGrid}>
          {registrosDelDia.map((r) => (
            <RegistroCard
              key={r.id}
              r={r}
              onEditar={handleEditar}
              onEliminar={(id) => setConfirm({ open: true, id })}
            />
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          5 — HISTORIAL AGRUPADO POR FECHA
          ══════════════════════════════════════ */}
      {misRegistros.length > 0 && (
        <>
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerLabel}>
              📅 Historial de registros
            </span>
            <span className={styles.dividerLine} />
          </div>

          {loadingHist ? (
            <div className={styles.spinnerWrap}>
              <Spinner size="lg" />
            </div>
          ) : (
            <div className={styles.historial}>
              {Object.entries(historialPorFecha)
                .sort(([a], [b]) => b.localeCompare(a))
                .filter(([fecha]) => fecha !== HOY) // el día de hoy ya se muestra arriba
                .map(([fecha, registros]) => (
                  <div key={fecha} className={styles.historialGrupo}>
                    <h3 className={styles.historialFecha}>
                      <Calendar size={14} /> {fecha}
                    </h3>
                    <div className={styles.registrosGrid}>
                      {registros.map((r) => (
                        <RegistroCard
                          key={r.id}
                          r={r}
                          onEditar={handleEditar}
                          onEliminar={(id) => setConfirm({ open: true, id })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
      <ConfirmModal
        open={confirm.open}
        title="¿Eliminar registro?"
        message="El registro y sus recursos quedarán inactivos."
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleEliminar}
        loading={eliminar.isPending}
      />
    </div>
  );
}
