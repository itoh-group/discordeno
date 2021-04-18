import { DiscordVoiceOpcodes } from "../../types/codes/voice_opcodes.ts";
import { ws } from "../ws.ts";

export async function createUdpConnection(
  guildId: string,
  ip: string,
  port: number,
) {
  const shard = ws.voiceShards.get(guildId);
  if (!shard) return;

  const address = {
    hostname: ip,
    port,
    transport: "udp",
  } as const;

  // EVEN THOUGH VSC AWAIT ISNT NEEDED, IT IS!!!
  shard.udp = await Deno.listenDatagram({
    port: 1337,
    transport: "udp",
    hostname: "0.0.0.0",
  });

  const ipDiscovery = new Uint8Array(74);
  const view = new DataView(ipDiscovery.buffer);
  view.setUint16(0, 0x1, false);
  view.setUint16(2, 70, false);
  view.setUint32(4, shard.ssrc!, false);

  await shard.udp.send(ipDiscovery, address).catch(console.log);
  const [buffer] = await shard.udp.receive();

  shard.address = {
    port: new DataView(buffer.buffer).getUint16(
      buffer.length - 2,
      false,
    ),
    // @ts-ignore deno doesnt allow this but its hella effective
    hostname: Deno.core.decode(
      buffer.subarray(8, buffer.indexOf(0, 8)),
    ),
    transport: "udp",
  };

  shard.ws.send(
    JSON.stringify({
      op: DiscordVoiceOpcodes.SelectProtocol,
      d: {
        protocol: "udp",
        address: shard.address.hostname,
        port: shard.address.port,
        mode: "xsalsa20_poly1305",
      },
    }),
  );
}
