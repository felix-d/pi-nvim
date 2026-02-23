/**
 * Pi extension: Neovim bridge
 *
 * Receives file references from the pi-nvim Neovim plugin and injects them
 * into the conversation. Install by copying or symlinking to:
 *   ~/.pi/agent/extensions/nvim-bridge.ts
 *
 * Usage:
 *   Run `/ide` in a pi instance — it will list all running nvim instances
 *   and let you pick one. Each nvim instance gets its own bridge file,
 *   so multiple pi+nvim pairs can coexist independently.
 *
 * See https://github.com/felix-d/pi-nvim for the Neovim side.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const BRIDGE_DIR = "/tmp/pi-nvim";

function nvimSocketToBridgeFile(nvimSocket: string): string {
  const escaped = nvimSocket.replace(/\//g, "%");
  return path.join(BRIDGE_DIR, escaped);
}

/** Find all running nvim server sockets on this machine. */
function findNvimSockets(): string[] {
  const sockets: string[] = [];

  // macOS: $TMPDIR/nvim.<username>/<rand>/nvim.<pid>.0
  // Linux: /tmp/nvim<username>/random/nvim.<pid>.0  or  /run/user/<uid>/nvim.*
  const searchRoots = [
    path.join(os.tmpdir(), `nvim.${os.userInfo().username}`),
    `/tmp/nvim${os.userInfo().username}`,
    `/run/user/${process.getuid?.() ?? 1000}`,
  ];

  for (const root of searchRoots) {
    if (!fs.existsSync(root)) continue;
    try {
      for (const entry of fs.readdirSync(root)) {
        const subdir = path.join(root, entry);
        try {
          for (const file of fs.readdirSync(subdir)) {
            const socketPath = path.join(subdir, file);
            const stat = fs.statSync(socketPath);
            if (stat.isSocket()) sockets.push(socketPath);
          }
        } catch {}
      }
    } catch {}
  }

  return sockets;
}

export default function (pi: ExtensionAPI) {
  let watcher: fs.FSWatcher | null = null;
  let myBridgeFile: string | null = null;

  function startWatching(bridgeFile: string, ctx: any) {
    if (watcher) return;
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

        if (ctx.hasUI) ctx.ui.notify(`Received: ${content}`, "info");

        fs.writeFileSync(bridgeFile, "");
      } catch {}
    });
  }

  function pair(nvimSocket: string, ctx: any) {
    fs.mkdirSync(BRIDGE_DIR, { recursive: true });

    const bridgeFile = nvimSocketToBridgeFile(nvimSocket);

    // Clean up previous pairing if switching to a different nvim
    if (myBridgeFile && myBridgeFile !== bridgeFile) {
      watcher?.close();
      watcher = null;
      try { fs.unlinkSync(myBridgeFile); } catch {}
    }

    fs.writeFileSync(bridgeFile, "");
    myBridgeFile = bridgeFile;
    startWatching(bridgeFile, ctx);
  }

  pi.on("session_start", async (_event, ctx) => {
    // Restore pairing after /reload if $NVIM is set (pi running inside nvim terminal)
    const nvimSocket = process.env.NVIM;
    if (nvimSocket) {
      const bridgeFile = nvimSocketToBridgeFile(nvimSocket);
      if (fs.existsSync(bridgeFile)) {
        myBridgeFile = bridgeFile;
        startWatching(bridgeFile, ctx);
        if (ctx.hasUI) ctx.ui.notify("Neovim bridge active (restored)", "info");
      }
    }
  });

  pi.registerCommand("ide", {
    description: "Connect this pi instance to a running nvim instance",
    handler: async (args, ctx) => {
      // If an explicit socket path was passed, use it directly
      if (args?.trim()) {
        pair(args.trim(), ctx);
        ctx.ui.notify(`IDE connected: ${args.trim()}`, "success");
        return;
      }

      // Auto-detect if running inside nvim terminal
      if (process.env.NVIM) {
        pair(process.env.NVIM, ctx);
        ctx.ui.notify(`IDE connected: ${process.env.NVIM}`, "success");
        return;
      }

      // Enumerate all running nvim sockets and let the user pick
      const sockets = findNvimSockets();

      if (sockets.length === 0) {
        ctx.ui.notify("No running nvim instances found.", "error");
        return;
      }

      if (sockets.length === 1) {
        pair(sockets[0], ctx);
        ctx.ui.notify(`IDE connected: ${sockets[0]}`, "success");
        return;
      }

      const chosen = await ctx.ui.select("Connect to nvim instance:", sockets);
      if (!chosen) return; // user cancelled

      pair(chosen, ctx);
      ctx.ui.notify(`IDE connected: ${chosen}`, "success");
    },
  });

  pi.on("session_shutdown", async () => {
    watcher?.close();
    if (myBridgeFile) {
      try { fs.unlinkSync(myBridgeFile); } catch {}
    }
  });
}
