# pi-nvim

Neovim plugin for sending file references to [pi](https://github.com/badlogic/pi-mono), a coding agent.

Press a keybinding in Neovim and the file path + line number appears instantly in your pi conversation.

## How it works

Each nvim instance has a unique server socket (e.g. `/tmp/nvim.abc123/0`). The plugin writes references to a per-instance bridge file under `/tmp/pi-nvim/`. Run `/ide` in a pi instance to pair it with that nvim — multiple pi+nvim pairs can coexist independently.

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

## Usage

After installing both sides, connect a pi instance to nvim:

```
/ide
```

That's it. Pi will auto-detect the nvim socket from `$NVIM` (set automatically when pi runs inside a nvim terminal buffer). If pi is running outside nvim, pass the socket path explicitly:

```
/ide /tmp/nvim.abc123/0
```

Run `:echo v:servername` in nvim to find the socket path.

### Multiple instances

Each nvim instance gets its own bridge file. Open two nvim instances, run `/ide` in a different pi instance for each — they work completely independently.

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
  keys = {
    send_line = "<leader>pl",  -- set to false to disable
    send_file = "<leader>pf",
    send_selection = "<leader>ps",
  },
  notify = true,  -- show a notification when sending
})
```

## License

MIT
