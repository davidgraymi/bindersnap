<script setup lang="ts">
import {type Editor} from '@tiptap/vue-3';
import {
  useUndoRedo,
  type UndoRedoAction,
} from './use-undo-redo.ts';
import {computed} from 'vue';
import {parseShortcutKeys} from '../tiptap-utils.ts';
import {SvgIcon} from '../../../svg.ts';

const props = defineProps<{
  /**
   * The editor instance to use for the history functionality
   */
  editor: Editor | null
  /**
   * The action to perform (undo or redo)
   */
  action: UndoRedoAction
  /**
   * Optional text to display next to the icon
   */
  text?: string
  /**
   * Whether to hide the button when the action is unavailable
   */
  hideWhenUnavailable?: boolean
  /**
   * Whether to show the shortcut keys
   */
  showShortcut?: boolean
  /**
   * Callback function to execute when the action is performed
   */
  onExecuted?:() => void
}>();

const {
  isVisible,
  handleAction,
  canExecute,
  label,
  iconName,
  shortcutKeys,
} = useUndoRedo(props);

const shortcutLabel = computed(() => {
  if (!props.showShortcut || !shortcutKeys) return '';
  return parseShortcutKeys({shortcutKeys}).join(' ');
});

const onClick = () => {
  if (handleAction()) {
    props.onExecuted?.();
  }
};
</script>

<template>
  <button
    v-if="isVisible" type="button" class="tiptap-button" data-style="ghost" :disabled="!canExecute"
    :data-disabled="!canExecute" :aria-label="label" :data-tooltip-content="label" @click="onClick"
  >
    <svg-icon :name="iconName" class="tiptap-button-icon"/>
    <span v-if="text" class="tiptap-button-text">{{ text }}</span>
    <span v-if="showShortcut" class="tiptap-button-shortcut">{{ shortcutLabel }}</span>
  </button>
</template>

<style scoped>
.tiptap-button {
  background: transparent;
  border-radius: 5px;
  margin: 0 1px;
  padding: 5px;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  gap: 0.25rem;
}

.tiptap-button:hover:not(:disabled) {
  background: var(--color-hover);
}

.tiptap-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tiptap-button-icon {
  width: 16px;
  height: 16px;
}

.tiptap-button-text {
  font-size: 0.875rem;
}

.tiptap-button-shortcut {
  font-size: 0.75rem;
  opacity: 0.6;
  background: var(--color-secondary-bg);
  padding: 0 4px;
  border-radius: 4px;
}
</style>
