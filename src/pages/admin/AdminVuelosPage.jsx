import { useState, useRef } from "react";
import {
  Plane,
  Plus,
  Edit,
  Upload,
  FileSpreadsheet,
  SlidersHorizontal,
  Search,
  X,
  Power,
} from "lucide-react";
import {
  // useBuscarVuelos,
  useCargaMasiva,
  useRegistrarVuelo,
  useActualizarVuelo,
  useVuelos,
  useBuscarVuelos,
  useAnularVuelo,
  useHabilitarVuelo,
} from "../../hooks/useVuelos";
import { formatearFecha } from "../../utils/formatters";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx"; // ← nuevo
import Input from "../../components/ui/Input.jsx"; // ← nuevo
import Select from "../../components/ui/Select.jsx"; // ← nuevo
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import styles from "./AdminVuelosPage.module.css";

const BADGE_MAP = {
  CANCELACION: "danger",
  DEMORA: "warning",
  REPROGRAMADO: "warning",
  PROGRAMADO: "info",
};

const CONTINGENCIA_OPTIONS = [
  { value: "CANCELACION", label: "Cancelación" },
  { value: "DEMORA", label: "Demora" },
  { value: "REPROGRAMADO", label: "Reprogramado" },
  { value: "PROGRAMADO", label: "Programado" },
];

const ESTADO_OPTIONS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "ANULADO", label: "Anulado" },
];

const EMPTY_FORM = {
  aerolinea: "",
  codigoVuelo: "",
  origen: "",
  destino: "",
  fechaVuelo: "",
  tipoContingencia: "",
  observaciones: "",
};

const EMPTY_FILTROS = {
  aerolinea: "",
  codigoVuelo: "",
  origen: "",
  destino: "",
  tipoContingencia: "",
  estado: "",
};

const contarActivos = (f) => Object.values(f).filter((v) => v !== "").length;

