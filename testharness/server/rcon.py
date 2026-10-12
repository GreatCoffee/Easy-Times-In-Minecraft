#!/usr/bin/env python
# ETIM test harness: minimal RCON console client.
# Framing per RConThreadClient一手 (1.12.2): 4-byte LE length = bytes AFTER
# the length field (id+type+body+two NULs); response packets read the same.
# Usage: python rcon.py "list"
import socket, struct, sys

HOST = "127.0.0.1"
PORT = 25575
PASS = "etim27"
AUTH, EXEC = 3, 2


def packet(p_id, p_type, body):
    payload = struct.pack("<ii", p_id, p_type) + body.encode("utf-8") + b"\x00\x00"
    return struct.pack("<i", len(payload)) + payload


def read_packet(sock):
    raw = sock.recv(4)
    if len(raw) < 4:
        raise EOFError("eof at length")
    (size,) = struct.unpack("<i", raw)
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise EOFError("eof in packet")
        data += chunk
    p_id, p_type = struct.unpack("<ii", data[:8])
    return p_id, p_type, data[8:-2].decode("utf-8", "replace")


def main():
    cmd = " ".join(sys.argv[1:]) or "list"
    sock = socket.create_connection((HOST, PORT), timeout=10)
    sock.sendall(packet(1, AUTH, PASS))
    authed = False
    while not authed:
        p_id, p_type, _ = read_packet(sock)
        if p_type == AUTH:
            authed = p_id != -1  # -1 = the login-failed reply
    if not authed:
        print("auth failed")
        sys.exit(2)
    sock.sendall(packet(9, EXEC, cmd))
    _, _, payload = read_packet(sock)
    out = payload.strip()
    print(out if out else "(no output)")
    sock.close()


if __name__ == "__main__":
    main()
