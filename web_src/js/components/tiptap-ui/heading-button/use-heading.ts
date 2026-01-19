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

export type Level = 1 | 2 | 3 | 4 | 5 | 6

/**
 * Configuration for the heading functionality
 */
type UseHeadingConfig = {
  /**
   * The Tiptap editor instance.
   */
  editor: Ref<Editor | null> | Editor | null
  /**
   * The heading level.
   */
  level: Level
  /**
   * Whether the button should hide when heading is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful heading toggle.
   */
  onToggled?: () => void
}

const HEADING_SHORTCUT_KEYS: Record<Level, string> = {
  1: 'ctrl+alt+1',
  2: 'ctrl+alt+2',
  3: 'ctrl+alt+3',
  4: 'ctrl+alt+4',
  5: 'ctrl+alt+5',
  6: 'ctrl+alt+6',
};

/**
 * Checks if heading can be toggled in the current editor state
 */
function canToggle(
  editor: Editor | null,
  level?: Level,
  turnInto: boolean = true,
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (
    !isNodeInSchema('heading', editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) return false;

  if (!turnInto) {
    return level ?
      editor.can().setNode('heading', {level}) :
      editor.can().setNode('heading');
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

  // Either we can set heading directly on the selection,
  // or we can clear formatting/nodes to arrive at a heading.
  return level ?
    editor.can().setNode('heading', {level}) || editor.can().clearNodes() :
    editor.can().setNode('heading') || editor.can().clearNodes();
}

/**
 * Checks if heading is currently active
 */
function isHeadingActive(
  editor: Editor | null,
  level?: Level | Level[],
): boolean {
  if (!editor || !editor.isEditable) return false;

  if (Array.isArray(level)) {
    return level.some((l) => editor.isActive('heading', {level: l}));
  }

  return level ?
    editor.isActive('heading', {level}) :
    editor.isActive('heading');
}

/**
 * Toggles heading in the editor
 */
function toggleHeading(
  editor: Editor | null,
  level: Level | Level[],
): boolean {
  if (!editor || !editor.isEditable) return false;

  const levels = Array.isArray(level) ? level : [level];
  const toggleLevel = levels.find((l) => canToggle(editor, l));

  if (!toggleLevel) return false;

  try {
    const view = editor.view;
    let state = view.state;
    let tr = state.tr;

    // No selection, find the cursor position
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

    const isActive = levels.some((l) =>
      editor.isActive('heading', {level: l}),
    );

    const toggle = isActive ?
      chain.setNode('paragraph') :
      chain.setNode('heading', {level: toggleLevel});

    toggle.run();

    editor.chain().focus().selectTextblockEnd().run();

    return true;
  } catch {
    return false;
  }
}

/**
 * Determines if the heading button should be shown
 */
function shouldShowButton(props: {
  editor: Editor | null
  level?: Level | Level[]
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, level, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('heading', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    if (Array.isArray(level)) {
      return level.some((l) => canToggle(editor, l));
    }
    return canToggle(editor, level);
  }

  return true;
}

/**
 * Composable that provides heading functionality for Tiptap editor
 */
export function useHeading(config: UseHeadingConfig) {
  const {
    editor: providedEditor,
    level,
    hideWhenUnavailable = false,
    onToggled,
  } = config;

  const isVisible = ref(true);
  const isActive = ref(false);
  const canToggleState = ref(false);

  const resolveEditor = () => unref(providedEditor);

  const updateState = () => {
    const editor = resolveEditor();
    isVisible.value = shouldShowButton({editor, level, hideWhenUnavailable});
    isActive.value = isHeadingActive(editor, level);
    canToggleState.value = canToggle(editor, level);
  };

  const handleToggle = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleHeading(editor, level);
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

  // Also watch level prop changes
  watch(() => level, updateState);

  return {
    isVisible,
    isActive,
    handleToggle,
    canToggle: canToggleState,
    label: `Heading ${level}`,
    shortcutKeys: HEADING_SHORTCUT_KEYS[level],
    iconName: `remix-h-${level}`,
  };
}
