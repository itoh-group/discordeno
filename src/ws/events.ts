import { DiscordGatewayPayload } from "../types/gateway/gateway_payload.ts";
import { DiscordenoShard, DiscordenoVoiceShard } from "./ws.ts";

/** The handler for logging different actions happening inside the ws. User can override and put custom handling per event. */
export function log(
  type: "CLOSED",
  data: { shardId: number; payload: CloseEvent },
): unknown;
export function log(
  type: "VOICE_CLOSED",
  data: { guildId: string; payload: CloseEvent },
): unknown;
export function log(
  type: "CLOSED_RECONNECT",
  data: { shardId: number; payload: CloseEvent },
): unknown;
export function log(
  type: "VOICE_CLOSED_RECONNECT",
  data: { guildId: string; payload: CloseEvent },
): unknown;
export function log(
  type: "ERROR",
  data: Record<string, unknown> & { shardId: number },
): unknown;
export function log(
  type: "VOICE_ERROR",
  data: Record<string, unknown> & { guildId: string },
): unknown;
export function log(
  type: "HEARTBEATING",
  data: { shardId: number; shard: DiscordenoShard },
): unknown;
export function log(
  type: "HEARTBEATING_CLOSED",
  data: { shardId: number; shard: DiscordenoShard },
): unknown;
export function log(
  type: "HEARTBEATING_DETAILS",
  data: { shardId: number; interval: number; shard: DiscordenoShard },
): unknown;
export function log(
  type: "HEARTBEATING_STARTED",
  data: { shardId: number; interval: number },
): unknown;
export function log(
  type: "VOICE_HEARTBEATING",
  data: { guildId: string; shard: DiscordenoVoiceShard },
): unknown;
export function log(
  type: "VOICE_HEARTBEATING_CLOSED",
  data: { guildId: string; shard: DiscordenoVoiceShard },
): unknown;
export function log(
  type: "VOICE_HEARTBEATING_DETAILS",
  data: { guildId: string; interval: number; shard: DiscordenoVoiceShard },
): unknown;
export function log(
  type: "VOICE_HEARTBEATING_STARTED",
  data: { guildId: string; interval: number },
): unknown;
export function log(
  type: "IDENTIFYING",
  data: { shardId: number; maxShards: number },
): unknown;
export function log(
  type: "INVALID_SESSION",
  data: { shardId: number; payload: DiscordGatewayPayload },
): unknown;
export function log(type: "RAW", data: Record<string, unknown>): unknown;
export function log(type: "RECONNECT", data: { shardId: number }): unknown;
export function log(type: "RESUMED", data: { shardId: number }): unknown;
export function log(type: "RESUMING", data: { shardId: number }): unknown;
export function log(type: "DEBUG", data: unknown): unknown;
export function log(
  type:
    | "CLOSED"
    | "CLOSED_RECONNECT"
    | "ERROR"
    | "VOICE_CLOSED"
    | "VOICE_CLOSED_RECONNECT"
    | "VOICE_ERROR"
    | "HEARTBEATING"
    | "HEARTBEATING_CLOSED"
    | "HEARTBEATING_DETAILS"
    | "HEARTBEATING_STARTED"
    | "VOICE_HEARTBEATING"
    | "VOICE_HEARTBEATING_CLOSED"
    | "VOICE_HEARTBEATING_DETAILS"
    | "VOICE_HEARTBEATING_STARTED"
    | "IDENTIFYING"
    | "INVALID_SESSION"
    | "RAW"
    | "RECONNECT"
    | "RESUMED"
    | "RESUMING"
    | "DEBUG",
  data: unknown,
) {
  console.log(type, data);
}
