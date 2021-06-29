import { eventHandlers } from "../bot.ts";
import { cacheHandlers } from "../cache.ts";
import type { Message } from "../types/messages/message.ts";
import { snowflakeToBigint } from "../util/bigint.ts";
import { CHANNEL_MENTION_REGEX } from "../util/constants.ts";
import { iconBigintToHash } from "../util/hash.ts";
import { channelToThread } from "../util/transformers/channel_to_thread.ts";
import { createNewProp } from "../util/utils.ts";

const MESSAGE_SNOWFLAKES = ["id", "channelId", "guildId", "webhookId", "applicationId"];

const messageToggles = {
  /** Whether this was a TTS message */
  tts: 1n,
  /** Whether this message mentions everyone */
  mentionEveryone: 2n,
  /** Whether this message is pinned */
  pinned: 4n,
};

const baseMessage: Partial<DiscordenoMessage> = {
  get link() {
    return `https://discord.com/channels/${this.guildId || "@me"}/${this.channelId}/${this.id}`;
  },

  // METHODS
  get tts() {
    return Boolean(this.bitfield! & messageToggles.tts);
  },
  get mentionEveryone() {
    return Boolean(this.bitfield! & messageToggles.mentionEveryone);
  },
  get pinned() {
    return Boolean(this.bitfield! & messageToggles.pinned);
  },
  toJSON() {
    return {
      id: this.id?.toString(),
      channelId: this.channelId?.toString(),
      guildId: this.guildId?.toString(),
      author: {
        id: this.authorId?.toString(),
        username: this.tag?.substring(0, this.tag.length - 5),
        discriminator: this.tag?.substring(this.tag.length - 4),
        // avatar: this.member?.avatar ? iconBigintToHash(this.member.avatar) : undefined,
        bot: this.isBot,
        // system: this.member?.system,
        // mfaEnabled: this.member?.mfaEnabled,
        // locale: this.member?.locale,
        // verified: this.member?.verified,
        // email: this.member?.email,
        // flags: this.member?.flags,
        // premiumType: this.member?.premiumType,
        // publicFlags: this.member?.publicFlags,
      },
      // member: this.member,
      content: this.content,
      timestamp: this.timestamp ? new Date(this.timestamp).toISOString() : undefined,
      editedTimestamp: this.editedTimestamp ? new Date(this.editedTimestamp).toISOString() : undefined,
      tts: this.tts,
      mentionEveryone: this.mentionEveryone,
      mentions: this.mentions,
      mentionRoles: this.mentionRoles,
      mentionChannels: this.mentionChannels,
      attachments: this.attachments,
      embeds: this.embeds,
      reactions: this.reactions,
      nonce: this.nonce,
      pinned: this.pinned,
      webhookId: this.webhookId,
      type: this.type,
      activity: this.activity,
      application: this.application,
      applicationId: this.applicationId,
      messageReference: this.messageReference,
      flags: this.flags,
      stickers: this.stickers,
      referencedMessage: this.referencedMessage,
      interaction: this.interaction,
      // thread: this.thread,
      components: this.components,
    } as Message;
  },
};

