/**

The voice server should respond with an Opcode 2 Ready payload, which informs us of the SSRC, UDP IP/port, and supported encryption modes the voice server expects:

{
    "op": 2,
    "d": {
        "ssrc": 1,
        "ip": "127.0.0.1",
        "port": 1234,
        "modes": ["xsalsa20_poly1305", "xsalsa20_poly1305_suffix", "xsalsa20_poly1305_lite"],
        "heartbeat_interval": 1
    }
}

heartbeat_interval here is an erroneous field and should be ignored. The correct heartbeat_interval value comes from the Hello payload.
 */
