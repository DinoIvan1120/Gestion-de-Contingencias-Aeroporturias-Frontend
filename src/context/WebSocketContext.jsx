import { createContext, useContext, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const clientRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // NOTA: El endpoint del backend está en /api/ws (no /ws).
    // El JwtFilter solo lee el JWT del header Authorization pero SockJS
    // hace un GET /api/ws/info que no puede llevar headers custom.
    // Por eso Spring Security responde 403 en ese handshake.
    //
    // Fix definitivo en el BACKEND — agregar en SecurityConfig.java:
    //   .requestMatchers("/api/ws/**").permitAll()
    //
    // En el frontend: silenciamos errores para que la app no se rompa.
    let client;
    try {
      client = new Client({
        webSocketFactory: () =>
          new SockJS(`${import.meta.env.VITE_API_BASE_URL}/api/ws`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 0, // sin reintentos si hay 403
        onConnect: () => {
          client.subscribe("/topic/atenciones", (message) => {
            console.log("📩 MENSAJE CRUDO:", message);
            console.log("📩 BODY:", message.body);
            try {
              const event = JSON.parse(message.body);
              console.log("✅ EVENTO:", event);
              if (
                event.tipo === "NUEVA_ATENCION" ||
                event.tipo === "ATENCION_ANULADA"
              ) {
                console.log("🔄 INVALIDANDO QUERIES");
                queryClient.invalidateQueries({ queryKey: ["atenciones"] });
                queryClient.invalidateQueries({ queryKey: ["reportes"] });
              }
            } catch {
              console.error("❌ ERROR PARSEANDO:", e);
              /* ignorar mensajes malformados */
            }
          });
        },
        onStompError: () => {
          /* silenciar — no crash */
        },
        onWebSocketError: () => {
          /* 403 del backend — silenciar */
        },
      });
      client.activate();
      clientRef.current = client;
    } catch {
      /* SockJS no disponible — ignorar */
    }

    return () => {
      try {
        client?.deactivate();
      } catch {
        /* ignorar */
      }
    };
  }, [token, queryClient]);

  return (
    <WebSocketContext.Provider value={{ client: clientRef.current }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
