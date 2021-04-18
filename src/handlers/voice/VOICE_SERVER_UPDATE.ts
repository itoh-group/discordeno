import { eventHandlers } from "../../bot.ts";
import { cacheHandlers } from "../../cache.ts";
import { DiscordGatewayPayload } from "../../types/gateway/gateway_payload.ts";
import {
  DiscordVoiceServerUpdate,
  VoiceServerUpdate,
} from "../../types/voice/voice_server_update.ts";
import { snakeKeysToCamelCase } from "../../util/utils.ts";
import { ws } from "../../ws/ws.ts";

export async function handleVoiceServerUpdate(data: DiscordGatewayPayload) {
  const payload = snakeKeysToCamelCase<VoiceServerUpdate>(
    data.d as DiscordVoiceServerUpdate,
  );

  const guild = await cacheHandlers.get("guilds", payload.guildId);
  if (!guild) return;

  ws.setupVoiceConnection(guild.id, {
    token: payload.token,
    url: payload.endpoint!,
  });
  eventHandlers.voiceServerUpdate?.(payload, guild);
}