export default function AdminVuelosPage() {
  // ── Filtros ────────────────────────────────────────────────────────────────
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [filtros, setFiltros] = useState(EMPTY_FILTROS);
  const [filtrosActivos, setFiltrosActivos] = useState(EMPTY_FILTROS);

  // ── Datos (usa búsqueda dinámica en lugar de getAll) ───────────────────────
  const { data: pageData, isLoading } = useBuscarVuelos(filtrosActivos, {
    page: 0,
    size: 50,
  });
  const vuelos = pageData?.content ?? [];
  const total = pageData?.totalElements ?? 0;

  //const { data: pageData, isLoading } = useVuelos({ page: 0, size: 50 });
  //const vuelos = pageData?.content ?? [];

  const cargaMasiva = useCargaMasiva();
  const registrar = useRegistrarVuelo();
  const actualizar = useActualizarVuelo();
  const anular = useAnularVuelo();
  const habilitar = useHabilitarVuelo();

  // ── Estado formulario CRUD ─────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // ── Modales de confirmación ────────────────────────────────────────────────
  const [confirmAnular, setConfirmAnular] = useState({
    open: false,
    id: null,
    codigo: "",
  });
  const [confirmHabilitar, setConfirmHabilitar] = useState({
    open: false,
    id: null,
    codigo: "",
  });

  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  //const [confirm, setConfirm] = useState({ open: false, id: null, codigo: "" });
  // const [dragging, setDragging] = useState(false);
  // const fileRef = useRef(null);

  const showModal = (type, title, message) =>
    setModal({ open: true, type, title, message });

  // ── Drag & drop Excel ──────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const fileRef = useRef(null);

  // ── Handlers filtros ───────────────────────────────────────────────────────
  const numActivos = contarActivos(filtrosActivos);

  const handleFiltroChange = (e) =>
    setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleBuscar = () => setFiltrosActivos({ ...filtros });

  const handleLimpiar = () => {
    setFiltros(EMPTY_FILTROS);
    setFiltrosActivos(EMPTY_FILTROS);
  };

  // ── Handlers CRUD ──────────────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormOpen(true);
  };

  const abrirEditar = (v) => {
    setEditId(v.id);
    setForm({
      aerolinea: v.aerolinea ?? "",
      codigoVuelo: v.codigoVuelo ?? "",
      origen: v.origen ?? "",
      destino: v.destino ?? "",
      fechaVuelo: v.fechaVuelo ?? "",
      tipoContingencia: v.tipoContingencia ?? "",
      observaciones: v.observaciones ?? "",
    });
    setErrors({});
    setFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: null }));
  };

  const validar = () => {
    const err = {};
    if (!form.aerolinea.trim()) err.aerolinea = "La aerolínea es requerida";
    if (!form.codigoVuelo.trim())
      err.codigoVuelo = "El código de vuelo es requerido";
    if (!form.origen.trim()) err.origen = "El origen es requerido";
    else if (!/^[A-Za-z]{3}$/.test(form.origen.trim()))
      err.origen = "Código IATA: 3 letras";
    if (!form.destino.trim()) err.destino = "El destino es requerido";
    else if (!/^[A-Za-z]{3}$/.test(form.destino.trim()))
      err.destino = "Código IATA: 3 letras";
    if (!form.fechaVuelo) err.fechaVuelo = "La fecha es requerida";
    if (!form.tipoContingencia)
      err.tipoContingencia = "El tipo de contingencia es requerido";
    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validar();
    if (Object.keys(err).length > 0) {
      setErrors(err);
      return;
    }

    const payload = {
      ...form,
      codigoVuelo: form.codigoVuelo.toUpperCase().trim(),
      origen: form.origen.toUpperCase().trim(),
      destino: form.destino.toUpperCase().trim(),
    };

    try {
      if (editId) {
        await actualizar.mutateAsync({ id: editId, ...payload });
        showModal(
          "success",
          "Vuelo actualizado",
          `El vuelo ${payload.codigoVuelo} fue actualizado correctamente.`,
        );
      } else {
        await registrar.mutateAsync(payload);
        showModal(
          "success",
          "Vuelo creado",
          `El vuelo ${payload.codigoVuelo} fue registrado exitosamente.`,
        );
      }
      setFormOpen(false);
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "No se pudo guardar el vuelo.",
      );
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.endsWith(".xlsx"))
      return showModal(
        "error",
        "Formato inválido",
        "Solo se aceptan archivos .xlsx",
      );
    const fd = new FormData();
    fd.append("archivo", file);
    try {
      const { data } = await cargaMasiva.mutateAsync(fd);
      showModal(
        "success",
        "Carga exitosa",
        `Vuelos importados correctamente. ${data?.data?.registros ?? ""} registros procesados.`,
      );
    } catch (err) {
      showModal(
        "error",
        "Error en la carga",
        err.response?.data?.message ?? "El archivo no pudo procesarse.",
      );
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleAnular = async () => {
    try {
      await anular.mutateAsync(confirmAnular.id);
      showModal(
        "success",
        "Vuelo anulado",
        `El vuelo ${confirmAnular.codigo} fue anulado.`,
      );
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "No se pudo anular el vuelo.",
      );
    } finally {
      setConfirmAnular({ open: false, id: null, codigo: "" });
    }
  };

  const handleHabilitar = async () => {
    try {
      await habilitar.mutateAsync(confirmHabilitar.id);
      showModal(
        "success",
        "Vuelo reactivado",
        `El vuelo ${confirmHabilitar.codigo} fue reactivado.`,
      );
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "No se pudo reactivar el vuelo.",
      );
    } finally {
      setConfirmHabilitar({ open: false, id: null, codigo: "" });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        {/* Fila 1: ícono + título (ocupa todo el ancho) */}
        <div className={styles.headerTop}>
          <Plane size={24} color="var(--rol-admin)" />
          <div>
            <h1 className={styles.title}>Carga Masiva de Vuelos</h1>
            <p className={styles.sub}>Importa vuelos en Excel (.xlsx)</p>
          </div>
        </div>

        {/* Filtros — esquina superior derecha */}
        <button
          className={[
            styles.filterToggleBtn,
            filtrosOpen ? styles.filterToggleActive : "",
          ].join(" ")}
          onClick={() => setFiltrosOpen((o) => !o)}
        >
          <SlidersHorizontal size={15} />
          Filtros
          {numActivos > 0 && (
            <span className={styles.filterBadge}>{numActivos}</span>
          )}
        </button>

        {/* Fila 2: Carga masiva + Agregar vuelo */}
        <div className={styles.headerActions}>
          <button
            className={styles.uploadBtn}
            onClick={() => setUploadOpen(true)}
          >
            <Upload size={15} />
            Carga masiva
          </button>
          <div style={{ flex: 1 }}>
            <Button onClick={abrirCrear} style={{ width: "100%" }}>
              <Plus size={15} />
              Agregar vuelo
            </Button>
          </div>
        </div>
      </div>

      {/* ── Panel de filtros colapsable ── */}
      <div
        className={[
          styles.filterPanel,
          filtrosOpen ? styles.filterPanelOpen : "",
        ].join(" ")}
      >
        <div className={styles.filterGrid}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Aerolínea</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                className={styles.filterInput}
                name="aerolinea"
                value={filtros.aerolinea}
                onChange={handleFiltroChange}
                placeholder="Ej: Plus Ultra"
              />
            </div>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Código de vuelo</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                className={styles.filterInput}
                name="codigoVuelo"
                value={filtros.codigoVuelo}
                onChange={handleFiltroChange}
                placeholder="Ej: PU301"
              />
            </div>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Origen (IATA)</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                className={styles.filterInput}
                name="origen"
                value={filtros.origen}
                onChange={handleFiltroChange}
                placeholder="Ej: MAD"
              />
            </div>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Destino (IATA)</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                className={styles.filterInput}
                name="destino"
                value={filtros.destino}
                onChange={handleFiltroChange}
                placeholder="Ej: LIM"
              />
            </div>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Contingencia</label>
            <select
              className={styles.filterSelect}
              name="tipoContingencia"
              value={filtros.tipoContingencia}
              onChange={handleFiltroChange}
            >
              <option value="">Todas</option>
              {CONTINGENCIA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Estado</label>
            <select
              className={styles.filterSelect}
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
            >
              <option value="">Todos</option>
              {ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterActions}>
          <button className={styles.filterClearBtn} onClick={handleLimpiar}>
            <X size={14} /> Limpiar
          </button>
          <button className={styles.filterSearchBtn} onClick={handleBuscar}>
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      <div className={styles.uploadCard}>
        <div
          className={[styles.dropZone, dragging ? styles.dragOver : ""].join(
            " ",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet
            size={48}
            color={dragging ? "var(--success)" : "var(--primary)"}
          />
          <p className={styles.dropTitle}>Arrastra el archivo Excel aquí</p>
          <p className={styles.dropSub}>o haz clic para seleccionar</p>
          <span className={styles.dropFormat}>
            Formato: .xlsx — columnas: aerolinea, codigoVuelo, origen, destino,
            fechaVuelo, tipoContingencia
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
        {cargaMasiva.isPending && (
          <div className={styles.uploadingBar}>
            <Upload size={16} /> Procesando archivo...
          </div>
        )}
      </div>

      <div className={styles.tableWrap}>
        <h2 className={styles.sectionTitle}>
          Vuelos registrados ({vuelos.length})
        </h2>
        {isLoading ? (
          <p className={styles.loading}>Cargando...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                {[
                  "Código",
                  "Aerolínea",
                  "Ruta",
                  "Fecha",
                  "Contingencia",
                  "Estado",
                  "Acciones",
                ].map((h) => (
                  <th key={h} className={styles.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vuelos.map((v) => (
                <tr key={v.id} className={styles.tr}>
                  <td className={styles.td}>
                    <strong>{v.codigoVuelo}</strong>
                  </td>
                  <td className={styles.td}>{v.aerolinea}</td>
                  <td className={styles.td}>
                    {v.origen} → {v.destino}
                  </td>
                  <td className={styles.td}>
                    {v.fechaVuelo?.slice(0, 16)?.replace("T", " ")}
                  </td>
                  <td className={styles.td}>
                    <Badge
                      label={v.tipoContingencia}
                      variant={BADGE_MAP[v.tipoContingencia] ?? "neutral"}
                    />
                  </td>
                  <td className={styles.td}>
                    <Badge
                      label={v.estado === "ANULADO" ? "ANULADO" : "ACTIVO"}
                      variant={v.estado === "ANULADO" ? "danger" : "success"}
                    />
                  </td>
                  <td className={styles.td}>
                    <div className={styles.rowActions}>
                      {/* Editar — siempre visible */}
                      <button
                        className={styles.actionBtn}
                        onClick={() => abrirEditar(v)}
                        title="Editar vuelo"
                      >
                        <Edit size={15} />
                      </button>

                      {/* Anular — solo si ACTIVO */}
                      {v.estado !== "ANULADO" && (
                        <button
                          className={[styles.actionBtn, styles.dangerBtn].join(
                            " ",
                          )}
                          onClick={() =>
                            setConfirmAnular({
                              open: true,
                              id: v.id,
                              codigo: v.codigoVuelo,
                            })
                          }
                          title="Anular vuelo"
                        >
                          <Power size={15} />
                        </button>
                      )}

                      {/* Habilitar — solo si ANULADO */}
                      {v.estado === "ANULADO" && (
                        <button
                          className={[styles.actionBtn, styles.successBtn].join(
                            " ",
                          )}
                          onClick={() =>
                            setConfirmHabilitar({
                              open: true,
                              id: v.id,
                              codigo: v.codigoVuelo,
                            })
                          }
                          title="Reactivar vuelo"
                        >
                          <Power size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Crear / Editar ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Editar vuelo" : "Nuevo vuelo"}
        size="md"
      >
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGrid}>
            <Input
              label="Aerolínea"
              name="aerolinea"
              value={form.aerolinea}
              onChange={handleFormChange}
              error={errors.aerolinea}
              placeholder="Ej: Plus Ultra Airlines"
              required
            />
            <Input
              label="Código de vuelo"
              name="codigoVuelo"
              value={form.codigoVuelo}
              onChange={handleFormChange}
              error={errors.codigoVuelo}
              placeholder="Ej: PU301"
              required
            />
          </div>

          <div className={styles.formGrid}>
            <Input
              label="Origen (IATA)"
              name="origen"
              value={form.origen}
              onChange={handleFormChange}
              error={errors.origen}
              placeholder="Ej: MAD"
              required
            />
            <Input
              label="Destino (IATA)"
              name="destino"
              value={form.destino}
              onChange={handleFormChange}
              error={errors.destino}
              placeholder="Ej: LIM"
              required
            />
          </div>

          <div className={styles.formGrid}>
            <Input
              label="Fecha de vuelo"
              name="fechaVuelo"
              type="date"
              value={form.fechaVuelo}
              onChange={handleFormChange}
              error={errors.fechaVuelo}
              required
            />
            <Select
              label="Tipo de contingencia"
              name="tipoContingencia"
              value={form.tipoContingencia}
              onChange={handleFormChange}
              options={CONTINGENCIA_OPTIONS}
              error={errors.tipoContingencia}
              placeholder="Seleccione..."
              required
            />
          </div>

          <div className={styles.textareaField}>
            <label className={styles.textareaLabel}>
              Observaciones <span className={styles.optional}>(opcional)</span>
            </label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleFormChange}
              className={styles.textarea}
              rows={3}
              placeholder="Notas adicionales sobre el vuelo..."
            />
          </div>

          <div className={styles.formActions}>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={registrar.isPending || actualizar.isPending}
            >
              {editId ? "Actualizar" : "Crear vuelo"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Carga Masiva Excel ── */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Carga masiva de vuelos"
        size="md"
      >
        <div className={styles.uploadBody}>
          <div
            className={[styles.dropZone, dragging ? styles.dragOver : ""].join(
              " ",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet
              size={48}
              color={dragging ? "var(--success)" : "var(--primary)"}
            />
            <p className={styles.dropTitle}>Arrastra el archivo Excel aquí</p>
            <p className={styles.dropSub}>o haz clic para seleccionar</p>
            <span className={styles.dropFormat}>
              Formato: .xlsx — columnas: aerolinea, codigoVuelo, origen,
              destino, fechaVuelo, tipoContingencia
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
          {cargaMasiva.isPending && (
            <div className={styles.uploadingBar}>
              <Upload size={16} /> Procesando archivo...
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={confirmAnular.open}
        title="Anular vuelo"
        message={`¿Deseas anular el vuelo ${confirmAnular.codigo}? Esta acción no se puede deshacer.`}
        onClose={() => setConfirmAnular({ open: false, id: null, codigo: "" })}
        onConfirm={handleAnular}
        loading={anular.isPending}
        confirmLabel="Anular vuelo"
      />

      {/* ── Confirm: Habilitar ── */}
      <ConfirmModal
        open={confirmHabilitar.open}
        title="Reactivar vuelo"
        message={`¿Deseas reactivar el vuelo ${confirmHabilitar.codigo}? Volverá a estado ACTIVO.`}
        onClose={() =>
          setConfirmHabilitar({ open: false, id: null, codigo: "" })
        }
        onConfirm={handleHabilitar}
        loading={habilitar.isPending}
        confirmLabel="Reactivar vuelo"
      />
      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </div>
  );
}
