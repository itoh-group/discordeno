import { botId } from "../../bot.ts";
import { DiscordVoiceOpcodes } from "../../types/codes/voice_opcodes.ts";

export function voiceIdentify(
  shardId: number,
  guildId: string,
  data: {
    sessionId: string;
    token: string;
    url: string;
  },
) {

    // {
    //   op: DiscordVoiceOpcodes.Identify,
    //   d: {
    //     server_id: guildId,
    //     user_id: botId,
    //     session_id: data.sessionId,
    //     token: data.token,
    //   },
    // }
}
