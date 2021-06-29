import { eventHandlers } from "../bot.ts";
import type { Channel } from "../types/channels/channel.ts";
import type { DiscordOverwrite } from "../types/channels/overwrite.ts";
import { snowflakeToBigint } from "../util/bigint.ts";
import { createNewProp } from "../util/utils.ts";

const CHANNEL_SNOWFLAKES = ["id", "guildId", "lastMessageId", "ownerId", "applicationId", "parentId"];

const baseChannel: Partial<DiscordenoChannel> = {
  toJSON() {
    return {
      id: this.id?.toString(),
      type: this.type,
      guildId: this.guildId?.toString(),
      position: this.position,
      permissionOverwrites: this.permissionOverwrites?.map((o) => ({
        ...o,
        id: o.id.toString(),
        allow: o.allow.toString(),
        deny: o.deny.toString(),
      })),
      name: this.name,
      topic: this.topic,
      nsfw: this.nsfw,
      lastMessageId: this.lastMessageId?.toString(),
      bitrate: this.bitrate,
      userLimit: this.userLimit,
      rateLimitPerUser: this.rateLimitPerUser,
      recipients: this.recipients,
      icon: this.icon,
      ownerId: this.ownerId,
      applicationId: this.applicationId,
      parentId: this.parentId,
      lastPinTimestamp: this.lastPinTimestamp ? new Date(this.lastPinTimestamp).toISOString() : undefined,
      rtcRegion: this.rtcRegion,
      videoQualityMode: this.videoQualityMode,
    } as Channel;
  },
};

/** Create a structure object  */
// deno-lint-ignore require-await
export async function createDiscordenoChannel(data: Channel, guildId?: bigint) {
  const { lastPinTimestamp, permissionOverwrites = [], ...rest } = data;

  const props: Record<string, PropertyDescriptor> = {};
  (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
    eventHandlers.debug?.("loop", `Running forEach loop in createDiscordenoChannel function.`);

    props[key] = createNewProp(
      CHANNEL_SNOWFLAKES.includes(key) ? (rest[key] ? snowflakeToBigint(rest[key] as string) : undefined) : rest[key]
    );
  });

  // Set the guildId seperately because sometimes guildId is not included
  props.guildId = createNewProp(snowflakeToBigint(guildId?.toString() || data.guildId || ""));

  const channel: DiscordenoChannel = Object.create(baseChannel, {
    ...props,
    lastPinTimestamp: createNewProp(lastPinTimestamp ? Date.parse(lastPinTimestamp) : undefined),
    permissionOverwrites: createNewProp(
      permissionOverwrites.map((o) => ({
        ...o,
        id: snowflakeToBigint(o.id),
        allow: snowflakeToBigint(o.allow),
        deny: snowflakeToBigint(o.deny),
      }))
    ),
  });

  return channel;
}

export interface DiscordenoChannel
  extends Omit<
    Channel,
    | "id"
    | "guildId"
    | "lastMessageId"
    | "ownerId"
    | "applicationId"
    | "parentId"
    | "permissionOverwrites"
    | "messageCount"
    | "memberCount"
    | "threadMetadata"
    | "member"
  > {
  permissionOverwrites: (Omit<DiscordOverwrite, "id" | "allow" | "deny"> & {
    id: bigint;
    allow: bigint;
    deny: bigint;
  })[];
  /** The id of the channel */
  id: bigint;
  /** The id of the guild, 0n if it is a DM */
  guildId: bigint;
  /** The id of the last message sent in this channel (may not point to an existing or valid message) */
  lastMessageId?: bigint;
  /** id of the DM creator */
  ownerId?: bigint;
  /** Application id of the group DM creator if it is bot-created */
  applicationId?: bigint;
  /** Id of the parent category for a channel (each parent category can contain up to 50 channels) */
  parentId?: bigint;

  // METHODS
  /** Returns the Channel object json value */
  toJSON(): Channel;
}
