import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- UI Utils ---
import {
  isNodeInSchema,
  isNodeTypeSelected,
} from '../tiptap-utils.ts';

const ORDERED_LIST_SHORTCUT_KEY = 'mod+shift+7';

/**
 * Configuration for the ordered list functionality
 */
type UseOrderedListConfig = {
  editor: Ref<Editor | null> | Editor | null
  hideWhenUnavailable?: boolean
  onToggled?: () => void
}

function canToggleOrderedList(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (
    !isNodeInSchema('orderedList', editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) return false;

  return editor.can().toggleOrderedList();
}

function toggleOrderedList(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleOrderedList(editor)) return false;

  return editor.chain().focus().toggleOrderedList().run();
}

function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('orderedList', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleOrderedList(editor);
  }

  return true;
}

export function useOrderedList(config: UseOrderedListConfig) {
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
    canToggle.value = canToggleOrderedList(editor);
    isActive.value = editor?.isActive('orderedList') || false;
  };

  const handleToggle = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleOrderedList(editor);
    if (success) {
      onToggled?.();
    }
    return success;
  };

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
    canToggle,
    label: 'Ordered List',
    shortcutKeys: ORDERED_LIST_SHORTCUT_KEY,
    iconName: 'octicon-list-ordered',
  };
}
