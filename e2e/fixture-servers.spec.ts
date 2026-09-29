import { connect } from "node:net";
import { networkInterfaces } from "node:os";
import { expect, test } from "@playwright/test";

// Both fixture servers expose an unauthenticated API (reset, create, update):
// they must be reachable from this machine only.
const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find((iface) => iface && !iface.internal && iface.family === "IPv4")?.address;

/** Resolves "connected", or the error code the connection attempt failed with. */
function connectTo(host: string, port: number): Promise<string> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolve("connected");
    });
    socket.once("error", (error: NodeJS.ErrnoException) => resolve(error.code ?? error.message));
  });
}

for (const port of [3999, 3998]) {
  test(`fixture server on :${port} listens on loopback only`, async () => {
    expect(await connectTo("127.0.0.1", port)).toBe("connected");
    test.skip(!lanAddress, "no non-loopback IPv4 interface to probe");
    expect(await connectTo(lanAddress ?? "", port)).toBe("ECONNREFUSED");
  });
}
