// [ID 6.4] Folder Board 플러그인 설정 탭 (한/영 i18n 즉시 전환 지원)
// -> 언어, 커맨드 별칭, 레이아웃(Flow/Vertical/Horizontal), 정렬, 열기 방식, 탭 고정, 좌측 패널 자동 접기, 단축키 안내를 관리함.
import { App, PluginSettingTab, Setting } from "obsidian";
import { i18n } from "./i18n";
import type FolderBoardPlugin from "./main";
import { renderShortcutsGrid } from "./shortcuts";
import type { LanguageMode, LayoutColumns, OpenBehavior, SortMode, VerticalEdgeBehavior } from "./types";

export class FolderBoardSettingTab extends PluginSettingTab {
  private plugin: FolderBoardPlugin;

  constructor(app: App, plugin: FolderBoardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // [ID 6.4.5] 언어 선택 (자동 = 옵시디언 한국어 시 한국어, 그 외 영어 / 수동 강제 선택 가능)
    new Setting(containerEl)
      .setName(i18n.settingLanguageName())
      .setDesc(i18n.settingLanguageDesc())
      .addDropdown((dd) =>
        dd
          .addOption("auto", i18n.settingLanguageAuto())
          .addOption("en", i18n.settingLanguageEn())
          .addOption("ko", i18n.settingLanguageKo())
          .setValue(this.plugin.settings.languageMode)
          .onChange(async (value) => {
            await this.plugin.setLanguageModeSetting(value as LanguageMode);
            this.display();
          })
      );

    // [ID 6.4.2] 커맨드 팔레트(Cmd+P) 사용자 지정 검색 별칭 (한영 전환 없이 즉시 호출)
    new Setting(containerEl)
      .setName(i18n.settingCmdAliasName())
      .setDesc(i18n.settingCmdAliasDesc())
      .addText((text) =>
        text
          .setPlaceholder(i18n.settingCmdAliasPlaceholder())
          .setValue(this.plugin.settings.openCommandAlias)
          .onChange(async (value) => {
            this.plugin.settings.openCommandAlias = value;
            this.plugin.syncCommandNames();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(i18n.settingLayoutName())
      .setDesc(i18n.settingLayoutDesc())
      .addDropdown((dd) =>
        dd
          .addOption("flow", i18n.settingLayoutFlow())
          .addOption("vertical", i18n.settingLayoutVertical())
          .addOption("horizontal", i18n.settingLayoutHorizontal())
          .setValue(this.plugin.settings.gridCols)
          .onChange(async (value) => {
            this.plugin.settings.gridCols = value as LayoutColumns;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          })
      );

    new Setting(containerEl)
      .setName(i18n.settingSortName())
      .addDropdown((dd) =>
        dd
          .addOption("name", i18n.settingSortOptName())
          .addOption("mtime", i18n.settingSortOptMtime())
          .setValue(this.plugin.settings.sortBy)
          .onChange(async (value) => {
            this.plugin.settings.sortBy = value as SortMode;
            await this.plugin.saveSettings();
            this.plugin.refreshOpenViews();
          })
      );

    new Setting(containerEl)
      .setName(i18n.settingOpenBehaviorName())
      .addDropdown((dd) =>
        dd
          .addOption("same-tab", i18n.settingOpenSameTab())
          .addOption("new-tab", i18n.settingOpenNewTab())
          .setValue(this.plugin.settings.openBehavior)
          .onChange(async (value) => {
            this.plugin.settings.openBehavior = value as OpenBehavior;
            await this.plugin.saveSettings();
          })
      );

    // [ID 6.4.3] 폴더 보드 탭 자동 고정(Pin) 토글 -> 보드 상단 핀 버튼과 양방향 동기화
    new Setting(containerEl)
      .setName(i18n.settingAutoPinName())
      .setDesc(i18n.settingAutoPinDesc())
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoPinTab).onChange(async (value) => {
          this.plugin.settings.autoPinTab = value;
          await this.plugin.saveSettings();
          this.plugin.syncOpenBoardPinState(value);
        })
      );

    // [ID 6.4.4] Folder Board 활성 시 좌측 패널(기본 탐색기) 스마트 자동 접힘·복원 토글
    new Setting(containerEl)
      .setName(i18n.settingAutoCollapseName())
      .setDesc(i18n.settingAutoCollapseDesc())
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoCollapseLeftSidebar).onChange(async (value) => {
          await this.plugin.setAutoCollapseLeftSidebar(value);
        })
      );

    new Setting(containerEl)
      .setName(i18n.settingEdgeBehaviorName())
      .setDesc(i18n.settingEdgeBehaviorDesc())
      .addDropdown((dd) =>
        dd
          .addOption("adaptive", i18n.settingEdgeAdaptive())
          .addOption("loop", i18n.settingEdgeLoop())
          .setValue(this.plugin.settings.verticalEdgeBehavior)
          .onChange(async (value) => {
            this.plugin.settings.verticalEdgeBehavior = value as VerticalEdgeBehavior;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(i18n.settingResetOrderName())
      .setDesc(i18n.settingResetOrderDesc())
      .addButton((btn) =>
        btn.setButtonText(i18n.reset()).onClick(async () => {
          await this.plugin.resetAllFolderOrders();
          this.plugin.refreshOpenViews();
        })
      );

    new Setting(containerEl)
      .setName(i18n.settingResetExpandedName())
      .addButton((btn) =>
        btn.setButtonText(i18n.reset()).onClick(async () => {
          await this.plugin.resetAllExpandedStates();
          this.plugin.refreshOpenViews();
        })
      );

    // [ID 6.4.1] 설정 탭 하단 단축키 치트시트
    new Setting(containerEl).setName(i18n.settingShortcutsHeading()).setHeading();
    const shortcutWrap = containerEl.createDiv({ cls: "fb-settings-shortcuts" });
    renderShortcutsGrid(shortcutWrap);
  }
}
