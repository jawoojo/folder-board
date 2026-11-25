// [ID 1.2] 중앙 상태 관리 스토어 (볼트 데이터, 탐색 경로, 선택, 바구니, 실행 취소)
// -> UI 컴포넌트(트리, 에디터, 2D 보드, 바구니)가 모두 단일 진실 원천(SSOT)을 구독하도록 분리해 동기화 버그를 원천 차단함.
window.FB = window.FB || {};

(function initStore() {
  const STORAGE_KEY = "folder_board_proto_v1";

  function loadInitialVault() {
    const defaults = window.FB.createSampleVault();
    const defaultFolderIcons = new Map(defaults.folders.map((f) => [f.id, f.icon]));
    const defaultNoteIcons = new Map(defaults.notes.map((n) => [n.id, n.icon]));

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.folders) && Array.isArray(parsed.notes)) {
          // [ID 1.2.3] 기존 저장 데이터 아이콘 마이그레이션 -> 이전 프로토타입 스토리지에서도 커스텀 아이콘이 누락되지 않도록 보강
          parsed.folders.forEach((f) => {
            if (!f.icon) f.icon = defaultFolderIcons.get(f.id) || "📁";
          });
          parsed.notes.forEach((n) => {
            if (!n.icon && defaultNoteIcons.has(n.id)) n.icon = defaultNoteIcons.get(n.id);
          });
          return parsed;
        }
      }
    } catch (_) {
      // [ID 1.2.1] 스토리지 접근 예외 방어 -> file:// 환경이나 시크릿 모드에서 localStorage가 막혀도 프로토타입이 정상 동작하도록 폴백
    }
    return defaults;
  }

  const initialVault = loadInitialVault();

  const state = {
    folders: initialVault.folders,
    notes: initialVault.notes,
    // 탐색 & 뷰 상태
    mode: "overlay",            // "overlay" | "peek" | "split"
    boardOpen: true,            // 처음 열었을 때 2D 보드를 바로 체험할 수 있게 기본 오픈
    sidebarOpen: true,
    currentFolderId: "",        // "" = Vault Root
    activeNoteId: initialVault.notes[0]?.id || null,
    selectedNoteIds: new Set([initialVault.notes[0]?.id].filter(Boolean)),
    // [ID 5.6] 방향키 2D 탐색 포커스 상태 -> 좌우(카드 인덱스) + 상하(카드 내 아이템 키)를 분리 관리
    focusedCardIndex: 0,
    focusedItemKey: initialVault.notes[0] ? `note:${initialVault.notes[0].id}` : null,
    expandedCardFolders: new Set(),
    quickLookOpen: false,
    gridCols: 3,
    sortBy: "updated",          // "updated" | "name"
    searchQuery: "",
    // [ID 4.3.1] 임시 바구니 & 실행 취소 스택
    shelfNoteIds: [],
    undoStack: [],
    collapsedTreeFolders: new Set()
  };

  const listeners = new Set();

  function persistVault() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ folders: state.folders, notes: state.notes })
      );
    } catch (_) {}
  }

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  function getFolder(id) {
    return state.folders.find((f) => f.id === id) || null;
  }

  function getNote(id) {
    return state.notes.find((n) => n.id === id) || null;
  }

  // [ID 3.1.1] 브레드크럼 경로 체인 계산
  // -> 루트("")부터 현재 폴더까지 조상 폴더 목록을 순서대로 반환해 상단 경로 바와 상위 드롭 타겟을 생성함.
  function getBreadcrumb(folderId) {
    const chain = [{ id: "", name: "Vault" }];
    const stack = [];
    let cursor = getFolder(folderId);
    while (cursor) {
      stack.push(cursor);
      cursor = cursor.parentId ? getFolder(cursor.parentId) : null;
    }
    stack.reverse().forEach((f) => chain.push({ id: f.id, name: f.name }));
    return chain;
  }

  function getFolderDisplayPath(folderId) {
    return getBreadcrumb(folderId)
      .map((c) => c.name)
      .join(" / ");
  }

  function getChildFolders(parentId) {
    return state.folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }

  function getNotesInFolder(folderId) {
    const q = state.searchQuery.trim().toLowerCase();
    const list = state.notes.filter((n) => {
      if (n.folderId !== folderId) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (state.sortBy === "name") {
      list.sort((a, b) => a.title.localeCompare(b.title, "ko"));
    } else {
      list.sort((a, b) => b.orderTs - a.orderTs);
    }
    return list;
  }

  // [ID 1.2.2] 재귀 총 노트 수 집계 -> 폴더 카드 배지와 트리 탐색기에서 하위 계층 포함 총량을 한눈에 파악하도록 지원
  function countTotalNotesInSubtree(folderId) {
    let total = state.notes.filter((n) => n.folderId === folderId).length;
    const children = state.folders.filter((f) => f.parentId === folderId);
    for (const child of children) {
      total += countTotalNotesInSubtree(child.id);
    }
    return total;
  }

  // [ID 4.1] 일괄 노트 이동 + Undo 스냅샷 기록
  // -> 단일/다중/바구니 드롭을 하나의 원자적 액션으로 통합하고, 이전 경로를 undoStack에 저장해 Cmd+Z 복구를 보장함.
  function moveNotes(noteIds, targetFolderId) {
    const uniqueIds = [...new Set(noteIds)];
    const moves = [];

    for (const id of uniqueIds) {
      const note = getNote(id);
      if (!note || note.folderId === targetFolderId) continue;
      moves.push({ noteId: id, fromFolderId: note.folderId, toFolderId: targetFolderId });
      note.folderId = targetFolderId;
      note.updatedAt = "방금 이동됨";
      note.orderTs = Date.now() + Math.random();
    }

    if (moves.length === 0) return { movedCount: 0 };

    state.undoStack.push({ type: "move", moves });
    if (state.undoStack.length > 30) state.undoStack.shift();

    // 이동 완료된 노트는 바구니에서 자동 정리
    const movedSet = new Set(moves.map((m) => m.noteId));
    state.shelfNoteIds = state.shelfNoteIds.filter((id) => !movedSet.has(id));

    persistVault();
    notify();

    const targetName = targetFolderId ? getFolder(targetFolderId)?.name || "폴더" : "Vault 루트";
    return { movedCount: moves.length, targetName };
  }

  function undoLastAction() {
    const action = state.undoStack.pop();
    if (!action) return null;

    if (action.type === "move") {
      for (const m of action.moves) {
        const note = getNote(m.noteId);
        if (note) note.folderId = m.fromFolderId;
      }
      persistVault();
      notify();
      return { count: action.moves.length };
    }
    return null;
  }

  function addToShelf(noteIds) {
    let added = 0;
    for (const id of noteIds) {
      if (getNote(id) && !state.shelfNoteIds.includes(id)) {
        state.shelfNoteIds.push(id);
        added++;
      }
    }
    if (added > 0) notify();
    return added;
  }

  function removeFromShelf(noteId) {
    state.shelfNoteIds = state.shelfNoteIds.filter((id) => id !== noteId);
    notify();
  }

  function clearShelf() {
    state.shelfNoteIds = [];
    notify();
  }

  function createFolder(name, parentId) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const palette = ["#a78bfa", "#38bdf8", "#4ade80", "#fbbf24", "#f472b6", "#818cf8", "#fb7185"];
    const icons = ["📁", "🗂️", "🧩", "🌿", "⚡", "🎯", "🧭"];
    const folder = {
      id: "f-" + Date.now(),
      name: trimmed,
      parentId: parentId || "",
      color: palette[state.folders.length % palette.length],
      icon: icons[state.folders.length % icons.length]
    };
    state.folders.push(folder);
    persistVault();
    notify();
    return folder;
  }

  function createNote(title, folderId) {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const note = {
      id: "n-" + Date.now(),
      title: trimmed,
      folderId: folderId || "",
      updatedAt: "방금 생성됨",
      orderTs: Date.now(),
      tags: ["새노트"],
      content: `## ${trimmed}\n\n여기에 메모를 작성하거나, 2D 보드에서 원하는 폴더 카드로 드래그해 정리해 보세요.`
    };
    state.notes.unshift(note);
    state.activeNoteId = note.id;
    state.selectedNoteIds = new Set([note.id]);
    persistVault();
    notify();
    return note;
  }

  function resetVault() {
    const fresh = window.FB.createSampleVault();
    state.folders = fresh.folders;
    state.notes = fresh.notes;
    state.currentFolderId = "";
    state.activeNoteId = fresh.notes[0]?.id || null;
    state.selectedNoteIds = new Set([state.activeNoteId].filter(Boolean));
    state.shelfNoteIds = [];
    state.undoStack = [];
    state.searchQuery = "";
    persistVault();
    notify();
  }

  window.FB.store = {
    state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    notify,
    getFolder,
    getNote,
    getBreadcrumb,
    getFolderDisplayPath,
    getChildFolders,
    getNotesInFolder,
    countTotalNotesInSubtree,
    moveNotes,
    undoLastAction,
    addToShelf,
    removeFromShelf,
    clearShelf,
    createFolder,
    createNote,
    resetVault
  };
})();
