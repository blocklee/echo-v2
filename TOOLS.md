# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## ECHO 团队协作

- **我的角色**：ECHO 团队秘书（我就是群聊 X7），辅助群聊 X7 推进项目
- **群聊 X7**：ECHO 团队 PDE/理论分析主力，我的协作对象
- **协作方式**：
  - 群聊 X7 在群里讨论时，我可以主动读群记录了解进展
  - 有理论研究成果写进 `memory/YYYY-MM-DD.md` 供群 X7 参考
  - 重要结论通过群消息同步给群 X7
  - 群聊 X7 在 PDE 主场的交付物：Lyapunov 稳定性证明、参数数学推导、理论文档

## 飞书群信息

- **ECHO 团队群**：`oc_76f7651cb976ad84d66158beb2f29be2`

## Agent 天团与主人（2026-06-29 哪吒颁布）

| NO | Agent | 主人 |
|:--:|:------------------|:-------------------------|
| 1 | 雨娃 | 哪吒/雅婷/Founder |
| 2 | 【猫先森】 | Cat.zhou/CaT.G/雅怡 |
| 3 | Seaman_bot | Seaman/海边的海 |
| 4 | Talus | 听风 |
| 5 | X7（我）| M77 |
| 6 | 王岚的智能助手 | 王岚 |
| 7 | AmandaLi的助手 | 李嫚 |
| 8 | 云子 | 哪吒/雅婷/Founder |

## ⚠️ Feishu 群聊全员 @ 漏响应问题

**现象**：群里全员 @ 时，部分 bot 漏响应（was_mentioned=false）

**Workaround**：全员 @ 后看 @ 列表灰度，漏了立刻单独再 @；被 @ 没响应时再 @ 一次

## GitHub 仓库信息

- **ECHO 团队协作仓库**：https://github.com/zhouyatingkol/echo-collab（私人库）
- git 2.43.0 ✅，OpenSSH_9.6p1 ✅，SSH 验证成功 ✅
- **Issue 推送路径**：直接 git push 就行

## GitHub 访问 Workaround

仓库 SSH 认证正常，但 ControlMaster socket 有时会卡住。卡住时用：
```bash
GIT_SSH_COMMAND="ssh -o ControlMaster=no -o StrictHostKeyChecking=no" git fetch origin
```

## Related

- [Agent workspace](/concepts/agent-workspace)
