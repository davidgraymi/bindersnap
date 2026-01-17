import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref} from 'vue';

// --- UI Utils ---
import {isMarkInSchema, isNodeTypeSelected} from '../tiptap-utils.ts';

const LINK_SHORTCUT_KEY = 'mod+k';

type UseLinkConfig = {
  editor: Ref<Editor | null> | Editor | null
  hideWhenUnavailable?: boolean
  onToggled?: () => void
}

function canToggleLink(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isMarkInSchema('link', editor) || isNodeTypeSelected(editor, ['image'])) return false;

  return true; // Always possible if schema supports it, we just need to handle URL input
}

function isLinkActive(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  return editor.isActive('link');
}

function toggleLink(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;

  const previousUrl = editor.getAttributes('link').href;
  // Simple prompt for now, user might want custom modal later
  const url = window.prompt('URL', previousUrl);

  if (url === null) {
    return false; // Cancelled
  }

  if (url === '') {
    return editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .unsetLink()
      .run();
  }

  return editor
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({href: url})
    .run();
}

function shouldShowButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const {editor, hideWhenUnavailable} = props;

  if (!editor || !editor.isEditable) return false;
  if (!isMarkInSchema('link', editor)) return false;

  if (hideWhenUnavailable && !editor.isActive('code')) {
    return canToggleLink(editor);
  }

  return true;
}

export function useLink(config: UseLinkConfig) {
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
    canToggle.value = canToggleLink(editor);
    isActive.value = isLinkActive(editor);
  };

  const handleToggle = () => {
    const editor = resolveEditor();
    if (!editor) return false;

    const success = toggleLink(editor);
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
    label: 'Link',
    shortcutKeys: LINK_SHORTCUT_KEY,
    iconName: 'octicon-link',
  };
}
