import { useState } from "react";
import {
  UserCog,
  Plus,
  Edit,
  Power,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Search,
  X,
} from "lucide-react";
import {
  useBuscarUsuarios,
  useCrearUsuario,
  useActualizarUsuario,
  useCambiarEstadoUsuario,
} from "../../hooks/useUsuarios";
import { ROLES } from "../../utils/constants";
import { getRolLabel } from "../../utils/roleUtils";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Modal from "../../components/ui/Modal.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import ConfirmModal from "../../components/ui/ConfirmModal.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import styles from "./AdminUsuariosPage.module.css";

const ROL_OPTIONS = Object.values(ROLES).map((r) => ({
  value: r,
  label: getRolLabel(r),
}));

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  correo: "",
  documento: "",
  codigoEmpleado: "",
  password: "",
  rol: "",
};

const EMPTY_FILTROS = {
  nombre: "",
  correo: "",
  documento: "",
  codigoEmpleado: "",
  rol: "",
  estado: "",
};

const ESTADO_OPTIONS = [
  { value: "1", label: "Activo" },
  { value: "0", label: "Inactivo" },
];

export default function AdminUsuariosPage() {
  // ── Estado del filtro ──────────────────────────────────────────
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [filtros, setFiltros] = useState(EMPTY_FILTROS);
  const [filtrosActivos, setFiltrosActivos] = useState(EMPTY_FILTROS);
  const [page] = useState(0);

  // ── Query con búsqueda dinámica ────────────────────────────────
  const { data: pageData, isLoading } = useBuscarUsuarios(filtrosActivos, {
    page,
    size: 50,
  });
  const usuarios = pageData?.content ?? [];
  const total = pageData?.totalElements ?? 0;

  // ── Estado del formulario CRUD ─────────────────────────────────
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();
  const cambiarEstado = useCambiarEstadoUsuario();

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [confirm, setConfirm] = useState({
    open: false,
    id: null,
    estadoActual: null,
  });
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });

  const showModal = (type, title, message) =>
    setModal({ open: true, type, title, message });

  // ── Handlers de filtro ─────────────────────────────────────────
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };
  const handleBuscar = () => setFiltrosActivos({ ...filtros });
  const handleLimpiar = () => {
    setFiltros(EMPTY_FILTROS);
    setFiltrosActivos(EMPTY_FILTROS);
  };

  // Contar filtros activos para el badge
  const filtrosActivosCount = Object.values(filtrosActivos).filter(
    (v) => v !== "",
  ).length;

  // ── Handlers del formulario CRUD ───────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPass(false);
    setFormOpen(true);
  };
  const openEdit = (u) => {
    setEditId(u.id);
    setForm({
      nombre: u.nombre ?? "",
      apellido: u.apellido ?? "",
      correo: u.correo ?? "",
      documento: u.documento ?? "",
      codigoEmpleado: u.codigoEmpleado ?? "",
      password: "",
      rol: u.rol ?? "",
    });
    setErrors({});
    setShowPass(false);
    setFormOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.nombre) e.nombre = "Requerido";
    if (!form.apellido) e.apellido = "Requerido";
    if (!form.correo) e.correo = "Requerido";
    if (!form.documento) e.documento = "Requerido";
    if (!form.codigoEmpleado) e.codigoEmpleado = "Requerido";
    if (!editId && !form.password) e.password = "Requerido al crear";
    if (!form.rol) e.rol = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (editId) {
        await actualizar.mutateAsync({ id: editId, ...payload });
        showModal(
          "success",
          "Usuario actualizado",
          `${form.nombre} ${form.apellido} actualizado correctamente.`,
        );
      } else {
        await crear.mutateAsync(payload);
        showModal(
          "success",
          "Usuario creado",
          `${form.nombre} ${form.apellido} creado con rol ${getRolLabel(form.rol)}.`,
        );
      }
      setFormOpen(false);
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error inesperado.",
      );
    }
  };

  const handleCambiarEstado = async () => {
    try {
      await cambiarEstado.mutateAsync({
        id: confirm.id,
        estadoActual: confirm.estadoActual,
      });
      showModal(
        "success",
        "Estado actualizado",
        "Estado del usuario cambiado correctamente.",
      );
    } catch (err) {
      showModal("error", "Error", err.response?.data?.message ?? "Error.");
    } finally {
      setConfirm({ open: false, id: null, estadoActual: null });
    }
  };

  const handleFormChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((er) => ({ ...er, [e.target.name]: "" }));
  };

  return (
    <div className={styles.page}>
      {/* ── Encabezado ── */}
      <div className={styles.pageHeader}>
        <UserCog size={24} color="var(--rol-admin)" />
        <div>
          <h1 className={styles.title}>Gestión de Usuarios</h1>
          <p className={styles.sub}>
            {total} usuario{total !== 1 ? "s" : ""} encontrado
            {total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          {/* Botón de filtro con badge contador */}
          <button
            className={[
              styles.filterToggleBtn,
              filtrosOpen ? styles.filterToggleActive : "",
            ].join(" ")}
            onClick={() => setFiltrosOpen((v) => !v)}
            aria-label="Mostrar filtros"
          >
            <SlidersHorizontal size={16} />
            <span>Filtro</span>
            {filtrosActivosCount > 0 && (
              <span className={styles.filterBadge}>{filtrosActivosCount}</span>
            )}
          </button>
          <Button onClick={openCreate} size="sm">
            <Plus size={16} /> Nuevo usuario
          </Button>
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
          {/* Nombre / Apellido */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Nombre o Apellido</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="nombre"
                value={filtros.nombre}
                onChange={handleFiltroChange}
                placeholder="Buscar por nombre..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Correo */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Correo electrónico</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="correo"
                value={filtros.correo}
                onChange={handleFiltroChange}
                placeholder="Buscar por correo..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Documento */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>N° de Documento</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="documento"
                value={filtros.documento}
                onChange={handleFiltroChange}
                placeholder="Buscar por documento..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Código de empleado */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Código de Empleado</label>
            <div className={styles.filterInputWrap}>
              <Search size={14} className={styles.filterInputIcon} />
              <input
                name="codigoEmpleado"
                value={filtros.codigoEmpleado}
                onChange={handleFiltroChange}
                placeholder="Buscar por código..."
                className={styles.filterInput}
              />
            </div>
          </div>

          {/* Rol */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Rol</label>
            <select
              name="rol"
              value={filtros.rol}
              onChange={handleFiltroChange}
              className={styles.filterSelect}
            >
              <option value="">Todos los roles</option>
              {ROL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Estado</label>
            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
              className={styles.filterSelect}
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

        {/* Acciones del filtro */}
        <div className={styles.filterActions}>
          <button className={styles.filterClearBtn} onClick={handleLimpiar}>
            <X size={14} /> Limpiar
          </button>
          <button className={styles.filterSearchBtn} onClick={handleBuscar}>
            <Search size={14} /> Buscar
          </button>
        </div>
      </div>

      {/* ── Tabla de usuarios ── */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {[
                "#",
                "Nombre",
                "Correo",
                "Documento",
                "Cód. Empleado",
                "Rol",
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
            {isLoading ? (
              <tr>
                <td colSpan={8} className={styles.tdCenter}>
                  Cargando...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.tdCenter}>
                  No se encontraron usuarios con los filtros aplicados.
                </td>
              </tr>
            ) : (
              usuarios.map((u, i) => (
                <tr key={u.id} className={styles.tr}>
                  <td className={styles.td}>{i + 1}</td>
                  <td className={styles.td}>
                    <strong>
                      {u.apellido}, {u.nombre}
                    </strong>
                  </td>
                  <td className={styles.td}>{u.correo}</td>
                  <td className={styles.td}>{u.documento ?? "—"}</td>
                  <td className={styles.td}>{u.codigoEmpleado ?? "—"}</td>
                  <td className={styles.td}>
                    <span className={styles.rolTag}>{getRolLabel(u.rol)}</span>
                  </td>
                  <td className={styles.td}>
                    <Badge
                      label={
                        u.estado === 1 || u.estado === true
                          ? "ACTIVO"
                          : "INACTIVO"
                      }
                      variant={
                        u.estado === 1 || u.estado === true
                          ? "success"
                          : "danger"
                      }
                    />
                  </td>
                  <td className={styles.td}>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.actionBtn}
                        onClick={() => openEdit(u)}
                        aria-label="Editar"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        className={[
                          styles.actionBtn,
                          u.estado === 1 || u.estado === true
                            ? styles.dangerBtn
                            : styles.successBtn,
                        ].join(" ")}
                        onClick={() =>
                          setConfirm({
                            open: true,
                            id: u.id,
                            estadoActual: u.estado,
                          })
                        }
                        aria-label="Cambiar estado"
                      >
                        <Power size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal de formulario ── */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? "Editar usuario" : "Nuevo usuario"}
        size="md"
      >
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGrid}>
            <Input
              label="Nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleFormChange}
              error={errors.nombre}
              placeholder="Ej: Roberto"
              required
            />
            <Input
              label="Apellido"
              name="apellido"
              value={form.apellido}
              onChange={handleFormChange}
              error={errors.apellido}
              placeholder="Ej: Vargas"
              required
            />
          </div>

          <Input
            label="Correo electrónico"
            name="correo"
            type="email"
            value={form.correo}
            onChange={handleFormChange}
            error={errors.correo}
            placeholder="usuario@saasa.com"
            required
          />

          <div className={styles.formGrid}>
            <Input
              label="N° de documento"
              name="documento"
              value={form.documento}
              onChange={handleFormChange}
              error={errors.documento}
              placeholder="Ej: 12345678"
              required
            />
            <Input
              label="Código de empleado"
              name="codigoEmpleado"
              value={form.codigoEmpleado}
              onChange={handleFormChange}
              error={errors.codigoEmpleado}
              placeholder="Ej: EMP-001"
              required
            />
          </div>

          {/* Contraseña con ojo */}
          <div className={styles.passField}>
            <label className={styles.passLabel}>
              Contraseña {!editId && <span className={styles.req}>*</span>}
              {editId && (
                <span className={styles.optional}>(vacío = sin cambios)</span>
              )}
            </label>
            <div className={styles.passWrap}>
              <input
                name="password"
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={handleFormChange}
                placeholder="Mínimo 8 caracteres, 1 mayúscula y 1 número"
                className={[
                  styles.passInput,
                  errors.password ? styles.passError : "",
                ].join(" ")}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? "Ocultar" : "Mostrar"}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && (
              <span className={styles.fieldError}>{errors.password}</span>
            )}
          </div>

          <Select
            label="Rol"
            name="rol"
            value={form.rol}
            onChange={handleFormChange}
            options={ROL_OPTIONS}
            error={errors.rol}
            required
            placeholder="Seleccione rol..."
          />

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
              loading={crear.isPending || actualizar.isPending}
            >
              {editId ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={confirm.open}
        title="Cambiar estado de usuario"
        message="¿Confirmas el cambio de estado del usuario?"
        onClose={() =>
          setConfirm({ open: false, id: null, estadoActual: null })
        }
        onConfirm={handleCambiarEstado}
        loading={cambiarEstado.isPending}
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
