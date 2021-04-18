import { VOICE_GATEWAY_VERSION } from "../../util/constants.ts";
import { ws } from "../ws.ts";

export function createVoiceConnection(guildId: string, url: string) {
  const socket = new WebSocket(`wss://${url}?v=${VOICE_GATEWAY_VERSION}`);
  socket.binaryType = "arraybuffer";

  socket.onerror = (errorEvent) => {
    ws.log("VOICE_ERROR", { guildId, error: errorEvent });
  };

  socket.onmessage = async ({ data: message }) =>
    await ws.handleOnMessageVoice(message, guildId);

  socket.onclose = (event) => {
    ws.log("VOICE_CLOSED", { guildId, payload: event });
    if (
      event.code === 3064 ||
      event.reason === "Discordeno Voice Testing Finished! Do Not RESUME!"
    ) {
      return;
    }

    // switch (event.code) {
    // }
  };

  return socket;
}
