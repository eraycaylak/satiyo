import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env.js";

/**
 * Bir konuşmaya ait gerçek-zamanlı WebSocket odası.
 * - Soket el sıkışması: GET + Upgrade header (Worker route'tan yönlendirilir).
 * - REST mesaj gönderiminde Worker, POST /broadcast ile yeni mesajı buraya iter;
 *   oda tüm bağlı soketlere yayınlar.
 * Hibernatable WebSocket API kullanır (bağlantı boştayken DO uykuya geçer).
 */
export class ChatRoom extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/broadcast")) {
      const payload = await request.text();
      for (const ws of this.ctx.getWebSockets()) {
        try { ws.send(payload); } catch { /* kopmuş soket */ }
      }
      return new Response(null, { status: 204 });
    }

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ kind: "connected", ts: Date.now() }));
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("expected websocket", { status: 426 });
  }

  // İstemciden gelen mesajları diğer bağlı soketlere aktar (typing göstergesi vb.)
  override async webSocketMessage(sender: WebSocket, message: string | ArrayBuffer) {
    const data = typeof message === "string" ? message : "";
    if (!data) return;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === sender) continue;
      try { ws.send(data); } catch { /* yok say */ }
    }
  }

  override async webSocketClose(ws: WebSocket, code: number) {
    try { ws.close(code, "kapandı"); } catch { /* yok say */ }
  }
}
