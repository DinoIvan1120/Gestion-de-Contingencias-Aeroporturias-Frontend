import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import registrosDiariosApi from "../api/registrosDiariosApi";

const KEY_HOY = ["registros-diarios", "hoy"];
const KEY_MIS = ["registros-diarios", "mis-registros"];
const KEY_TODOS = ["registros-diarios", "todos"];

/** Registros del día actual (agente y líder) */
export function useRegistrosHoy() {
  return useQuery({
    queryKey: KEY_HOY,
    queryFn: async () => {
      const { data } = await registrosDiariosApi.getHoy();
      return data.data ?? [];
    },
    staleTime: 0,
  });
}

/** Historial del líder con filtros opcionales de fecha */
export function useMisRegistros(params = {}) {
  return useQuery({
    queryKey: [...KEY_MIS, params],
    queryFn: async () => {
      const { data } = await registrosDiariosApi.getMisRegistros(params);
      return data.data;
    },
    staleTime: 0,
  });
}

/** Verificar si ya existe un registro para ese vuelo+fecha */
export function useExisteRegistro(vueloItinerarioId, fecha) {
  return useQuery({
    queryKey: ["registros-diarios", "existe", vueloItinerarioId, fecha],
    queryFn: async () => {
      const { data } = await registrosDiariosApi.existe(
        vueloItinerarioId,
        fecha,
      );
      return data.data;
    },
    enabled: !!vueloItinerarioId && !!fecha,
  });
}

/** Registrar vuelo del itinerario para el día (POST) */
export function useRegistrarVueloDiario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => registrosDiariosApi.registrar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_HOY });
      qc.invalidateQueries({ queryKey: KEY_MIS });
    },
  });
}

/** Actualizar recursos de un registro existente (PUT) */
export function useActualizarRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      registrosDiariosApi.actualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_HOY });
      qc.invalidateQueries({ queryKey: KEY_MIS });
    },
  });
}

/** Eliminar (soft-delete) un registro */
export function useEliminarRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => registrosDiariosApi.eliminar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_HOY });
      qc.invalidateQueries({ queryKey: KEY_MIS });
    },
  });
}
