# pi-nvim

Neovim plugin for sending file references to [pi](https://github.com/badlogic/pi-mono), a coding agent.

Press a keybinding in Neovim and the file path + line number appears instantly in your pi conversation.

## How it works

The plugin writes file references to a bridge file (`/tmp/pi-nvim-bridge.txt`). A pi extension watches this file and injects the references into the active conversation.

Both sides are needed:
1. **Neovim plugin** — sends file paths on keybinding press
2. **Pi extension** — receives them and injects into the conversation

## Installation

### Pi extension

```bash
pi install https://github.com/felix-d/pi-nvim
```

Then run `/reload` in pi or restart it.

### Neovim plugin

With [lazy.nvim](https://github.com/folke/lazy.nvim):

```lua
{
  "felix-d/pi-nvim",
  config = true,
  keys = {
    { "<leader>pl", function() require("pi-nvim").send_line() end, desc = "Pi: send file:line" },
    { "<leader>pf", function() require("pi-nvim").send_file() end, desc = "Pi: send file" },
    { "<leader>ps", function() require("pi-nvim").send_selection() end, mode = "v", desc = "Pi: send selection" },
  },
}
```

Or with default keybindings:

```lua
{
  "felix-d/pi-nvim",
  opts = {},
}
```

## Default keybindings

| Mode | Key | Action |
|------|-----|--------|
| Normal | `<leader>pl` | Send `file:line` (current cursor position) |
| Normal | `<leader>pf` | Send file path |
| Visual | `<leader>ps` | Send `file:start-end` (selected line range) |

## Commands

- `:PiSendLine` — send current file:line
- `:PiSendFile` — send current file path
- `:PiSendSelection` — send visual selection range

## Configuration

```lua
require("pi-nvim").setup({
  -- Path to the bridge file (must match the pi extension)
  bridge_file = "/tmp/pi-nvim-bridge.txt",

  -- Keybindings (set to false to disable)
  keys = {
    send_line = "<leader>pl",
    send_file = "<leader>pf",
    send_selection = "<leader>ps",
  },

  -- Show notifications when sending
  notify = true,
})
```

## License

MIT
