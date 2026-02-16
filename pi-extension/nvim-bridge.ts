/**
 * Pi extension: Neovim bridge
 *
 * Receives file references from the pi-nvim Neovim plugin and injects them
 * into the conversation. Install by copying or symlinking to:
 *   ~/.pi/agent/extensions/nvim-bridge.ts
 *
 * See https://github.com/felix-d/pi-nvim for the Neovim side.
 */
import * as fs from "node:fs";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const TRIGGER_FILE = `/tmp/pi-nvim-bridge-${process.pid}.txt`;
const TRIGGER_LINK = "/tmp/pi-nvim-bridge.txt";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    fs.writeFileSync(TRIGGER_FILE, "");
    try {
      fs.unlinkSync(TRIGGER_LINK);
    } catch {}
    fs.symlinkSync(TRIGGER_FILE, TRIGGER_LINK);

    const watcher = fs.watch(TRIGGER_FILE, () => {
      try {
        const content = fs.readFileSync(TRIGGER_FILE, "utf-8").trim();
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

        fs.writeFileSync(TRIGGER_FILE, "");
      } catch {}
    });

    pi.on("session_shutdown", async () => {
      watcher.close();
      try { fs.unlinkSync(TRIGGER_FILE); } catch {}
      try { fs.unlinkSync(TRIGGER_LINK); } catch {}
    });

    if (ctx.hasUI) {
      ctx.ui.notify("Neovim bridge active", "info");
    }
  });
}
