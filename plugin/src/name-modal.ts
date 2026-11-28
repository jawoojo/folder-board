// [ID 6.3] 모던 미니멀 이름 입력 모달 (새 노트 / 새 폴더 / 이름 변경 공용)
// -> Electron 기반 옵시디언에서는 window.prompt()가 차단되므로 네이티브 Modal 기반의 경량 입력창을 제공함.
import { App, Modal } from "obsidian";
import { i18n } from "./i18n";

export interface NamePromptOptions {
  title: string;
  placeholder: string;
  destinationLabel?: string;
  initialValue?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
}

export class NamePromptModal extends Modal {
  private opts: NamePromptOptions;

  constructor(app: App, opts: NamePromptOptions) {
    super(app);
    this.opts = opts;
  }

  onOpen(): void {
    const { contentEl, modalEl } = this;
    modalEl.addClass("fb-prompt-modal");
    contentEl.empty();

    const header = contentEl.createDiv({ cls: "fb-prompt-header" });
    header.createDiv({ cls: "fb-prompt-title", text: this.opts.title });

    if (this.opts.destinationLabel) {
      header.createSpan({
        cls: "fb-prompt-dest",
        text: this.opts.destinationLabel
      });
    }

    const input = contentEl.createEl("input", {
      type: "text",
      cls: "fb-prompt-input",
      placeholder: this.opts.placeholder,
      value: this.opts.initialValue || ""
    });

    const footer = contentEl.createDiv({ cls: "fb-prompt-footer" });
    const cancelBtn = footer.createEl("button", { text: i18n.cancel() });
    const submitBtn = footer.createEl("button", {
      cls: "mod-cta",
      text: this.opts.confirmLabel || i18n.create()
    });

    const commit = async () => {
      const value = input.value.trim();
      if (!value) return;
      this.close();
      await this.opts.onSubmit(value);
    };

    cancelBtn.addEventListener("click", () => this.close());
    submitBtn.addEventListener("click", () => void commit());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        void commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });

    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
