import { useQuery } from "@tanstack/react-query";
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
