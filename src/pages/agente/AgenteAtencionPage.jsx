import { useState, useRef, useCallback, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
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
  ChevronDown,
} from "lucide-react";
import { useRegistrosHoy } from "../../hooks/useRegistrosDiarios";
import { useWebSocket } from "../../context/WebSocketContext"; // FIX #2
import {
  useAtencionesRegistro,
  useDisponibilidad,
  useEscanearBoardingPass,
  useEscanearBoardingPassImagen,
  useVerificarPnr,
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
// const EMPTY_PX = { nombre: "", apellido: "", pnr: "", correo: "" };

const EMPTY_SV = {
  hotelRec: null,
  simples: 0,
  dobles: 0,
  matrim: 0,
  svHotel: { desayuno: false, almuerzo: false, snack: false, cena: false },
  transRec: null,
  cantTrans: 1,
  tipoTrans: { individual: false, grupal: false },
  restRec: null,
  cantRest: 1,
  svRest: { desayuno: false, almuerzo: false, cena: false },
  fechaIngreso: HOY, // ← AGREGAR
  fechaSalida: "", // ← AGREGAR
};
const EMPTY_PX = { nombre: "", apellido: "", pnr: "", correo: "", ...EMPTY_SV };

/* ══════════════════════
   Helpers
   ══════════════════════ */
/** Intenta decodificar un barcode de una imagen/video usando BarcodeDetector o canvas */
// async function leerCodigoDeImagen(source) {
//   if ("BarcodeDetector" in window) {
//     try {
//       const det = new window.BarcodeDetector({
//         formats: ["pdf417", "qr_code", "code_128", "aztec", "data_matrix"],
//       });
//       const codes = await det.detect(source);
//       if (codes.length > 0) return codes[0].rawValue;
//     } catch {
//       /* continúa */
//     }
//   }
//   return null;
// }

/** Convierte dataURL a ImageBitmap para BarcodeDetector */
// async function dataUrlToImageBitmap(dataUrl) {
//   return new Promise((res, rej) => {
//     const img = new Image();
//     img.onload = () => createImageBitmap(img).then(res).catch(rej);
//     img.onerror = rej;
//     img.src = dataUrl;
//   });
// }

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

function ResourceCombobox({
  recursos,
  selected,
  onSelect,
  getDisp,
  Icon,
  buildLabel,
  colorActive = "#16a34a",
  placeholder = "Seleccionar proveedor…", // ← AGREGAR
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = selected ? buildLabel(selected) : null;

  return (
    <div className={styles.combobox} ref={ref}>
      <button
        className={[
          styles.comboboxTrigger,
          selected ? styles.comboboxTriggerActive : styles.comboboxTriggerEmpty,
        ].join(" ")}
        style={
          selected
            ? { borderColor: colorActive, background: `${colorActive}10` }
            : {}
        }
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {/* Ícono con badge de color */}
        <span
          className={styles.comboboxIconBadge}
          style={{
            background: selected ? `${colorActive}20` : "#f1f5f9",
            borderColor: selected ? `${colorActive}50` : "#d1d5db",
          }}
        >
          <Icon size={16} color={selected ? colorActive : "#9ca3af"} />
        </span>

        <span className={styles.comboboxTriggerText}>
          {selectedLabel ?? (
            <span className={styles.comboboxPlaceholder}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={[
            styles.comboboxChevron,
            open ? styles.comboboxChevronOpen : "",
          ].join(" ")}
          color="var(--text-400)"
        />
      </button>

      {open && (
        <div className={styles.comboboxDropdown}>
          {/* Opción "ninguno" */}
          <button
            className={[
              styles.comboboxOption,
              !selected ? styles.comboboxOptionActive : "",
            ].join(" ")}
            onClick={() => {
              onSelect(null);
              setOpen(false);
            }}
            type="button"
          >
            <span className={styles.comboboxOptionDot} />
            <span>Sin asignar</span>
          </button>

          {recursos.map((r) => {
            const rid = r.vueloRecursoId ?? r.id;
            const d = getDisp(r);
            const agotado =
              d?.agotado === true ||
              (d?.totalDisponibles !== undefined && d.totalDisponibles === 0);
            const isSel = selected?.vueloRecursoId === rid;
            const label = buildLabel(r);

            return (
              <button
                key={rid}
                className={[
                  styles.comboboxOption,
                  isSel ? styles.comboboxOptionActive : "",
                  agotado ? styles.comboboxOptionDisabled : "",
                ].join(" ")}
                disabled={agotado}
                onClick={() => {
                  onSelect(isSel ? null : r);
                  setOpen(false);
                }}
                type="button"
              >
                <span
                  className={styles.comboboxOptionDot}
                  style={isSel ? { background: colorActive } : {}}
                />
                <span className={styles.comboboxOptionLabel}>{label}</span>
                {agotado && (
                  <span className={styles.agotadoTag}>Sin disponibilidad</span>
                )}
                {isSel && <span className={styles.comboboxCheck}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
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

  // TEMPORAL — para ver qué estructura devuelve el backend
  console.log("📊 DISP DATA:", JSON.stringify(disp, null, 2));

  // FIX #2: suscribir al WebSocket de disponibilidad cuando el agente selecciona un vuelo
  const { subscribeDisponibilidad, unsubscribeDisponibilidad } =
    useWebSocket() ?? {};

  // En FormularioAtencion, reemplazar el useEffect existente del WebSocket:
  useEffect(() => {
    if (!registro?.id) return;
    subscribeDisponibilidad?.(registro.id);
    return () => unsubscribeDisponibilidad?.(registro.id);
  }, [registro?.id, subscribeDisponibilidad, unsubscribeDisponibilidad]);

  // AGREGAR este segundo useEffect como respaldo:
  // Si el WS de /topic/atenciones llega pero /topic/disponibilidad no,
  // forzamos un refetch de disponibilidad cada vez que se invalidan atenciones.
  const { data: _atencionesWatch } = useAtencionesRegistro(registro.id);
  useEffect(() => {
    // Cada vez que cambian las atenciones del registro, refrescar disponibilidad
    refetchDisp();
  }, [_atencionesWatch?.length, refetchDisp]);

  // useEffect(() => {
  //   if (!registro?.id) return;
  //   subscribeDisponibilidad?.(registro.id);
  //   return () => unsubscribeDisponibilidad?.(registro.id);
  // }, [registro?.id, subscribeDisponibilidad, unsubscribeDisponibilidad]);

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
  const scanningRef = useRef(false); // ← agregar junto a los otros refs
  // const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const inputImgRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [bpTexto, setBpTexto] = useState("");
  const [bpScanning, setBpScanning] = useState(false);

  const [modoManual, setModoManual] = useState(false);
  const [syncing, setSyncing] = useState(false); // estado del botón sincronizar

  /*
   * "un_correo"               → mismos servicios, UN correo del modal (Caso 1/2 original)
   * "correo_individual"       → mismos servicios, correo de CADA pasajero (Caso 2 nuevo)
   * "servicios_independientes"→ servicios distintos por pasajero, correo de CADA uno (Caso 3)
   */
  const [modoEnvio, setModoEnvio] = useState("un_correo");

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
  const [fechaIngreso, setFechaIngreso] = useState(HOY);
  const [fechaSalida, setFechaSalida] = useState("");

  const [transRec, setTransRec] = useState(null); // RecursoDisponibleResponse
  const [cantTrans, setCantTrans] = useState(1); // ← AGREGAR ESTA LÍNEA
  const [tipoTrans, setTipoTrans] = useState({
    individual: false,
    grupal: false,
  });

  const [restRec, setRestRec] = useState(null); // RecursoDisponibleResponse
  const [cantRest, setCantRest] = useState(1); // ← AGREGAR ESTA LÍNEA
  const [svRest, setSvRest] = useState({
    desayuno: false,
    almuerzo: false,
    cena: false,
  });

  /* ── Datos de emisión ── */
  const [fechaEmision, setFechaEmision] = useState(HOY);
  const [lugarEmision, setLugarEmision] = useState("LIM");

  /* ── Computed service state (Caso 3 = per-passenger, otros = global) ── */
  const isSvInd = modoEnvio === "servicios_independientes";

  const setPxSvField = (key, val) =>
    setPasajeros((prev) => {
      const copy = [...prev];
      copy[pxActivo] = { ...copy[pxActivo], [key]: val };
      return copy;
    });

  const pxSv = pasajeros[pxActivo] ?? {};
  const _hotelRec = isSvInd ? (pxSv.hotelRec ?? null) : hotelRec;
  const _simples = isSvInd ? (pxSv.simples ?? 0) : simples;
  const _dobles = isSvInd ? (pxSv.dobles ?? 0) : dobles;
  const _matrim = isSvInd ? (pxSv.matrim ?? 0) : matrim;
  const _svHotel = isSvInd
    ? (pxSv.svHotel ?? {
        desayuno: false,
        almuerzo: false,
        snack: false,
        cena: false,
      })
    : svHotel;

  const _fechaIngreso = isSvInd ? (pxSv.fechaIngreso ?? HOY) : fechaIngreso;
  const _fechaSalida = isSvInd ? (pxSv.fechaSalida ?? "") : fechaSalida;
  const _setFechaIngreso = isSvInd
    ? (v) => setPxSvField("fechaIngreso", v)
    : setFechaIngreso;
  const _setFechaSalida = isSvInd
    ? (v) => setPxSvField("fechaSalida", v)
    : setFechaSalida;
  const _transRec = isSvInd ? (pxSv.transRec ?? null) : transRec;
  const _cantTrans = isSvInd ? (pxSv.cantTrans ?? 1) : cantTrans;
  const _tipoTrans = isSvInd
    ? (pxSv.tipoTrans ?? { individual: false, grupal: false })
    : tipoTrans;
  const _restRec = isSvInd ? (pxSv.restRec ?? null) : restRec;
  const _cantRest = isSvInd ? (pxSv.cantRest ?? 1) : cantRest;
  const _svRest = isSvInd
    ? (pxSv.svRest ?? { desayuno: false, almuerzo: false, cena: false })
    : svRest;

  const _setHotelRec = isSvInd
    ? (v) => setPxSvField("hotelRec", v)
    : setHotelRec;
  const _setSimples = isSvInd ? (v) => setPxSvField("simples", v) : setSimples;
  const _setDobles = isSvInd ? (v) => setPxSvField("dobles", v) : setDobles;
  const _setMatrim = isSvInd ? (v) => setPxSvField("matrim", v) : setMatrim;
  const _setSvHotel = isSvInd
    ? (v) => setPxSvField("svHotel", typeof v === "function" ? v(_svHotel) : v)
    : setSvHotel;
  const _setTransRec = isSvInd
    ? (v) => setPxSvField("transRec", v)
    : setTransRec;
  const _setCantTrans = isSvInd
    ? (v) => setPxSvField("cantTrans", v)
    : setCantTrans;
  const _setTipoTrans = isSvInd
    ? (v) =>
        setPxSvField("tipoTrans", typeof v === "function" ? v(_tipoTrans) : v)
    : setTipoTrans;
  const _setRestRec = isSvInd ? (v) => setPxSvField("restRec", v) : setRestRec;
  const _setCantRest = isSvInd
    ? (v) => setPxSvField("cantRest", v)
    : setCantRest;
  const _setSvRest = isSvInd
    ? (v) => setPxSvField("svRest", typeof v === "function" ? v(_svRest) : v)
    : setSvRest;

  /* ── Modales ── */
  const [modal, setModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
  });
  const showModal = (type, title, msg) =>
    setModal({ open: true, type, title, message: msg });

  /* ── Sincronizar disponibilidad manualmente ── */
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await refetchDisp();
      const data = result?.data;
      const hoteles = data?.hoteles ?? [];
      const transportes = data?.transportes ?? [];
      const restaurantes = data?.restaurantes ?? [];
      const resumen = [
        hoteles.length > 0
          ? `🏨 ${hoteles[0].proveedorNombre}: ${hoteles[0].totalDisponibles}/${hoteles[0].totalHabitaciones} hab.`
          : null,
        transportes.length > 0
          ? `🚌 ${transportes[0].proveedorNombre}: ${transportes[0].capacidadDisponible}/${transportes[0].capacidadTotal} pax`
          : null,
        restaurantes.length > 0
          ? `🍽️ ${restaurantes[0].proveedorNombre}: ${restaurantes[0].capacidadDisponible}/${restaurantes[0].capacidadTotal} cubiertos`
          : null,
      ]
        .filter(Boolean)
        .join("\n");
      showModal(
        "success",
        "Sincronización exitosa",
        resumen || "Disponibilidad actualizada correctamente.",
      );
    } catch {
      showModal(
        "error",
        "Error de sincronización",
        "No se pudo obtener la disponibilidad. Verifica que el backend esté activo y vuelve a intentarlo.",
      );
    } finally {
      setSyncing(false);
    }
  };

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
  const verificarPnr = useVerificarPnr();
  const crearAt = useCrearAtencion();
  const asignarSv = useAsignarServicios();
  const genPdf = useGenerarPdf();
  const genYEnviar = useGenerarYEnviarVoucher();
  const obtenerUrl = useObtenerUrlDescarga(); // ← AGREGAR ESTA LÍNEA
  const { data: atencionesPrev = [] } = useAtencionesRegistro(registro.id);

  /* ── Cámara con @zxing/browser (auto-scan PDF417) ── */
  const readerRef = useRef(null); // instancia de BrowserMultiFormatReader

  const detenerCamara = useCallback(() => {
    // Detener el stream de video
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Resetear el reader de ZXing
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        /* ignorar */
      }
      readerRef.current = null;
    }
    setCamOn(false);
  }, []);

  const iniciarCamara = useCallback(async () => {
    scanningRef.current = false; // ← reset al iniciar
    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.PDF_417,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.AZTEC,
        BarcodeFormat.DATA_MATRIX,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 300,
      });
      readerRef.current = reader;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      setCamOn(true);
      // ← decodeFromStream se llama en useEffect([camOn])
      //   cuando videoRef.current ya existe
    } catch (err) {
      const esPermisoDenegado =
        err?.name === "NotAllowedError" ||
        err?.name === "PermissionDeniedError";
      showModal(
        "error",
        esPermisoDenegado ? "Permiso denegado" : "Cámara no disponible",
        esPermisoDenegado
          ? "Activa el permiso de cámara en la configuración del navegador e intenta de nuevo."
          : `No se pudo acceder a la cámara. Usa "Subir Imagen" o ingresa el código manualmente. (${err?.name})`,
      );
    }
  }, [detenerCamara]);

  // useEffect inicia el scan DESPUÉS de que React renderiza el <video>
  useEffect(() => {
    if (!camOn) return;
    if (!videoRef.current) return;
    if (!streamRef.current) return;
    if (!readerRef.current) return;

    const video = videoRef.current;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {});
    }

    // Ahora sí: videoRef.current existe en el DOM
    readerRef.current.decodeFromStream(
      streamRef.current,
      videoRef.current,
      async (result) => {
        if (!result) return;
        if (scanningRef.current) return; // ← ya está procesando, ignorar
        scanningRef.current = true; // ← bloquear siguientes disparos

        const codigo = result.getText();
        detenerCamara();

        try {
          const res = await escanear.mutateAsync(codigo.trim());
          const bp = res.data.data;
          const partes = (bp.nombreCompleto ?? "").split("/");
          const apellido = partes[0]?.trim().toUpperCase() ?? "";
          const nombre = partes[1]?.trim().toUpperCase() ?? "";

          // ── Verificar PNR duplicado antes de mostrar éxito ──
          const vueloId = v?.id;
          if (bp.pnr && vueloId) {
            try {
              const verfRes = await verificarPnr.mutateAsync({
                pnr: bp.pnr,
                vueloId,
              });
              const verf = verfRes.data.data;
              if (verf?.duplicado) {
                showModal(
                  "warning",
                  "Boarding pass duplicado",
                  `El PNR ${bp.pnr} ya fue registrado en una atención anterior.\n\nPasajero: ${verf.nombrePasajero ?? bp.nombreCompleto}\nCorrelativo: ${verf.correlativo ?? "—"}\n\nNo se pueden registrar dos atenciones con el mismo PNR para este vuelo.`,
                );
                scanningRef.current = false;
                return;
              }
            } catch {
              // Si la verificación falla, continuar con flujo normal (no bloqueante)
            }
          }
          // ── Fin verificación ──

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
            err.response?.data?.message ?? "No se pudo decodificar el código.",
          );
        } finally {
          scanningRef.current = false; // ← liberar para el próximo escaneo
        }
      },
    );
  }, [camOn, detenerCamara]);

  // Cleanup al desmontar el componente
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

      // ── Verificar PNR duplicado antes de mostrar éxito ──
      const vueloId = v?.id;
      if (bp.pnr && vueloId) {
        try {
          const verfRes = await verificarPnr.mutateAsync({
            pnr: bp.pnr,
            vueloId,
          });
          const verf = verfRes.data.data;
          if (verf?.duplicado) {
            showModal(
              "warning",
              "Boarding pass duplicado",
              `El PNR ${bp.pnr} ya fue registrado en una atención anterior.\n\nPasajero: ${verf.nombrePasajero ?? bp.nombreCompleto}\nCorrelativo: ${verf.correlativo ?? "—"}\n\nNo se pueden registrar dos atenciones con el mismo PNR para este vuelo.`,
            );
            return;
          }
        } catch {
          // Si la verificación falla, continuar con flujo normal (no bloqueante)
        }
      }
      // ── Fin verificación ──

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
  // const handleEscanear = async () => {
  //   if (!bpTexto.trim()) {
  //     showModal(
  //       "error",
  //       "Código vacío",
  //       "Ingresa el código de barras IATA del boarding pass.",
  //     );
  //     return;
  //   }
  //   if (bpTexto.startsWith("data:image")) {
  //     showModal(
  //       "error",
  //       "Formato incorrecto",
  //       "El campo contiene una imagen, no el código IATA. Por favor ingresa el texto del código de barras directamente.",
  //     );
  //     return;
  //   }
  //   try {
  //     const res = await escanear.mutateAsync(bpTexto.trim());
  //     const bp = res.data.data;
  //     const partes = (bp.nombreCompleto ?? "").split("/");
  //     const apellido = partes[0]?.trim().toUpperCase() ?? "";
  //     const nombre = partes[1]?.trim().toUpperCase() ?? "";
  //     setPasajeros((prev) => {
  //       const copy = [...prev];
  //       copy[pxActivo] = {
  //         ...copy[pxActivo],
  //         nombre,
  //         apellido,
  //         pnr: bp.pnr ?? "",
  //       };
  //       return copy;
  //     });
  //     setBpTexto("");
  //     showModal(
  //       "success",
  //       "Boarding pass leído",
  //       `${bp.nombreCompleto} · PNR: ${bp.pnr}`,
  //     );
  //   } catch (err) {
  //     showModal(
  //       "error",
  //       "Error de escaneo",
  //       err.response?.data?.message ??
  //         "No se pudo decodificar. Verifica que el código sea IATA BCBP.",
  //     );
  //   }
  // };

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
  const buildServicios = (pxIdx = null) => {
    let sv = {};
    if (isSvInd && pxIdx !== null) sv = pasajeros[pxIdx] ?? {};

    const hRec = isSvInd && pxIdx !== null ? (sv.hotelRec ?? null) : _hotelRec;
    const sims = isSvInd && pxIdx !== null ? (sv.simples ?? 0) : _simples;
    const dobs = isSvInd && pxIdx !== null ? (sv.dobles ?? 0) : _dobles;
    const mats = isSvInd && pxIdx !== null ? (sv.matrim ?? 0) : _matrim;
    const svH = isSvInd && pxIdx !== null ? (sv.svHotel ?? {}) : _svHotel;
    const tRec = isSvInd && pxIdx !== null ? (sv.transRec ?? null) : _transRec;
    const cTrans = isSvInd && pxIdx !== null ? (sv.cantTrans ?? 1) : _cantTrans;
    const tTrans =
      isSvInd && pxIdx !== null ? (sv.tipoTrans ?? {}) : _tipoTrans;
    const rRec = isSvInd && pxIdx !== null ? (sv.restRec ?? null) : _restRec;
    const cRest = isSvInd && pxIdx !== null ? (sv.cantRest ?? 1) : _cantRest;
    const svR = isSvInd && pxIdx !== null ? (sv.svRest ?? {}) : _svRest;

    const lista = [];
    if (hRec) {
      const tipoHab =
        sims > 0
          ? "SIMPLE"
          : dobs > 0
            ? "DOBLE"
            : mats > 0
              ? "MATRIMONIAL"
              : null;
      if (tipoHab) {
        lista.push({
          vueloRecursoId: hRec.vueloRecursoId,
          tipoDetalle: "HOTEL",
          tipoHabitacion: tipoHab,
          desayuno: svH.desayuno,
          almuerzo: svH.almuerzo,
          cena: svH.cena,
          snack: svH.snack,
          cantidad: sims + dobs + mats || 1,
          fechaIngreso: _fechaIngreso || null, // ← AGREGAR
          fechaSalida: _fechaSalida || null, // ← AGREGAR
        });
      }
    }
    if (tRec) {
      const tipoT = tTrans.individual
        ? "INDIVIDUAL"
        : tTrans.grupal
          ? "GRUPAL"
          : "INDIVIDUAL";
      lista.push({
        vueloRecursoId: tRec.vueloRecursoId,
        tipoDetalle: "TRANSPORTE",
        tipoTransporte: tipoT,
        cantidad: cTrans,
      });
    }
    if (rRec) {
      lista.push({
        vueloRecursoId: rRec.vueloRecursoId,
        tipoDetalle: "RESTAURANTE",
        desayuno: svR.desayuno,
        almuerzo: svR.almuerzo,
        cena: svR.cena,
        cantidad: cRest,
      });
    }
    return lista;
  };

  /* ── Registrar pasajeros y servicios (común a ambos botones) ── */
  const registrarPasajeros = async () => {
    const validosConIdx = pasajeros
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.nombre && p.apellido && p.pnr && p.correo);

    if (!validosConIdx.length) {
      showModal(
        "error",
        "Sin pasajeros",
        "Completa los datos de al menos un pasajero.",
      );
      return null;
    }

    const pnrsEnForm = validosConIdx.map(({ p }) => p.pnr.toUpperCase());
    const pnrsUnicos = new Set(pnrsEnForm);
    if (pnrsUnicos.size !== pnrsEnForm.length) {
      showModal(
        "error",
        "PNR duplicado",
        "Hay pasajeros con el mismo PNR en el formulario. Cada pasajero debe tener un PNR único.",
      );
      return null;
    }
    // ── FIN ──

    const atencionIds = [];
    for (const { p: px, i } of validosConIdx) {
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
      const svList = isSvInd ? buildServicios(i) : buildServicios();
      if (svList.length && atId) {
        await asignarSv.mutateAsync({
          atencionId: atId,
          registroId: registro.id,
          servicios: svList,
        });
        await refetchDisp();
      }
      if (atId) atencionIds.push({ id: atId, correo: px.correo });
    }
    return { atencionIds, total: validosConIdx.length };
  };

  // const resetForm = () => {
  //   setPasajeros([{ ...EMPTY_PX }]);
  //   setPxActivo(0);
  //   setBpTexto("");
  // };

  // ✅ AHORA — limpia también todos los servicios
  const resetForm = () => {
    setPasajeros([{ ...EMPTY_PX }]);
    setPxActivo(0);
    setBpTexto("");
    setHotelRec(null);
    setSimples(0);
    setDobles(0);
    setMatrim(0);
    setSvHotel({ desayuno: false, almuerzo: false, snack: false, cena: false });
    setTransRec(null);
    setCantTrans(1);
    setTipoTrans({ individual: false, grupal: false });
    setRestRec(null);
    setCantRest(1);
    setSvRest({ desayuno: false, almuerzo: false, cena: false });
    setFechaIngreso(HOY);
    setFechaSalida("");
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
      await refetchDisp();
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
    if (modoEnvio === "un_correo") {
      const correoPreFill = validos.length === 1 ? validos[0].correo : "";
      setEmailModal({ open: true, correo: correoPreFill, atencionIds: [] });
    } else {
      await handleEnviarIndividual();
    }
  };

  /* ── Caso original: un solo correo destino (modal) ── */
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
        try {
          const res = await obtenerUrl.mutateAsync(id);
          if (res.data?.downloadUrl)
            window.open(res.data.downloadUrl, "_blank");
        } catch {
          /* no bloqueante */
        }
      }
      showModal(
        "success",
        "PDF Enviado",
        `${total} pasajero${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}. El voucher fue enviado a ${correo}.`,
      );
      await refetchDisp();
      resetForm();
    } catch (err) {
      showModal(
        "error",
        "Error",
        err.response?.data?.message ?? "Error al registrar o enviar.",
      );
    }
  };

  /* ── Caso 2 nuevo / Caso 3: correo individual por pasajero ── */
  const handleEnviarIndividual = async () => {
    try {
      const result = await registrarPasajeros();
      if (!result) return;
      const { atencionIds, total } = result;
      for (const { id, correo: correoPx } of atencionIds) {
        await genYEnviar.mutateAsync({ id, correoDestino: correoPx });
        try {
          const res = await obtenerUrl.mutateAsync(id);
          if (res.data?.downloadUrl)
            window.open(res.data.downloadUrl, "_blank");
        } catch {
          /* no bloqueante */
        }
      }
      showModal(
        "success",
        "Vouchers enviados",
        `${total} pasajero${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}. Cada PDF fue enviado al correo individual.`,
      );
      await refetchDisp();
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
            onClick={handleSync}
            title="Sincronizar disponibilidad"
            disabled={syncing}
          >
            <RefreshCw size={13} className={syncing ? styles.spinning : ""} />
          </button>
          {/* <button
            className={styles.refetchBtn}
            onClick={() => refetchDisp()}
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button> */}
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
                {/* Indicador de escaneo activo */}
                <div className={styles.camScanning}>
                  <span className={styles.camScanLine} />
                  <p className={styles.camScanTip}>
                    📷 Apunta al código de barras — se detectará automáticamente
                  </p>
                </div>
              </div>
            )}

            {/* {bpTexto && !camOn && (
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
            )} */}

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

        {/* ─── Selector de modo (solo con 2+ pasajeros) ─── */}
        {pasajeros.length > 1 && (
          <div className={styles.modoEnvioCard}>
            <p className={styles.modoEnvioLabel}>Modo de asignación y envío:</p>
            <div className={styles.modoEnvioTabs}>
              {[
                {
                  id: "un_correo",
                  label: "Un correo",
                  sub: "Mismos servicios · un destino",
                },
                {
                  id: "correo_individual",
                  label: "Correo individual",
                  sub: "Mismos servicios · correo de cada pasajero",
                },
                {
                  id: "servicios_independientes",
                  label: "Servicios independientes",
                  sub: "Servicios distintos · correo de cada pasajero",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  className={[
                    styles.modoEnvioTab,
                    modoEnvio === m.id ? styles.modoEnvioTabActive : "",
                  ].join(" ")}
                  onClick={() => setModoEnvio(m.id)}
                >
                  <span className={styles.modoEnvioTabLabel}>{m.label}</span>
                  <span className={styles.modoEnvioTabSub}>{m.sub}</span>
                </button>
              ))}
            </div>
            {modoEnvio === "servicios_independientes" && (
              <p className={styles.modoEnvioNota}>
                📌 Asignando servicios para{" "}
                <strong>
                  Pasajero {pxActivo + 1}
                  {pasajeros[pxActivo]?.pnr
                    ? ` · ${pasajeros[pxActivo].pnr}`
                    : ""}
                </strong>
                . Cambia de pestaña arriba para asignar servicios a otro
                pasajero.
              </p>
            )}
          </div>
        )}

        {/* ─── Asignación de Servicios ─── */}
        <div className={styles.subseccion}>
          <h3 className={styles.subseccionTitulo}>
            Asignación de Servicios
            {isSvInd && pasajeros.length > 1 && (
              <span className={styles.svIndTag}>Pasajero {pxActivo + 1}</span>
            )}
          </h3>

          {/* HOTEL — fuente: recursosHotel (lo que el líder habilitó) */}
          <div className={styles.svBloque}>
            <label className={styles.svBloqueLabel}>Hotel</label>
            {recursosHotel.length === 0 ? (
              <div className={styles.svVacio}>
                <Hotel size={14} /> Sin hotel asignado para este vuelo
              </div>
            ) : (
              <ResourceCombobox
                recursos={recursosHotel}
                selected={_hotelRec}
                getDisp={getDispHotel}
                Icon={Hotel}
                colorActive="#22c55e"
                placeholder="Seleccione hotel..."
                buildLabel={(h) => {
                  const d = getDispHotel(h);
                  const nombre = h.nombreProveedor ?? h.proveedorNombre;
                  const habTotal =
                    (h.habitacionesSimples ?? 0) +
                    (h.habitacionesDobles ?? 0) +
                    (h.habitacionesMatrimoniales ?? 0);
                  const habDisp = d?.totalDisponibles ?? habTotal;
                  return `${nombre} (${habDisp}/${habTotal} habitaciones disponibles)`;
                }}
                onSelect={(h) => {
                  if (!h) {
                    _setHotelRec(null);
                    return;
                  }
                  const rid = h.vueloRecursoId ?? h.id;
                  const d = getDispHotel(h);
                  _setHotelRec({
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
                  });
                  _setSimples(1); //Default 1 simple al seleccionar
                }}
              />
            )}

            {_hotelRec && (
              <div className={styles.hotelDetalle}>
                {/* ── FECHAS CHECK-IN / CHECK-OUT ── */}
                <p className={styles.hotelDetalleTitulo}>Fechas de estadía:</p>
                <div className={styles.emisionGrid}>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>📅 Check-in *</label>
                    <input
                      type="date"
                      className={styles.pxInput}
                      value={_fechaIngreso}
                      min={HOY}
                      onChange={(e) => _setFechaIngreso(e.target.value)}
                    />
                  </div>
                  <div className={styles.pxField}>
                    <label className={styles.pxLabel}>📅 Check-out *</label>
                    <input
                      type="date"
                      className={styles.pxInput}
                      value={_fechaSalida}
                      min={_fechaIngreso || HOY}
                      onChange={(e) => _setFechaSalida(e.target.value)}
                    />
                  </div>
                </div>
                <p className={styles.hotelDetalleTitulo}>
                  Seleccionar Tipo y Cantidad de Habitaciones
                </p>
                <div className={styles.stepperGrid}>
                  <Stepper
                    label="Simples"
                    disponibles={_hotelRec.habitacionesSimples_Disponibles ?? 0}
                    value={_simples}
                    onChange={_setSimples}
                  />
                  <Stepper
                    label="Dobles"
                    disponibles={_hotelRec.habitacionesDobles_Disponibles ?? 0}
                    value={_dobles}
                    onChange={_setDobles}
                  />
                  <Stepper
                    label="Matrimoniales"
                    disponibles={
                      _hotelRec.habitacionesMatrimoniales_Disponibles ?? 0
                    }
                    value={_matrim}
                    onChange={_setMatrim}
                  />
                </div>
                <p className={styles.hotelDetalleTitulo}>
                  Servicios del Hotel:
                </p>
                <div className={styles.chkGrid}>
                  <Chk
                    checked={_svHotel.desayuno}
                    onChange={(v) =>
                      _setSvHotel((s) => ({ ...s, desayuno: v }))
                    }
                    label="Desayuno"
                    color="#22c55e"
                  />
                  <Chk
                    checked={_svHotel.almuerzo}
                    onChange={(v) =>
                      _setSvHotel((s) => ({ ...s, almuerzo: v }))
                    }
                    label="Almuerzo / Comida"
                    color="#22c55e"
                  />
                  <Chk
                    checked={_svHotel.snack}
                    onChange={(v) => _setSvHotel((s) => ({ ...s, snack: v }))}
                    label="Snack"
                    color="#22c55e"
                  />
                  <Chk
                    checked={_svHotel.cena}
                    onChange={(v) => _setSvHotel((s) => ({ ...s, cena: v }))}
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
              <ResourceCombobox
                recursos={recursosTransporte}
                selected={_transRec}
                getDisp={getDispTrans}
                Icon={Bus}
                colorActive="#3b82f6"
                placeholder="Seleccione transporte..."
                buildLabel={(t) => {
                  const d = getDispTrans(t);
                  const nombre = t.nombreProveedor ?? t.proveedorNombre;
                  const disp =
                    d?.capacidadDisponible ?? t.capacidadTotal ?? "—";
                  const total = d?.capacidadTotal ?? t.capacidadTotal ?? "—";
                  return `${nombre} (${disp}/${total} pax disponibles)`;
                }}
                onSelect={(t) =>
                  _setTransRec(
                    t
                      ? { ...t, vueloRecursoId: t.vueloRecursoId ?? t.id }
                      : null,
                  )
                }
              />
            )}

            {_transRec && (
              <div className={styles.transDetalle}>
                <p className={styles.hotelDetalleTitulo}>Tipo de Transporte:</p>
                <div
                  className={styles.chkGrid}
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <Chk
                    checked={_tipoTrans.individual}
                    onChange={(v) =>
                      _setTipoTrans((s) => ({
                        ...s,
                        individual: v,
                        grupal: v ? false : s.grupal,
                      }))
                    }
                    label="Individual"
                    color="#3b82f6"
                  />
                  <Chk
                    checked={_tipoTrans.grupal}
                    onChange={(v) =>
                      _setTipoTrans((s) => ({
                        ...s,
                        grupal: v,
                        individual: v ? false : s.individual,
                      }))
                    }
                    label="Grupal"
                    color="#3b82f6"
                  />
                </div>
                {/* FIX #3: Stepper de cantidad de pasajeros en transporte */}
                {(_tipoTrans.individual || _tipoTrans.grupal) &&
                  (() => {
                    const d = getDispTrans(_transRec);
                    const cap =
                      d?.capacidadDisponible ?? _transRec?.capacidadTotal ?? 0;
                    return (
                      <Stepper
                        label={
                          _tipoTrans.individual
                            ? "Pasajeros individuales"
                            : "Pasajeros grupales"
                        }
                        disponibles={cap}
                        value={_cantTrans}
                        onChange={_setCantTrans}
                      />
                    );
                  })()}
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
              <ResourceCombobox
                recursos={recursosRest}
                selected={_restRec}
                getDisp={getDispRest}
                Icon={UtensilsCrossed}
                colorActive="#f97316"
                placeholder="Seleccione restaurante"
                buildLabel={(r) => {
                  const d = getDispRest(r);
                  const nombre = r.nombreProveedor ?? r.proveedorNombre;
                  const disp =
                    d?.capacidadDisponible ?? r.capacidadTotal ?? "—";
                  const total = d?.capacidadTotal ?? r.capacidadTotal ?? "—";
                  return `${nombre} (${disp}/${total} cubiertos disponibles)`;
                }}
                onSelect={(r) =>
                  _setRestRec(
                    r
                      ? { ...r, vueloRecursoId: r.vueloRecursoId ?? r.id }
                      : null,
                  )
                }
              />
            )}

            {_restRec && (
              <div className={styles.restDetalle}>
                <p className={styles.hotelDetalleTitulo}>
                  Servicios del Restaurante:
                </p>
                {/* FIX #4: Stepper de cubiertos */}
                {(() => {
                  const d = getDispRest(_restRec);
                  const cap =
                    d?.capacidadDisponible ?? _restRec?.capacidadTotal ?? 0;
                  return (
                    <Stepper
                      label="Cantidad de cubiertos"
                      disponibles={cap}
                      value={_cantRest}
                      onChange={_setCantRest}
                    />
                  );
                })()}
                <div
                  className={styles.chkGrid}
                  // style={{ gridTemplateColumns: "repeat(3,1fr)" }}
                >
                  <Chk
                    checked={_svRest.desayuno}
                    onChange={(v) => _setSvRest((s) => ({ ...s, desayuno: v }))}
                    label="Desayuno"
                    emoji="🌅"
                    color="#f97316"
                  />
                  <Chk
                    checked={_svRest.almuerzo}
                    onChange={(v) => _setSvRest((s) => ({ ...s, almuerzo: v }))}
                    label="Almuerzo"
                    emoji="😋"
                    color="#f97316"
                  />
                  <Chk
                    checked={_svRest.cena}
                    onChange={(v) => _setSvRest((s) => ({ ...s, cena: v }))}
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
            {modoEnvio === "un_correo"
              ? "Generar y Enviar"
              : "Generar y Enviar (individual)"}
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
                <Send size={14} />{" "}
                {modoEnvio === "un_correo"
                  ? "Generar y Enviar"
                  : "Generar y Enviar (individual)"}
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
