import { ws } from "../ws.ts";
import { secretbox } from "./deps.ts";

const frame = new Uint8Array(28 + 3 * 1276);
frame.set([0x80]);
frame.set([0x78], 1);

export async function sendVoice(guildId: string, opus: unknown) {
  const shard = ws.voiceShards.get(guildId);
  if (!shard) return;

  if (!shard.view) {
    shard.view = new DataView(frame.buffer);
    shard.view.setUint32(8, shard.ssrc!, false);
  }

  if (!shard.frame) {
    shard.frame = frame.slice();
  }

  if (65536 <= ++shard.sequence) shard.sequence -= 65536;
  if (4294967296 <= (shard.timestamp += 960)) shard.timestamp %= 4294967296;

  shard.view.setUint16(2, shard.sequence, false);
  shard.view.setUint32(4, shard.timestamp, false);

  shard.nonce.set(shard.frame.subarray(0, 12));
  const sealed = await secretbox.seal(opus, shard.secretKey, shard.nonce);
  shard.frame.set(sealed, 12);

  return await shard.udp.send(
    shard.frame.subarray(0, 12 + sealed.length),
    shard.address,
  );
}
