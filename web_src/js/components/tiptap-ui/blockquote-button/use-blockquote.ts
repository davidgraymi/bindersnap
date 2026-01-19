import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- UI Utils ---
import {
  findNodePosition,
  isNodeInSchema,
  isNodeTypeSelected,
  isValidPosition,
  selectionWithinConvertibleTypes,
} from '../tiptap-utils.ts';
import {NodeSelection, TextSelection} from '@tiptap/pm/state';

const BLOCKQUOTE_SHORTCUT_KEY = 'mod+shift+b';

/**
 * Configuration for the blockquote functionality
 */
type UseBlockquoteConfig = {
  /**
   * The Tiptap editor instance.
   */
  editor: Ref<Editor | null> | Editor | null
  /**
   * Whether the button should hide when blockquote is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful toggle.
   */
  onToggled?: () => void
}

/**
 * Checks if blockquote can be toggled in the current editor state
 */
function canToggleBlockquote(
  editor: Editor | null,
  turnInto: boolean = true,
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (
    !isNodeInSchema('blockquote', editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) return false;

  if (!turnInto) {
    return editor.can().toggleWrap('blockquote');
  }

  // Ensure selection is in nodes we're allowed to convert
  if (
    !selectionWithinConvertibleTypes(editor, [
      'paragraph',
      'heading',
      'bulletList',
      'orderedList',
      'taskList',
      'blockquote',
      'codeBlock',
    ])
  ) return false;

  // Either we can wrap in blockquote directly on the selection,
  // or we can clear formatting/nodes to arrive at a blockquote.
  return editor.can().toggleWrap('blockquote') || editor.can().clearNodes();
}

/**
 * Toggles blockquote formatting for a specific node or the current selection
 */
function toggleBlockquote(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleBlockquote(editor)) return false;

  try {
    const view = editor.view;
    let state = view.state;
    let tr = state.tr;

    // No selection, find the the cursor position
    if (state.selection.empty || state.selection instanceof TextSelection) {
      const pos = findNodePosition({
        editor,
        node: state.selection.$anchor.node(1),
      })?.pos;
      if (!isValidPosition(pos)) return false;

      tr = tr.setSelection(NodeSelection.create(state.doc, pos));
      view.dispatch(tr);
      state = view.state;
    }

    const selection = state.selection;

    let chain = editor.chain().focus();

    // Handle NodeSelection
    if (selection instanceof NodeSelection) {
      const firstChild = selection.node.firstChild?.firstChild;
      const lastChild = selection.node.lastChild?.lastChild;

      const from = firstChild ?
        selection.from + firstChild.nodeSize :
        selection.from + 1;

      const to = lastChild ?
        selection.to - lastChild.nodeSize :
        selection.to - 1;

      const resolvedFrom = state.doc.resolve(from);
      const resolvedTo = state.doc.resolve(to);

      chain = chain
        .setTextSelection(TextSelection.between(resolvedFrom, resolvedTo))
        .clearNodes();
    }

    const toggle = editor.isActive('blockquote') ?
      chain.lift('blockquote') :
      chain.wrapIn('blockquote');

    toggle.run();

    editor.chain().focus().selectTextblockEnd().run();

    return true;
  } catch {
    return false;
  }
}

/**
 * Determines if the blockquote button should be shown
 */
function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('blockquote', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleBlockquote(editor);
  }

  return true;
}

/**
 * Composable that provides blockquote functionality for Tiptap editor
 */
export function useBlockquote(config: UseBlockquoteConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onToggled,
  } = config;

  const isVisible = ref(true);
  const canToggle = ref(false);
  const isActive = ref(false);

  const resolveEditor = () => unref(providedEditor);

  const updateState = () => {
    const editor = resolveEditor();
    isVisible.value = shouldShowButton({editor, hideWhenUnavailable});
    canToggle.value = canToggleBlockquote(editor);
    isActive.value = editor?.isActive('blockquote') || false;
  };

  const handleToggle = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleBlockquote(editor);
    if (success) {
      onToggled?.();
    }
    return success;
  };

  // Watch editor changes
  watch(
    () => resolveEditor(),
    (newEditor, oldEditor) => {
      if (oldEditor) {
        oldEditor.off('transaction', updateState);
        oldEditor.off('selectionUpdate', updateState);
      }
      if (newEditor) {
        newEditor.on('transaction', updateState);
        newEditor.on('selectionUpdate', updateState);
        updateState(); // Initial update
      }
    },
    {immediate: true},
  );

  onBeforeUnmount(() => {
    const editor = resolveEditor();
    if (editor) {
      editor.off('transaction', updateState);
      editor.off('selectionUpdate', updateState);
    }
  });

  return {
    isVisible,
    isActive,
    handleToggle,
    canToggle,
    label: 'Blockquote',
    shortcutKeys: BLOCKQUOTE_SHORTCUT_KEY,
    iconName: 'octicon-quote',
  };
}
