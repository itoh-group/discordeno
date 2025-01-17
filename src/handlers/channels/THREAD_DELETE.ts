import { eventHandlers } from "../../bot.ts";
import { cacheHandlers } from "../../cache.ts";
import { Channel } from "../../types/channels/channel.ts";
import { DiscordGatewayPayload } from "../../types/gateway/gateway_payload.ts";
import { snowflakeToBigint } from "../../util/bigint.ts";

export async function handleThreadDelete(data: DiscordGatewayPayload) {
  const payload = data.d as Channel;

  const cachedChannel = await cacheHandlers.get("threads", snowflakeToBigint(payload.id));
  if (!cachedChannel) return;

  await cacheHandlers.delete("threads", snowflakeToBigint(payload.id));
  cacheHandlers.forEach("messages", (message) => {
    eventHandlers.debug?.("loop", `Running forEach messages loop in THREAD_DELETE file.`);
    if (message.channelId === snowflakeToBigint(payload.id)) {
      cacheHandlers.delete("messages", message.id);
    }
  });

  eventHandlers.threadDelete?.(cachedChannel);
}
