import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- Lib ---
import {isMarkInSchema, isNodeTypeSelected} from '../tiptap-utils.ts';

export type MarkType =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'underline'
  | 'superscript'
  | 'subscript'

/**
 * Configuration for the mark functionality
 */
type UseMarkConfig = {
  /**
   * The Tiptap editor instance.
   */
  editor: Ref<Editor | null> | Editor | null
  /**
   * The type of mark to toggle
   */
  type: MarkType
  /**
   * Whether the button should hide when mark is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful mark toggle.
   */
  onToggled?: () => void
}

const markIcons = {
  bold: 'octicon-bold',
  italic: 'octicon-italic',
  underline: 'remix-underline',
  strike: 'octicon-strikethrough',
  code: 'octicon-code',
  superscript: 'remix-superscript-2',
  subscript: 'remix-subscript-2',
};

const MARK_SHORTCUT_KEYS: Record<MarkType, string> = {
  bold: 'mod+b',
  italic: 'mod+i',
  underline: 'mod+u',
  strike: 'mod+shift+s',
  code: 'mod+e',
  superscript: 'mod+.',
  subscript: 'mod+,',
};

/**
 * Checks if a mark can be toggled in the current editor state
 */
function canToggleMark(editor: Editor | null, type: MarkType): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isMarkInSchema(type, editor) || isNodeTypeSelected(editor, ['image'])) return false;

  return editor.can().toggleMark(type);
}

/**
 * Checks if a mark is currently active
 */
function isMarkActive(editor: Editor | null, type: MarkType): boolean {
  if (!editor || !editor.isEditable) return false;
  return editor.isActive(type);
}

/**
 * Toggles a mark in the editor
 */
function toggleMark(editor: Editor | null, type: MarkType): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleMark(editor, type)) return false;

  return editor.chain().focus().toggleMark(type).run();
}

/**
 * Determines if the mark button should be shown
 */
function shouldShowButton(props: {
  editor: Editor | null
  type: MarkType
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, type, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isMarkInSchema(type, editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleMark(editor, type);
  }

  return true;
}

/**
 * Gets the formatted mark name
 */
function getFormattedMarkName(type: MarkType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Composable that provides mark functionality for Tiptap editor
 */
export function useMark(config: UseMarkConfig) {
  const {
    editor: providedEditor,
    type,
    hideWhenUnavailable = false,
    onToggled,
  } = config;

  const isVisible = ref(true);
  const canToggle = ref(false);
  const isActive = ref(false);

  const resolveEditor = () => unref(providedEditor);

  const updateState = () => {
    const editor = resolveEditor();
    isVisible.value = shouldShowButton({editor, type, hideWhenUnavailable});
    canToggle.value = canToggleMark(editor, type);
    isActive.value = isMarkActive(editor, type);
  };

  const handleMark = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleMark(editor, type);
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

  // Also watch type change
  watch(() => type, updateState);

  return {
    isVisible,
    isActive,
    handleMark,
    canToggle,
    label: getFormattedMarkName(type),
    shortcutKeys: MARK_SHORTCUT_KEYS[type],
    iconName: markIcons[type],
  };
}
