import { eventHandlers } from "../bot.ts";
import { cacheHandlers } from "../cache.ts";
import type { PresenceUpdate } from "../types/activity/presence_update.ts";
import type { Emoji } from "../types/emojis/emoji.ts";
import type { Guild } from "../types/guilds/guild.ts";
import { GuildMemberWithUser } from "../types/members/guild_member.ts";
import { snowflakeToBigint } from "../util/bigint.ts";
import { cacheMembers } from "../util/cache_members.ts";
import { Collection } from "../util/collection.ts";
import { iconHashToBigInt } from "../util/hash.ts";
import { channelToThread } from "../util/transformers/channel_to_thread.ts";
import { createNewProp } from "../util/utils.ts";
import { structures } from "./mod.ts";
import { DiscordenoRole } from "./role.ts";
import { DiscordenoVoiceState } from "./voice_state.ts";

const GUILD_SNOWFLAKES = [
  "id",
  "ownerId",
  "permissions",
  "afkChannelId",
  "widgetChannelId",
  "applicationId",
  "systemChannelId",
  "rulesChannelId",
  "publicUpdatesChannelId",
];

export const guildToggles = {
  /** Whether this user is owner of this guild */
  owner: 1n,
  /** Whether the guild widget is enabled */
  widgetEnabled: 2n,
  /** Whether this is a large guild */
  large: 4n,
  /** Whether this guild is unavailable due to an outage */
  unavailable: 8n,
  /** Whether this server's icon is animated */
  animatedIcon: 16n,
  /** Whether this server's banner is animated. */
  animatedBanner: 32n,
  /** Whether this server's splash is animated. */
  animatedSplash: 64n,
};

const baseGuild: Partial<DiscordenoGuild> = {
  toJSON() {
    return {
      shardId: this.shardId!,
      id: this.id?.toString(),
      name: this.name,
      icon: this.icon,
      iconHash: undefined,
      splash: this.splash,
      discoverySplash: this.discoverySplash,
      owner: this.owner,
      ownerId: this.ownerId?.toString(),
      permissions: this.permissions,
      afkChannelId: this.afkChannelId?.toString(),
      afkTimeout: this.afkTimeout,
      widgetEnabled: this.widgetEnabled,
      widgetChannelId: this.widgetChannelId?.toString(),
      verificationLevel: this.verificationLevel,
      defaultMessageNotifications: this.defaultMessageNotifications,
      explicitContentFilter: this.explicitContentFilter,
      roles: this.roles?.map((r) => r.toJSON()) || [],
      emojis: this.emojis?.array() || [],
      features: this.features,
      mfaLevel: this.mfaLevel,
      applicationId: this.applicationId?.toString(),
      systemChannelId: this.systemChannelId?.toString(),
      systemChannelFlags: this.systemChannelFlags,
      rulesChannelId: this.rulesChannelId?.toString(),
      joinedAt: this.joinedAt ? new Date(this.joinedAt).toISOString() : undefined,
      large: this.large,
      unavailable: this.unavailable,
      memberCount: this.memberCount,
      voiceStates: this.voiceStates,
      members: [], //this.members,
      channels: [], //this.channels,
      threads: this.threads,
      presences: this.presences,
      maxPresences: this.maxPresences,
      maxMembers: this.maxMembers,
      vanityUrlCode: this.vanityUrlCode,
      description: this.description,
      banner: this.banner,
      premiumTier: this.premiumTier,
      premiumSubscriptionCount: this.premiumSubscriptionCount,
      preferredLocale: this.preferredLocale,
      publicUpdatesChannelId: this.publicUpdatesChannelId?.toString(),
      maxVideoChannelUsers: this.maxVideoChannelUsers,
      approximateMemberCount: this.approximateMemberCount,
      approximatePresenceCount: this.approximatePresenceCount,
      welcomeScreen: this.welcomeScreen,
      nsfwLevel: this.nsfwLevel,
      stageInstances: this.stageInstances,
    } as Guild & { shardId: number };
  },
  get owner() {
    return Boolean(this.bitfield! & guildToggles.owner);
  },
  get widgetEnabled() {
    return Boolean(this.bitfield! & guildToggles.widgetEnabled);
  },
  get large() {
    return Boolean(this.bitfield! & guildToggles.large);
  },
  get unavailable() {
    return Boolean(this.bitfield! & guildToggles.unavailable);
  },
  get animatedIcon() {
    return Boolean(this.bitfield! & guildToggles.animatedIcon);
  },
  get animatedBanner() {
    return Boolean(this.bitfield! & guildToggles.animatedBanner);
  },
  get animatedSplash() {
    return Boolean(this.bitfield! & guildToggles.animatedSplash);
  },
};

