# dsh-voice-input-shortcut

为 DSH（DeepSeek Harness）网页端的语音输入按钮增加键盘快捷键。

## 功能

- 默认快捷键 **⌘⌥V**（macOS Web）/ **Ctrl+Alt+V**（Windows Web）
- 空闲状态按下：触发输入框的麦克风按钮（开始录音；未安装模型时打开引导对话框）
- 录音中再次按下：点击"停止并识别"，转录文字进入草稿
- 识别/请求进行中按下：提示忙碌，不打断流程
- 命令注册进官方快捷键目录，可在 `Mod+/` 打开的"快捷键"设置中查看与改键

要求：DSH ≥ 0.2.0-rc.2，且语音输入插件（voice-input-bundle）已启用。

## 实现说明

- 客户端插件（`dsh.client.platform: web`），通过 `ctx.shortcuts.register()`
  注册可编辑命令 `voice.input.toggle`，默认绑定 `primary+alt+V`（web:macos / web:windows）。
- 触发方式为查找并点击语音输入插件的 DOM 按钮：
  - 录音工具栏根节点带稳定的 `data-voice-activity` 属性（值为当前阶段）；
  - 麦克风按钮通过 `ctx.locale.bind("voice-input")` 取得的当前语言 aria-label
    精确定位，并附带 zh/en 硬编码兜底。
- 宿主侧入口（`lib/index.js`）为空标记，与官方语音输入插件做法一致。
