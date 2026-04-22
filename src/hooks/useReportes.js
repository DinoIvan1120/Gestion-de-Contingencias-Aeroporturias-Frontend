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

export function useReporteDetalle(id) {
  return useQuery({
    queryKey: ["reporte-detalle", id],
    queryFn: async () => {
      const { data } = await reportesApi.getDetalle(id);
      return data.data;
    },
    enabled: !!id,
    staleTime: 0,
  });
}

export function useActualizarServicios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => reportesApi.actualizarServicios(id, body),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["reporte-detalle", String(vars.id)] }),
  });
}

export function useRegenerarPdf() {
  return useMutation({
    mutationFn: (id) => reportesApi.regenerarPdf(id),
  });
}
