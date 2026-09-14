# 项目开发说明

## Node/npm 权限问题

如果 Codex 执行 `npm` 或 `npm run build` 报错：

`EPERM: operation not permitted, lstat 'C:\\Users\\1'`

不要执行 `takeown` 或递归修改 `C:\\Users\\1` 的权限。

普通 PowerShell 已验证本机 Node/npm 正常。请改用项目本地 Vite：

```powershell
.\\node_modules\\.bin\\vite.cmd
.\\node_modules\\.bin\\vite.cmd build
```

验证命令：

```powershell
cd D:\\myProject\\web\\luxixi
.\\node_modules\\.bin\\vite.cmd build
```

该问题通常是 Codex 沙箱限制，不是项目代码或 Windows NTFS 权限问题。

## Git 规则

- 每个会话开始代码开发前，自动确认当前 worktree 已与其他会话隔离：优先使用当前独立 worktree，并创建或切换到以 `codex/` 开头的本地开发分支。完成隔离后直接继续开发，不需要再次向用户确认。
- 只有在用户明确要求时才提交或推送远程；未经明确要求，不合并其他分支。
- 每次提交和推送使用中文说明，包括 Git 提交信息、合并提交信息及推送交付说明；代码标识符和专有名称可以保留原文。
- 不覆盖、回退或删除工作区中已有的用户改动。
