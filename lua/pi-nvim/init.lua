local M = {}

M.config = {
  bridge_file = "/tmp/pi-nvim-bridge.txt",
  keys = {
    send_line = "<leader>pl",
    send_file = "<leader>pf",
    send_selection = "<leader>ps",
  },
  notify = true,
}

local function send(content)
  vim.fn.writefile({ content }, M.config.bridge_file)
  if M.config.notify then
    vim.notify("Sent to pi: " .. content, vim.log.levels.INFO)
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
