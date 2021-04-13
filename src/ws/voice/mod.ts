/**
 * Once we retrieve a session_id, token, and endpoint information, we can connect and handshake with the voice server over another secure WebSocket. Unlike the gateway endpoint we receive in an HTTP Get Gateway request, the endpoint received from our Voice Server Update payload does not contain a URL protocol, so some libraries may require manually prepending it with "wss://" before connecting. Once connected to the voice WebSocket endpoint, we can send an Opcode 0 Identify payload with our server_id, user_id, session_id, and token:
 * 
 * {
  "op": 0,
  "d": {
    "server_id": "41771983423143937",
    "user_id": "104694319306248192",
    "session_id": "my_session_id",
    "token": "my_token"
  }
}

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
