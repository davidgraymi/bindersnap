import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- UI Utils ---
import {isNodeInSchema} from '../tiptap-utils.ts';

const IMAGE_SHORTCUT_KEY = 'mod+shift+i'; // Example shortcut

type UseImageConfig = {
  editor: Ref<Editor | null> | Editor | null
  hideWhenUnavailable?: boolean
  onInserted?: () => void
}

function canInsertImage(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('image', editor)) return false;

  return editor.can().setImage({src: ''});
}

function insertImage(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canInsertImage(editor)) return false;

  const url = window.prompt('Image URL');
  if (!url) return false;

  return editor.chain().focus().setImage({src: url}).run();
}

function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('image', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canInsertImage(editor);
  }

  return true;
}

export function useImage(config: UseImageConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onInserted,
  } = config;

  const isVisible = ref(true);
  const canInsert = ref(false);

  const resolveEditor = () => unref(providedEditor);

  const updateState = () => {
    const editor = resolveEditor();
    isVisible.value = shouldShowButton({editor, hideWhenUnavailable});
    canInsert.value = canInsertImage(editor);
  };

  const handleInsert = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = insertImage(editor);
    if (success) {
      onInserted?.();
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
    handleInsert,
    canInsert,
    label: 'Image',
    shortcutKeys: IMAGE_SHORTCUT_KEY,
    iconName: 'octicon-image',
  };
}
