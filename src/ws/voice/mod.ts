// Establishing a Voice UDP Connection
// Once we receive the properties of a UDP voice server from our Opcode 2 Ready payload, we can proceed to the final step of voice connections, which entails establishing and handshaking a UDP connection for voice data. First, we open a UDP connection to the IP and port provided in the Ready payload. If required, we can now perform an IP Discovery using this connection. Once we've fully discovered our external IP and UDP port, we can then tell the voice WebSocket what it is, and start receiving/sending data. We do this using Opcode 1 Select Protocol:
// Example Select Protocol Payload
// {
//     "op": 1,
//     "d": {
//         "protocol": "udp",
//         "data": {
//             "address": "127.0.0.1",
//             "port": 1337,
//             "mode": "xsalsa20_poly1305_lite"
//         }
//     }
// }

// Encryption Modes
// MODE	KEY	NONCE BYTES	GENERATING NONCE
// Normal	xsalsa20_poly1305	The nonce bytes are the RTP header	Copy the RTP header
// Suffix	xsalsa20_poly1305_suffix	The nonce bytes are 24 bytes appended to the payload of the RTP packet	Generate 24 random bytes
// Lite	xsalsa20_poly1305_lite	The nonce bytes are 4 bytes appended to the payload of the RTP packet	Incremental 4 bytes (32bit) int value
// The nonce has to be stripped from the payload before encrypting and before decrypting the audio data
// Finally, the voice server will respond with a Opcode 4 Session Description that includes the mode and secret_key, a 32 byte array used for encrypting and sending voice data:
// Example Session Description Payload
// {
//     "op": 4,
//     "d": {
//         "mode": "xsalsa20_poly1305_lite",
//         "secret_key": [ ...251, 100, 11...]
//     }
// }

// We can now start encrypting and sending voice data over the previously established UDP connection.