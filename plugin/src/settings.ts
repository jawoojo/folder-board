// [ID 6.4] Folder Board 플러그인 설정 탭
// -> 레이아웃(2/3/4열 · 세로 · 가로 · 여러줄), 정렬, 열기 방식, 경계 이동 정책, 영속 상태 초기화를 관리함.
import { App, PluginSettingTab, Setting } from "obsidian";
import type FolderBoardPlugin from "./main";
import { renderShortcutsGrid } from "./shortcuts";
import type { LayoutColumns, OpenBehavior, SortMode, VerticalEdgeBehavior } from "./types";

export class FolderBoardSettingTab extends PluginSettingTab {
  private plugin: FolderBoardPlugin;

  constructor(app: App, plugin: FolderBoardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // [ID 6.4.2] 커맨드 팔레트(Cmd+P) 사용자 지정 검색 별칭 (한영 전환 없이 즉시 호출)
    new Setting(containerEl)
      .setName("커맨드 팔레트(⌘P) 열기 별칭")
      .setDesc("⌘P에서 한영 전환 없이 바로 찾을 문구를 입력하세요 (예: 폴더 보드 열기, 보드). 변경 즉시 반영됩니다.")
      .addText((text) =>
        text
          .setPlaceholder("폴더 보드 열기")
          .setValue(this.plugin.settings.openCommandAlias)
          .onChange(async (value) => {
            this.plugin.settings.openCommandAlias = value;
            this.plugin.syncCommandNames();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("기본 레이아웃")
      .addDropdown((dd) =>
        dd
          .addOption("flow", "여러줄 모드 (섹션 분류 · 기본)")
          .addOption("2", "2열 그리드")
          .addOption("3", "3열 그리드")
          .addOption("4", "4열 그리드")
          .addOption("auto", "세로 모드 (넓이 자동 맞춤)")
          .addOption("scroll", "가로 모드 (세로 펼침 · 가로 스크롤)")
          .setValue(String(this.plugin.settings.gridCols))
          .onChange(async (value) => {
            this.plugin.settings.gridCols = (
              value === "scroll" || value === "auto" || value === "flow" ? value : Number(value)
            ) as LayoutColumns;
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
      .setName("카드 상하 끝에서 ↑/↓ 동작")
      .setDesc("적응형: 가로 모드는 카드 내부 순환, 2D 그리드·세로·여러줄 모드는 위/아래 섹션으로 연결")
      .addDropdown((dd) =>
        dd
          .addOption("adaptive", "모드 적응형 (추천)")
          .addOption("loop", "항상 카드 내부 순환")
          .setValue(this.plugin.settings.verticalEdgeBehavior)
          .onChange(async (value) => {
            this.plugin.settings.verticalEdgeBehavior = value as VerticalEdgeBehavior;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("사용자 지정 폴더 순서 초기화")
      .addButton((btn) =>
        btn.setButtonText("초기화").onClick(async () => {
          this.plugin.settings.folderOrder = {};
          await this.plugin.saveSettings();
          this.plugin.refreshOpenViews();
        })
      );

    new Setting(containerEl)
      .setName("기억된 폴더 펼침 상태 초기화")
      .addButton((btn) =>
        btn.setButtonText("초기화").onClick(async () => {
          await this.plugin.resetAllExpandedStates();
          this.plugin.refreshOpenViews();
        })
      );

    // [ID 6.4.1] 설정 탭 하단 단축키 치트시트
    new Setting(containerEl).setName("단축키 안내").setHeading();
    const shortcutWrap = containerEl.createDiv({ cls: "fb-settings-shortcuts" });
    renderShortcutsGrid(shortcutWrap);
  }
}
