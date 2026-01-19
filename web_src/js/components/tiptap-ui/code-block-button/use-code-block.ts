import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';
import {NodeSelection, TextSelection} from '@tiptap/pm/state';

// --- Lib ---
import {
  findNodePosition,
  isNodeInSchema,
  isNodeTypeSelected,
  isValidPosition,
  selectionWithinConvertibleTypes,
} from '../tiptap-utils.ts';

const CODE_BLOCK_SHORTCUT_KEY = 'mod+alt+c';

/**
 * Configuration for the code block functionality
 */
type UseCodeBlockConfig = {
  /**
   * The Tiptap editor instance.
   */
  editor: Ref<Editor | null> | Editor | null
  /**
   * Whether the button should hide when code block is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful code block toggle.
   */
  onToggled?: () => void
}

/**
 * Checks if code block can be toggled in the current editor state
 */
function canToggle(
  editor: Editor | null,
  turnInto: boolean = true,
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (
    !isNodeInSchema('codeBlock', editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) return false;

  if (!turnInto) {
    return editor.can().toggleNode('codeBlock', 'paragraph');
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

  // Either we can toggle code block directly on the selection,
  // or we can clear formatting/nodes to arrive at a code block.
  return (
    editor.can().toggleNode('codeBlock', 'paragraph') ||
    editor.can().clearNodes()
  );
}

/**
 * Toggles code block in the editor
 */
function toggleCodeBlock(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggle(editor)) return false;

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

    const toggle = editor.isActive('codeBlock') ?
      chain.setNode('paragraph') :
      chain.toggleNode('codeBlock', 'paragraph');

    toggle.run();

    editor.chain().focus().selectTextblockEnd().run();

    return true;
  } catch {
    return false;
  }
}

/**
 * Determines if the code block button should be shown
 */
function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('codeBlock', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggle(editor);
  }

  return true;
}

/**
 * Composable that provides code block functionality for Tiptap editor
 */
export function useCodeBlock(config: UseCodeBlockConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onToggled,
  } = config;

  const isVisible = ref(true);
  const canToggleState = ref(false);
  const isActive = ref(false);

  const resolveEditor = () => unref(providedEditor);

  const updateState = () => {
    const editor = resolveEditor();
    isVisible.value = shouldShowButton({editor, hideWhenUnavailable});
    canToggleState.value = canToggle(editor);
    isActive.value = editor?.isActive('codeBlock') || false;
  };

  const handleToggle = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleCodeBlock(editor);
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
        updateState();
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
    canToggle: canToggleState,
    label: 'Code Block',
    shortcutKeys: CODE_BLOCK_SHORTCUT_KEY,
    iconName: 'octicon-code',
  };
}
