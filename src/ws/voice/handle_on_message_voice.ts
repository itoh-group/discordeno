import { DiscordVoiceOpcodes } from "../../types/codes/voice_opcodes.ts";
import { decompressWith } from "../deps.ts";
import { ws } from "../ws.ts";

/** Handler for handling every message event from websocket. */
// deno-lint-ignore no-explicit-any
export function handleOnMessage(message: any, guildId: string) {
  if (message instanceof ArrayBuffer) {
    message = new Uint8Array(message);
  }

  if (message instanceof Uint8Array) {
    message = decompressWith(
      message,
      0,
      (slice: Uint8Array) => ws.utf8decoder.decode(slice),
    );
  }

  if (typeof message !== "string") return;

  const shard = ws.voiceShards.get(guildId);

  const messageData = JSON.parse(message) as DiscordGatewayPayload;
  ws.log("RAW", { guildId, payload: messageData });

  switch (messageData.op) {
    case DiscordVoiceOpcodes.Ready:
      shard.ssrc = messageData.d.ssrc;
      shard.ip = messageData.d.ip;
      shard.port = messageData.d.port;
      shard.modes = messageData.d.modes;

      // Begin heartbeating interval
      ws.heartbeat();
    // case DiscordGatewayOpcodes.Heartbeat:
    //   if (shard?.ws.readyState !== WebSocket.OPEN) return;

    //   shard.heartbeat.lastSentAt = Date.now();
    //   // Discord randomly sends this requiring an immediate heartbeat back
    //   shard?.queue.push({
    //     op: DiscordGatewayOpcodes.Heartbeat,
    //     d: shard?.previousSequenceNumber,
    //   });
    //   break;
    // case DiscordGatewayOpcodes.Hello:
    //   ws.heartbeat(
    //     guildId,
    //     (messageData.d as DiscordHello).heartbeat_interval,
    //   );
    //   break;
    // case DiscordGatewayOpcodes.HeartbeatACK:
    //   if (ws.shards.has(guildId)) {
    //     ws.shards.get(guildId)!.heartbeat.acknowledged = true;
    //   }
    //   break;
    // case DiscordGatewayOpcodes.Reconnect:
    //   ws.log("RECONNECT", { guildId });

    //   if (ws.shards.has(guildId)) {
    //     ws.shards.get(guildId)!.resuming = true;
    //   }

    //   await resume(guildId);
    //   break;
    // case DiscordGatewayOpcodes.InvalidSession:
    //   ws.log("INVALID_SESSION", { guildId, payload: messageData });

    //   // When d is false we need to reidentify
    //   if (!messageData.d) {
    //     await identify(guildId, ws.maxShards);
    //     break;
    //   }

    //   if (ws.shards.has(guildId)) {
    //     ws.shards.get(guildId)!.resuming = true;
    //   }

    //   await resume(guildId);
    //   break;
    // default:
    //   if (messageData.t === "RESUMED") {
    //     ws.log("RESUMED", { guildId });

    //     if (ws.shards.has(guildId)) {
    //       ws.shards.get(guildId)!.resuming = false;
    //     }
    //     break;
    //   }

    //   // Important for RESUME
    //   if (messageData.t === "READY") {
    //     const shard = ws.shards.get(guildId);
    //     if (shard) {
    //       shard.sessionId = (messageData.d as DiscordReady).session_id;
    //     }

    //     ws.loadingShards.get(guildId)?.resolve(true);
    //     ws.loadingShards.delete(guildId);
    //   }

    //   // Update the sequence number if it is present
    //   if (messageData.s) {
    //     const shard = ws.shards.get(guildId);
    //     if (shard) {
    //       shard.previousSequenceNumber = messageData.s;
    //     }
    //   }

    //   if (ws.url) await ws.handleDiscordPayload(messageData, guildId);
    //   else {
    //     eventHandlers.raw?.(messageData);
    //     await eventHandlers.dispatchRequirements?.(messageData, guildId);

    //     if (messageData.op !== DiscordGatewayOpcodes.Dispatch) return;

    //     if (!messageData.t) return;

    //     return handlers[messageData.t]?.(messageData, guildId);
    //   }

    //   break;
  }
}
