// [ID 4.0] 2D 보드 드래그 앤 드롭 컨트롤러
// -> 노트(단일/다중)와 임시 바구니 칩의 드래그 페이로드를 일원화하고,
// -> 폴더 카드·하위 폴더 필·브레드크럼·직속 영역·바구니의 중첩 드롭 우선순위를 안정적으로 처리함.
window.FB = window.FB || {};

(function initDnD() {
  const MIME_TYPE = "application/x-folder-board-notes";
  let activeDragIds = [];
  let currentHighlightEl = null;

  function setHighlight(el) {
    if (currentHighlightEl === el) return;
    if (currentHighlightEl) currentHighlightEl.classList.remove("drag-over");
    currentHighlightEl = el;
    if (currentHighlightEl) currentHighlightEl.classList.add("drag-over");
  }

  function clearDragState() {
    activeDragIds = [];
    setHighlight(null);
    document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
  }

  // [ID 4.1.1] 다중 드래그 커스텀 고스트 배지 생성
  // -> 여러 노트를 함께 옮길 때 기본 브라우저 반투명 썸네일만 보이면 몇 개를 쥐고 있는지 직관성이 떨어지므로 개수 배지를 띄움.
  function attachCustomDragGhost(e, count, firstTitle) {
    const ghost = document.createElement("div");
    ghost.style.position = "fixed";
    ghost.style.top = "-9999px";
    ghost.style.left = "-9999px";
    ghost.style.padding = "7px 12px";
    ghost.style.borderRadius = "8px";
    ghost.style.background = "#7f6df2";
    ghost.style.color = "#ffffff";
    ghost.style.fontSize = "12.5px";
    ghost.style.fontWeight = "600";
    ghost.style.boxShadow = "0 8px 24px rgba(0,0,0,0.45)";
    ghost.style.whiteSpace = "nowrap";
    ghost.textContent = count > 1 ? `📄 ${firstTitle} 외 ${count - 1}개 (${count}개 이동)` : `📄 ${firstTitle}`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 14, 14);
    requestAnimationFrame(() => ghost.remove());
  }

  function resolveDropTarget(target) {
    if (!target || !(target instanceof Element)) return null;
    // [ID 4.2] 중첩 드롭 타겟 우선순위 해결
    // -> 카드 내부의 네이티브 하위 폴더 행(.nav-folder-title)에 올렸을 때 상위 폴더 카드보다 하위 폴더가 먼저 매칭되도록 closest 순서 보장.
    return target.closest("[data-drop-shelf], .nav-folder-title[data-drop-folder], .crumb-btn[data-drop-folder], .folder-card[data-drop-folder]");
  }

  function bindDnD({ store, onMoved, onAddedToShelf }) {
    document.addEventListener("dragstart", (e) => {
      const draggable = e.target.closest("[data-drag-note-id]");
      if (!draggable) return;

      const noteId = draggable.dataset.dragNoteId;
      const fromShelf = draggable.dataset.dragFromShelf === "true";

      if (fromShelf) {
        // 바구니 칩 드래그 시 해당 항목(또는 바구니 전체) 이동
        activeDragIds = [noteId];
      } else if (store.state.selectedNoteIds.has(noteId) && store.state.selectedNoteIds.size > 1) {
        // 이미 다중 선택된 항목 중 하나를 잡으면 선택 묶음 전체를 일괄 드래그
        activeDragIds = [...store.state.selectedNoteIds];
      } else {
        activeDragIds = [noteId];
        store.state.selectedNoteIds = new Set([noteId]);
      }

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(MIME_TYPE, JSON.stringify(activeDragIds));
      e.dataTransfer.setData("text/plain", activeDragIds.join(","));

      const firstNote = store.getNote(activeDragIds[0]);
      if (firstNote) {
        attachCustomDragGhost(e, activeDragIds.length, firstNote.title);
      }

      activeDragIds.forEach((id) => {
        document.querySelectorAll(`[data-drag-note-id="${id}"]`).forEach((el) => el.classList.add("dragging"));
      });
    });

    document.addEventListener("dragover", (e) => {
      if (activeDragIds.length === 0) return;
      const dropEl = resolveDropTarget(e.target);
      if (!dropEl) {
        setHighlight(null);
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setHighlight(dropEl);
    });

    document.addEventListener("dragleave", (e) => {
      if (!currentHighlightEl) return;
      if (e.relatedTarget && currentHighlightEl.contains(e.relatedTarget)) return;
      if (e.target === currentHighlightEl) {
        setHighlight(null);
      }
    });

    document.addEventListener("drop", (e) => {
      const dropEl = resolveDropTarget(e.target);
      if (!dropEl) {
        clearDragState();
        return;
      }
      e.preventDefault();

      let noteIds = activeDragIds;
      if (noteIds.length === 0) {
        try {
          noteIds = JSON.parse(e.dataTransfer.getData(MIME_TYPE) || "[]");
        } catch (_) {
          noteIds = [];
        }
      }

      if (noteIds.length === 0) {
        clearDragState();
        return;
      }

      if (dropEl.hasAttribute("data-drop-shelf")) {
        const added = store.addToShelf(noteIds);
        if (added > 0 && onAddedToShelf) onAddedToShelf(added);
      } else if (dropEl.hasAttribute("data-drop-folder")) {
        const targetFolderId = dropEl.dataset.dropFolder;
        const result = store.moveNotes(noteIds, targetFolderId);
        if (result.movedCount > 0 && onMoved) onMoved(result);
      }

      clearDragState();
    });

    document.addEventListener("dragend", clearDragState);
  }

  window.FB.dnd = { bindDnD };
})();
