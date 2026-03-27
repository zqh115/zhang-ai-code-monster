import { computed, onBeforeUnmount, ref } from 'vue'

const PARENT_MESSAGE_SOURCE = 'zhang-ai-visual-editor-parent'
const FRAME_MESSAGE_SOURCE = 'zhang-ai-visual-editor-frame'
const STYLE_ELEMENT_ID = '__zhang_ai_visual_editor_style__'
const SCRIPT_ELEMENT_ID = '__zhang_ai_visual_editor_script__'

export type SelectedElementInfo = {
  tagName: string
  id: string
  className: string
  textContent: string
  path: string
}

const createBridgeScript = () => `
(() => {
  if (window.__ZHANG_AI_VISUAL_EDITOR__) {
    return;
  }

  const OVERLAY_ATTRIBUTE = 'data-zhang-ai-editor-overlay';
  let active = false;
  let hoveredElement = null;
  let selectedElement = null;
  let parentOrigin = '';

  const createOverlay = (variant) => {
    const overlay = document.createElement('div');
    overlay.setAttribute(OVERLAY_ATTRIBUTE, variant);
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '0';
    overlay.style.height = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.display = 'none';
    overlay.style.boxSizing = 'border-box';
    overlay.style.borderRadius = '10px';
    overlay.style.zIndex = '2147483646';
    overlay.style.transition = 'all 0.06s ease-out';

    if (variant === 'hover') {
      overlay.style.border = '2px dashed rgba(59, 130, 246, 0.96)';
      overlay.style.background = 'rgba(96, 165, 250, 0.08)';
      overlay.style.boxShadow = '0 0 0 2px rgba(191, 219, 254, 0.22)';
    } else {
      overlay.style.border = '2px solid rgba(29, 78, 216, 0.98)';
      overlay.style.background = 'rgba(59, 130, 246, 0.12)';
      overlay.style.boxShadow = '0 0 0 4px rgba(96, 165, 250, 0.18)';
    }

    return overlay;
  };

  const hoverOverlay = createOverlay('hover');
  const selectedOverlay = createOverlay('selected');
  document.body.appendChild(hoverOverlay);
  document.body.appendChild(selectedOverlay);

  const isOverlayElement = (target) => {
    return target instanceof HTMLElement && target.hasAttribute(OVERLAY_ATTRIBUTE);
  };

  const isSelectable = (target) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    if (target === document.documentElement || target === document.body) {
      return false;
    }
    if (isOverlayElement(target)) {
      return false;
    }
    return true;
  };

  const resolveSelectableTarget = (target) => {
    let current = target instanceof HTMLElement ? target : null;
    while (current && !isSelectable(current)) {
      current = current.parentElement;
    }
    return current;
  };

  const getElementPath = (element) => {
    const segments = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && segments.length < 6) {
      const tagName = current.tagName.toLowerCase();
      const id = current.id ? '#' + current.id : '';
      const className = current.classList.length ? '.' + Array.from(current.classList).slice(0, 2).join('.') : '';
      let index = '';
      if (!id && current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter((item) => item.tagName === current.tagName);
        if (siblings.length > 1) {
          index = ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
        }
      }
      segments.unshift(tagName + id + className + index);
      current = current.parentElement;
    }
    return segments.join(' > ');
  };

  const getTextContent = (element) => {
    return (element.innerText || element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
  };

  const serializeElement = (element) => ({
    tagName: element.tagName.toLowerCase(),
    id: element.id || '',
    className: Array.from(element.classList).slice(0, 6).join(' '),
    textContent: getTextContent(element),
    path: getElementPath(element),
  });

  const updateOverlay = (overlay, element) => {
    const rect = element.getBoundingClientRect();
    if (!rect.width && !rect.height) {
      overlay.style.display = 'none';
      return;
    }

    overlay.style.display = 'block';
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  };

  const hideOverlay = (overlay) => {
    overlay.style.display = 'none';
  };

  const refreshOverlays = () => {
    if (selectedElement) {
      updateOverlay(selectedOverlay, selectedElement);
    } else {
      hideOverlay(selectedOverlay);
    }

    if (active && hoveredElement && hoveredElement !== selectedElement) {
      updateOverlay(hoverOverlay, hoveredElement);
    } else {
      hideOverlay(hoverOverlay);
    }
  };

  const clearHover = () => {
    hoveredElement = null;
    hideOverlay(hoverOverlay);
  };

  const clearSelected = () => {
    selectedElement = null;
    hideOverlay(selectedOverlay);
  };

  const setSelected = (element) => {
    selectedElement = element;
    refreshOverlays();
  };

  const handlePointerMove = (event) => {
    if (!active) {
      return;
    }

    const target = resolveSelectableTarget(document.elementFromPoint(event.clientX, event.clientY));
    if (!target || target === selectedElement) {
      clearHover();
      return;
    }

    hoveredElement = target;
    refreshOverlays();
  };

  const handlePointerLeave = () => {
    if (!active) {
      return;
    }
    clearHover();
  };

  const handleClick = (event) => {
    if (!active) {
      return;
    }

    const target = resolveSelectableTarget(document.elementFromPoint(event.clientX, event.clientY));
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    hoveredElement = null;
    setSelected(target);
    window.parent.postMessage({
      source: '${FRAME_MESSAGE_SOURCE}',
      type: 'element-selected',
      payload: serializeElement(target),
    }, parentOrigin || '*');
  };

  const handleMessage = (event) => {
    const data = event.data || {};
    if (data.source !== '${PARENT_MESSAGE_SOURCE}') {
      return;
    }

    if (!parentOrigin) {
      parentOrigin = event.origin;
    }

    if (data.parentOrigin && data.parentOrigin !== parentOrigin) {
      return;
    }

    if (data.type === 'enable') {
      active = true;
      document.body.style.cursor = 'crosshair';
      refreshOverlays();
      return;
    }

    if (data.type === 'disable') {
      active = false;
      document.body.style.cursor = '';
      clearHover();
      return;
    }

    if (data.type === 'clear-selection') {
      clearHover();
      clearSelected();
    }
  };

  const handleViewportChange = () => {
    refreshOverlays();
  };

  document.addEventListener('mousemove', handlePointerMove, true);
  document.addEventListener('mouseleave', handlePointerLeave, true);
  document.addEventListener('click', handleClick, true);
  window.addEventListener('message', handleMessage);
  window.addEventListener('scroll', handleViewportChange, true);
  window.addEventListener('resize', handleViewportChange);

  window.__ZHANG_AI_VISUAL_EDITOR__ = {
    destroy() {
      document.removeEventListener('mousemove', handlePointerMove, true);
      document.removeEventListener('mouseleave', handlePointerLeave, true);
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
      clearHover();
      clearSelected();
      hoverOverlay.remove();
      selectedOverlay.remove();
      document.body.style.cursor = '';
    },
  };
})();
`

