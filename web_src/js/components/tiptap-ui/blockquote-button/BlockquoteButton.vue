<script setup lang="ts">
import {type Editor} from '@tiptap/vue-3';
import {useBlockquote} from './use-blockquote.ts';
import {computed} from 'vue';
import {parseShortcutKeys} from '../tiptap-utils.ts';
import {SvgIcon} from '../../../svg.ts';

const props = defineProps<{
  editor: Editor | null
  text?: string
  hideWhenUnavailable?: boolean
  showShortcut?: boolean
  onToggled?:() => void
}>();

const {
  isVisible,
  isActive,
  canToggle,
  handleToggle,
  label,
  iconName,
  shortcutKeys,
} = useBlockquote(props);

const shortcutLabel = computed(() => {
  if (!props.showShortcut || !shortcutKeys) return '';
  return parseShortcutKeys({shortcutKeys}).join(' ');
});

const onClick = () => {
  handleToggle();
};
</script>

<template>
  <button
    v-if="isVisible" type="button" class="tiptap-button" data-style="ghost"
    :data-active-state="isActive ? 'on' : 'off'" :disabled="!canToggle" :data-disabled="!canToggle" :aria-label="label"
    :data-tooltip-content="label" :aria-pressed="isActive" @click="onClick"
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

.tiptap-button[data-active-state="on"] {
  background: var(--color-active);
  color: var(--color-active-text, inherit);
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
