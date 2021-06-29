import { eventHandlers } from "../bot.ts";
import type { Role } from "../types/permissions/role.ts";
import { snowflakeToBigint } from "../util/bigint.ts";
import { createNewProp } from "../util/utils.ts";

const ROLE_SNOWFLAKES = ["id", "botId", "integrationId", "guildId"];

const roleToggles = {
  /** If this role is showed seperately in the user listing */
  hoist: 1n,
  /** Whether this role is managed by an integration */
  managed: 2n,
  /** Whether this role is mentionable */
  mentionable: 4n,
  /** If this role is the nitro boost role. */
  isNitroBoostRole: 8n,
};

const baseRole: Partial<DiscordenoRole> = {
  get hexColor() {
    return this.color!.toString(16);
  },
  get mention() {
    return `<@&${this.id}>`;
  },
  get hoist() {
    return Boolean(this.bitfield! & roleToggles.hoist);
  },
  get managed() {
    return Boolean(this.bitfield! & roleToggles.managed);
  },
  get mentionable() {
    return Boolean(this.bitfield! & roleToggles.mentionable);
  },
  get isNitroBoostRole() {
    return Boolean(this.bitfield! & roleToggles.isNitroBoostRole);
  },

  // METHODS

  toJSON() {
    return {
      guildId: this.guildId?.toString(),
      id: this.id?.toString(),
      name: this.name,
      color: this.color,
      hoist: this.hoist,
      position: this.position,
      permissions: this.permissions?.toString(),
      managed: this.managed,
      mentionable: this.mentionable,
      tags: {
        botId: this.botId?.toString(),
        integrationId: this.integrationId?.toString(),
        premiumSubscriber: this.isNitroBoostRole,
      },
    } as Role & { guildId: string };
  },
};

// deno-lint-ignore require-await
export async function createDiscordenoRole(
  data: { role: Role } & {
    guildId: bigint;
  }
) {
  const { tags = {}, ...rest } = { guildId: data.guildId, ...data.role };

  let bitfield = 0n;

  const props: Record<string, ReturnType<typeof createNewProp>> = {};
  (Object.keys(rest) as (keyof typeof rest)[]).forEach((key) => {
    eventHandlers.debug?.("loop", `Running for of loop in createDiscordenoRole function.`);

    const toggleBits = roleToggles[key as keyof typeof roleToggles];
    if (toggleBits) {
      bitfield |= rest[key] ? toggleBits : 0n;
      return;
    }

    props[key] = createNewProp(
      ROLE_SNOWFLAKES.includes(key) ? (rest[key] ? snowflakeToBigint(rest[key] as string) : undefined) : rest[key]
    );
  });

  const role: DiscordenoRole = Object.create(baseRole, {
    ...props,
    permissions: createNewProp(BigInt(rest.permissions)),
    botId: createNewProp(tags.botId ? snowflakeToBigint(tags.botId) : undefined),
    isNitroBoostRole: createNewProp("premiumSubscriber" in tags),
    integrationId: createNewProp(tags.integrationId ? snowflakeToBigint(tags.integrationId) : undefined),
    bitfield: createNewProp(bitfield),
  });

  return role;
}

export interface DiscordenoRole extends Omit<Role, "tags" | "id" | "permissions"> {
  /** The role id */
  id: bigint;
  /** The bot id that is associated with this role. */
  botId?: bigint;
  /** If this role is the nitro boost role. */
  isNitroBoostRole: boolean;
  /** The integration id that is associated with this role */
  integrationId: bigint;
  /** The roles guildId */
  guildId: bigint;
  /** Permission bit set */
  permissions: bigint;
  /** Holds all the boolean toggles. */
  bitfield: bigint;

  // GETTERS

  /** The hex color for this role. */
  hexColor: string;
  /** The @ mention of the role in a string. */
  mention: string;

  // METHODS

  /** Convert to json friendly role with guild id */
  toJSON(): Role & { guildId: string };
}
