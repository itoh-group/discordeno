import { eventHandlers } from "../bot.ts";
import { cacheHandlers } from "../cache.ts";
import { avatarURL } from "../helpers/members/avatar_url.ts";
import { GuildMemberWithUser, GuildMember } from "../types/members/guild_member.ts";
import { User } from "../types/users/user.ts";
import { snowflakeToBigint } from "../util/bigint.ts";
import { Collection } from "../util/collection.ts";
import { iconBigintToHash, iconHashToBigInt } from "../util/hash.ts";
import { createNewProp } from "../util/utils.ts";
import { structures } from "./mod.ts";

const MEMBER_SNOWFLAKES = ["id"];

export const memberToggles = {
  /** Whether the user belongs to an OAuth2 application */
  bot: 1n,
  /** Whether the user is an Official Discord System user (part of the urgent message system) */
  system: 2n,
  /** Whether the user has two factor enabled on their account */
  mfaEnabled: 4n,
  /** Whether the email on this account has been verified */
  verified: 8n,
  /** Whether the users avatar is animated. */
  animatedAvatar: 16n,
};

const baseMember: Partial<DiscordenoMember> = {
  get avatarUrl() {
    return avatarURL(this.id!, this.discriminator!, {
      avatar: this.avatar!,
      animated: this.animatedAvatar,
    });
  },
  get mention() {
    return `<@!${this.id!}>`;
  },
  get tag() {
    return `${this.username!}#${this.discriminator!.toString().padStart(4, "0")}`;
  },

  // METHODS
  get bot() {
    return Boolean(this.bitfield! & memberToggles.bot);
  },
  get system() {
    return Boolean(this.bitfield! & memberToggles.system);
  },
  get mfaEnabled() {
    return Boolean(this.bitfield! & memberToggles.mfaEnabled);
  },
  get verified() {
    return Boolean(this.bitfield! & memberToggles.verified);
  },
  get animatedAvatar() {
    return Boolean(this.bitfield! & memberToggles.animatedAvatar);
  },
  toJSON() {
    return (this.guilds?.map((g) => ({
      user: {
        id: this.id?.toString(),
        username: this.username,
        discriminator: this.discriminator?.toString(),
        avatar: this.avatar ? iconBigintToHash(this.avatar) : undefined,
        bot: this.bot,
        system: this.system,
        mfaEnabled: this.mfaEnabled,
        locale: this.locale,
        verified: this.verified,
        email: this.email,
        flags: this.flags,
        premiumType: this.premiumType,
        publicFlags: this.publicFlags,
      },
      nick: g.nick,
      roles: g.roles.map((id) => id.toString()),
      joinedAt: g.joinedAt ? new Date(g.joinedAt).toISOString() : undefined,
      premiumSince: g.premiumSince,
      deaf: g.deaf,
      mute: g.mute,
      pending: g.pending,
    })) || []) as (GuildMemberWithUser & { guildId: string })[];
  },
};

structures.createDiscordenoMember = async function (
  // The `user` param in `DiscordGuildMember` is optional since discord does not send it in `MESSAGE_CREATE` and `MESSAGE_UPDATE` events. But this data in there is required to build this structure so it is required in this case
  data: GuildMemberWithUser,
  guildId: bigint,
  otherGuildMembers?: (GuildMember & { id: string })[]
) {
  const { user, joinedAt, premiumSince } = data;

  let bitfield = 0n;
  const props: Record<string, ReturnType<typeof createNewProp>> = {};
  (Object.keys(user) as (keyof typeof user)[]).forEach((key) => {
    eventHandlers.debug?.("loop", `Running for of for Object.keys(user) loop in DiscordenoMember function.`);

    const toggleBits = memberToggles[key as keyof typeof memberToggles];
    if (toggleBits) {
      bitfield |= user[key] ? toggleBits : 0n;
      return;
    }

    if (key === "avatar") {
      const transformed = user[key] ? iconHashToBigInt(user[key] as string) : undefined;
      if (transformed?.animated) bitfield |= memberToggles.animatedAvatar;
      props.avatar = createNewProp(transformed?.bigint);
      return;
    }

    if (key === "discriminator") {
      props.discriminator = createNewProp(Number(user[key]));
      return;
    }

    props[key] = createNewProp(
      MEMBER_SNOWFLAKES.includes(key) ? (user[key] ? snowflakeToBigint(user[key] as string) : undefined) : user[key]
    );
  });

  const member: DiscordenoMember = Object.create(baseMember, {
    ...props,
    /** The guild related data mapped by guild id */
    guilds: createNewProp(new Collection<bigint, GuildMember>()),
    bitfield: createNewProp(bitfield),
    cachedAt: createNewProp(Date.now()),
  });

  if (otherGuildMembers === undefined) {
    const cached = await cacheHandlers.get("members", snowflakeToBigint(user.id));
    if (cached) {
      for (const [id, guild] of cached.guilds.entries()) {
        eventHandlers.debug?.("loop", `Running for of for cached.guilds.entries() loop in DiscordenoMember function.`);
        member.guilds.set(id, guild);
      }
    }
  } else {
    for (const other of otherGuildMembers) {
      // User was never cached before
      member.guilds.set(snowflakeToBigint(other.id), {
        nick: other.nick,
        roles: other.roles.map((id) => snowflakeToBigint(id)),
        joinedAt: joinedAt ? Date.parse(joinedAt) : undefined,
        premiumSince: premiumSince ? Date.parse(premiumSince) : undefined,
        deaf: other.deaf,
        mute: other.mute,
      });
    }
  }

  // User was never cached before
  member.guilds.set(guildId, {
    nick: data.nick,
    roles: data.roles.map((id) => snowflakeToBigint(id)),
    joinedAt: joinedAt ? Date.parse(joinedAt) : undefined,
    premiumSince: premiumSince ? Date.parse(premiumSince) : undefined,
    deaf: data.deaf,
    mute: data.mute,
  });

  return member;
};

export interface DiscordenoMember extends Omit<User, "discriminator" | "id" | "avatar"> {
  /** The user's id */
  id: bigint;
  /** The user's 4-digit discord-tag */
  discriminator: number;
  /** The avatar in bigint format. */
  avatar: bigint;
  /** The guild related data mapped by guild id */
  guilds: Collection<
    bigint,
    Omit<GuildMember, "joinedAt" | "premiumSince" | "roles"> & {
      joinedAt?: number;
      premiumSince?: number;
      roles: bigint[];
    }
  >;
  /** Holds all the boolean toggles. */
  bitfield: bigint;
  /** When the member has been cached the last time. */
  cachedAt: number;

  // GETTERS
  /** The avatar url using the default format and size. */
  avatarUrl: string;
  /** The mention string for this member */
  mention: string;
  /** The username#discriminator tag for this member */
  tag: string;
  /** Whether or not the avatar is animated. */
  animatedAvatar: boolean;

  // METHODS

  /** Converts to a json object */
  toJSON(): (GuildMemberWithUser & { guildId: string })[];
}
