import { DiscordVoiceOpcodes } from "../../types/codes/voice_opcodes.ts";
import { delay } from "../../util/utils.ts";
import { closeWS } from "../close_ws.ts";
import { ws } from "../ws.ts";

export async function voiceHeartbeat(guildId: string) {
  const interval = ws.shards.first()?.heartbeat.interval || 41250;

  ws.log(
    "VOICE_HEARTBEATING_STARTED",
    { guildId, interval },
  );

  const shard = ws.voiceShards.get(guildId);
  if (!shard) return;

  ws.log(
    "VOICE_HEARTBEATING_DETAILS",
    { guildId, interval, shard },
  );

  shard.heartbeat.keepAlive = true;
  shard.heartbeat.acknowledged = false;
  shard.heartbeat.lastSentAt = Date.now();
  shard.heartbeat.interval = interval;

  // The first heartbeat is special so we send it without setInterval: https://discord.com/developers/docs/topics/gateway#heartbeating
  await delay(Math.floor(shard.heartbeat.interval * Math.random()));

  if (shard.ws.readyState === WebSocket.OPEN) {
    shard.ws.send(JSON.stringify({
      op: DiscordVoiceOpcodes.Heartbeat,
      d: Date.now(),
    }));
  }

  shard.heartbeat.intervalId = setInterval(() => {
    ws.log("DEBUG", `Running setInterval in heartbeat file.`);
    const currentShard = ws.voiceShards.get(guildId);
    if (!currentShard) return;

    ws.log("VOICE_HEARTBEATING", { guildId, shard: currentShard });

    if (
      currentShard.ws.readyState === WebSocket.CLOSED ||
      !currentShard.heartbeat.keepAlive
    ) {
      ws.log("VOICE_HEARTBEATING_CLOSED", { guildId, shard: currentShard });

      // STOP THE HEARTBEAT
      return clearInterval(shard.heartbeat.intervalId);
    }

    if (!currentShard.heartbeat.acknowledged) {
      closeWS(currentShard.ws, 3066, "Did not receive an ACK in time.");
      return ws.voiceIdentify(guildId, {
        sessionId: currentShard.sessionId!,
        token: currentShard.token!,
        url: currentShard.url!,
      });
    }

    if (currentShard.ws.readyState !== WebSocket.OPEN) return;

    currentShard.ws.send(JSON.stringify({
      op: DiscordVoiceOpcodes.Heartbeat,
      d: Date.now(),
    }));

    currentShard.heartbeat.acknowledged = false;
  }, shard.heartbeat.interval);
}
