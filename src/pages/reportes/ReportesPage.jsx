import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  BarChart2,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { useReportes, useExportarExcel } from "../../hooks/useReportes";
import { useNavigate } from "react-router-dom";
import { useVuelos } from "../../hooks/useVuelos";
import { useProveedores } from "../../hooks/useProveedores";
import { formatearFecha, formatearMonto } from "../../utils/formatters";
import Button from "../../components/ui/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Modal from "../../components/ui/Modal.jsx";
import styles from "./ReportesPage.module.css";

const EMPTY_FILTROS = {
  correlativo: "",
  pnr: "",
  nombrePasajero: "",
  vueloId: "",
  hotelId: "",
  transporteId: "",
  restauranteId: "",
  agenteId: "",
  fechaDesde: "",
  fechaHasta: "",
};

export default function ReportesPage() {
  const { rol } = useAuth();
  const esProveedor = rol === "PROVEEDOR";
  const [filtros, setFiltros] = useState(EMPTY_FILTROS);
  const [filtrosActivos, setFiltrosActivos] = useState(EMPTY_FILTROS);
  const [filtrosOpen, setFiltrosOpen] = useState(false); // cerrado al entrar
  const [page, setPage] = useState(0);
  const [detalleAtencion, setDetalleAtencion] = useState(null);
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const navigate = useNavigate();

  const { data: pageData, isLoading } = useReportes(filtrosActivos, {
    page,
    size: 10,
  });
  const atenciones = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const totalElements = pageData?.totalElements ?? 0;

  // Detectar tipo de proveedor desde los propios datos (sin campo extra en backend)
  const tipoProveedor = useMemo(() => {
    if (!esProveedor || atenciones.length === 0) return null;
    const a = atenciones.find(
      (x) =>
        (x.hotelTotal ?? 0) > 0 ||
        (x.transporteTotal ?? 0) > 0 ||
        (x.restauranteTotal ?? 0) > 0,
    );
    if (!a) return null;
    if ((a.hotelTotal ?? 0) > 0) return "HOTEL";
    if ((a.transporteTotal ?? 0) > 0) return "TRANSPORTE";
    if ((a.restauranteTotal ?? 0) > 0) return "RESTAURANTE";
    return null;
  }, [esProveedor, atenciones]);

  // Visibilidad de columnas por tipo de servicio
  const mostrarHotel = !esProveedor || tipoProveedor === "HOTEL";
  const mostrarTransporte = !esProveedor || tipoProveedor === "TRANSPORTE";
  const mostrarRestaurante = !esProveedor || tipoProveedor === "RESTAURANTE";

  const { data: vuelosPage } = useVuelos({ page: 0, size: 100 });
  const vuelos = vuelosPage?.content ?? [];
  const { data: hotelesPage } = useProveedores({
    tipo: "HOTEL",
    page: 0,
    size: 50,
  });
  const { data: transPage } = useProveedores({
    tipo: "TRANSPORTE",
    page: 0,
    size: 50,
  });
  const { data: restPage } = useProveedores({
    tipo: "RESTAURANTE",
    page: 0,
    size: 50,
  });
  const hoteles = hotelesPage?.content ?? [];
  const transportes = transPage?.content ?? [];
  const restaurantes = restPage?.content ?? [];

  const exportar = useExportarExcel();

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((f) => ({ ...f, [name]: value }));
  };

  const handleBuscar = () => {
    setFiltrosActivos({ ...filtros });
    setPage(0);
  };
  const handleLimpiar = () => {
    setFiltros(EMPTY_FILTROS);
    setFiltrosActivos(EMPTY_FILTROS);
    setPage(0);
  };

  // Badge: cuenta filtros activos (excluyendo los vacíos)
  const filtrosActivosCount = Object.values(filtrosActivos).filter(
    (v) => v !== "",
  ).length;

  const handleExportar = async () => {
    try {
      await exportar.mutateAsync(filtrosActivos);
    } catch {
      setModal({
        open: true,
        type: "error",
        title: "Error al exportar",
        message: "No se pudo generar el archivo Excel.",
      });
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <BarChart2 size={24} color="var(--primary)" />
        <div>
          <h1 className={styles.title}>
            {esProveedor
              ? "Mis Servicios Registrados"
              : "Reportes de Atenciones"}
          </h1>
          <p className={styles.sub}>
            {totalElements} registro{totalElements !== 1 ? "s" : ""} encontrado
            {totalElements !== 1 ? "s" : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          {/* NUEVO: botón Filtro con badge de filtros activos */}
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
          {/* Exportar Excel: solo para roles internos */}
          {!esProveedor && (
            <Button
              onClick={handleExportar}
              loading={exportar.isPending}
              variant="ghost"
              size="sm"
            >
              <Download size={16} /> Exportar Excel
            </Button>
          )}
        </div>
      </div>

      {/* Banner informativo para proveedor */}
      {esProveedor && (
        <div className={styles.proveedorBanner}>
          <Info size={16} />
          <span>
            Solo estás viendo los registros correspondientes a tus servicios.
            Los datos de otros proveedores no son visibles.
          </span>
        </div>
      )}

      {/* Filtros */}
      <div
        className={[
          styles.filterPanel,
          filtrosOpen ? styles.filterPanelOpen : "",
        ].join(" ")}
      >
        <h2 className={styles.sectionTitle}>Filtros de búsqueda</h2>
        <div className={styles.filtrosGrid}>
          {[
            {
              name: "correlativo",
              label: "Correlativo",
              placeholder: "SGC-000001001",
            },
            { name: "pnr", label: "PNR", placeholder: "ABC123" },
            {
              name: "nombrePasajero",
              label: "Pasajero",
              placeholder: "Nombre del pasajero",
            },
          ].map(({ name, label, placeholder }) => (
            <div key={name} className={styles.filtroField}>
              <label className={styles.filtroLabel}>{label}</label>
              <input
                name={name}
                value={filtros[name]}
                onChange={handleFiltroChange}
                placeholder={placeholder}
                className={styles.filtroInput}
              />
            </div>
          ))}

          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Vuelo</label>
            <select
              name="vueloId"
              value={filtros.vueloId}
              onChange={handleFiltroChange}
              className={styles.filtroSelect}
            >
              <option value="">Todos</option>
              {vuelos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.codigoVuelo} | {v.origen}→{v.destino}
                </option>
              ))}
            </select>
          </div>

          {/* Filtros Hotel/Transporte/Restaurante: ocultos para proveedor */}
          {!esProveedor && (
            <>
              <div className={styles.filtroField}>
                <label className={styles.filtroLabel}>Hotel</label>
                <select
                  name="hotelId"
                  value={filtros.hotelId}
                  onChange={handleFiltroChange}
                  className={styles.filtroSelect}
                >
                  <option value="">Todos</option>
                  {hoteles.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filtroField}>
                <label className={styles.filtroLabel}>Transporte</label>
                <select
                  name="transporteId"
                  value={filtros.transporteId}
                  onChange={handleFiltroChange}
                  className={styles.filtroSelect}
                >
                  <option value="">Todos</option>
                  {transportes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.filtroField}>
                <label className={styles.filtroLabel}>Restaurante</label>
                <select
                  name="restauranteId"
                  value={filtros.restauranteId}
                  onChange={handleFiltroChange}
                  className={styles.filtroSelect}
                >
                  <option value="">Todos</option>
                  {restaurantes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Fecha desde</label>
            <input
              type="date"
              name="fechaDesde"
              value={filtros.fechaDesde}
              onChange={handleFiltroChange}
              className={styles.filtroInput}
            />
          </div>
          <div className={styles.filtroField}>
            <label className={styles.filtroLabel}>Fecha hasta</label>
            <input
              type="date"
              name="fechaHasta"
              value={filtros.fechaHasta}
              onChange={handleFiltroChange}
              className={styles.filtroInput}
            />
          </div>
        </div>
        <div className={styles.filtrosActions}>
          <Button variant="secondary" size="sm" onClick={handleLimpiar}>
            Limpiar
          </Button>
          <Button size="sm" onClick={handleBuscar}>
            Buscar
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableWrap}>
        {isLoading ? (
          <div className={styles.loadingRow}>Cargando...</div>
        ) : atenciones.length === 0 ? (
          <div className={styles.emptyRow}>
            No se encontraron registros con los filtros aplicados.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>#</th>
                <th className={styles.th}>Correlativo</th>
                <th className={styles.th}>PNR</th>
                <th className={styles.th}>F. Creación</th>
                {!esProveedor && (
                  <th className={styles.th}>F. Actualización</th>
                )}
                {!esProveedor && <th className={styles.th}>Generado por</th>}
                {!esProveedor && <th className={styles.th}>Rol</th>}
                <th className={styles.th}>Fecha Vuelo</th>
                <th className={styles.th}>Pasajero</th>
                <th className={styles.th}>Vuelo</th>
                {mostrarHotel && <th className={styles.th}>Hotel</th>}
                {mostrarHotel && <th className={styles.th}>Hotel S/</th>}
                {mostrarTransporte && <th className={styles.th}>Transporte</th>}
                {mostrarTransporte && (
                  <th className={styles.th}>Transporte S/</th>
                )}
                {mostrarRestaurante && (
                  <th className={styles.th}>Restaurante</th>
                )}
                {mostrarRestaurante && (
                  <th className={styles.th}>Restaurante S/</th>
                )}
                <th className={styles.th}>
                  {esProveedor ? "TOTAL MIS SERVICIOS S/" : "TOTAL S/"}
                </th>
                <th className={styles.th}>Estado</th>
                {!esProveedor && <th className={styles.th}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {atenciones.map((a, i) => (
                <tr key={a.correlativo ?? i} className={styles.tr}>
                  <td className={styles.td}>{page * 10 + i + 1}</td>
                  <td className={styles.td}>
                    <span className={styles.correlativo}>
                      {a.correlativo ?? "—"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.pnrBadge}>{a.pnr}</span>
                  </td>
                  <td className={styles.td}>
                    {a.createdAt ? formatearFecha(a.createdAt) : "—"}
                  </td>
                  {!esProveedor && (
                    <td className={styles.td}>
                      {a.updatedAt ? formatearFecha(a.updatedAt) : "—"}
                    </td>
                  )}
                  {!esProveedor && (
                    <td className={styles.td}>{a.generadoPor ?? "—"}</td>
                  )}
                  {!esProveedor && (
                    <td className={styles.td}>
                      {a.rolGenerador && (
                        <span className={styles.rolBadge}>
                          {a.rolGenerador === "ADMINISTRADOR"
                            ? "Admin"
                            : a.rolGenerador === "LIDER_SAASA"
                              ? "Líder"
                              : a.rolGenerador === "AGENTE_SAASA"
                                ? "Agente"
                                : a.rolGenerador === "LINEA_AEREA"
                                  ? "Línea Aérea"
                                  : a.rolGenerador === "PROVEEDOR"
                                    ? "Proveedor"
                                    : a.rolGenerador}
                        </span>
                      )}
                    </td>
                  )}
                  <td className={styles.td}>
                    {a.fechaVuelo?.slice(0, 10) ?? "—"}
                  </td>
                  <td className={styles.td}>{a.pasajero ?? "—"}</td>
                  <td className={styles.td}>{a.vuelo ?? "—"}</td>
                  {mostrarHotel && (
                    <td className={styles.td}>{a.hotel ?? "—"}</td>
                  )}
                  {mostrarHotel && (
                    <td className={styles.td}>
                      {formatearMonto(a.hotelTotal)}
                    </td>
                  )}
                  {mostrarTransporte && (
                    <td className={styles.td}>{a.transporte ?? "—"}</td>
                  )}
                  {mostrarTransporte && (
                    <td className={styles.td}>
                      {formatearMonto(a.transporteTotal)}
                    </td>
                  )}
                  {mostrarRestaurante && (
                    <td className={styles.td}>{a.restaurante ?? "—"}</td>
                  )}
                  {mostrarRestaurante && (
                    <td className={styles.td}>
                      {formatearMonto(a.restauranteTotal)}
                    </td>
                  )}
                  <td className={styles.td}>
                    <strong
                      className={
                        esProveedor ? styles.totalProveedor : undefined
                      }
                    >
                      {formatearMonto(a.total)}
                    </strong>
                  </td>
                  <td className={styles.td}>
                    <Badge
                      label={a.estado ?? "ACTIVO"}
                      variant={a.estado === "ANULADO" ? "danger" : "success"}
                    />
                  </td>
                  {!esProveedor && (
                    <td className={styles.td}>
                      <button
                        className={styles.detailBtn}
                        onClick={() =>
                          navigate(`/reportes/detalle/${a.correlativo}`)
                        }
                        aria-label="Ver detalle"
                      >
                        detalle
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={18} />
          </button>
          <span className={styles.pageInfo}>
            Página {page + 1} de {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Modal detalle */}
      <Modal
        open={!!detalleAtencion}
        onClose={() => setDetalleAtencion(null)}
        title="Detalle de atención"
        size="lg"
      >
        {detalleAtencion && (
          <div className={styles.detalle}>
            <div className={styles.detalleGrid}>
              <div>
                <strong>Correlativo:</strong>{" "}
                {detalleAtencion.numeroCorrelativo ??
                  detalleAtencion.correlativo}
              </div>
              <div>
                <strong>PNR:</strong> {detalleAtencion.pnr}
              </div>
              <div>
                <strong>Pasajero:</strong> {detalleAtencion.apellido}/
                {detalleAtencion.nombre}
              </div>
              <div>
                <strong>Correo:</strong> {detalleAtencion.correo ?? "—"}
              </div>
              <div>
                <strong>Vuelo:</strong> {detalleAtencion.codigoVuelo ?? "—"}
              </div>
              <div>
                <strong>Estado:</strong>{" "}
                <Badge
                  label={detalleAtencion.estado ?? "ACTIVO"}
                  variant={
                    detalleAtencion.estado === "ANULADO" ? "danger" : "success"
                  }
                />
              </div>
            </div>
            <h4 className={styles.desgloseTitle}>Desglose de costos</h4>
            <table className={styles.desgloseTable}>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Hotel</td>
                  <td>{formatearMonto(detalleAtencion.montoHotel)}</td>
                </tr>
                <tr>
                  <td>Transporte</td>
                  <td>{formatearMonto(detalleAtencion.montoTransporte)}</td>
                </tr>
                <tr>
                  <td>Restaurante</td>
                  <td>{formatearMonto(detalleAtencion.montoRestaurante)}</td>
                </tr>
                <tr className={styles.totalRow}>
                  <td>
                    <strong>TOTAL</strong>
                  </td>
                  <td>
                    <strong>
                      {formatearMonto(detalleAtencion.montoTotal)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>

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