export function useVisualEditing() {
  const isEditing = ref(false)
  const selectedElement = ref<SelectedElementInfo | null>(null)
  const iframeElement = ref<HTMLIFrameElement | null>(null)
  const frameOrigin = ref('*')

  const hasSelectedElement = computed(() => Boolean(selectedElement.value))

  const resolveFrameOrigin = (iframe: HTMLIFrameElement) => {
    const iframeSource = iframe.getAttribute('src') || iframe.src
    if (!iframeSource || typeof window === 'undefined') {
      return '*'
    }

    try {
      return new URL(iframeSource, window.location.href).origin
    } catch {
      return '*'
    }
  }

  const postCommandToFrame = (type: 'enable' | 'disable' | 'clear-selection') => {
    const contentWindow = iframeElement.value?.contentWindow
    if (!contentWindow) {
      return
    }

    contentWindow.postMessage(
      {
        source: PARENT_MESSAGE_SOURCE,
        type,
        parentOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      },
      frameOrigin.value,
    )
  }

  const installBridge = (iframe: HTMLIFrameElement) => {
    const documentRef = iframe.contentDocument
    if (!documentRef) {
      return
    }

    if (!documentRef.getElementById(STYLE_ELEMENT_ID)) {
      const styleElement = documentRef.createElement('style')
      styleElement.id = STYLE_ELEMENT_ID
      styleElement.textContent = `
        .zhang-ai-visual-editor-hover {
          outline: 2px dashed rgba(59, 130, 246, 0.95) !important;
          outline-offset: 2px !important;
        }

        .zhang-ai-visual-editor-selected {
          outline: 2px solid rgba(29, 78, 216, 1) !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.18) !important;
        }
      `
      ;(documentRef.head || documentRef.body || documentRef.documentElement).appendChild(styleElement)
    }

    if (!documentRef.getElementById(SCRIPT_ELEMENT_ID)) {
      const scriptElement = documentRef.createElement('script')
      scriptElement.id = SCRIPT_ELEMENT_ID
      scriptElement.textContent = createBridgeScript()
      ;(documentRef.body || documentRef.documentElement).appendChild(scriptElement)
    }
  }

  const syncEditingStateToFrame = () => {
    postCommandToFrame(isEditing.value ? 'enable' : 'disable')
    if (!selectedElement.value) {
      postCommandToFrame('clear-selection')
    }
  }

  const handleFrameLoad = (iframe: HTMLIFrameElement) => {
    iframeElement.value = iframe
    frameOrigin.value = resolveFrameOrigin(iframe)
    try {
      installBridge(iframe)
      window.setTimeout(() => {
        syncEditingStateToFrame()
      }, 0)
    } catch {
      // Ignore cross-origin or transient load errors. The page requirement assumes same-origin.
    }
  }

  const toggleEditMode = () => {
    isEditing.value = !isEditing.value
    if (!isEditing.value) {
      selectedElement.value = null
      postCommandToFrame('clear-selection')
    }
    syncEditingStateToFrame()
  }

  const clearSelectedElement = () => {
    selectedElement.value = null
    postCommandToFrame('clear-selection')
  }

  const exitEditMode = () => {
    isEditing.value = false
    clearSelectedElement()
    postCommandToFrame('disable')
  }

  const buildPromptWithSelectedElement = (prompt: string) => {
    if (!selectedElement.value) {
      return prompt
    }

    const element = selectedElement.value
    const details = [
      '你正在可视化编辑页面中的一个具体元素，请优先围绕这个元素修改：',
      `- 标签：${element.tagName}`,
      `- 路径：${element.path}`,
      element.id ? `- ID：${element.id}` : '',
      element.className ? `- 类名：${element.className}` : '',
      element.textContent ? `- 文本：${element.textContent}` : '',
      '',
      '用户需求：',
      prompt,
    ]
      .filter(Boolean)
      .join('\n')

    return details
  }

  const handleWindowMessage = (event: MessageEvent) => {
    if (frameOrigin.value !== '*' && event.origin !== frameOrigin.value) {
      return
    }

    const data = event.data as
      | {
          source?: string
          type?: string
          payload?: SelectedElementInfo
        }
      | undefined

    if (data?.source !== FRAME_MESSAGE_SOURCE || data.type !== 'element-selected' || !data.payload) {
      return
    }

    selectedElement.value = data.payload
  }

  window.addEventListener('message', handleWindowMessage)

  onBeforeUnmount(() => {
    window.removeEventListener('message', handleWindowMessage)
    exitEditMode()
  })

  return {
    isEditing,
    hasSelectedElement,
    selectedElement,
    handleFrameLoad,
    toggleEditMode,
    clearSelectedElement,
    exitEditMode,
    buildPromptWithSelectedElement,
  }
}
