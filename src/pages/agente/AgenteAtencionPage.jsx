import { useState, useRef, useCallback, useEffect } from "react";
import {
  Users,
  Plane,
  Hotel,
  Bus,
  UtensilsCrossed,
  Camera,
  CameraOff,
  Upload,
  CheckSquare,
  Square,
  Plus,
  Minus,
  FileDown,
  Send,
  ChevronLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useRegistrosHoy } from "../../hooks/useRegistrosDiarios";
import {
  useAtencionesRegistro,
  useDisponibilidad,
  useEscanearBoardingPass,
  useEscanearBoardingPassImagen,
  useCrearAtencion,
  useAsignarServicios,
  useGenerarPdf,
  useGenerarYEnviarVoucher,
  useObtenerUrlDescarga, // ← AGREGAR ESTA LÍNEA
} from "../../hooks/useAtenciones";
import InfoModal from "../../components/ui/InfoModal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import styles from "./AgenteAtencionPage.module.css";

const BADGE_MAP = {
  CANCELACION: "danger",
  DEMORA: "warning",
  REPROGRAMADO: "warning",
  PROGRAMADO: "info",
};
const HOY = new Date().toISOString().slice(0, 10);
const EMPTY_PX = { nombre: "", apellido: "", pnr: "", correo: "" };

/* ══════════════════════
   Helpers
   ══════════════════════ */
/** Intenta decodificar un barcode de una imagen/video usando BarcodeDetector o canvas */
async function leerCodigoDeImagen(source) {
  // 1. Probar BarcodeDetector nativo (Chrome 83+)
  if ("BarcodeDetector" in window) {
    try {
      const det = new window.BarcodeDetector({
        formats: ["pdf417", "qr_code", "code_128", "aztec", "data_matrix"],
      });
      const codes = await det.detect(source);
      if (codes.length > 0) return codes[0].rawValue;
    } catch {
      /* continúa */
    }
  }
  return null;
}

/** Convierte dataURL a ImageBitmap para BarcodeDetector */
async function dataUrlToImageBitmap(dataUrl) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => createImageBitmap(img).then(res).catch(rej);
    img.onerror = rej;
    img.src = dataUrl;
  });
}

/* ══════════════════════
   Checkbox toggle
   ══════════════════════ */
