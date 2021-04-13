import { DiscordGatewayOpcodes } from "../../types/codes/gateway_opcodes.ts";
import { requireBotChannelPermissions } from "../../util/permissions.ts";
import { ws } from "../../ws/ws.ts";

/** Join a voice channel if you have the CONNECT permission in that channel. */
export async function joinVoiceChannel(
  shardId: number,
  guildId: string,
  channelId: string,
  options: {
    selfMute?: boolean;
    selfDeaf?: boolean;
  } = {},
) {
  await requireBotChannelPermissions(channelId, ["CONNECT"]);

  ws.shards.get(shardId)?.queue.unshift({
    op: DiscordGatewayOpcodes.VoiceStateUpdate,
    d: {
      guild_id: guildId,
      channel_id: channelId,
      self_deaf: options.selfDeaf || false,
      self_mute: options.selfMute || false,
    },
  });
  ws.processQueue(shardId);
}
