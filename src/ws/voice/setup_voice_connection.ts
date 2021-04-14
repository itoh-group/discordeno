import { ws } from "../ws.ts";
import { voiceIdentify } from "./voice_identify.ts";

/** Since discord sends the necessary information to connect to voice in different events, we can have those event send info here to aggregate and decide when ready to connect. */
export function setupVoiceConnection(
  shardId: number,
  guildId: string,
  payload: {
    token?: string;
    url?: string;
    channelId?: string;
    sessionId?: string;
  },
) {
  if (!ws.voiceShards.has(guildId)) {
    ws.voiceShards.set(guildId, payload);
    return;
  }

  const shard = ws.voiceShards.get(guildId);
  if (!shard) return;

  if (payload.token) shard.token = payload.token;
  if (payload.url) shard.url = payload.url;
  if (payload.sessionId) shard.sessionId = payload.sessionId;
  if (payload.channelId) shard.channelId = payload.channelId;

  if (shard.token && shard.url && shard.sessionId) {
    voiceIdentify(shardId, guildId, {
      token: shard.token,
      sessionId: shard.sessionId,
      url: shard.url,
    });
  }
}
