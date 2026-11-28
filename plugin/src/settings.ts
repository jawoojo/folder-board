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
      .setDesc("Flow(연속 다단), Vertical(세로 스크롤), Horizontal(가로 스크롤). Vertical·Horizontal은 카드 경계 드래그로 가로·세로 분할을 자유 조절합니다.")
      .addDropdown((dd) =>
        dd
          .addOption("flow", "Flow 모드 (연속 다단 · 기본)")
          .addOption("vertical", "Vertical 모드 (세로 스크롤)")
          .addOption("horizontal", "Horizontal 모드 (가로 스크롤)")
          .setValue(this.plugin.settings.gridCols)
          .onChange(async (value) => {
            this.plugin.settings.gridCols = value as LayoutColumns;
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

    // [ID 6.4.3] 폴더 보드 탭 자동 고정(Pin) 토글 -> 보드 상단 핀 버튼과 양방향 동기화
    new Setting(containerEl)
      .setName("폴더 보드 탭 자동 고정 (Pin)")
      .setDesc(
        "폴더 보드 탭을 고정해 두어 탐색기나 보드에서 노트를 열어도 보드가 사라지지 않고 옆 탭에서 열리게 합니다. (보드 상단 핀 버튼으로도 즉시 토글 가능)"
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoPinTab).onChange(async (value) => {
          this.plugin.settings.autoPinTab = value;
          await this.plugin.saveSettings();
          this.plugin.syncOpenBoardPinState(value);
        })
      );

    // [ID 6.4.4] Folder Board 활성 시 좌측 패널(기본 탐색기) 스마트 자동 접힘·복원 토글
    new Setting(containerEl)
      .setName("폴더 보드에서 좌측 패널 자동 접기")
      .setDesc(
        "폴더 보드를 볼 때 좌측 탐색기 패널을 자동으로 접어 화면을 넓히고, 다른 노트로 이동하면 다시 펼칩니다. (수동으로 접어둔 상태 및 Space 분할 편집 중에는 유지)"
      )
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoCollapseLeftSidebar).onChange(async (value) => {
          await this.plugin.setAutoCollapseLeftSidebar(value);
        })
      );

    new Setting(containerEl)
      .setName("카드 상하 끝에서 ↑/↓ 동작")
      .setDesc("적응형: 같은 열의 위/아래 카드·섹션으로 자연스럽게 연결 / 순환: 항상 현재 카드 내부 순환")
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
      .setDesc("Flow · Vertical · Horizontal 모든 모드에 저장된 카드 순서를 기본 이름순으로 되돌립니다.")
      .addButton((btn) =>
        btn.setButtonText("초기화").onClick(async () => {
          await this.plugin.resetAllFolderOrders();
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
