import { ws } from "../ws.ts";
import { voiceIdentify } from "./voice_identify.ts";
import { secretbox } from "https://esm.sh/@evan/wasm@0.0.50/target/nacl/deno.js";

/** Since discord sends the necessary information to connect to voice in different events, we can have those event send info here to aggregate and decide when ready to connect. */
export function setupVoiceConnection(
  guildId: string,
  payload: {
    token?: string;
    url?: string;
    channelId?: string;
    sessionId?: string;
  },
) {
  const socket = payload.url
    ? ws.createVoiceConnection(guildId, payload.url)
    : undefined;

  if (!ws.voiceShards.has(guildId)) {
    ws.voiceShards.set(guildId, {
      // THIS MAY BE UNDEFINED ON FIRST, BUT SECOND CALL WE WILL SET IT BELOW
      ws: socket as WebSocket,
      sessionId: payload.sessionId,
      token: payload.token,
      url: payload.url,
      channelId: payload.channelId,
      heartbeat: {
        lastSentAt: 0,
        lastReceivedAt: 0,
        acknowledged: false,
        keepAlive: false,
        interval: 0,
        intervalId: 0,
      },
      udp: undefined,
      sequence: 0,
      timestamp: 0,
      nonce: new Uint8Array(secretbox.nonce_length),
    });
    return;
  }

  const shard = ws.voiceShards.get(guildId);
  if (!shard) return;
  // THIS MAY BE UNDEFINED ON FIRST, SO WE MAKE SURE IT IS SET NOW
  if (socket) shard.ws = socket;
  if (payload.token) shard.token = payload.token;
  if (payload.url) shard.url = payload.url;
  if (payload.sessionId) shard.sessionId = payload.sessionId;
  if (payload.channelId) shard.channelId = payload.channelId;

  if (shard.token && shard.url && shard.sessionId) {
    shard.ws.onopen = () => {
      voiceIdentify(guildId, {
        token: shard.token!,
        sessionId: shard.sessionId!,
        url: shard.url!,
      });
    };
  }
}
