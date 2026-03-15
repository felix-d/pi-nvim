local M = {}

M.config = {
  keys = {
    send_line = "<leader>pl",
    send_file = "<leader>pf",
    send_selection = "<leader>ps",
  },
  notify = true,
}

-- Returns the bridge file path for this nvim instance.
-- The pi extension keys bridge files by nvim server socket, with slashes
-- replaced by '%' so it's a flat filename under /tmp/pi-nvim/.
local function bridge_file()
  local socket = vim.fn.serverlist()[1] or ""
  if socket == "" then
    return nil, "nvim server socket not available"
  end
  local escaped = socket:gsub("/", "%%")
  return "/tmp/pi-nvim/" .. escaped, nil
end

local function send(content)
  local file, err = bridge_file()
  if not file then
    vim.notify("pi-nvim: " .. err, vim.log.levels.ERROR)
    return
  end

  -- Check the bridge dir exists (created by pi when /ide is run)
  if vim.fn.isdirectory("/tmp/pi-nvim") == 0 then
    vim.notify("pi-nvim: no pi instance connected. Run /ide in pi first.", vim.log.levels.WARN)
    return
  end

  vim.fn.writefile({ content }, file)

  if M.config.notify then
    vim.api.nvim_echo({ { "Sent to pi: " .. content, "Comment" } }, false, {})
  end
end

function M.send_line()
  send(vim.fn.expand("%:p") .. ":" .. vim.fn.line("."))
end

function M.send_file()
  send(vim.fn.expand("%:p"))
end

function M.send_selection()
  local file = vim.fn.expand("%:p")
  local start_line = vim.fn.line("v")
  local end_line = vim.fn.line(".")
  if start_line > end_line then
    start_line, end_line = end_line, start_line
  end
  send(file .. ":" .. start_line .. "-" .. end_line)
end

function M.setup(opts)
  M.config = vim.tbl_deep_extend("force", M.config, opts or {})

  local keys = M.config.keys

  if keys.send_line then
    vim.keymap.set("n", keys.send_line, M.send_line, { desc = "Pi: send file:line" })
  end

  if keys.send_file then
    vim.keymap.set("n", keys.send_file, M.send_file, { desc = "Pi: send file" })
  end

  if keys.send_selection then
    vim.keymap.set("v", keys.send_selection, M.send_selection, { desc = "Pi: send selection range" })
  end

  vim.api.nvim_create_user_command("PiSendLine", M.send_line, { desc = "Send current file:line to pi" })
  vim.api.nvim_create_user_command("PiSendFile", M.send_file, { desc = "Send current file path to pi" })
  vim.api.nvim_create_user_command("PiSendSelection", M.send_selection, { range = true, desc = "Send selection range to pi" })
end

return M
