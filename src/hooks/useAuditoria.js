import { useQuery, useMutation } from "@tanstack/react-query";
import auditoriaApi from "../api/auditoriaApi";

export function useAuditoria(params) {
  return useQuery({
    queryKey: ["auditoria", params],
    queryFn: async () => {
      const { data } = await auditoriaApi.getAll(params);
      return data.data;
    },
    staleTime: 0,
  });
}

export function useExportarExcelAuditoria() {
  return useMutation({
    mutationFn: async (filtros) => {
      const response = await auditoriaApi.exportarExcel(filtros);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditoria-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
