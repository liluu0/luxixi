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

- 未经用户明确要求，不创建或切换分支，不提交，不推送远程。
- 不覆盖、回退或删除工作区中已有的用户改动。
