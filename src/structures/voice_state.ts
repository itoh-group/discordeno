import { eventHandlers } from "../bot.ts";
import type { VoiceState } from "../types/voice/voice_state.ts";
import { snowflakeToBigint } from "../util/bigint.ts";
import { createNewProp } from "../util/utils.ts";

const VOICE_STATE_SNOWFLAKES = ["userId", "channelId", "guildId"];

export const voiceStateToggles = {
  /** Whether this user is deafened by the server */
  deaf: 1n,
  /** Whether this user is muted by the server */
  mute: 2n,
  /** Whether this user is locally deafened */
  selfDeaf: 4n,
  /** Whether this user is locally muted */
  selfMute: 8n,
  /** Whether this user is streaming using "Go Live" */
  selfStream: 16n,
  /** Whether this user's camera is enabled */
  selfVideo: 32n,
  /** Whether this user is muted by the current user */
  suppress: 64n,
};

const baseRole: Partial<DiscordenoVoiceState> = {
  get deaf() {
    return Boolean(this.bitfield! & voiceStateToggles.deaf);
  },
  get mute() {
    return Boolean(this.bitfield! & voiceStateToggles.mute);
  },
  get selfDeaf() {
    return Boolean(this.bitfield! & voiceStateToggles.selfDeaf);
  },
  get selfMute() {
    return Boolean(this.bitfield! & voiceStateToggles.selfMute);
  },
  get selfStream() {
    return Boolean(this.bitfield! & voiceStateToggles.selfStream);
  },
  get selfVideo() {
    return Boolean(this.bitfield! & voiceStateToggles.selfVideo);
  },
  get suppress() {
    return Boolean(this.bitfield! & voiceStateToggles.suppress);
  },
  toJSON() {
    return {
      guildId: this.guildId?.toString(),
      channelId: this.channelId?.toString(),
      userId: this.userId?.toString(),
      // member: this.member,
      sessionId: this.sessionId,
      deaf: this.deaf,
      mute: this.mute,
      selfDeaf: this.selfDeaf,
      selfMute: this.selfMute,
      selfStream: this.selfStream,
      selfVideo: this.selfVideo,
      suppress: this.suppress,
      requestToSpeakTimestamp: this.requestToSpeakTimestamp,
    } as VoiceState;
  },
};

// deno-lint-ignore require-await
export async function createDiscordenoVoiceState(guildId: bigint, data: VoiceState) {
  let bitfield = 0n;

  const props: Record<string, ReturnType<typeof createNewProp>> = {};
  (Object.keys(data) as (keyof typeof data)[]).forEach((key) => {
    eventHandlers.debug?.("loop", `Running for of loop in createDiscordenoVoiceState function.`);

    // We don't need to cache member twice. It will be in cache.members
    if (key === "member") return;

    const toggleBits = voiceStateToggles[key as keyof typeof voiceStateToggles];
    if (toggleBits) {
      bitfield |= data[key] ? toggleBits : 0n;
      return;
    }

    props[key] = createNewProp(
      VOICE_STATE_SNOWFLAKES.includes(key)
        ? data[key]
          ? snowflakeToBigint(data[key] as string)
          : undefined
        : data[key]
    );
  });

  const voiceState: DiscordenoVoiceState = Object.create(baseRole, {
    ...props,
    guildId: createNewProp(guildId),
    bitfield: createNewProp(bitfield),
  });

  return voiceState;
}

export interface DiscordenoVoiceState extends Omit<VoiceState, "channelId" | "guildId" | "userId" | "member"> {
  /** The guild id */
  guildId: bigint;
  /** The channel id this user is connected to */
  channelId?: bigint;
  /** The user id this voice state is for */
  userId: bigint;
  /** Holds all the boolean toggles. */
  bitfield: bigint;

  // GETTERS

  /** Converts to the raw JSON format. */
  toJSON(): VoiceState;
}
