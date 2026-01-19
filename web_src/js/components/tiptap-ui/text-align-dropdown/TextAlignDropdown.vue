<script setup lang="ts">
import {type Editor} from '@tiptap/vue-3';
import {useTextAlign, type TextAlign, ALIGNMENTS, ALIGNMENT_ICONS} from './use-text-align.ts';
import {SvgIcon} from '../../../svg.ts';

const props = defineProps<{
  editor: Editor | null
  hideWhenUnavailable?: boolean
  isOpen: boolean
}>();

const emit = defineEmits<(e: 'toggle'|'close') => void>();

const {
  isVisible,
  currentAlign,
  handleSetAlign,
  currentIconName,
} = useTextAlign(props);

const toggleDropdown = () => {
  emit('toggle');
};

const selectAlign = (align: TextAlign) => {
  handleSetAlign(align);
  emit('close');
};

// Close on outside click could be added later using a directive or composable
</script>

<template>
  <div v-if="isVisible" class="tiptap-dropdown">
    <button
      type="button" class="tiptap-button dropdown-trigger" :aria-expanded="isOpen" @click="toggleDropdown"
      data-tooltip-content="Text Alignment"
    >
      <svg-icon :name="currentIconName" class="tiptap-button-icon"/>
      <svg-icon name="octicon-chevron-down" :size="12"/>
    </button>

    <div v-if="isOpen" class="dropdown-menu">
      <button
        v-for="align in ALIGNMENTS" :key="align" type="button" class="dropdown-item"
        :data-active="currentAlign === align" @click="selectAlign(align)" :data-tooltip-content="align"
      >
        <svg-icon :name="ALIGNMENT_ICONS[align]" class="tiptap-button-icon"/>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tiptap-dropdown {
  position: relative;
  display: inline-block;
}

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

.tiptap-button:hover {
  background: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.tiptap-button-icon {
  width: 16px;
  height: 16px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: var(--color-body);
  border: 1px solid var(--color-secondary-alpha-40);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
  min-width: 47px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  border-radius: 4px;
  width: 100%;
}

.dropdown-item:hover {
  background: var(--color-hover, rgba(0, 0, 0, 0.05));
}

.dropdown-item[data-active="true"] {
  background: var(--color-active-bg, rgba(0, 0, 0, 0.1));
  font-weight: bold;
}
</style>
