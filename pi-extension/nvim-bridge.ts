/**
 * Pi extension: Neovim bridge
 *
 * Receives file references from the pi-nvim Neovim plugin and injects them
 * into the conversation. Install by copying or symlinking to:
 *   ~/.pi/agent/extensions/nvim-bridge.ts
 *
 * Usage:
 *   Run `/ide` in a pi instance to pair it with the nvim instance that
 *   launched the terminal. Each nvim instance gets its own bridge file,
 *   so multiple pi+nvim pairs can coexist independently.
 *
 * See https://github.com/felix-d/pi-nvim for the Neovim side.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const BRIDGE_DIR = "/tmp/pi-nvim";

function nvimSocketToBridgeFile(nvimSocket: string): string {
  // Replace slashes so it's a flat filename: /tmp/nvim.abc/0 → nvim.abc%0
  const escaped = nvimSocket.replace(/\//g, "%");
  return path.join(BRIDGE_DIR, escaped);
}

export default function (pi: ExtensionAPI) {
  let watcher: fs.FSWatcher | null = null;
  let myBridgeFile: string | null = null;

  function startWatching(bridgeFile: string, ctx: any) {
    if (watcher) return; // already watching
    watcher = fs.watch(bridgeFile, () => {
      try {
        const content = fs.readFileSync(bridgeFile, "utf-8").trim();
        if (!content) return;

        pi.sendMessage(
          {
            customType: "nvim-ref",
            content: `User referenced from editor: ${content}`,
            display: true,
          },
          { triggerTurn: false },
        );

        if (ctx.hasUI) {
          ctx.ui.notify(`Received: ${content}`, "info");
        }

        fs.writeFileSync(bridgeFile, "");
      } catch {}
    });
  }

  pi.on("session_start", async (_event, ctx) => {
    // If pi is running inside a nvim terminal, $NVIM is set automatically.
    // Check if this instance is already paired (e.g. after /reload).
    const nvimSocket = process.env.NVIM;
    if (nvimSocket) {
      const bridgeFile = nvimSocketToBridgeFile(nvimSocket);
      if (fs.existsSync(bridgeFile)) {
        myBridgeFile = bridgeFile;
        startWatching(bridgeFile, ctx);
        if (ctx.hasUI) {
          ctx.ui.notify("Neovim bridge active (restored)", "info");
        }
      }
    }
  });

  pi.registerCommand("ide", {
    description: "Connect this pi instance to the current nvim instance",
    handler: async (args, ctx) => {
      // Use explicit socket path from args, or auto-detect from $NVIM env var
      const nvimSocket = args?.trim() || process.env.NVIM;

      if (!nvimSocket) {
        ctx.ui.notify(
          "No nvim socket found. Run pi from inside a nvim terminal, or pass the socket path: /ide /tmp/nvim.xxx/0",
          "error",
        );
        return;
      }

      fs.mkdirSync(BRIDGE_DIR, { recursive: true });

      const bridgeFile = nvimSocketToBridgeFile(nvimSocket);

      // Clean up previous pairing if we were already connected to a different nvim
      if (myBridgeFile && myBridgeFile !== bridgeFile) {
        watcher?.close();
        watcher = null;
        try { fs.unlinkSync(myBridgeFile); } catch {}
      }

      fs.writeFileSync(bridgeFile, "");
      myBridgeFile = bridgeFile;

      startWatching(bridgeFile, ctx);
      ctx.ui.notify(`IDE connected: ${nvimSocket}`, "success");
    },
  });

  pi.on("session_shutdown", async () => {
    watcher?.close();
    if (myBridgeFile) {
      try { fs.unlinkSync(myBridgeFile); } catch {}
    }
  });
}
