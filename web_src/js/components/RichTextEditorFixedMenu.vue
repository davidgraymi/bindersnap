<script setup lang="ts">
import type {Editor} from '@tiptap/vue-3';
import {ref, computed, onMounted, onBeforeUnmount} from 'vue';
import {SvgIcon} from '../svg.ts';

// Tiptap UI Components
import BlockquoteButton from './tiptap-ui/blockquote-button/BlockquoteButton.vue';
import BulletListButton from './tiptap-ui/bullet-list-button/BulletListButton.vue';
import CodeBlockButton from './tiptap-ui/code-block-button/CodeBlockButton.vue';
import HeadingButton from './tiptap-ui/heading-button/HeadingButton.vue';
import ImageButton from './tiptap-ui/image-button/ImageButton.vue';
import LinkButton from './tiptap-ui/link-button/LinkButton.vue';
import MarkButton from './tiptap-ui/mark-button/MarkButton.vue';
import OrderedListButton from './tiptap-ui/ordered-list-button/OrderedListButton.vue';
import TaskListButton from './tiptap-ui/task-list-button/TaskListButton.vue';
import TextAlignDropdown from './tiptap-ui/text-align-dropdown/TextAlignDropdown.vue';
import UndoRedoButton from './tiptap-ui/undo-redo-button/UndoRedoButton.vue';

const props = defineProps<{
  editor: Editor,
}>();

// Toolbar ref for click outside detection
const toolbarRef = ref<HTMLElement | null>(null);

// Dropdown state
const headingDropdownOpen = ref(false);
const listDropdownOpen = ref(false);
const textAlignDropdownOpen = ref(false);

// Theme state
const isDarkMode = ref(document.documentElement.classList.contains('gitea-dark'));

// Heading levels configuration
const headingLevels = [1, 2, 3, 4, 5, 6] as const;

// Get current heading level for button display
const currentHeadingLevel = computed(() => {
  for (const level of headingLevels) {
    if (props.editor?.isActive('heading', {level})) {
      return level;
    }
  }
  return null;
});

// Theme toggle function
function toggleTheme() {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'gitea-dark' : 'gitea-light');
}

// Close dropdowns when clicking outside
function closeDropdowns() {
  headingDropdownOpen.value = false;
  listDropdownOpen.value = false;
  textAlignDropdownOpen.value = false;
}

// Global click handler to close dropdowns when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (toolbarRef.value && !toolbarRef.value.contains(event.target as Node)) {
    closeDropdowns();
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <div v-if="props.editor" ref="toolbarRef" class="toolbar" @click.self="closeDropdowns">
    <!-- History Group -->
    <div class="toolbar-group">
      <UndoRedoButton :editor="editor" action="undo"/>
      <UndoRedoButton :editor="editor" action="redo"/>
    </div>

    <div class="toolbar-separator"/>

    <!-- Block Group: Heading, Lists, Blockquote, Code Block -->
    <div class="toolbar-group">
      <!-- Heading Dropdown -->
      <div class="dropdown-container">
        <button
          type="button" class="toolbar-button dropdown-trigger"
          :class="{'is-active': currentHeadingLevel !== null}" data-tooltip-content="Heading"
          @click.stop="headingDropdownOpen = !headingDropdownOpen; listDropdownOpen = false; textAlignDropdownOpen = false"
        >
          <svg-icon name="octicon-heading"/>
          <svg-icon name="octicon-chevron-down" :size="12"/>
        </button>
        <div v-if="headingDropdownOpen" class="dropdown-menu dropdown-vertical">
          <HeadingButton
            v-for="level in headingLevels" :key="level" :editor="editor" :level="level"
            :data-tooltip-content="`Heading ${level}`" @click="headingDropdownOpen = false"
          />
        </div>
      </div>

      <!-- List Dropdown -->
      <div class="dropdown-container">
        <button
          type="button" class="toolbar-button dropdown-trigger"
          :class="{'is-active': editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')}"
          data-tooltip-content="List"
          @click.stop="listDropdownOpen = !listDropdownOpen; headingDropdownOpen = false; textAlignDropdownOpen = false"
        >
          <svg-icon name="octicon-list-unordered"/>
          <svg-icon name="octicon-chevron-down" :size="12"/>
        </button>
        <div v-if="listDropdownOpen" class="dropdown-menu dropdown-vertical">
          <BulletListButton :editor="editor" @click="listDropdownOpen = false"/>
          <OrderedListButton :editor="editor" @click="listDropdownOpen = false"/>
          <TaskListButton :editor="editor" @click="listDropdownOpen = false"/>
        </div>
      </div>

      <!-- Blockquote -->
      <BlockquoteButton :editor="editor"/>

      <!-- Code Block -->
      <CodeBlockButton :editor="editor"/>
    </div>

    <div class="toolbar-separator"/>

    <!-- Inline Formatting Group -->
    <div class="toolbar-group">
      <MarkButton :editor="editor" type="bold"/>
      <MarkButton :editor="editor" type="italic"/>
      <MarkButton :editor="editor" type="strike"/>
      <MarkButton :editor="editor" type="underline"/>
      <LinkButton :editor="editor"/>
      <MarkButton :editor="editor" type="superscript"/>
      <MarkButton :editor="editor" type="subscript"/>
      <MarkButton :editor="editor" type="code"/>
    </div>

    <div class="toolbar-separator"/>

    <!-- Alignment Group -->
    <div class="toolbar-group">
      <TextAlignDropdown
        :editor="editor" :is-open="textAlignDropdownOpen"
        @toggle="textAlignDropdownOpen = !textAlignDropdownOpen; headingDropdownOpen = false; listDropdownOpen = false"
        @close="textAlignDropdownOpen = false"
      />
    </div>

    <div class="toolbar-separator"/>

    <!-- Actions Group -->
    <div class="toolbar-group">
      <ImageButton :editor="editor" class="toolbar-button add-button"/>

      <button
        type="button" class="toolbar-button" @click="toggleTheme"
        :data-tooltip-content="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <svg-icon :name="isDarkMode ? 'octicon-sun' : 'octicon-moon'"/>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: var(--color-box-header);
  border-radius: 25px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-separator {
  width: 1px;
  height: 20px;
  background: var(--color-secondary-alpha-40);
  margin: 0 4px;
}

.toolbar-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  min-width: 32px;
  height: 32px;
}

.toolbar-button:hover:not(:disabled) {
  background: var(--color-hover);
}

.toolbar-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-button.is-active {
  background: var(--color-active);
}

.dropdown-container {
  position: relative;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  gap: 2px;
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

.dropdown-vertical {
  display: flex;
  flex-direction: column;
}

/* Style tiptap-ui components to match toolbar buttons */
:deep(.tiptap-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  min-width: 32px;
  height: 32px;
}

:deep(.tiptap-button:hover:not(:disabled)) {
  background: var(--color-hover);
}

:deep(.tiptap-button:disabled) {
  opacity: 0.4;
  cursor: not-allowed;
}

:deep(.tiptap-button[data-active-state="on"]) {
  background: var(--color-active);
}

:deep(.tiptap-button-icon) {
  width: 16px;
  height: 16px;
}
</style>
