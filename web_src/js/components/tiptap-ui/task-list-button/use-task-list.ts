import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- UI Utils ---
import {
  isNodeInSchema,
  isNodeTypeSelected,
} from '../tiptap-utils.ts';

const TASK_LIST_SHORTCUT_KEY = 'mod+shift+9';

/**
 * Configuration for the task list functionality
 */
type UseTaskListConfig = {
  editor: Ref<Editor | null> | Editor | null
  hideWhenUnavailable?: boolean
  onToggled?: () => void
}

function canToggleTaskList(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (
    !isNodeInSchema('taskList', editor) ||
    isNodeTypeSelected(editor, ['image'])
  ) return false;

  return editor.can().toggleTaskList();
}

function toggleTaskList(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canToggleTaskList(editor)) return false;

  return editor.chain().focus().toggleTaskList().run();
}

function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isNodeInSchema('taskList', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleTaskList(editor);
  }

  return true;
}

export function useTaskList(config: UseTaskListConfig) {
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
    canToggle.value = canToggleTaskList(editor);
    isActive.value = editor?.isActive('taskList') || false;
  };

  const handleToggle = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleTaskList(editor);
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
    label: 'Task List',
    shortcutKeys: TASK_LIST_SHORTCUT_KEY,
    iconName: 'octicon-tasklist',
  };
}