export async function createDiscordenoMessage(data: Message) {
  const {
    guildId = "",
    mentionChannels = [],
    mentions = [],
    mentionRoles = [],
    editedTimestamp,
    author,
    messageReference,
    ...rest
  } = data;

  let bitfield = 0n;

  const props: Record<string, ReturnType<typeof createNewProp>> = {};
  (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
    eventHandlers.debug?.("loop", `Running for of loop in createDiscordenoMessage function.`);

    const toggleBits = messageToggles[key as keyof typeof messageToggles];
    if (toggleBits) {
      bitfield |= rest[key] ? toggleBits : 0n;
      return;
    }

    // Don't add member to props since it would overwrite the message.member getter
    // thread should not be cached on a message
    if (["member", "thread"].includes(key)) return;

    props[key] = createNewProp(
      MESSAGE_SNOWFLAKES.includes(key) ? (rest[key] ? snowflakeToBigint(rest[key] as string) : undefined) : rest[key]
    );
  });

  if (rest.thread) await cacheHandlers.set("threads", snowflakeToBigint(data.id), channelToThread(rest.thread));

  props.authorId = createNewProp(snowflakeToBigint(author.id));
  props.isBot = createNewProp(author.bot || false);
  props.tag = createNewProp(`${author.username}#${author.discriminator.toString().padStart(4, "0")}`);

  // Discord doesnt give guild id for getMessage() so this will fill it in
  const guildIdFinal =
    snowflakeToBigint(guildId) ||
    (await cacheHandlers.get("channels", snowflakeToBigint(data.channelId)))?.guildId ||
    0n;

  const message: DiscordenoMessage = Object.create(baseMessage, {
    ...props,
    content: createNewProp(data.content || ""),
    guildId: createNewProp(guildIdFinal),
    mentionedUserIds: createNewProp(mentions.map((m) => snowflakeToBigint(m.id))),
    mentionedRoleIds: createNewProp(mentionRoles.map((id) => snowflakeToBigint(id))),
    mentionedChannelIds: createNewProp([
      // Keep any ids that discord sends
      ...mentionChannels.map((m) => snowflakeToBigint(m.id)),
      // Add any other ids that can be validated in a channel mention format
      ...(rest.content?.match(CHANNEL_MENTION_REGEX) || []).map((text) =>
        // converts the <#123> into 123
        snowflakeToBigint(text.substring(2, text.length - 1))
      ),
    ]),
    timestamp: createNewProp(Date.parse(data.timestamp)),
    editedTimestamp: createNewProp(editedTimestamp ? Date.parse(editedTimestamp) : undefined),
    messageReference: createNewProp(
      messageReference
        ? {
            messageId: messageReference.messageId ? snowflakeToBigint(messageReference.messageId) : undefined,
            channelId: messageReference.channelId ? snowflakeToBigint(messageReference.channelId) : undefined,
            guildId: messageReference.guildId ? snowflakeToBigint(messageReference.guildId) : undefined,
          }
        : undefined
    ),
    bitfield: createNewProp(bitfield),
  });

  return message;
}

export interface DiscordenoMessage
  extends Omit<
    Message,
    | "id"
    | "webhookId"
    | "timestamp"
    | "editedTimestamp"
    | "guildId"
    | "channelId"
    | "member"
    | "author"
    | "applicationId"
    | "thread"
  > {
  id: bigint;
  /** Whether or not this message was sent by a bot */
  isBot: boolean;
  /** The username#discrimnator for the user who sent this message */
  tag: string;
  /** Holds all the boolean toggles. */
  bitfield: bigint;

  // For better user experience

  /** Id of the guild which the massage has been send in. "0n" if it a DM */
  guildId: bigint;
  /** id of the channel the message was sent in */
  channelId: bigint;
  /** If the message is generated by a webhook, this is the webhook's id */
  webhookId?: bigint;
  /** The id of the user who sent this message */
  authorId: bigint;
  /** If the message is a response to an Interaction, this is the id of the interaction's application */
  applicationId?: bigint;
  /** The message content for this message. Empty string if no content was sent like an attachment only. */
  content: string;
  /** Ids of users specifically mentioned in the message */
  mentionedUserIds: bigint[];
  /** Ids of roles specifically mentioned in this message */
  mentionedRoleIds: bigint[];
  /** Channels specifically mentioned in this message */
  mentionedChannelIds?: bigint[];
  /** When this message was sent */
  timestamp: number;
  /** When this message was edited (or undefined if never) */
  editedTimestamp?: number;

  // GETTERS
  /** The url link to this message */
  link: string;

  // METHODS
  /** Convert to json */
  toJSON(): Message;
}