function Chk({ checked, onChange, label, emoji, color }) {
  return (
    <button
      className={[styles.chkBtn, checked ? styles.chkBtnActive : ""].join(" ")}
      style={checked ? { borderColor: color, background: `${color}18` } : {}}
      onClick={() => onChange(!checked)}
    >
      {checked ? (
        <CheckSquare size={15} color={color} />
      ) : (
        <Square size={15} color="var(--text-400)" />
      )}
      {emoji && <span>{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

/* ══════════════════════
   Stepper −/+
   ══════════════════════ */
function Stepper({ label, disponibles = 0, value, onChange }) {
  return (
    <div className={styles.stepper}>
      <div className={styles.stepperLabel}>
        {label}{" "}
        <span className={styles.stepperDisp}>(Disponibles: {disponibles})</span>
      </div>
      <div className={styles.stepperCtrl}>
        <button
          className={styles.stepBtn}
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
        >
          <Minus size={13} />
        </button>
        <span className={styles.stepVal}>{value}</span>
        <button
          className={[styles.stepBtn, styles.stepBtnPlus].join(" ")}
          onClick={() => onChange(Math.min(disponibles, value + 1))}
          disabled={value >= disponibles}
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════
   Vista 1 — Selección de vuelo
   ══════════════════════ */
function SeleccionVuelo({ registros, loading, onSeleccionar }) {
  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <Users size={24} color="var(--rol-agente)" />
        <div>
          <h1 className={styles.pageTitle}>Registro de Compensación</h1>
          <p className={styles.pageSub}>
            Atención al pasajero afectado — {HOY}
          </p>
        </div>
      </div>

      <div className={styles.secTitulo}>🛫 Vuelos registrados para hoy</div>
      <p className={styles.secNota}>
        Selecciona el vuelo del pasajero que vas a atender
      </p>

      {loading ? (
        <div className={styles.centered}>
          <Spinner size="lg" />
        </div>
      ) : registros.length === 0 ? (
        <div className={styles.emptyState}>
          <Plane size={48} color="var(--text-200)" />
          <p>El líder aún no ha registrado vuelos para hoy.</p>
        </div>
      ) : (
        <div className={styles.vuelosGrid}>
          {registros.map((r) => {
            const v = r.vueloItinerario;
            return (
              <div key={r.id} className={styles.vCard}>
                <div className={styles.vCardTop}>
                  <div className={styles.vCardInfo}>
                    <span className={styles.vCodigo}>{v?.codigoVuelo}</span>
                    <span className={styles.vRuta}>
                      {v?.origen} → {v?.destino}
                    </span>
                    {v?.horaVuelo && (
                      <span className={styles.vHora}>{v.horaVuelo}</span>
                    )}
                  </div>
                  <Badge
                    label={v?.tipoContingencia ?? "—"}
                    variant={BADGE_MAP[v?.tipoContingencia] ?? "neutral"}
                  />
                </div>
                <p className={styles.vAero}>{v?.aerolinea}</p>
                <p className={styles.vLider}>
                  👤 Líder: {r.registradoPorNombre}
                </p>
                <div className={styles.vRecursosCont}>
                  {r.totalHoteles > 0 && (
                    <span className={styles.vRecurso}>
                      <Hotel size={12} /> {r.totalHoteles}
                    </span>
                  )}
                  {r.totalTransportes > 0 && (
                    <span className={styles.vRecurso}>
                      <Bus size={12} /> {r.totalTransportes}
                    </span>
                  )}
                  {r.totalRestaurantes > 0 && (
                    <span className={styles.vRecurso}>
                      <UtensilsCrossed size={12} /> {r.totalRestaurantes}
                    </span>
                  )}
                </div>
                <button
                  className={styles.selBtn}
                  onClick={() => onSeleccionar(r)}
                >
                  Seleccionar este vuelo →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Vista 2 — Formulario completo (UNA SOLA VISTA)
   ══════════════════════════════════════════════════════════ */
function FormularioAtencion({ registro, onVolver }) {
  const v = registro.vueloItinerario;

  /* ── Disponibilidad en tiempo real ── */
  const { data: disp, refetch: refetchDisp } = useDisponibilidad(registro.id);

  /*
   * FUENTE DE PROVEEDORES: registro.recursos (lo que el líder habilitó)
   * FUENTE DE DISPONIBILIDAD: disp (números en tiempo real)
   * Cruzamos por vueloRecursoId / proveedorId
   */
  const recursosHotel = (registro.recursos ?? []).filter(
    (r) => r.proveedorTipo === "HOTEL",
  );
  const recursosTransporte = (registro.recursos ?? []).filter(
    (r) => r.proveedorTipo === "TRANSPORTE",
  );
  const recursosRest = (registro.recursos ?? []).filter(
    (r) => r.proveedorTipo === "RESTAURANTE",
  );

  /* Enriquecer con disponibilidad real si ya llegó */
  const hotelesDip = disp?.hoteles ?? [];
  const transportesDip = disp?.transportes ?? [];
  const restaurantesDip = disp?.restaurantes ?? [];

  /* Helper: encuentra disponibilidad por vueloRecursoId del recurso */
  const getDispHotel = (r) =>
    hotelesDip.find((d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id));
  const getDispTrans = (r) =>
    transportesDip.find((d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id));
  const getDispRest = (r) =>
    restaurantesDip.find(
      (d) => d.vueloRecursoId === (r.vueloRecursoId ?? r.id),
    );

  /* ── Escáner ── */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const inputImgRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [bpTexto, setBpTexto] = useState("");
  const [bpScanning, setBpScanning] = useState(false);

  const [modoManual, setModoManual] = useState(false);

  /* ── Pasajeros ── */
  const [pasajeros, setPasajeros] = useState([{ ...EMPTY_PX }]);
  const [pxActivo, setPxActivo] = useState(0);

  /* ── Servicios seleccionados ── */
  const [hotelRec, setHotelRec] = useState(null); // RecursoDisponibleResponse
  const [simples, setSimples] = useState(0);
  const [dobles, setDobles] = useState(0);
  const [matrim, setMatrim] = useState(0);
  const [svHotel, setSvHotel] = useState({
    desayuno: false,
    almuerzo: false,
    snack: false,
    cena: false,
  });

  const [transRec, setTransRec] = useState(null); // RecursoDisponibleResponse
  const [tipoTrans, setTipoTrans] = useState({
    individual: false,
    grupal: false,
  });

  const [restRec, setRestRec] = useState(null); // RecursoDisponibleResponse
  const [svRest, setSvRest] = useState({
    desayuno: false,
    almuerzo: false,
    cena: false,
  });

  /* ── Datos de emisión ── */
  const [fechaEmision, setFechaEmision] = useState(HOY);
  const [lugarEmision, setLugarEmision] = useState("LIM");

  /* ── Modales ── */
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const showModal = (type, title, msg) =>
    setModal({ open: true, type, title, message: msg });

  /* ── Modal de correo para "Generar y Enviar" ── */
  const [emailModal, setEmailModal] = useState({
    open: false,
    correo: "",
    atencionIds: [], // ids de atenciones ya creadas, esperando envío
  });

  /* ── Hooks de mutación ── */
  const escanear = useEscanearBoardingPass();
  // 2. Dentro de FormularioAtencion, junto a los demás hooks de mutación:
  const escanearImg = useEscanearBoardingPassImagen();
  const crearAt = useCrearAtencion();
  const asignarSv = useAsignarServicios();
  const genPdf = useGenerarPdf();
  const genYEnviar = useGenerarYEnviarVoucher();
  const obtenerUrl = useObtenerUrlDescarga(); // ← AGREGAR ESTA LÍNEA
  const { data: atencionesPrev = [] } = useAtencionesRegistro(registro.id);

  /* ── Cámara ── */
  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Esperar a que los metadatos estén listos antes de hacer play
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => resolve();
        });
        await videoRef.current.play();
      }
      setCamOn(true);
      scanLoop();
    } catch {
      showModal(
        "error",
        "Cámara no disponible",
        'No se pudo acceder a la cámara. Usa "Subir Imagen" o ingresa el código manualmente.',
      );
    }
  };

  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamOn(false);
  }, []);

  const scanLoop = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current.videoWidth) {
      setTimeout(scanLoop, 300);
      return;
    }
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const bm = await createImageBitmap(canvas);
    const codigo = await leerCodigoDeImagen(bm);
    if (codigo) {
      setBpTexto(codigo);
      detenerCamara();
      showModal(
        "success",
        "Código detectado",
        'Haz clic en "Escanear" para procesar el boarding pass.',
      );
    } else if (streamRef.current) {
      setTimeout(scanLoop, 500);
    }
  }, [detenerCamara]);

  useEffect(() => {
    return () => detenerCamara();
  }, [detenerCamara]);

  /* ── Subir imagen ── */
  // 3. Reemplazar handleSubirImagen completo:
  const handleSubirImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // permite re-seleccionar el mismo archivo
    setBpScanning(true);

    try {
      // Intento 2: Enviar imagen al backend (ZXing con múltiples estrategias)
      const formData = new FormData();
      formData.append("imagen", file);

      const res = await escanearImg.mutateAsync(formData);
      const bp = res.data.data;
      const partes = (bp.nombreCompleto ?? "").split("/");
      const apellido = partes[0]?.trim().toUpperCase() ?? "";
      const nombre = partes[1]?.trim().toUpperCase() ?? "";

      setPasajeros((prev) => {
        const copy = [...prev];
        copy[pxActivo] = {
          ...copy[pxActivo],
          nombre,
          apellido,
          pnr: bp.pnr ?? "",
        };
        return copy;
      });

      showModal(
        "success",
        "Boarding pass leído",
        `${bp.nombreCompleto} · PNR: ${bp.pnr}`,
      );
    } catch (err) {
      showModal(
        "error",
        "No se pudo leer el código",
        err.response?.data?.message ??
          "La imagen no pudo ser procesada. Intenta con mejor iluminación o ingresa el código manualmente.",
      );
    } finally {
      setBpScanning(false);
    }
  };

  /* ── Enviar código al backend para parsear ── */
  const handleEscanear = async () => {
    if (!bpTexto.trim()) {
      showModal(
        "error",
        "Código vacío",
        "Ingresa el código de barras IATA del boarding pass.",
      );
      return;
    }
    // Si es base64 de imagen, no lo enviamos — el backend espera texto IATA
    if (bpTexto.startsWith("data:image")) {
      showModal(
        "error",
        "Formato incorrecto",
        "El campo contiene una imagen, no el código IATA. Por favor ingresa el texto del código de barras directamente.",
      );
      return;
    }
    try {
      const res = await escanear.mutateAsync(bpTexto.trim());
      const bp = res.data.data;
      const partes = (bp.nombreCompleto ?? "").split("/");
      const apellido = partes[0]?.trim().toUpperCase() ?? "";
      const nombre = partes[1]?.trim().toUpperCase() ?? "";
      setPasajeros((prev) => {
        const copy = [...prev];
        copy[pxActivo] = {
          ...copy[pxActivo],
          nombre,
          apellido,
          pnr: bp.pnr ?? "",
        };
        return copy;
      });
      showModal(
        "success",
        "Boarding pass leído",
        `${bp.nombreCompleto} · PNR: ${bp.pnr}`,
      );
    } catch (err) {
      showModal(
        "error",
        "Error de escaneo",
        err.response?.data?.message ??
          "No se pudo decodificar. Verifica que el código sea IATA BCBP.",
      );
    }
  };

  /* ── Agregar pasajero ── */
  const handleAgregarPx = () => {
    const px = pasajeros[pxActivo];
    if (!px.nombre || !px.apellido || !px.pnr || !px.correo) {
      showModal(
        "error",
        "Datos incompletos",
        "Completa nombre, apellido, PNR y correo antes de agregar otro pasajero.",
      );
      return;
    }
    setPasajeros((prev) => [...prev, { ...EMPTY_PX }]);
    setPxActivo(pasajeros.length);
    setBpTexto("");
  };

  /* ── Construir lista de servicios con el nuevo formato del backend ── */
  const buildServicios = () => {
    const lista = [];
    if (hotelRec) {
      const tipoHab =
        simples > 0
          ? "SIMPLE"
          : dobles > 0
            ? "DOBLE"
            : matrim > 0
              ? "MATRIMONIAL"
              : null;
      if (tipoHab) {
        lista.push({
          vueloRecursoId: hotelRec.vueloRecursoId,
          tipoDetalle: "HOTEL",
          tipoHabitacion: tipoHab,
          desayuno: svHotel.desayuno,
          almuerzo: svHotel.almuerzo,
          cena: svHotel.cena,
          snack: svHotel.snack,
          cantidad: simples + dobles + matrim || 1,
        });
      }
    }
    if (transRec) {
      const tipoT = tipoTrans.individual
        ? "INDIVIDUAL"
        : tipoTrans.grupal
          ? "GRUPAL"
          : "INDIVIDUAL";
      lista.push({
        vueloRecursoId: transRec.vueloRecursoId,
        tipoDetalle: "TRANSPORTE",
        tipoTransporte: tipoT,
        cantidad: 1,
      });
    }
    if (restRec) {
      lista.push({
        vueloRecursoId: restRec.vueloRecursoId,
        tipoDetalle: "RESTAURANTE",
        desayuno: svRest.desayuno,
        almuerzo: svRest.almuerzo,
        cena: svRest.cena,
        cantidad: 1,
      });
    }
    return lista;
  };

  /* ── Registrar pasajeros y servicios (común a ambos botones) ── */
  const registrarPasajeros = async () => {
    const validos = pasajeros.filter(
      (p) => p.nombre && p.apellido && p.pnr && p.correo,
    );
    if (!validos.length) {
      showModal(
        "error",
        "Sin pasajeros",
        "Completa los datos de al menos un pasajero.",
      );
      return null;
    }
    const atencionIds = [];
    for (const px of validos) {
      const res = await crearAt.mutateAsync({
        nombre: px.nombre.toUpperCase(),
        apellido: px.apellido.toUpperCase(),
        pnr: px.pnr.toUpperCase(),
        correo: px.correo,
        codigoBarras:
          !bpTexto.startsWith("data:image") && bpTexto ? bpTexto : null,
        fechaEmision,
        lugarEmision,
        vueloId: v?.id,
        registroVueloDiarioId: registro.id,
      });
      const atId = res.data.data?.id;
      const svList = buildServicios();
      if (svList.length && atId) {
        await asignarSv.mutateAsync({
          atencionId: atId,
          registroId: registro.id,
          servicios: svList,
        });
        refetchDisp();
      }
      if (atId) atencionIds.push({ id: atId, correo: px.correo });
    }
    return { atencionIds, total: validos.length };
  };

  const resetForm = () => {
    setPasajeros([{ ...EMPTY_PX }]);
    setPxActivo(0);
    setBpTexto("");
  };

  /* ── Botón "Generar PDF" — solo genera y sube a S3 ── */
  const handleSoloGenerarPDF = async () => {
    try {
      const result = await registrarPasajeros();
      if (!result) return;
      const { atencionIds, total } = result;
      // Generar PDF para cada atención
      for (const { id } of atencionIds) {
        await genPdf.mutateAsync(id);
      }
      showModal(
        "success",
        "PDF Generado",
        `${total} pasajero${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}. El PDF se generó correctamente.`,
      );
      resetForm();
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al registrar.",
      );
    }
  };

  /* ── Botón "Generar y Enviar" — abre modal de correo ── */
  const handleAbrirModalEnvio = async () => {
    const validos = pasajeros.filter(
      (p) => p.nombre && p.apellido && p.pnr && p.correo,
    );
    if (!validos.length) {
      showModal(
        "error",
        "Sin pasajeros",
        "Completa los datos de al menos un pasajero.",
      );
      return;
    }
    // Si hay un solo pasajero, pre-llenar con su correo
    const correoPreFill = validos.length === 1 ? validos[0].correo : "";
    setEmailModal({ open: true, correo: correoPreFill, atencionIds: [] });
  };

  /* ── Confirmar envío desde el modal de correo ── */
  const handleConfirmarEnvio = async () => {
    const correo = emailModal.correo.trim();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      showModal(
        "error",
        "Correo inválido",
        "Ingresa un correo electrónico válido.",
      );
      return;
    }
    setEmailModal((m) => ({ ...m, open: false }));
    try {
      const result = await registrarPasajeros();
      if (!result) return;

      const { atencionIds, total } = result;
      for (const { id } of atencionIds) {
        await genYEnviar.mutateAsync({ id, correoDestino: correo });

        // ✅ DESCARGAR AUTOMÁTICAMENTE (dentro del loop)
        try {
          const res = await obtenerUrl.mutateAsync(id);
          const { downloadUrl } = res.data;
          if (downloadUrl) {
            window.open(downloadUrl, "_blank");
          }
        } catch (err) {
          console.error("Error descargando PDF:", err);
          // No bloqueante - el PDF ya fue enviado por correo
        }
      }

      showModal(
        "success",
        "PDF Enviado",
        `${total} pasajero${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}. El voucher fue enviado a ${correo}.`,
      );
      resetForm();
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al registrar o enviar.",
      );
    }
  };

  /* ── Descargar PDF desde S3 ── */
  const handleDescargarPDF = async (atencionId) => {
    try {
      const res = await obtenerUrl.mutateAsync(atencionId);
      const { downloadUrl } = res.data;

      if (downloadUrl) {
        // Abrir URL firmada en nueva pestaña
        window.open(downloadUrl, "_blank");
      } else {
        showModal("error", "Error", "No se pudo generar URL de descarga");
      }
    } catch (err) {
      showModal(
        "error",
        "Error de descarga",
        err.response?.data?.message ?? "No se pudo descargar el PDF",
      );
    }
  };

  const loading =
    crearAt.isPending ||
    asignarSv.isPending ||
    genPdf.isPending ||
    genYEnviar.isPending;
  const pxCompletos = pasajeros.filter(
    (p) => p.nombre && p.apellido && p.pnr && p.correo,
  ).length;
  const px = pasajeros[pxActivo];
  const setPx = (k, val) =>
    setPasajeros((prev) => {
      const c = [...prev];
      c[pxActivo] = { ...c[pxActivo], [k]: val };
      return c;
    });

  /* ── Disponibilidad numérica del hotel seleccionado ── */

  return (
    <div className={styles.page}>
      {/* ─── Header verde ─── */}
      <div className={styles.headerVerde}>
        <button className={styles.backBtn} onClick={onVolver}>
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className={styles.headerTitulo}>Registro de compensación</h1>
          <p className={styles.headerSub}>
            {v?.aerolinea ?? "Plus Ultra Airlines"}
          </p>
        </div>
      </div>

      {/* ─── 1. Información del Vuelo ─── */}
      <div className={styles.infoVuelo}>
        <div className={styles.infoVueloTitulo}>
          <Plane size={16} /> Información del Vuelo
        </div>
        <div className={styles.infoVueloGrid}>
          <div>
            <span className={styles.ivLabel}>Vuelo:</span>{" "}
            <span className={styles.ivVal}>
              {v?.codigoVuelo} · {v?.aerolinea}
            </span>
          </div>
          <div>
            <span className={styles.ivLabel}>Ruta:</span>{" "}
            <span className={styles.ivVal}>
              {v?.origen} → {v?.destino}
            </span>
          </div>
          <div>
            <span className={styles.ivLabel}>Fecha/Hora:</span>
            <span className={styles.ivVal}>
              {v?.fechaVuelo}
              {v?.horaVuelo ? ` · ${v.horaVuelo}` : v?.fechaVuelo ? "" : "—"}
            </span>
          </div>
          <div>
            <span className={styles.ivLabel}>Estado:</span>{" "}
            <Badge
              label={v?.tipoContingencia ?? "—"}
              variant={BADGE_MAP[v?.tipoContingencia] ?? "neutral"}
            />
          </div>
        </div>
      </div>

      {/* ─── 2. Recursos Disponibles ─── */}
      <div className={styles.seccionCard}>
        <div className={styles.rcTitulo}>
          <Hotel size={16} /> Recursos Disponibles para Hoy
          <button
            className={styles.refetchBtn}
            onClick={() => refetchDisp()}
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <div className={styles.rcGrid}>
          {/* Hoteles */}
          <div className={styles.rcItem} style={{ borderColor: "#22c55e" }}>
            <div className={styles.rcHeader}>
              <Hotel size={20} color="#22c55e" />
              <span>Hoteles</span>
            </div>
            <span className={styles.rcNum} style={{ color: "#22c55e" }}>
              {recursosHotel.length}
            </span>
            <span className={styles.rcSub}>
              de {registro.totalHoteles ?? recursosHotel.length} disponibles
            </span>
            {recursosHotel.length > 0 && (
              <div className={styles.rcDetalle}>
                <span className={styles.rcDetalleLabel}>
                  Habitaciones disponibles:
                </span>
                {recursosHotel.map((h) => {
                  const d = getDispHotel(h);
                  const nombre = h.nombreProveedor ?? h.proveedorNombre;
                  const habTotal =
                    (h.habitacionesSimples ?? 0) +
                    (h.habitacionesDobles ?? 0) +
                    (h.habitacionesMatrimoniales ?? 0);
                  const habDisp = d?.totalDisponibles ?? habTotal;
                  const simD =
                    d?.habitacionesSimples_Disponibles ??
                    h.habitacionesSimples ??
                    0;
                  const dobD =
                    d?.habitacionesDobles_Disponibles ??
                    h.habitacionesDobles ??
                    0;
                  const matD =
                    d?.habitacionesMatrimoniales_Disponibles ??
                    h.habitacionesMatrimoniales ??
                    0;
                  return (
                    <div key={h.vueloRecursoId ?? h.id}>
                      <span className={styles.rcDetalleVal}>
                        <strong>{nombre}:</strong>{" "}
                        <strong className={styles.rcGreen}>
                          {habDisp}/{habTotal} disponibles
                        </strong>
                      </span>
                      <span className={styles.rcDetalleVal}>
                        &nbsp;&nbsp;S:{simD} &nbsp;D:{dobD} &nbsp;M:{matD}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Transportes */}
          <div className={styles.rcItem} style={{ borderColor: "#3b82f6" }}>
            <div className={styles.rcHeader}>
              <Bus size={20} color="#3b82f6" />
              <span>Transportes</span>
            </div>
            <span className={styles.rcNum} style={{ color: "#3b82f6" }}>
              {recursosTransporte.length}
            </span>
            <span className={styles.rcSub}>
              de {registro.totalTransportes ?? recursosTransporte.length}{" "}
              disponibles
            </span>
            {recursosTransporte.map((t) => {
              const d = getDispTrans(t);
              return (
                <div
                  key={t.vueloRecursoId ?? t.id}
                  className={styles.rcDetalle}
                >
                  <span className={styles.rcDetalleVal}>
                    {t.nombreProveedor ?? t.proveedorNombre}:{" "}
                    <strong className={styles.rcBlue}>
                      {d?.capacidadDisponible ?? t.capacidadTotal ?? "—"}/
                      {d?.capacidadTotal ?? t.capacidadTotal ?? "—"}
                    </strong>{" "}
                    pax
                  </span>
                </div>
              );
            })}
          </div>
          {/* Restaurantes */}
          <div className={styles.rcItem} style={{ borderColor: "#f97316" }}>
            <div className={styles.rcHeader}>
              <UtensilsCrossed size={20} color="#f97316" />
              <span>Restaurantes</span>
            </div>
            <span className={styles.rcNum} style={{ color: "#f97316" }}>
              {recursosRest.length}
            </span>
            <span className={styles.rcSub}>
              de {registro.totalRestaurantes ?? recursosRest.length} disponibles
            </span>
            {recursosRest.map((r) => {
              const d = getDispRest(r);
              return (
                <div
                  key={r.vueloRecursoId ?? r.id}
                  className={styles.rcDetalle}
                >
                  <span className={styles.rcDetalleVal}>
                    {r.nombreProveedor ?? r.proveedorNombre}:{" "}
                    <strong className={styles.rcOrange}>
                      {d?.capacidadDisponible ?? r.capacidadTotal ?? "—"}/
                      {d?.capacidadTotal ?? r.capacidadTotal ?? "—"}
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* ─── 3. Captura de Boarding Pass ─── */}
      <div className={styles.seccionCard}>
        <div className={styles.bpSectionHeader}>
          <span className={styles.bpTitulo}>Captura de Boarding Pass</span>
          <div className={styles.bpModeTabs}>
            <button
              className={[
                styles.bpModeTab,
                !modoManual ? styles.bpModeTabActive : "",
              ].join(" ")}
              onClick={() => {
                setModoManual(false);
              }}
            >
              <Camera size={14} /> Escáner
            </button>
            <button
              className={[
                styles.bpModeTab,
                modoManual ? styles.bpModeTabActiveManual : "",
              ].join(" ")}
              onClick={() => {
                setModoManual(true);
                detenerCamara();
              }}
            >
              ✏️ Ingreso Manual
            </button>
          </div>
        </div>

        {/* ── Modo Escáner ── */}
        {!modoManual && (
          <div className={styles.bpScannerMode}>
            <div className={styles.bpBtns}>
              <button
                className={styles.bpBtn}
                onClick={camOn ? detenerCamara : iniciarCamara}
              >
                {camOn ? (
                  <>
                    <CameraOff size={14} /> Detener cámara
                  </>
                ) : (
                  <>
                    <Camera size={14} /> Activar cámara
                  </>
                )}
              </button>
              <button
                className={styles.bpBtn}
                onClick={() => inputImgRef.current?.click()}
                disabled={bpScanning}
              >
                {bpScanning ? <Spinner size="sm" /> : <Upload size={14} />}{" "}
                Subir Imagen
              </button>
              <input
                ref={inputImgRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleSubirImagen}
              />
            </div>

            {camOn && (
              <div className={styles.camWrap}>
                <video
                  ref={videoRef}
                  className={styles.camVideo}
                  autoPlay
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                <p className={styles.camTip}>
                  Apunta la cámara al código de barras del boarding pass. Se
                  detectará automáticamente.
                </p>
              </div>
            )}

            {bpTexto && !camOn && (
              <div className={styles.bpDetectedBanner}>
                <div className={styles.bpDetectedInfo}>
                  <span className={styles.bpDetectedDot} />
                  <span>Código detectado. Listo para procesar.</span>
                </div>
                <button
                  className={styles.bpProcesarBtn}
                  onClick={handleEscanear}
                  disabled={escanear.isPending}
                >
                  {escanear.isPending ? <Spinner size="sm" /> : null}
                  Procesar boarding pass →
                </button>
              </div>
            )}

            <p className={styles.bpHint}>
              💡 Usa la cámara o sube una imagen del boarding pass para
              autocompletar los datos del pasajero.
            </p>
          </div>
        )}

        {/* ── Modo Manual ── */}
        {modoManual && (
          <div className={styles.bpManualMode}>
            <div className={styles.bpManualCard}>
              <div className={styles.bpManualCardHeader}>
                <div className={styles.bpManualIconWrap}>
                  <Users size={16} color="#16a34a" />
                </div>
                <div>
                  <p className={styles.bpManualCardTitle}>Datos del Pasajero</p>
                  <p className={styles.bpManualCardSub}>
                    Pasajero {pxActivo + 1} de {pasajeros.length}
                  </p>
                </div>
              </div>

              <div className={styles.bpManualGrid}>
                {/* Nombre completo — fila completa */}
                <div
                  className={[styles.bpManualField, styles.bpManualSpan2].join(
                    " ",
                  )}
                >
                  <label className={styles.bpManualLabel}>
                    Nombre Completo
                    <span className={styles.bpManualFmt}>
                      {" "}
                      · formato APELLIDO/NOMBRE
                    </span>
                  </label>
                  <input
                    className={styles.bpManualInput}
                    value={
                      [px.apellido, px.nombre].filter(Boolean).join("/") || ""
                    }
                    placeholder="PÉREZ/JUAN CARLOS"
                    onChange={(e) => {
                      const parts = e.target.value.split("/");
                      setPx("apellido", parts[0]?.trim().toUpperCase() ?? "");
                      setPx("nombre", parts[1]?.trim().toUpperCase() ?? "");
                    }}
                  />
                </div>

                {/* PNR */}
                <div className={styles.bpManualField}>
                  <label className={styles.bpManualLabel}>PNR *</label>
                  <input
                    className={styles.bpManualInput}
                    value={px.pnr}
                    maxLength={6}
                    onChange={(e) => setPx("pnr", e.target.value.toUpperCase())}
                    placeholder="WSVFKR"
                  />
                </div>

                {/* Correo */}
                <div className={styles.bpManualField}>
                  <label className={styles.bpManualLabel}>
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    className={styles.bpManualInput}
                    value={px.correo}
                    onChange={(e) => setPx("correo", e.target.value)}
                    placeholder="pasajero@ejemplo.com"
                  />
                </div>
              </div>

              {/* Indicador de completitud */}
              <div className={styles.bpManualStatus}>
                {[
                  { ok: !!(px.apellido && px.nombre), label: "Nombre" },
                  { ok: !!px.pnr, label: "PNR" },
                  { ok: !!px.correo, label: "Correo" },
                ].map((item) => (
                  <span
                    key={item.label}
                    className={[
                      styles.bpManualStatusChip,
                      item.ok ? styles.bpManualStatusOk : "",
                    ].join(" ")}
                  >
                    {item.ok ? "✓" : "○"} {item.label}
                  </span>
                ))}
              </div>

              <button className={styles.agregarPxBtn} onClick={handleAgregarPx}>
                <Users size={15} /> Agregar otro pasajero
              </button>
            </div>

            {/* Tabs de pasajeros si hay más de uno */}
            {pasajeros.length > 1 && (
              <div className={styles.pxTabs} style={{ marginTop: "0.5rem" }}>
                {pasajeros.map((p, i) => (
                  <button
                    key={i}
                    className={[
                      styles.pxTab,
                      i === pxActivo ? styles.pxTabActive : "",
                    ].join(" ")}
                    onClick={() => setPxActivo(i)}
                  >
                    Pasajero {i + 1}
                    {p.pnr ? ` · ${p.pnr}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {/* ─── 4. Registro de Pasajero ─── */}
      <div className={styles.seccionCard}>
        <h2 className={styles.seccionH2}>Emisión y Servicios</h2>

        {/* Tabs de pasajeros — solo en modo escáner (manual ya los muestra arriba) */}
        {!modoManual && pasajeros.length > 1 && (
          <div className={styles.pxTabs}>
            {pasajeros.map((p, i) => (
              <button
                key={i}
                className={[
                  styles.pxTab,
                  i === pxActivo ? styles.pxTabActive : "",
                ].join(" ")}
                onClick={() => setPxActivo(i)}
              >
                Pasajero {i + 1}
                {p.pnr ? ` · ${p.pnr}` : ""}
              </button>
            ))}
          </div>
        )}

        {/* Resumen del pasajero activo (solo escáner, para confirmar/editar) */}
        {!modoManual && (
          <div className={styles.subseccion}>
            <h3 className={styles.subseccionTitulo}>Datos del Pasajero</h3>
            <div className={styles.pxGrid}>
              <div className={[styles.pxField, styles.span2].join(" ")}>
                <label className={styles.pxLabel}>Nombre Completo *</label>
                <input
                  className={styles.pxInput}
                  value={
                    [px.apellido, px.nombre].filter(Boolean).join("/") || ""
                  }
                  placeholder="Nombre del pasajero"
                  onChange={(e) => {
                    const p = e.target.value.split("/");
                    setPx("apellido", p[0]?.trim().toUpperCase() ?? "");
                    setPx("nombre", p[1]?.trim().toUpperCase() ?? "");
                  }}
                />
              </div>
              <div className={styles.pxField}>
                <label className={styles.pxLabel}>PNR *</label>
                <input
                  className={styles.pxInput}
                  value={px.pnr}
                  maxLength={6}
                  onChange={(e) => setPx("pnr", e.target.value.toUpperCase())}
                  placeholder="WSVFKR"
                />
              </div>
              <div className={styles.pxField}>
                <label className={styles.pxLabel}>Correo Electrónico *</label>
                <input
                  type="email"
                  className={styles.pxInput}
                  value={px.correo}
                  onChange={(e) => setPx("correo", e.target.value)}
                  placeholder="pasajero@ejemplo.com"
                />
              </div>
            </div>
            <button className={styles.agregarPxBtn} onClick={handleAgregarPx}>
              <Users size={15} /> Agregar Siguiente Pasajero
            </button>
            <p className={styles.agregarPxNota}>
              * Complete nombre, PNR y email, luego haga clic para agregar más
              pasajeros
            </p>
          </div>
        )}

        {/* Emisión */}
        <div className={styles.subseccion}>
          <h3 className={styles.subseccionTitulo}>Información de Emisión</h3>
          <div className={styles.emisionGrid}>
            <div className={styles.pxField}>
              <label className={styles.pxLabel}>Fecha de Emisión *</label>
              <input
                type="date"
                className={styles.pxInput}
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
              />
            </div>
            <div className={styles.pxField}>
              <label className={styles.pxLabel}>Lugar de Emisión *</label>
              <input
                className={styles.pxInput}
                value={lugarEmision}
                onChange={(e) => setLugarEmision(e.target.value.toUpperCase())}
                placeholder="LIM"
              />
            </div>
          </div>
        </div>

        {/* ─── Asignación de Servicios ─── */}
        <div className={styles.subseccion}>
          <h3 className={styles.subseccionTitulo}>Asignación de Servicios</h3>

          {/* HOTEL — fuente: recursosHotel (lo que el líder habilitó) */}
          <div className={styles.svBloque}>
            <label className={styles.svBloqueLabel}>Hotel</label>
            {recursosHotel.length === 0 ? (
              <div className={styles.svVacio}>
                <Hotel size={14} /> Sin hotel asignado para este vuelo
              </div>
            ) : (
              recursosHotel.map((h) => {
                const d = getDispHotel(h);
                const nombre = h.nombreProveedor ?? h.proveedorNombre;
                const habDisp = d?.totalDisponibles ?? null;
                const habTotal =
                  (h.habitacionesSimples ?? 0) +
                  (h.habitacionesDobles ?? 0) +
                  (h.habitacionesMatrimoniales ?? 0);
                const rid = h.vueloRecursoId ?? h.id;
                const sel = hotelRec?.vueloRecursoId === rid;
                const agotado = habDisp !== null && habDisp === 0;
                return (
                  <button
                    key={rid}
                    className={[
                      styles.svSelectBtn,
                      sel ? styles.svSelectBtnActive : "",
                    ].join(" ")}
                    disabled={agotado}
                    onClick={() => {
                      setHotelRec(
                        sel
                          ? null
                          : {
                              ...h,
                              vueloRecursoId: rid,
                              habitacionesSimples_Disponibles:
                                d?.habitacionesSimples_Disponibles ??
                                h.habitacionesSimples ??
                                0,
                              habitacionesDobles_Disponibles:
                                d?.habitacionesDobles_Disponibles ??
                                h.habitacionesDobles ??
                                0,
                              habitacionesMatrimoniales_Disponibles:
                                d?.habitacionesMatrimoniales_Disponibles ??
                                h.habitacionesMatrimoniales ??
                                0,
                            },
                      );
                    }}
                  >
                    <Hotel size={14} />
                    <span>
                      {nombre}
                      {habDisp != null
                        ? ` (${habDisp}/${habTotal} habitaciones disponibles)`
                        : ""}
                    </span>
                    {agotado && (
                      <span className={styles.agotadoTag}>
                        Sin disponibilidad
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {hotelRec && (
              <div className={styles.hotelDetalle}>
                <p className={styles.hotelDetalleTitulo}>
                  Seleccionar Tipo y Cantidad de Habitaciones
                </p>
                <div className={styles.stepperGrid}>
                  <Stepper
                    label="Simples"
                    disponibles={hotelRec.habitacionesSimples_Disponibles ?? 0}
                    value={simples}
                    onChange={setSimples}
                  />
                  <Stepper
                    label="Dobles"
                    disponibles={hotelRec.habitacionesDobles_Disponibles ?? 0}
                    value={dobles}
                    onChange={setDobles}
                  />
                  <Stepper
                    label="Matrimoniales"
                    disponibles={
                      hotelRec.habitacionesMatrimoniales_Disponibles ?? 0
                    }
                    value={matrim}
                    onChange={setMatrim}
                  />
                </div>
                <p className={styles.hotelDetalleTitulo}>
                  Servicios del Hotel:
                </p>
                <div className={styles.chkGrid}>
                  <Chk
                    checked={svHotel.desayuno}
                    onChange={(v) => setSvHotel((s) => ({ ...s, desayuno: v }))}
                    label="Desayuno"
                    color="#22c55e"
                  />
                  <Chk
                    checked={svHotel.almuerzo}
                    onChange={(v) => setSvHotel((s) => ({ ...s, almuerzo: v }))}
                    label="Almuerzo / Comida"
                    color="#22c55e"
                  />
                  <Chk
                    checked={svHotel.snack}
                    onChange={(v) => setSvHotel((s) => ({ ...s, snack: v }))}
                    label="Snack"
                    color="#22c55e"
                  />
                  <Chk
                    checked={svHotel.cena}
                    onChange={(v) => setSvHotel((s) => ({ ...s, cena: v }))}
                    label="Cena"
                    color="#22c55e"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TRANSPORTE */}
          <div className={styles.svBloque}>
            <label className={styles.svBloqueLabel}>Transporte</label>
            {recursosTransporte.length === 0 ? (
              <div className={styles.svVacio}>
                <Bus size={14} /> Sin transporte asignado para este vuelo
              </div>
            ) : (
              recursosTransporte.map((t) => {
                const d = getDispTrans(t);
                const nombre = t.nombreProveedor ?? t.proveedorNombre;
                const rid = t.vueloRecursoId ?? t.id;
                const sel = transRec?.vueloRecursoId === rid;
                const agotado = d?.agotado === true;
                return (
                  <button
                    key={rid}
                    className={[
                      styles.svSelectBtn,
                      sel ? styles.svSelectBtnActive : "",
                    ].join(" ")}
                    disabled={agotado}
                    onClick={() =>
                      setTransRec(sel ? null : { ...t, vueloRecursoId: rid })
                    }
                  >
                    <Bus size={14} />
                    <span>{nombre}</span>
                    {agotado && (
                      <span className={styles.agotadoTag}>
                        Sin disponibilidad
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {transRec && (
              <div className={styles.transDetalle}>
                <p className={styles.hotelDetalleTitulo}>Tipo de Transporte:</p>
                <div
                  className={styles.chkGrid}
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <Chk
                    checked={tipoTrans.individual}
                    onChange={(v) =>
                      setTipoTrans((s) => ({
                        ...s,
                        individual: v,
                        grupal: v ? false : s.grupal,
                      }))
                    }
                    label="Individual"
                    color="#3b82f6"
                  />
                  <Chk
                    checked={tipoTrans.grupal}
                    onChange={(v) =>
                      setTipoTrans((s) => ({
                        ...s,
                        grupal: v,
                        individual: v ? false : s.individual,
                      }))
                    }
                    label="Grupal"
                    color="#3b82f6"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RESTAURANTE */}
          <div className={styles.svBloque}>
            <label className={styles.svBloqueLabel}>Restaurante</label>
            {recursosRest.length === 0 ? (
              <div className={styles.svVacio}>
                <UtensilsCrossed size={14} /> Sin restaurante asignado para este
                vuelo
              </div>
            ) : (
              recursosRest.map((r) => {
                const d = getDispRest(r);
                const nombre = r.nombreProveedor ?? r.proveedorNombre;
                const rid = r.vueloRecursoId ?? r.id;
                const sel = restRec?.vueloRecursoId === rid;
                const agotado = d?.agotado === true;
                return (
                  <button
                    key={rid}
                    className={[
                      styles.svSelectBtn,
                      sel ? styles.svSelectBtnActive : "",
                    ].join(" ")}
                    disabled={agotado}
                    onClick={() =>
                      setRestRec(sel ? null : { ...r, vueloRecursoId: rid })
                    }
                  >
                    <UtensilsCrossed size={14} />
                    <span>{nombre}</span>
                    {agotado && (
                      <span className={styles.agotadoTag}>
                        Sin disponibilidad
                      </span>
                    )}
                  </button>
                );
              })
            )}

            {restRec && (
              <div className={styles.restDetalle}>
                <p className={styles.hotelDetalleTitulo}>
                  Servicios del Restaurante:
                </p>
                <div
                  className={styles.chkGrid}
                  // style={{ gridTemplateColumns: "repeat(3,1fr)" }}
                >
                  <Chk
                    checked={svRest.desayuno}
                    onChange={(v) => setSvRest((s) => ({ ...s, desayuno: v }))}
                    label="Desayuno"
                    emoji="🌅"
                    color="#f97316"
                  />
                  <Chk
                    checked={svRest.almuerzo}
                    onChange={(v) => setSvRest((s) => ({ ...s, almuerzo: v }))}
                    label="Almuerzo"
                    emoji="😋"
                    color="#f97316"
                  />
                  <Chk
                    checked={svRest.cena}
                    onChange={(v) => setSvRest((s) => ({ ...s, cena: v }))}
                    label="Cena"
                    emoji="🌙"
                    color="#f97316"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Botones finales (imagen 9: azul y verde) ─── */}
        <div className={styles.accionesGrid}>
          <button
            className={styles.btnPdf}
            onClick={handleSoloGenerarPDF}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <FileDown size={16} />}
            Generar PDF ({pxCompletos} pasajero{pxCompletos !== 1 ? "s" : ""})
          </button>
          <button
            className={styles.btnEnviar}
            onClick={handleAbrirModalEnvio}
            disabled={loading}
          >
            {loading ? <Spinner size="sm" /> : <Send size={16} />}
            Generar y Enviar
          </button>
        </div>
      </div>

      {/* ─── Atenciones previas ─── */}
      {atencionesPrev.length > 0 && (
        <div className={styles.seccionCard}>
          <h3 className={styles.subseccionTitulo}>
            <Users size={15} /> Pasajeros ya atendidos ({atencionesPrev.length})
          </h3>
          <div className={styles.atencionesLista}>
            {atencionesPrev.map((a) => (
              <div key={a.id} className={styles.atencionItem}>
                <span>
                  <strong>
                    {a.apellido}, {a.nombre}
                  </strong>
                </span>
                <span className={styles.pnrTag}>PNR: {a.pnr}</span>
                <Badge label={a.estado ?? "ATENDIDO"} variant="success" />
              </div>
            ))}
          </div>
        </div>
      )}

      <InfoModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />

      {/* ─── Modal correo destino para "Generar y Enviar" ─── */}
      {emailModal.open && (
        <div className={styles.emailModalOverlay}>
          <div className={styles.emailModalBox}>
            <h3 className={styles.emailModalTitle}>
              <Send size={17} /> Enviar Voucher por Correo
            </h3>
            <p className={styles.emailModalDesc}>
              Ingresa el correo al que se enviará el voucher PDF.
            </p>
            <input
              className={styles.emailModalInput}
              type="email"
              placeholder="correo@ejemplo.com"
              value={emailModal.correo}
              onChange={(e) =>
                setEmailModal((m) => ({ ...m, correo: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleConfirmarEnvio()}
              autoFocus
            />
            <div className={styles.emailModalActions}>
              <button
                className={styles.emailModalCancel}
                onClick={() => setEmailModal((m) => ({ ...m, open: false }))}
              >
                Cancelar
              </button>
              <button
                className={styles.emailModalConfirm}
                onClick={handleConfirmarEnvio}
                disabled={!emailModal.correo.trim()}
              >
                <Send size={14} /> Generar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════
   RAÍZ
   ════════════════════════════ */
export default function AgenteAtencionPage() {
  const { data: registros = [], isLoading } = useRegistrosHoy();
  const [registroSel, setRegistroSel] = useState(null);

  return registroSel ? (
    <FormularioAtencion
      registro={registroSel}
      onVolver={() => setRegistroSel(null)}
    />
  ) : (
    <SeleccionVuelo
      registros={registros}
      loading={isLoading}
      onSeleccionar={setRegistroSel}
    />
  );
}
