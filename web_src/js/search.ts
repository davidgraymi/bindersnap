import {hideElem, showElem} from './utils/dom.ts';

function onSearchTextChange(ta: HTMLTextAreaElement, ci: HTMLElement) {
  // adjust the height
  ta.style.height = 'auto';
  const h = ta.scrollHeight + 6;
  ta.style.height = `${h}px`;
  // display clear icon
  if (ta.value !== '') {
    showElem(ci);
  } else {
    hideElem(ci);
  }
}

function initHub() {
  const searchBar = document.querySelector<HTMLElement>('.search-bar');
  if (!searchBar) return;
  const belowSearchContainer = document.querySelector<HTMLElement>('.search-predict-show');
  if (!belowSearchContainer) return;
  const clearIcon = document.querySelector<HTMLElement>('.search-icon-clear');
  if (!clearIcon) return;
  const searchInputArea = document.querySelector<HTMLElement>('.search-input-area');
  if (!searchInputArea) return;
  const textArea = document.querySelector<HTMLTextAreaElement>('.search-input-area textarea.search-input');
  if (!textArea) return;
  const elForm = document.querySelector<HTMLFormElement>('.search-form form');
  if (!elForm) return;

  function onSearchTextAreaFocus(this: HTMLTextAreaElement, _ev: FocusEvent) {
    showElem(belowSearchContainer);
    searchBar.style.borderRadius = '24px 24px 0 0';
    searchBar.style.background = 'var(--color-search-bar-background-hover)';
    searchBar.style.boxShadow = 'var(--shadow-search-box-hover)';
    searchBar.style.borderColor = 'transparent';
    // TODO: add dark mode focus darkening
  }
  function onSearchTextAreaBlur(this: HTMLTextAreaElement, _ev: FocusEvent) {
    hideElem(belowSearchContainer);
    searchBar.style.background = 'var(--color-search-bar-background)';
    searchBar.style.border = '1px solid var(--color-search-bar-border)';
    searchBar.style.boxShadow = 'var(--shadow-search-box)';
    searchBar.style.borderRadius = '24px';
  }

  searchBar.addEventListener('click', () => {
    textArea.focus();
  });
  textArea.addEventListener('focus', onSearchTextAreaFocus);
  textArea.addEventListener('blur', onSearchTextAreaBlur);
  textArea.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.code === 'Enter' && !ev.shiftKey) {
      elForm.submit();
      ev.preventDefault(); // Prevents the addition of a new line in the text field
    }
  });
  clearIcon.addEventListener('click', () => {
    textArea.value = '';
    textArea.focus();
    hideElem(clearIcon);
    textArea.style.height = '46px';
  });
  if (textArea.addEventListener) {
    textArea.addEventListener('input', () => {
      // event handling code for sane browsers
      onSearchTextChange(textArea, clearIcon);
    }, false);
  }
}

function initSearchHub() {
  const searchBar = document.querySelector<HTMLElement>('.psearch-bar');
  if (!searchBar) return;
  // const belowSearchContainer = document.querySelector<HTMLElement>('.search-predict-show');
  // if (!belowSearchContainer) return;
  const clearIcon = document.querySelector<HTMLElement>('.search-icon-clear');
  if (!clearIcon) return;
  const searchInputArea = document.querySelector<HTMLElement>('.search-input-area');
  if (!searchInputArea) return;
  const textArea = document.querySelector<HTMLTextAreaElement>('.search-input-area textarea.search-input');
  if (!textArea) return;
  const elForm = document.querySelector<HTMLFormElement>('form');
  if (!elForm) return;

  function onSearchTextAreaFocus(this: HTMLTextAreaElement, _ev: FocusEvent) {
    // showElem(belowSearchContainer);
    searchBar.style.borderRadius = '24px 24px 0 0';
    searchBar.style.background = 'var(--color-search-bar-background-hover)';
    searchBar.style.boxShadow = 'var(--shadow-search-box-hover)';
    searchBar.style.borderColor = 'transparent';
    // TODO: add dark mode focus darkening
  }
  function onSearchTextAreaBlur(this: HTMLTextAreaElement, _ev: FocusEvent) {
    // hideElem(belowSearchContainer);
    searchBar.style.background = 'var(--color-search-bar-background)';
    searchBar.style.border = '1px solid var(--color-search-bar-border)';
    searchBar.style.boxShadow = 'var(--shadow-search-box)';
    searchBar.style.borderRadius = '24px';
  }

  searchBar.addEventListener('click', () => {
    textArea.focus();
  });
  textArea.addEventListener('focus', onSearchTextAreaFocus);
  textArea.addEventListener('blur', onSearchTextAreaBlur);
  textArea.addEventListener('keydown', (ev: KeyboardEvent) => {
    if (ev.code === 'Enter' && !ev.shiftKey) {
      elForm.submit();
      ev.preventDefault(); // Prevents the addition of a new line in the text field
    }
  });
  clearIcon.addEventListener('click', () => {
    textArea.value = '';
    textArea.focus();
    hideElem(clearIcon);
    textArea.style.height = '46px';
  });
  if (textArea.addEventListener) {
    textArea.addEventListener('input', () => {
      // event handling code for sane browsers
      onSearchTextChange(textArea, clearIcon);
    }, false);
  }
}

export function initSearch() {
  initHub();
  initSearchHub();
}

window.addEventListener('beforeunload', (event) => {
  event.stopImmediatePropagation();
});
