import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import reportesApi from "../api/reportesApi";

export function useReportes(filtros, pageable) {
  return useQuery({
    queryKey: ["reportes", filtros, pageable],
    queryFn: async () => {
      const { data } = await reportesApi.getAll({ ...filtros, ...pageable });
      return data.data;
    },
  });
}

export function useExportarExcel() {
  return useMutation({
    mutationFn: async (filtros) => {
      const response = await reportesApi.exportarExcel(filtros);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-atenciones-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}

/**
 * FIX 2: staleTime:0 + gcTime:0
 *
 * El problema era que gcTime tenía el valor por defecto (5 min).
 * Con staleTime:0 React Query marca los datos como "stale" al instante,
 * PERO con gcTime>0 los mantiene en caché y los devuelve de inmediato
 * mientras hace el re-fetch en background → el usuario ve datos viejos.
 *
 * Con gcTime:0 el caché se destruye al desmontar el componente,
 * así cada vez que se abre un detalle hace un fetch limpio.
 *
 * El id recibido es el CORRELATIVO (ej: "SGC-000001001") porque la lista
 * no expone atencionId. Se usa getDetalleByCorr que llama al endpoint correcto.
 */

// export function useReporteDetalle(id) {
//   return useQuery({
//     queryKey: ["reporte-detalle", id],
//     queryFn: async () => {
//       const { data } = await reportesApi.getDetalle(id);
//       return data.data;
//     },
//     enabled: !!id,
//     staleTime: 0,
//   });
// }

export function useReporteDetalle(correlativo) {
  return useQuery({
    queryKey: ["reporte-detalle", correlativo],
    queryFn: async () => {
      const { data } = await reportesApi.getDetalleByCorr(correlativo);
      return data.data;
    },
    enabled: !!correlativo,
    staleTime: 0,
    gcTime: 0, // no conservar caché al desmontar -> fetch limpio siempre
  });
}

export function useActualizarServicios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => reportesApi.actualizarServicios(id, body),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["reporte-detalle"] }),
  });
}

export function useRegenerarPdf() {
  return useMutation({
    mutationFn: (id) => reportesApi.regenerarPdf(id),
  });
}

export function useDescargarActualizado() {
  return useMutation({
    mutationFn: (id) => reportesApi.descargarActualizado(id),
  });
}
