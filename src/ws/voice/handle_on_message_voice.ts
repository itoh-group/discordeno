import { DiscordVoiceOpcodes } from "../../types/codes/voice_opcodes.ts";
import { DiscordGatewayPayload } from "../../types/gateway/gateway_payload.ts";
import { decompressWith } from "../deps.ts";
import { ws } from "../ws.ts";

/** Handler for handling every message event from websocket. */
// deno-lint-ignore no-explicit-any
export async function handleOnMessageVoice(message: any, guildId: string) {
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
  ws.log("VOICE_RAW", { guildId, payload: messageData });

  switch (messageData.op) {
    case DiscordVoiceOpcodes.Ready:
      if (!shard) {
        return ws.log("DEBUG", `MISSING VOICE SHARD ON READY. ID: ${guildId}`);
      }

      // deno-lint-ignore no-explicit-any
      shard.ssrc = (messageData.d as any).ssrc;
      // deno-lint-ignore no-explicit-any
      shard.ip = (messageData.d as any).ip;
      // deno-lint-ignore no-explicit-any
      shard.port = (messageData.d as any).port;
      // deno-lint-ignore no-explicit-any
      shard.modes = (messageData.d as any).modes;

      // Begin heartbeating interval
      ws.voiceHeartbeat(guildId);

      // Create UDP connection for transmitting data
      shard.udp = await ws.createUdpConnection(guildId, shard.ip!, shard.port!);
      break;
    case DiscordVoiceOpcodes.HeartbeatACK:
      if (!shard) {
        return ws.log(
          "DEBUG",
          `MISSING VOICE SHARD ON HEARTBEAT ACK. ID: ${guildId}`,
        );
      }
      shard.heartbeat.acknowledged = true;
      break;
    case DiscordVoiceOpcodes.SessionDescription:
      // deno-lint-ignore no-explicit-any
      shard.secretKey = (messageData.d as any).secret_key;
      break;
  }
}
