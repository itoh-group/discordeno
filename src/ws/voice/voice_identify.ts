import { botId } from "../../bot.ts";
import { DiscordVoiceOpcodes } from "../../types/codes/voice_opcodes.ts";
import { ws } from "../ws.ts";

export function voiceIdentify(
  guildId: string,
  data: {
    sessionId: string;
    token: string;
    url: string;
  },
) {
  const shard = ws.voiceShards.get(guildId);
  if (!shard) return ws.log("DEBUG", `Shard ID ${guildId} not found.`);

  shard.ws.send(JSON.stringify(
    {
      op: DiscordVoiceOpcodes.Identify,
      d: {
        server_id: guildId,
        user_id: botId,
        session_id: data.sessionId,
        token: data.token,
      },
    },
  ));
}
