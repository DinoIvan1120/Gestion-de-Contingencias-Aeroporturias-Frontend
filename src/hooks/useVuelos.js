import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import vuelosApi from "../api/vuelosApi";
import recursosApi from "../api/recursosApi";

export const VUELOS_KEY = ["vuelos"];
export const RECURSOS_KEY = (vueloId) => ["recursos", vueloId];

export function useVuelos(params) {
  return useQuery({
    queryKey: [...VUELOS_KEY, params],
    queryFn: async () => {
      const { data } = await vuelosApi.getAll(params);
      return data.data;
    },
    staleTime: Number(import.meta.env.VITE_QUERY_STALE_TIME) || 0,
  });
}

export function useVuelo(id) {
  return useQuery({
    queryKey: ["vuelo", id],
    queryFn: async () => {
      const { data } = await vuelosApi.getById(id);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useRecursos(vueloId) {
  return useQuery({
    queryKey: RECURSOS_KEY(vueloId),
    queryFn: async () => {
      const { data } = await vuelosApi.getRecursos(vueloId);
      return data.data;
    },
    enabled: !!vueloId,
  });
}

export function useRegistrarVuelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vuelosApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

export function useActualizarVuelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) => vuelosApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

export function useAnularVuelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => vuelosApi.anular(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

export function useCargaMasiva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => vuelosApi.cargaMasiva(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

export function useHabilitarRecurso(vueloId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => recursosApi.habilitar(vueloId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURSOS_KEY(vueloId) }),
  });
}

export function useDeshabilitarRecurso(vueloId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recursoId) => recursosApi.deshabilitar(vueloId, recursoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURSOS_KEY(vueloId) }),
  });
}

// ── Hooks para los 3 endpoints unificados de la Vista Líder ──────────────

/** Carga vuelo + recursos completos para mostrar en la vista del Líder */
export function useRegistroVuelo(id) {
  return useQuery({
    queryKey: ["registro-vuelo", id],
    queryFn: async () => {
      const { data } = await vuelosApi.getRegistro(id);
      return data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

/** POST /vuelos/registro — primera vez que el Líder presiona "Guardar" */
export function useCrearRegistroCompleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vuelosApi.crearRegistro(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VUELOS_KEY }),
  });
}

/** PUT /vuelos/{id}/registro — Líder presiona "Guardar" en modo edición */
export function useActualizarRegistroCompleto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      vuelosApi.actualizarRegistro(id, payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: VUELOS_KEY });
      qc.invalidateQueries({ queryKey: ["registro-vuelo", vars.id] });
    },
  });
}
