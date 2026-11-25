// [ID 6.4] Folder Board 플러그인 설정 탭
// -> 열 개수, 정렬 기준, 노트 열기 방식, 영속 폴더 펼침 초기화를 제공함.
import { App, PluginSettingTab, Setting } from "obsidian";
import type FolderBoardPlugin from "./main";
import type { OpenBehavior, SortMode } from "./types";

export class FolderBoardSettingTab extends PluginSettingTab {
  private plugin: FolderBoardPlugin;

  constructor(app: App, plugin: FolderBoardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("기본 열 개수")
      .addDropdown((dd) =>
        dd
          .addOption("2", "2열")
          .addOption("3", "3열")
          .addOption("4", "4열")
          .setValue(String(this.plugin.settings.gridCols))
          .onChange(async (value) => {
            this.plugin.settings.gridCols = Number(value) as 2 | 3 | 4;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          })
      );

    new Setting(containerEl)
      .setName("기본 정렬")
      .addDropdown((dd) =>
        dd
          .addOption("name", "이름순")
          .addOption("mtime", "최근 수정순")
          .setValue(this.plugin.settings.sortBy)
          .onChange(async (value) => {
            this.plugin.settings.sortBy = value as SortMode;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          })
      );

    new Setting(containerEl)
      .setName("노트 열기 방식")
      .addDropdown((dd) =>
        dd
          .addOption("same-tab", "현재 탭에서 열기")
          .addOption("new-tab", "새 탭에서 열기")
          .setValue(this.plugin.settings.openBehavior)
          .onChange(async (value) => {
            this.plugin.settings.openBehavior = value as OpenBehavior;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("기억된 폴더 펼침 상태 초기화")
      .addButton((btn) =>
        btn.setButtonText("초기화").onClick(async () => {
          this.plugin.settings.expandedFolders = [];
          await this.plugin.saveSettings();
          this.plugin.refreshOpenViews();
        })
      );
  }
}
