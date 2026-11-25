// [ID 5.0] 메인 애플리케이션 렌더러 및 인터랙션 컨트롤러
// -> 좌측 네이티브 트리 탐색기, 마크다운 에디터, 2D 네이티브 미니 탐색기 그리드, Quick Look, 방향키 2D 탐색을 통합 제어함.
window.FB = window.FB || {};

(function initApp() {
  const { store, dnd } = window.FB;

  const dom = {
    body: document.body,
    modeBtns: document.querySelectorAll(".proto-mode-btn"),
    btnToggleBoard: document.getElementById("btn-toggle-board"),
    btnResetVault: document.getElementById("btn-reset-vault"),
    btnHelp: document.getElementById("btn-help"),
    helpModal: document.getElementById("help-modal"),
    btnCloseHelp: document.getElementById("btn-close-help"),

    ribbonExplorerBtn: document.getElementById("ribbon-explorer-btn"),
    ribbonBoardBtn: document.getElementById("ribbon-board-btn"),
    ribbonUndoBtn: document.getElementById("ribbon-undo-btn"),
    obsSidebar: document.getElementById("obs-sidebar"),
    sidebarOpenBoard: document.getElementById("sidebar-open-board"),
    sidebarTree: document.getElementById("sidebar-tree"),
    sidebarStats: document.getElementById("sidebar-stats"),

    editorPane: document.getElementById("obs-editor-pane"),
    peekClickBanner: document.getElementById("peek-click-banner"),
    editorPath: document.getElementById("editor-path"),
    editorMeta: document.getElementById("editor-meta"),
    editorDocument: document.getElementById("editor-document"),

    boardBackdrop: document.getElementById("board-backdrop"),
    boardShell: document.getElementById("board-shell"),
    btnGoUp: document.getElementById("btn-go-up"),
    boardBreadcrumb: document.getElementById("board-breadcrumb"),
    boardSearch: document.getElementById("board-search"),
    btnClearSearch: document.getElementById("btn-clear-search"),
    segBtns: document.querySelectorAll(".seg-btn"),
    boardSort: document.getElementById("board-sort"),
    btnNewNote: document.getElementById("btn-new-note"),
    btnNewFolder: document.getElementById("btn-new-folder"),
    btnQuickLookToggle: document.getElementById("btn-quicklook-toggle"),
    btnCloseBoard: document.getElementById("btn-close-board"),

    gridSectionTitle: document.getElementById("grid-section-title"),
    folderGrid: document.getElementById("folder-grid"),

    quicklookDrawer: document.getElementById("quicklook-drawer"),
    quicklookContent: document.getElementById("quicklook-content"),
    btnQlOpen: document.getElementById("btn-ql-open"),
    btnQlClose: document.getElementById("btn-ql-close"),

    shelfBar: document.getElementById("shelf-bar"),
    shelfCount: document.getElementById("shelf-count"),
    shelfItems: document.getElementById("shelf-items"),
    btnShelfDropHere: document.getElementById("btn-shelf-drop-here"),
    btnShelfClear: document.getElementById("btn-shelf-clear"),

    selectionBar: document.getElementById("selection-bar"),
    selectionLabel: document.getElementById("selection-label"),
    btnSelToShelf: document.getElementById("btn-sel-to-shelf"),
    btnSelClear: document.getElementById("btn-sel-clear"),

    toastContainer: document.getElementById("toast-container")
  };

  // [ID 5.6.1] 현재 렌더된 2D 카드 모델 캐시 -> 방향키(←/→/↑/↓)가 화면에 보이는 실제 순서 그대로 정확히 이동하도록 보장
  let renderedCards = [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // [ID 5.2] 경량 마크다운 렌더러
  // -> 외부 CDN/라이브러리 의존 없이 오프라인 file:// 환경에서도 옵시디언 노트(제목, 체크리스트, 인용구, 코드)를 자연스럽게 렌더링함.
  function renderMarkdown(mdText) {
    const lines = mdText.split("\n");
    let html = "";
    let inList = false;

    const formatInline = (s) =>
      escapeHtml(s)
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line.trim()) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        continue;
      }

      if (line.startsWith("### ")) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<h3>${formatInline(line.slice(4))}</h3>`;
      } else if (line.startsWith("## ")) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<h2>${formatInline(line.slice(3))}</h2>`;
      } else if (line.startsWith("> ")) {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<blockquote>${formatInline(line.slice(2))}</blockquote>`;
      } else if (/^- \[( |x)\] /.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        const checked = line[3] === "x" ? "checked" : "";
        html += `<li class="md-todo"><label><input type="checkbox" disabled ${checked} />${formatInline(line.slice(6))}</label></li>`;
      } else if (line.startsWith("- ")) {
        if (!inList) { html += "</ul>"; inList = true; }
        html += `<li>${formatInline(line.slice(2))}</li>`;
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += `<p>${formatInline(line)}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  function showToast(message, { undoable = false } = {}) {
    const toast = document.createElement("div");
    toast.className = "toast";
    const text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);

    if (undoable) {
      const btn = document.createElement("button");
      btn.className = "toast-undo";
      btn.textContent = "되돌리기";
      btn.addEventListener("click", () => {
        const res = store.undoLastAction();
        if (res) showToast(`${res.count}개 노트 이동을 되돌렸습니다.`);
        toast.remove();
      });
      toast.appendChild(btn);
    }

    dom.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3800);
  }

  // [ID 3.3.3] 카드 내부 네이티브 트리 아이템 평탄화 수집
  // -> 하위 폴더를 카드 안에서 ▸/▾로 펼쳤을 때, 펼쳐진 하위 노트까지 방향키(↑/↓)로 자연스럽게 순회할 수 있도록 평탄 리스트를 생성함.
  function collectCardTreeItems(folderId, depth, out, { includeSubfolders = true } = {}) {
    const s = store.state;
    const q = s.searchQuery.trim().toLowerCase();

    if (includeSubfolders) {
      const subFolders = store.getChildFolders(folderId);
      for (const sub of subFolders) {
        const subExpanded = q ? true : s.expandedCardFolders.has(sub.id);
        const childOut = [];
        if (subExpanded) {
          collectCardTreeItems(sub.id, depth + 1, childOut, { includeSubfolders: true });
        }
        const matchesName = !q || sub.name.toLowerCase().includes(q);
        if (!q || matchesName || childOut.length > 0) {
          out.push({
            type: "folder",
            key: `folder:${sub.id}`,
            id: sub.id,
            folder: sub,
            depth,
            expanded: subExpanded
          });
          if (subExpanded) {
            out.push(...childOut);
          }
        }
      }
    }

    const notes = store.getNotesInFolder(folderId);
    for (const note of notes) {
      out.push({
        type: "note",
        key: `note:${note.id}`,
        id: note.id,
        note,
        depth
      });
    }
  }

  // [ID 3.2] 2D 보드 카드 모델 구성 (첫 번째 카드 = 직속 노트, 이후 = 하위 폴더 미니 탐색기)
  // -> 직속 노트를 상단 별도 영역이 아닌 첫 번째 카드로 편입해 세로 공간 낭비를 없애고 키보드 좌우 이동 흐름을 통일함.
  function buildBoardCards() {
    const s = store.state;
    const q = s.searchQuery.trim().toLowerCase();
    const curFolder = store.getFolder(s.currentFolderId);
    const cards = [];

    // 1) 첫 번째 카드: 현재 경로의 직속 노트 전용 카드
    const directItems = [];
    collectCardTreeItems(s.currentFolderId, 0, directItems, { includeSubfolders: false });
    if (!q || directItems.length > 0) {
      cards.push({
        isRootCard: true,
        folderId: s.currentFolderId,
        title: curFolder ? `${curFolder.name} (직속)` : "Vault 직속 노트",
        icon: "📥",
        color: "#fbbf24",
        totalCount: store.state.notes.filter((n) => n.folderId === s.currentFolderId).length,
        items: directItems
      });
    }

    // 2) 나머지 카드: 현재 경로의 하위 폴더 각각이 독립 네이티브 탐색기 카드로 배치됨
    const childFolders = store.getChildFolders(s.currentFolderId);
    for (const folder of childFolders) {
      const items = [];
      collectCardTreeItems(folder.id, 0, items, { includeSubfolders: true });
      const matchesName = !q || folder.name.toLowerCase().includes(q);
      if (q && !matchesName && items.length === 0) continue;

      cards.push({
        isRootCard: false,
        folderId: folder.id,
        title: folder.name,
        icon: folder.icon || "📁",
        color: folder.color || "#dcddde",
        totalCount: store.countTotalNotesInSubtree(folder.id),
        items
      });
    }

    // 포커스 인덱스 경계 보정
    if (cards.length === 0) {
      s.focusedCardIndex = 0;
      s.focusedItemKey = null;
    } else {
      if (s.focusedCardIndex >= cards.length) s.focusedCardIndex = cards.length - 1;
      if (s.focusedCardIndex < 0) s.focusedCardIndex = 0;
    }

    renderedCards = cards;
    return cards;
  }

  function getFocusedNoteId() {
    const s = store.state;
    if (s.focusedItemKey && s.focusedItemKey.startsWith("note:")) {
      const id = s.focusedItemKey.slice(5);
      if (store.getNote(id)) return id;
    }
    return [...s.selectedNoteIds].slice(-1)[0] || s.activeNoteId;
  }

  function syncFocusScroll() {
    requestAnimationFrame(() => {
      const focusedRow = dom.folderGrid.querySelector(".tree-item-self.is-focused");
      if (focusedRow) {
        focusedRow.scrollIntoView({ block: "nearest", inline: "nearest" });
      } else {
        const focusedCard = dom.folderGrid.querySelector(".folder-card.focused-card");
        if (focusedCard) focusedCard.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }

  // [ID 5.6.2] 방향키 포커스 적용 헬퍼
  // -> 포커스된 아이템이 노트면 즉시 선택/미리보기(Quick Look·Peek·Split)를 동기화해 Space 한 번으로 훑어보는 감각을 극대화함.
  function focusCardItem(cardIdx, itemIndex) {
    const s = store.state;
    const card = renderedCards[cardIdx];
    if (!card) return;
    s.focusedCardIndex = cardIdx;

    if (card.items.length === 0) {
      s.focusedItemKey = null;
      store.notify();
      syncFocusScroll();
      return;
    }

    const safeIdx = Math.max(0, Math.min(itemIndex, card.items.length - 1));
    const item = card.items[safeIdx];
    s.focusedItemKey = item.key;

    if (item.type === "note") {
      s.selectedNoteIds = new Set([item.id]);
      if (s.mode === "peek" || s.mode === "split") {
        s.activeNoteId = item.id;
      }
    }
    store.notify();
    syncFocusScroll();
  }

  function navigateToFolder(folderId) {
    const s = store.state;
    s.currentFolderId = folderId || "";
    s.focusedCardIndex = 0;
    s.focusedItemKey = null;
    store.notify();
    // 진입 직후 첫 번째 카드의 첫 아이템에 포커스를 맞춰 바로 방향키 탐색 가능하게 유지
    if (renderedCards[0]?.items[0]) {
      focusCardItem(0, 0);
    }
  }

  // =========================================================
  // 렌더링 파트
  // =========================================================
  function renderLayoutClasses(cardCount) {
    const s = store.state;
    dom.body.classList.remove("mode-overlay", "mode-peek", "mode-split");
    dom.body.classList.add(`mode-${s.mode}`);
    dom.body.classList.toggle("board-open", s.boardOpen);

    dom.modeBtns.forEach((btn) => {
      const active = btn.dataset.mode === s.mode;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", String(active));
    });

    dom.obsSidebar.classList.toggle("collapsed", !s.sidebarOpen);
    dom.ribbonExplorerBtn.classList.toggle("active", s.sidebarOpen);
    dom.ribbonBoardBtn.classList.toggle("active", s.boardOpen);
    dom.ribbonUndoBtn.disabled = s.undoStack.length === 0;

    dom.quicklookDrawer.classList.toggle("open", s.quickLookOpen && s.mode !== "split");
    dom.btnQuickLookToggle.classList.toggle("hidden", s.mode === "split");

    // [ID 3.4] 동적 열·행 계산 -> 카드가 한 줄로 배치 가능하면 세로 100% 확장(rows-1), 2줄이면 균등 분할(rows-2)
    const effectiveCols = Math.max(1, Math.min(s.gridCols, Math.max(1, cardCount)));
    const rowCount = Math.max(1, Math.ceil(cardCount / effectiveCols));
    const rowClass = rowCount === 1 ? "rows-1" : rowCount === 2 ? "rows-2" : "rows-many";

    dom.folderGrid.className = `folder-grid cols-${effectiveCols} ${rowClass}`;
    dom.segBtns.forEach((btn) => btn.classList.toggle("active", Number(btn.dataset.cols) === s.gridCols));
    dom.boardSort.value = s.sortBy;
  }

  // [ID 5.3] 좌측 기본 세로 트리 탐색기 동기화 렌더링
  // -> 2D 미니 탐색기 카드와 완전히 동일한 아이콘·폴더 색상을 적용해 네이티브 일체감을 검증함.
  function renderSidebarTree() {
    const s = store.state;
    const container = document.createElement("div");

    function appendLevel(parentId, depth) {
      const folders = store.getChildFolders(parentId);
      for (const folder of folders) {
        const collapsed = s.collapsedTreeFolders.has(folder.id);
        const row = document.createElement("div");
        row.className = "tree-row";
        row.style.paddingLeft = `${8 + depth * 14}px`;
        row.innerHTML = `
          <span class="tree-caret">${collapsed ? "▸" : "▾"}</span>
          <span class="native-icon">${escapeHtml(folder.icon || "📁")}</span>
          <span class="tree-label" style="color:${folder.color || "inherit"}">${escapeHtml(folder.name)}</span>
          <span class="tree-count">${store.countTotalNotesInSubtree(folder.id)}</span>
        `;
        row.addEventListener("click", () => {
          if (collapsed) s.collapsedTreeFolders.delete(folder.id);
          else s.collapsedTreeFolders.add(folder.id);
          store.notify();
        });
        row.addEventListener("dblclick", () => {
          s.boardOpen = true;
          navigateToFolder(folder.id);
        });
        container.appendChild(row);

        if (!collapsed) {
          appendLevel(folder.id, depth + 1);
        }
      }

      const notes = s.notes
        .filter((n) => n.folderId === parentId)
        .sort((a, b) => a.title.localeCompare(b.title, "ko"));

      for (const note of notes) {
        const row = document.createElement("div");
        row.className = "tree-row" + (note.id === s.activeNoteId ? " active" : "");
        row.style.paddingLeft = `${22 + depth * 14}px`;
        row.innerHTML = `
          <span class="native-icon">${escapeHtml(note.icon || "📄")}</span>
          <span class="tree-label">${escapeHtml(note.title)}</span>
        `;
        row.addEventListener("click", () => {
          s.activeNoteId = note.id;
          s.selectedNoteIds = new Set([note.id]);
          store.notify();
        });
        container.appendChild(row);
      }
    }

    appendLevel("", 0);
    dom.sidebarTree.replaceChildren(container);
    dom.sidebarStats.textContent = `폴더 ${s.folders.length} · 노트 ${s.notes.length}`;
  }

  function renderNoteDocument(note, targetEl) {
    if (!note) {
      targetEl.innerHTML = `<div class="quicklook-empty">열린 노트가 없습니다.</div>`;
      return;
    }
    const tagsHtml = note.tags.map((t) => `<span class="md-tag">#${escapeHtml(t)}</span>`).join("");
    targetEl.innerHTML = `
      <h1 class="md-title">${escapeHtml(note.title)}</h1>
      <div class="md-tags">${tagsHtml}</div>
      <div class="md-body">${renderMarkdown(note.content)}</div>
    `;
  }

  function renderEditorAndQuickLook() {
    const s = store.state;
    const activeNote = store.getNote(s.activeNoteId);
    if (activeNote) {
      dom.editorPath.textContent = `${store.getFolderDisplayPath(activeNote.folderId)} / ${activeNote.title}.md`;
      dom.editorMeta.textContent = `수정: ${activeNote.updatedAt}`;
    } else {
      dom.editorPath.textContent = "Vault";
      dom.editorMeta.textContent = "";
    }
    renderNoteDocument(activeNote, dom.editorDocument);

    const qlNote = store.getNote(getFocusedNoteId());
    if (qlNote) {
      renderNoteDocument(qlNote, dom.quicklookContent);
      dom.btnQlOpen.disabled = false;
    } else {
      dom.quicklookContent.innerHTML = `<div class="quicklook-empty">노트를 선택한 뒤 <kbd>Space</kbd>를 누르면 내용을 바로 훑어볼 수 있습니다.</div>`;
      dom.btnQlOpen.disabled = true;
    }
  }

  // [ID 3.1] 브레드크럼 렌더링 (각 상위 경로를 드롭 타겟으로 연결)
  function renderBreadcrumb() {
    const s = store.state;
    const chain = store.getBreadcrumb(s.currentFolderId);
    dom.btnGoUp.disabled = s.currentFolderId === "";
    dom.boardBreadcrumb.innerHTML = "";

    chain.forEach((crumb, idx) => {
      if (idx > 0) {
        const sep = document.createElement("span");
        sep.className = "crumb-sep";
        sep.textContent = "›";
        dom.boardBreadcrumb.appendChild(sep);
      }
      const folder = crumb.id ? store.getFolder(crumb.id) : null;
      const btn = document.createElement("button");
      btn.className = "crumb-btn" + (idx === chain.length - 1 ? " current" : "");
      btn.dataset.dropFolder = crumb.id;
      btn.title = idx === chain.length - 1 ? "현재 위치" : `${crumb.name}로 이동 (또는 노트를 여기에 드롭)`;
      btn.innerHTML = `${idx === 0 ? "🏠 " : escapeHtml(folder?.icon || "📁") + " "}${escapeHtml(crumb.name)}`;
      btn.addEventListener("click", () => navigateToFolder(crumb.id));
      dom.boardBreadcrumb.appendChild(btn);
    });
  }

  function handleNoteClick(e, note, cardIdx) {
    const s = store.state;
    const isMulti = e.metaKey || e.ctrlKey;
    s.focusedCardIndex = cardIdx;
    s.focusedItemKey = `note:${note.id}`;

    if (isMulti) {
      if (s.selectedNoteIds.has(note.id)) {
        s.selectedNoteIds.delete(note.id);
      } else {
        s.selectedNoteIds.add(note.id);
      }
    } else {
      s.selectedNoteIds = new Set([note.id]);
      if (s.mode === "peek" || s.mode === "split") {
        s.activeNoteId = note.id;
      }
    }
    store.notify();
  }

  function openNoteInEditor(noteId, closeBoard = true) {
    const s = store.state;
    s.activeNoteId = noteId;
    s.selectedNoteIds = new Set([noteId]);
    if (closeBoard && s.mode !== "split") {
      s.boardOpen = false;
    }
    store.notify();
  }

  // [ID 3.3] 2D 네이티브 미니 탐색기 카드 그리드 렌더링
  function renderFolderGrid(cards) {
    const s = store.state;
    dom.folderGrid.innerHTML = "";

    const curFolder = store.getFolder(s.currentFolderId);
    dom.gridSectionTitle.textContent = curFolder
      ? `${curFolder.icon || "📁"} ${curFolder.name} — 미니 탐색기 ${cards.length}개`
      : `네이티브 2D 탐색기 — 카드 ${cards.length}개 (첫 번째 카드: 직속 노트)`;

    if (cards.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-grid-state";
      empty.textContent = `'${s.searchQuery}'에 해당하는 폴더나 노트가 현재 경로에 없습니다.`;
      dom.folderGrid.appendChild(empty);
      return;
    }

    cards.forEach((cardModel, cardIdx) => {
      const isFocusedCard = cardIdx === s.focusedCardIndex;
      const card = document.createElement("article");
      card.className =
        "folder-card" +
        (cardModel.isRootCard ? " is-root-card" : "") +
        (isFocusedCard ? " focused-card" : "");
      card.dataset.dropFolder = cardModel.folderId;
      card.style.setProperty("--folder-accent", cardModel.color);

      // 카드 헤더 (네이티브 아이콘·색상 유지 + 더블클릭/→ 버튼으로 Drill-down)
      const header = document.createElement("div");
      header.className = "folder-card-header";
      header.title = cardModel.isRootCard
        ? "현재 폴더 직속 노트 영역 (폴더 밖으로 꺼낼 노트를 여기에 드롭)"
        : "더블클릭 또는 Shift+Enter로 이 폴더 안으로 진입 (Drill-down)";

      header.innerHTML = `
        <div class="folder-card-title-wrap">
          <span class="native-icon">${escapeHtml(cardModel.icon)}</span>
          <span class="folder-card-name">${escapeHtml(cardModel.title)}</span>
          ${cardModel.isRootCard ? '<span class="root-card-badge">직속</span>' : ""}
        </div>
        <div class="folder-card-meta">
          <span class="folder-count-pill" title="노트 수">${cardModel.totalCount}</span>
          ${cardModel.isRootCard ? "" : '<button class="drill-btn" title="이 폴더 안으로 진입 (Shift+Enter)">→</button>'}
        </div>
      `;

      header.addEventListener("click", () => {
        focusCardItem(cardIdx, 0);
      });

      if (!cardModel.isRootCard) {
        header.addEventListener("dblclick", () => navigateToFolder(cardModel.folderId));
        header.querySelector(".drill-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          navigateToFolder(cardModel.folderId);
        });
      }
      card.appendChild(header);

      // 네이티브 탐색기 파일 트리 컨테이너 (.nav-files-container)
      const navContainer = document.createElement("div");
      navContainer.className = "nav-files-container";

      if (cardModel.items.length === 0) {
        const msg = document.createElement("div");
        msg.className = "empty-folder-msg";
        msg.textContent = cardModel.isRootCard
          ? "직속 노트가 비어 있습니다. 폴더 안의 노트를 여기로 꺼내둘 수 있어요."
          : "비어 있는 폴더 · 노트를 드래그해 넣으세요";
        navContainer.appendChild(msg);
      } else {
        for (const item of cardModel.items) {
          const isFocused = isFocusedCard && s.focusedItemKey === item.key;

          if (item.type === "folder") {
            const sub = item.folder;
            const row = document.createElement("div");
            row.className = "tree-item-self nav-folder-title" + (isFocused ? " is-focused" : "");
            row.style.paddingLeft = `${7 + item.depth * 14}px`;
            row.style.setProperty("--folder-accent", sub.color || "#cfd2dc");
            row.dataset.dropFolder = sub.id;
            row.dataset.path = store.getFolderDisplayPath(sub.id);
            row.title = "클릭: 안에서 펼치기/접기 · 더블클릭: 2D 보드로 진입 · 드롭 가능";

            row.innerHTML = `
              <span class="collapse-icon">${item.expanded ? "▾" : "▸"}</span>
              <span class="native-icon">${escapeHtml(sub.icon || "📁")}</span>
              <span class="tree-item-inner">${escapeHtml(sub.name)}</span>
              <span class="tree-item-flair">${store.countTotalNotesInSubtree(sub.id)}</span>
            `;

            row.addEventListener("click", (e) => {
              e.stopPropagation();
              s.focusedCardIndex = cardIdx;
              s.focusedItemKey = item.key;
              if (s.expandedCardFolders.has(sub.id)) {
                s.expandedCardFolders.delete(sub.id);
              } else {
                s.expandedCardFolders.add(sub.id);
              }
              store.notify();
            });
            row.addEventListener("dblclick", (e) => {
              e.stopPropagation();
              navigateToFolder(sub.id);
            });
            navContainer.appendChild(row);
          } else {
            const note = item.note;
            const isSelected = s.selectedNoteIds.has(note.id);
            const isActive = s.activeNoteId === note.id;
            const row = document.createElement("div");
            row.className =
              "tree-item-self nav-file-title" +
              (isSelected ? " is-selected" : "") +
              (isFocused ? " is-focused" : "") +
              (isActive ? " is-active" : "");
            row.style.paddingLeft = `${10 + item.depth * 14}px`;
            row.draggable = true;
            row.dataset.dragNoteId = note.id;
            row.dataset.path = `${store.getFolderDisplayPath(note.folderId)}/${note.title}.md`;
            row.title = `${note.title} (Space: 미리보기 · Enter/더블클릭: 열기 · 드래그 이동)`;

            row.innerHTML = `
              <span class="native-icon">${escapeHtml(note.icon || "📄")}</span>
              <span class="tree-item-inner">${escapeHtml(note.title)}</span>
              <span class="tree-item-flair">${escapeHtml(note.updatedAt)}</span>
            `;

            row.addEventListener("click", (e) => handleNoteClick(e, note, cardIdx));
            row.addEventListener("dblclick", () => openNoteInEditor(note.id, true));
            navContainer.appendChild(row);
          }
        }
      }

      card.appendChild(navContainer);
      dom.folderGrid.appendChild(card);
    });
  }

  // [ID 4.3] 하단 임시 바구니 & 다중 선택 플로팅 바 렌더링
  function renderShelfAndSelection() {
    const s = store.state;
    const validShelf = s.shelfNoteIds.map((id) => store.getNote(id)).filter(Boolean);
    dom.shelfCount.textContent = String(validShelf.length);
    dom.shelfItems.innerHTML = "";

    const hasShelf = validShelf.length > 0;
    dom.btnShelfDropHere.classList.toggle("hidden", !hasShelf);
    dom.btnShelfClear.classList.toggle("hidden", !hasShelf);

    if (!hasShelf) {
      dom.shelfItems.innerHTML = `<span class="shelf-placeholder">여러 폴더를 옮겨 다닐 때 노트를 여기에 잠깐 담아두고, 목적지 폴더로 한 번에 쏟아부을 수 있어요.</span>`;
    } else {
      for (const note of validShelf) {
        const chip = document.createElement("div");
        chip.className = "shelf-chip";
        chip.draggable = true;
        chip.dataset.dragNoteId = note.id;
        chip.dataset.dragFromShelf = "true";
        chip.innerHTML = `<span>${escapeHtml(note.icon || "📄")} ${escapeHtml(note.title)}</span>`;
        const rm = document.createElement("button");
        rm.textContent = "×";
        rm.title = "바구니에서 빼기";
        rm.addEventListener("click", (e) => {
          e.stopPropagation();
          store.removeFromShelf(note.id);
        });
        chip.appendChild(rm);
        dom.shelfItems.appendChild(chip);
      }
    }

    const multiCount = s.selectedNoteIds.size;
    dom.selectionBar.classList.toggle("hidden", !s.boardOpen || multiCount < 2);
    dom.selectionLabel.textContent = `${multiCount}개 노트 선택됨 — 아무거나 끌어 일괄 이동`;
  }

  function renderAll() {
    const cards = buildBoardCards();
    renderLayoutClasses(cards.length);
    renderSidebarTree();
    renderEditorAndQuickLook();
    renderBreadcrumb();
    renderFolderGrid(cards);
    renderShelfAndSelection();
  }

  // =========================================================
  // 이벤트 바인딩
  // =========================================================
  function bindEvents() {
    dom.modeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        store.state.mode = btn.dataset.mode;
        store.state.boardOpen = true;
        store.notify();
        const modeNames = {
          overlay: "모드 1: 확장 오버레이 (방향키 이동 + Space 미리보기)",
          peek: "모드 2: 하단 2/3 팝업 (이동 즉시 상단 1/3 실시간 반영)",
          split: "모드 3: 좌측 트리 + 중앙 2D + 우측 에디터 3분할"
        };
        showToast(modeNames[store.state.mode]);
      });
    });

    const toggleBoard = () => {
      store.state.boardOpen = !store.state.boardOpen;
      store.notify();
    };

    dom.btnToggleBoard.addEventListener("click", toggleBoard);
    dom.ribbonBoardBtn.addEventListener("click", toggleBoard);
    dom.sidebarOpenBoard.addEventListener("click", () => {
      store.state.boardOpen = true;
      store.notify();
    });
    dom.btnCloseBoard.addEventListener("click", () => {
      store.state.boardOpen = false;
      store.notify();
    });
    dom.boardBackdrop.addEventListener("click", () => {
      if (store.state.mode === "overlay") {
        store.state.boardOpen = false;
        store.notify();
      }
    });

    // 모드 2: 상단 1/3 에디터 영역 클릭 시 보드 닫고 전체화면 전환
    dom.editorPane.addEventListener("click", () => {
      if (store.state.mode === "peek" && store.state.boardOpen) {
        store.state.boardOpen = false;
        store.notify();
      }
    });

    dom.ribbonExplorerBtn.addEventListener("click", () => {
      store.state.sidebarOpen = !store.state.sidebarOpen;
      store.notify();
    });

    dom.ribbonUndoBtn.addEventListener("click", () => {
      const res = store.undoLastAction();
      if (res) showToast(`${res.count}개 노트 이동을 되돌렸습니다.`);
    });

    dom.btnGoUp.addEventListener("click", () => {
      const cur = store.getFolder(store.state.currentFolderId);
      if (cur) navigateToFolder(cur.parentId || "");
    });

    // 검색 필터
    dom.boardSearch.addEventListener("input", (e) => {
      store.state.searchQuery = e.target.value;
      dom.btnClearSearch.classList.toggle("hidden", !e.target.value);
      store.notify();
    });
    dom.btnClearSearch.addEventListener("click", () => {
      store.state.searchQuery = "";
      dom.boardSearch.value = "";
      dom.btnClearSearch.classList.add("hidden");
      store.notify();
    });

    // 열 개수 & 정렬
    dom.segBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        store.state.gridCols = Number(btn.dataset.cols);
        store.notify();
      });
    });
    dom.boardSort.addEventListener("change", (e) => {
      store.state.sortBy = e.target.value;
      store.notify();
    });

    // 새 노트 / 새 폴더
    dom.btnNewNote.addEventListener("click", () => {
      const title = prompt("새 노트 제목을 입력하세요:");
      if (!title) return;
      const note = store.createNote(title, store.state.currentFolderId);
      if (note) {
        store.state.focusedCardIndex = 0;
        store.state.focusedItemKey = `note:${note.id}`;
        store.notify();
        showToast(`'${note.title}' 노트를 생성했습니다.`);
      }
    });
    dom.btnNewFolder.addEventListener("click", () => {
      const name = prompt("새 하위 폴더 이름을 입력하세요:");
      if (!name) return;
      const folder = store.createFolder(name, store.state.currentFolderId);
      if (folder) showToast(`'${folder.name}' 폴더 섹션을 추가했습니다.`);
    });

    // Quick Look 토글
    dom.btnQuickLookToggle.addEventListener("click", () => {
      store.state.quickLookOpen = !store.state.quickLookOpen;
      store.notify();
    });
    dom.btnQlClose.addEventListener("click", () => {
      store.state.quickLookOpen = false;
      store.notify();
    });
    dom.btnQlOpen.addEventListener("click", () => {
      const noteId = getFocusedNoteId();
      if (noteId) openNoteInEditor(noteId, true);
    });

    // 바구니 액션
    dom.btnShelfDropHere.addEventListener("click", () => {
      const res = store.moveNotes(store.state.shelfNoteIds, store.state.currentFolderId);
      if (res.movedCount > 0) {
        showToast(`바구니의 ${res.movedCount}개 노트를 '${res.targetName}'로 이동했습니다.`, { undoable: true });
      }
    });
    dom.btnShelfClear.addEventListener("click", () => {
      store.clearShelf();
      showToast("임시 바구니를 비웠습니다.");
    });

    // 다중 선택 액션
    dom.btnSelToShelf.addEventListener("click", () => {
      const added = store.addToShelf([...store.state.selectedNoteIds]);
      if (added > 0) showToast(`${added}개 노트를 임시 바구니에 담았습니다.`);
    });
    dom.btnSelClear.addEventListener("click", () => {
      store.state.selectedNoteIds.clear();
      store.notify();
    });

    // 초기화 & 도움말
    dom.btnResetVault.addEventListener("click", () => {
      if (confirm("샘플 볼트를 초기 상태로 되돌릴까요?")) {
        store.resetVault();
        store.state.focusedCardIndex = 0;
        store.state.focusedItemKey = store.state.notes[0] ? `note:${store.state.notes[0].id}` : null;
        store.notify();
        showToast("샘플 볼트를 초기화했습니다.");
      }
    });
    dom.btnHelp.addEventListener("click", () => dom.helpModal.classList.remove("hidden"));
    dom.btnCloseHelp.addEventListener("click", () => dom.helpModal.classList.add("hidden"));
    dom.helpModal.addEventListener("click", (e) => {
      if (e.target === dom.helpModal) dom.helpModal.classList.add("hidden");
    });

    // [ID 5.5] 글로벌 키보드 단축키 & 2D 방향키 탐색
    // -> ←/→: 폴더 카드 간 수평 이동, ↑/↓: 현재 카드 내 파일/폴더 수직 이동, Space: 미리보기(또는 하위 폴더 토글)
    document.addEventListener("keydown", (e) => {
      const inInput = e.target.matches("input, textarea, select");
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        toggleBoard();
        return;
      }

      if (meta && !e.shiftKey && e.key.toLowerCase() === "z" && !inInput) {
        if (store.state.undoStack.length > 0) {
          e.preventDefault();
          const res = store.undoLastAction();
          if (res) showToast(`${res.count}개 노트 이동을 되돌렸습니다.`);
        }
        return;
      }

      if (inInput) {
        if (e.key === "Escape") e.target.blur();
        return;
      }

      if (e.key === "Escape") {
        if (!dom.helpModal.classList.contains("hidden")) {
          dom.helpModal.classList.add("hidden");
        } else if (store.state.selectedNoteIds.size > 1) {
          store.state.selectedNoteIds.clear();
          store.notify();
        } else if (store.state.quickLookOpen) {
          store.state.quickLookOpen = false;
          store.notify();
        } else if (store.state.boardOpen && store.state.mode !== "split") {
          store.state.boardOpen = false;
          store.notify();
        }
        return;
      }

      if (!store.state.boardOpen || renderedCards.length === 0) return;

      const s = store.state;
      const curCard = renderedCards[s.focusedCardIndex] || renderedCards[0];

      // 좌/우 방향키: 폴더 카드 사이 이동
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? 1 : -1;
        const nextIdx = (s.focusedCardIndex + delta + renderedCards.length) % renderedCards.length;
        const targetCard = renderedCards[nextIdx];
        // 새 카드로 이동 시 첫 번째 노트를 우선 포커스해 Space 미리보기 동선을 매끄럽게 연결
        const firstNoteIdx = targetCard.items.findIndex((it) => it.type === "note");
        focusCardItem(nextIdx, firstNoteIdx >= 0 ? firstNoteIdx : 0);
        return;
      }

      // 위/아래 방향키: 현재 카드 내부 파일/하위 폴더 포커스 이동
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!curCard || curCard.items.length === 0) return;
        const curIdx = curCard.items.findIndex((it) => it.key === s.focusedItemKey);
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const nextItemIdx =
          curIdx === -1
            ? delta > 0 ? 0 : curCard.items.length - 1
            : Math.max(0, Math.min(curIdx + delta, curCard.items.length - 1));
        focusCardItem(s.focusedCardIndex, nextItemIdx);
        return;
      }

      // Space: 노트 포커스 중엔 Quick Look 토글, 하위 폴더 포커스 중엔 카드 안에서 펼치기/접기
      if (e.code === "Space") {
        e.preventDefault();
        const focusedItem = curCard?.items.find((it) => it.key === s.focusedItemKey);
        if (focusedItem && focusedItem.type === "folder") {
          if (s.expandedCardFolders.has(focusedItem.id)) {
            s.expandedCardFolders.delete(focusedItem.id);
          } else {
            s.expandedCardFolders.add(focusedItem.id);
          }
          store.notify();
        } else if (s.mode !== "split") {
          s.quickLookOpen = !s.quickLookOpen;
          store.notify();
        }
        return;
      }

      // Enter / Shift+Enter: 노트 열기 또는 폴더 Drill-down
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey && curCard && !curCard.isRootCard) {
          navigateToFolder(curCard.folderId);
          return;
        }
        const focusedItem = curCard?.items.find((it) => it.key === s.focusedItemKey);
        if (focusedItem?.type === "folder") {
          navigateToFolder(focusedItem.id);
        } else if (focusedItem?.type === "note") {
          openNoteInEditor(focusedItem.id, true);
        } else if (curCard && !curCard.isRootCard) {
          navigateToFolder(curCard.folderId);
        }
        return;
      }

      // Backspace: 상위 폴더로 한 단계 복귀
      if (e.key === "Backspace" && s.currentFolderId !== "") {
        e.preventDefault();
        const cur = store.getFolder(s.currentFolderId);
        navigateToFolder(cur?.parentId || "");
      }
    });

    dnd.bindDnD({
      store,
      onMoved(res) {
        showToast(`${res.movedCount}개 노트를 '${res.targetName}'로 이동했습니다.`, { undoable: true });
      },
      onAddedToShelf(added) {
        showToast(`${added}개 노트를 하단 임시 바구니에 담았습니다.`);
      }
    });
  }

  store.subscribe(renderAll);
  bindEvents();
  renderAll();
})();
