import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- UI Utils ---
import {isNodeInSchema} from '../tiptap-utils.ts';

const HORIZONTAL_RULE_SHORTCUT_KEY = 'mod+alt+-'; // Example/Default shortcut if any, or null

type UseHorizontalRuleConfig = {
  editor: Ref<Editor | null> | Editor | null
  hideWhenUnavailable?: boolean
  onInserted?: () => void
}

function canInsertHorizontalRule(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('horizontalRule', editor)) return false;

  return editor.can().setHorizontalRule();
}

function insertHorizontalRule(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canInsertHorizontalRule(editor)) return false;

  return editor.chain().focus().setHorizontalRule().run();
}

function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('horizontalRule', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canInsertHorizontalRule(editor);
  }

  return true;
}

export function useHorizontalRule(config: UseHorizontalRuleConfig) {
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
    canInsert.value = canInsertHorizontalRule(editor);
  };

  const handleInsert = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = insertHorizontalRule(editor);
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
    label: 'Horizontal Rule',
    shortcutKeys: HORIZONTAL_RULE_SHORTCUT_KEY,
    iconName: 'octicon-horizontal-rule',
  };
}
