import axiosClient from "./axiosClient";

const BASE = "/api/v1/atenciones";

const atencionesApi = {
  getAll: (params) => axiosClient.get(BASE, { params }),
  getById: (id) => axiosClient.get(`${BASE}/${id}`),
  /** POST /atenciones/escanear-boarding-pass */
  escanearBoardingPass: (codigoBarras) =>
    axiosClient.post(`${BASE}/escanear-boarding-pass`, { codigoBarras }),

  /** POST /atenciones — registrar pasajero con registroVueloDiarioId */
  create: (body) => axiosClient.post(BASE, body),

  /** POST /atenciones/batch */
  createBatch: (body) => axiosClient.post(`${BASE}/batch`, body),
  create: (body) => axiosClient.post(BASE, body),
  batch: (body) => axiosClient.post(`${BASE}/batch`, body),
  update: (id, body) => axiosClient.put(`${BASE}/${id}`, body),
  anular: (id) => axiosClient.patch(`${BASE}/${id}/anular`),

  /** POST /atenciones/{id}/servicios */
  asignarServicios: (id, servicios) =>
    axiosClient.post(`${BASE}/${id}/servicios`, servicios),

  /** POST /atenciones/{id}/pdf */
  generarPdf: (id) => axiosClient.post(`${BASE}/${id}/pdf`),
  descargarPdf: (id) =>
    axiosClient.get(`${BASE}/${id}/pdf`, { responseType: "blob" }),
  reenviarPdf: (id, body) => axiosClient.post(`${BASE}/${id}/enviar`, body),

  /**
   * POST /atenciones/{id}/voucher/generar
   * Genera el PDF y lo sube a S3. Devuelve { numeroVoucher, pdfUrl, emailEnviado, correoDestino }.
   */
  generarVoucher: (id) => axiosClient.post(`${BASE}/${id}/voucher/generar`),

  /**
   * POST /atenciones/{id}/voucher/generar-y-enviar
   * Genera el PDF, lo sube a S3 y lo envía al correo indicado.
   * @param {number} id
   * @param {string} correoDestino
   */
  generarYEnviarVoucher: (id, correoDestino) =>
    axiosClient.post(`${BASE}/${id}/voucher/generar-y-enviar`, {
      correoDestino,
    }),

  // Añadir dentro del objeto atencionesApi:
  escanearImagen: (formData) =>
    axiosClient.post(`${BASE}/escanear-imagen`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  /**
   * ✅ NUEVO: GET /atenciones/{id}/voucher/descargar
   * Obtiene URL firmada temporal para descargar el PDF desde S3
   */
  obtenerUrlDescarga: (id) =>
    axiosClient.get(`${BASE}/${id}/voucher/descargar`),
};

export default atencionesApi;