export async function createDiscordenoGuild(data: Guild, shardId: number) {
  const {
    memberCount = 0,
    voiceStates = [],
    channels = [],
    threads = [],
    presences = [],
    joinedAt = "",
    emojis = [],
    members = [],
    icon,
    splash,
    banner,
    ...rest
  } = data;

  let bitfield = 0n;
  const guildId = snowflakeToBigint(rest.id);

  const promises = [];

  for (const channel of channels) {
    promises.push(async () => {
      const discordenoChannel = await structures.createDiscordenoChannel(channel, guildId);

      return cacheHandlers.set("channels", discordenoChannel.id, discordenoChannel);
    });
  }

  for (const thread of threads) {
    promises.push(() => {
      const discordenoThread = channelToThread(thread);

      return cacheHandlers.set("threads", discordenoThread.id, discordenoThread);
    });
  }

  await Promise.all(
    promises.map(async (promise) => {
      return await promise();
    })
  );

  const roles = await Promise.all(
    (data.roles || []).map((role) =>
      structures.createDiscordenoRole({
        role,
        guildId,
      })
    )
  );

  const voiceStateStructs = await Promise.all(
    voiceStates.map((vs) => {
      if (vs.member?.joinedAt) members.push(vs.member);
      return structures.createDiscordenoVoiceState(guildId, vs);
    })
  );

  const props: Record<string, ReturnType<typeof createNewProp>> = {};
  (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
    eventHandlers.debug?.("loop", `Running for of loop in createDiscordenoGuild function.`);

    const toggleBits = guildToggles[key as keyof typeof guildToggles];
    if (toggleBits) {
      bitfield |= rest[key] ? toggleBits : 0n;
      return;
    }

    props[key] = createNewProp(
      GUILD_SNOWFLAKES.includes(key) ? (rest[key] ? snowflakeToBigint(rest[key] as string) : undefined) : rest[key]
    );
  });

  const hashes = [
    { name: "icon", toggle: guildToggles.animatedIcon, value: icon },
    { name: "banner", toggle: guildToggles.animatedBanner, value: banner },
    { name: "splash", toggle: guildToggles.animatedSplash, value: splash },
  ];

  for (const hash of hashes) {
    const transformed = hash.value ? iconHashToBigInt(hash.value) : undefined;
    if (transformed) {
      props[hash.name] = createNewProp(hash.value);
      if (transformed.animated) bitfield |= hash.toggle;
    }
  }

  const guild: DiscordenoGuild = Object.create(baseGuild, {
    ...props,
    shardId: createNewProp(shardId),
    roles: createNewProp(new Collection(roles.map((r: DiscordenoRole) => [r.id, r]))),
    joinedAt: createNewProp(Date.parse(joinedAt)),
    presences: createNewProp(new Collection(presences.map((p) => [snowflakeToBigint(p.user!.id), p]))),
    memberCount: createNewProp(memberCount),
    emojis: createNewProp(new Collection(emojis.map((emoji) => [snowflakeToBigint(emoji.id!), emoji]))),
    voiceStates: createNewProp(new Collection(voiceStateStructs.map((vs) => [vs.userId, vs]))),
    bitfield: createNewProp(bitfield),
  });

  await cacheMembers(guild.id, members as GuildMemberWithUser[]);

  return guild;
}

export interface DiscordenoGuild
  extends Omit<
    Guild,
    | "roles"
    | "presences"
    | "voiceStates"
    | "members"
    | "channels"
    | "memberCount"
    | "emojis"
    | "id"
    | "ownerId"
    | "permissions"
    | "afkChannelId"
    | "widgetChannelId"
    | "applicationId"
    | "systemChannelId"
    | "rulesChannelId"
    | "publicUpdatesChannelId"
  > {
  /** Guild id */
  id: bigint;
  /** Id of the owner */
  ownerId: bigint;
  /** Total permissions for the user in the guild (execludes overrides) */
  permissions: bigint;
  /** Id of afk channel */
  afkChannelId?: bigint;
  /** The channel id that the widget will generate an invite to, or null if set to no invite */
  widgetChannelId?: bigint;
  /** Application id of the guild creator if it is bot-created */
  applicationId?: bigint;
  /** The id of the channel where guild notices such as welcome messages and boost events are posted */
  systemChannelId?: bigint;
  /** The id of the channel where community guilds can display rules and/or guidelines */
  rulesChannelId?: bigint;
  /** The id of the channel where admins and moderators of Community guilds receive notices from Discord */
  publicUpdatesChannelId?: bigint;
  /** Whether this server's icon is animated */
  animatedIcon: boolean;
  /** Whether this server's banner is animated. */
  animatedBanner: boolean;
  /** Whether this server's splash is animated. */
  animatedSplash: boolean;
  /** The id of the shard this guild is bound to */
  shardId: number;
  /** Total number of members in this guild */
  memberCount: number;
  /** The roles in the guild */
  roles: Collection<bigint, DiscordenoRole>;
  /** The presences of all the users in the guild. */
  presences: Collection<bigint, PresenceUpdate>;
  /** The Voice State data for each user in a voice channel in this server. */
  voiceStates: Collection<bigint, DiscordenoVoiceState>;
  /** Custom guild emojis */
  emojis: Collection<bigint, Emoji>;
  /** Holds all the boolean toggles. */
  bitfield: bigint;

  // METHODS

  /** Get the JSON version of the Guild object used to create this. Includes the shardId as well */
  toJSON(): Guild & { shardId: number };
}
