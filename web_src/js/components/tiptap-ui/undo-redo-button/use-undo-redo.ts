import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- Lib ---
import {isNodeTypeSelected} from '../tiptap-utils.ts';

export type UndoRedoAction = 'undo' | 'redo'

/**
 * Configuration for the history functionality
 */
type UseUndoRedoConfig = {
    /**
     * The Tiptap editor instance.
     */
    editor: Ref<Editor | null> | Editor | null
    /**
     * The history action to perform (undo or redo).
     */
    action: UndoRedoAction
    /**
     * Whether the button should hide when action is not available.
     * @default false
     */
    hideWhenUnavailable?: boolean
    /**
     * Callback function called after a successful action.
     */
    onExecuted?: () => void
}

const UNDO_REDO_SHORTCUT_KEYS: Record<UndoRedoAction, string> = {
  undo: 'mod+z',
  redo: 'mod+shift+z',
};

const historyActionLabels: Record<UndoRedoAction, string> = {
  undo: 'Undo',
  redo: 'Redo',
};

const historyIcons: Record<UndoRedoAction, string> = {
  undo: 'octicon-undo',
  redo: 'octicon-redo',
};

/**
 * Checks if a history action can be executed
 */
function canExecuteUndoRedoAction(
  editor: Editor | null,
  action: UndoRedoAction,
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (isNodeTypeSelected(editor, ['image'])) return false;

  return action === 'undo' ? editor.can().undo() : editor.can().redo();
}

/**
 * Executes a history action on the editor
 */
function executeUndoRedoAction(
  editor: Editor | null,
  action: UndoRedoAction,
): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!canExecuteUndoRedoAction(editor, action)) return false;

  const chain = editor.chain().focus();
  return action === 'undo' ? chain.undo().run() : chain.redo().run();
}

/**
 * Determines if the history button should be shown
 */
function shouldShowButton(props: {
    editor: Editor | null
    hideWhenUnavailable: boolean
    action: UndoRedoAction
}): boolean {
  const {editor, hideWhenUnavailable, action} = props;

  if (!editor || !editor.isEditable) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canExecuteUndoRedoAction(editor, action);
  }

  return true;
}

/**
 * Composable that provides history functionality for Tiptap editor
 */
export function useUndoRedo(config: UseUndoRedoConfig) {
  const {
    editor: providedEditor,
    action,
    hideWhenUnavailable = false,
    onExecuted,
  } = config;

  const isVisible = ref(true);
  const canExecute = ref(false);

  const resolveEditor = () => unref(providedEditor);

  const updateState = () => {
    const editor = resolveEditor();
    isVisible.value = shouldShowButton({editor, hideWhenUnavailable, action});
    canExecute.value = canExecuteUndoRedoAction(editor, action);
  };

  const handleAction = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = executeUndoRedoAction(editor, action);
    if (success) {
      onExecuted?.();
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

  // Also watch action change? Usually static but good to be safe
  watch(() => action, updateState);

  return {
    isVisible,
    handleAction,
    canExecute,
    label: historyActionLabels[action],
    shortcutKeys: UNDO_REDO_SHORTCUT_KEYS[action],
    iconName: historyIcons[action],
  };
}
