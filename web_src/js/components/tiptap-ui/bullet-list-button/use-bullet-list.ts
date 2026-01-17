import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- UI Utils ---
import {
  isNodeInSchema,
  isNodeTypeSelected,
} from '../tiptap-utils.ts';

const BULLET_LIST_SHORTCUT_KEY = 'mod+shift+8';

/**
 * Configuration for the bullet list functionality
 */
type UseBulletListConfig = {
  editor: Ref<Editor | null> | Editor | null
  hideWhenUnavailable?: boolean
  onToggled?: () => void
}

function canToggleBulletList(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (
    !isNodeInSchema('bulletList', editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) return false;

  return editor.can().toggleBulletList();
}

function toggleBulletList(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleBulletList(editor)) return false;

  return editor.chain().focus().toggleBulletList().run();
}

function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('bulletList', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleBulletList(editor);
  }

  return true;
}

export function useBulletList(config: UseBulletListConfig) {
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
    canToggle.value = canToggleBulletList(editor);
    isActive.value = editor?.isActive('bulletList') || false;
  };

  const handleToggle = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleBulletList(editor);
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
    label: 'Bullet List',
    shortcutKeys: BULLET_LIST_SHORTCUT_KEY,
    iconName: 'octicon-list-unordered',
  };
}
