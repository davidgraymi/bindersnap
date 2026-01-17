import {type Editor} from '@tiptap/vue-3';
import {ref, watch, onBeforeUnmount, type Ref, unref, computed} from 'vue';

// --- UI Utils ---

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export const ALIGNMENTS: TextAlign[] = ['left', 'center', 'right', 'justify'];

export const ALIGNMENT_ICONS: Record<TextAlign, string> = {
  left: 'remix-align-left',
  center: 'remix-align-center',
  right: 'remix-align-right',
  justify: 'remix-align-justify',
};

type UseTextAlignConfig = {
  editor: Ref<Editor | null> | Editor | null
  hideWhenUnavailable?: boolean
}

function canSetTextAlign(editor: Editor | null, align: TextAlign): boolean {
  if (!editor || !editor.isEditable) return false;
  // Assuming 'textAlign' extension is used.
  return editor.can().setTextAlign(align);
}

function setTextAlign(editor: Editor | null, align: TextAlign): boolean {
  if (!editor || !editor.isEditable) return false;
  return editor.chain().focus().setTextAlign(align).run();
}

function getActiveTextAlign(editor: Editor | null): TextAlign {
  if (!editor) return 'left';
  if (editor.isActive({textAlign: 'center'})) return 'center';
  if (editor.isActive({textAlign: 'right'})) return 'right';
  if (editor.isActive({textAlign: 'justify'})) return 'justify';
  return 'left';
}

export function useTextAlign(config: UseTextAlignConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
  } = config;

  const isVisible = ref(true);
  const currentAlign = ref<TextAlign>('left');

  const resolveEditor = () => unref(providedEditor);

  const updateState = () => {
    const editor = resolveEditor();
    // Visibility: simpler logic, always show if extension might be active?
    // Or check if 'textAlign' is in schema? usually attributes on nodes.
    // For now always true unless strict check needed.
    // Actually check if any align is possible.
    const canAlignLeft = canSetTextAlign(editor, 'left');
    if (hideWhenUnavailable && !canAlignLeft) {
      isVisible.value = false;
    } else {
      isVisible.value = true;
    }

    currentAlign.value = getActiveTextAlign(editor);
  };

  const handleSetAlign = (align: TextAlign) => {
    const editor = resolveEditor();
    if (!editor) return false;
    return setTextAlign(editor, align);
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

  // Computed icon based on current align
  const currentIconName = computed(() => ALIGNMENT_ICONS[currentAlign.value] || ALIGNMENT_ICONS.left);

  return {
    isVisible,
    currentAlign,
    handleSetAlign,
    currentIconName,
    alignments: ALIGNMENTS,
    icons: ALIGNMENT_ICONS,
  };
}
