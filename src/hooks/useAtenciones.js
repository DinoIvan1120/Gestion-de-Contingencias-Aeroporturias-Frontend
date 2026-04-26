import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import atencionesApi from "../api/atencionesApi";

const KEY_ATENCIONES = ["atenciones"];
const KEY_DISP = (id) => ["disponibilidad", id];

/** Lista atenciones de un registro diario específico */
export function useAtencionesRegistro(registroId) {
  return useQuery({
    queryKey: [...KEY_ATENCIONES, "registro", registroId],
    queryFn: async () => {
      const { data } = await registrosDiariosApi.getAtenciones(registroId);
      return data.data ?? [];
    },
    enabled: !!registroId,
    staleTime: 0,
  });
}

/** Disponibilidad en tiempo real de un registro diario */
export function useDisponibilidad(registroId) {
  return useQuery({
    queryKey: KEY_DISP(registroId),
    queryFn: async () => {
      const { data } = await registrosDiariosApi.getDisponibilidad(registroId);
      return data.data;
    },
    enabled: !!registroId,
    refetchInterval: 15000, // refresca cada 15s como complemento al WS
    staleTime: 0,
  });
}

/** POST /atenciones/escanear-boarding-pass */
export function useEscanearBoardingPass() {
  return useMutation({
    mutationFn: (codigoBarras) =>
      atencionesApi.escanearBoardingPass(codigoBarras),
  });
}

export const useEscanearBoardingPassImagen = () => {
  return useMutation({
    mutationFn: (formData) => atencionesApi.escanearImagen(formData), // ✅
  });
};

/** POST /atenciones — registrar pasajero */
export function useCrearAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => atencionesApi.create(payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: [...KEY_ATENCIONES, "registro", vars.registroVueloDiarioId],
      });
      qc.invalidateQueries({ queryKey: KEY_DISP(vars.registroVueloDiarioId) });
    },
  });
}

/** POST /atenciones/{id}/servicios */
export function useAsignarServicios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ atencionId, registroId, servicios }) =>
      atencionesApi
        .asignarServicios(atencionId, servicios)
        .then((res) => ({ res, registroId })),
    onSuccess: ({ registroId }) => {
      qc.invalidateQueries({ queryKey: KEY_DISP(registroId) });
    },
  });
}

export function useAtencion(id) {
  return useQuery({
    queryKey: ["atencion", id],
    queryFn: async () => {
      const { data } = await atencionesApi.getById(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useRegistrarAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => atencionesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

export function useRegistrarBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => atencionesApi.batch(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

export function useActualizarAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => atencionesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

export function useAnularAtencion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => atencionesApi.anular(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
  });
}

// export function useAsignarServicios(atencionId) {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: (servicios) =>
//       atencionesApi.asignarServicios(atencionId, servicios),
//     onSuccess: () => qc.invalidateQueries({ queryKey: ATENCIONES_KEY }),
//   });
// }

/** POST /atenciones/{id}/pdf */
// export function useGenerarPdf() {
//   return useMutation({
//     mutationFn: (id) => atencionesApi.generarPdf(id),
//   });
// }

/** POST /atenciones/{id}/voucher/generar — solo genera PDF y sube a S3 */
export function useGenerarPdf() {
  return useMutation({
    mutationFn: (id) => atencionesApi.generarVoucher(id),
  });
}

/** POST /atenciones/{id}/voucher/generar-y-enviar — genera PDF y lo envía por correo */
export function useGenerarYEnviarVoucher() {
  return useMutation({
    mutationFn: ({ id, correoDestino }) =>
      atencionesApi.generarYEnviarVoucher(id, correoDestino),
  });
}

export function useReenviarPDF() {
  return useMutation({
    mutationFn: ({ atencionId, correoDestino }) =>
      atencionesApi.reenviarPdf(atencionId, { correoDestino }),
  });
}

/** GET /atenciones/{id}/voucher/descargar — obtiene URL firmada para descarga */
export function useObtenerUrlDescarga() {
  return useMutation({
    mutationFn: (id) => atencionesApi.obtenerUrlDescarga(id),
  });
}
