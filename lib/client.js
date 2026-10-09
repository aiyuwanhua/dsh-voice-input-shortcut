window.__ModuleLoader__.load({
  id: "dsh-voice-input-shortcut",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    /** Locale namespace owned by this plugin. */
    const NS = "voice-input-shortcut";
    /** Locale namespace owned by the voice input plugin (aria-label source). */
    const VOICE_NS = "voice-input";

    /** Chinese dictionary; keys are the source of truth. */
    const zh = {
      label: "切换语音输入",
      busy: "语音输入正在进行中",
      locked: "语音输入当前不可用",
      unavailable: "未找到语音输入按钮，请确认语音输入插件已启用",
    };

    /** English dictionary with the same complete key set. */
    const en = {
      label: "Toggle voice input",
      busy: "Voice input is already running",
      locked: "Voice input is not available right now",
      unavailable: "Voice input button not found; check that the voice input plugin is enabled",
    };

    /*
     * Hardcoded fallback aria-labels of the voice input buttons (zh/en), used
     * only when the voice input dictionaries are not resolvable through the
     * locale service. The product ships exactly zh and en dictionaries.
     */
    const FALLBACK_TRIGGER_LABELS = [
      "开始录音",
      "打开语音输入引导",
      "Start recording",
      "Open voice input setup",
    ];
    const FALLBACK_STOP_LABELS = ["停止并识别", "Stop and transcribe"];

    /** Client services required by this plugin. */
    const inject = ["shortcuts", "locale"];

    /** A button that exists, is visible, and accepts clicks. */
    function isClickable(button) {
      return !button.disabled && button.getClientRects().length > 0;
    }

    /** Find the first visible enabled button carrying one of the labels. */
    function findButtonByLabels(labels) {
      const buttons = document.querySelectorAll("button[aria-label]");
      for (const button of buttons) {
        if (labels.includes(button.getAttribute("aria-label")) && isClickable(button)) {
          return button;
        }
      }
      return null;
    }

    /*
     * Find the stop button inside the open capture row. Primary lookup uses
     * aria-labels; the structural fallback takes the last clickable button of
     * the row, which is Stop (Cancel renders first).
     */
    function findStopButton(row, labels) {
      const buttons = Array.from(row.querySelectorAll("button"));
      const byLabel = buttons.find(
        (button) => labels.includes(button.getAttribute("aria-label")) && isClickable(button)
      );
      if (byLabel !== undefined) return byLabel;
      const clickable = buttons.filter(isClickable);
      return clickable.length > 0 ? clickable[clickable.length - 1] : null;
    }

    /** Localized trigger labels: voice plugin dictionary first, fallbacks after. */
    function triggerLabels(voiceT) {
      let live = [];
      try {
        live = [voiceT("start"), voiceT("setupPrompt.trigger")];
      } catch {
        // Namespace unavailable; keep hardcoded labels only.
      }
      return Array.from(new Set([...live, ...FALLBACK_TRIGGER_LABELS]));
    }

    /** Localized stop labels: voice plugin dictionary first, fallbacks after. */
    function stopLabels(voiceT) {
      let live = [];
      try {
        live = [voiceT("stop")];
      } catch {
        // Namespace unavailable; keep hardcoded labels only.
      }
      return Array.from(new Set([...live, ...FALLBACK_STOP_LABELS]));
    }

    /**
     * Client plugin body: register one editable keyboard command that toggles
     * the voice input composer button — start recording when idle, stop and
     * transcribe while recording.
     * @param ctx - Client runtime owning the shortcuts and locale services.
     */
    function apply(ctx) {
      ctx.effect(() => {
        const disposeLocale = ctx.locale.register(NS, { zh, en });
        return disposeLocale;
      }, "voice-input-shortcut: locale");

      ctx.effect(() => {
        const t = ctx.locale.bind(NS);
        const voiceT = ctx.locale.bind(VOICE_NS);

        const disposeShortcut = ctx.shortcuts.register({
          id: "voice.input.toggle",
          label: () => t("label"),
          aliases: ["voice input", "dictate", "语音输入"],
          defaults: {
            "web:macos": {
              code: "KeyV",
              modifiers: ["primary", "alt"],
            },
            "web:windows": {
              code: "KeyV",
              modifiers: ["primary", "alt"],
            },
          },
          regions: ["page", "editable"],
          modals: [],
          resolve: () => {
            // The voice plugin marks its open capture row with a stable,
            // non-localized data attribute carrying the current phase.
            const row = document.querySelector("[data-voice-activity]");
            if (row !== null) {
              if (row.getAttribute("data-voice-activity") === "recording") {
                const stop = findStopButton(row, stopLabels(voiceT));
                if (stop !== null) {
                  return {
                    status: "handled",
                    run: () => {
                      stop.click();
                    },
                  };
                }
              }
              return { status: "blocked", reason: t("busy") };
            }

            // Idle: locate the microphone trigger by its localized labels.
            const trigger = findButtonByLabels(triggerLabels(voiceT));
            if (trigger === null) {
              return { status: "blocked", reason: t("unavailable") };
            }
            if (trigger.disabled) {
              return { status: "blocked", reason: t("locked") };
            }
            return {
              status: "handled",
              run: () => {
                trigger.click();
              },
            };
          },
        });

        return disposeShortcut;
      }, "voice-input-shortcut: shortcut");
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
