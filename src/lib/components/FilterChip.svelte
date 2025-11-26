<script>
  import { createEventDispatcher } from "svelte";

  let { title, id, category, color } = $props();
  const dispatch = createEventDispatcher();

  let el;
  let offsetX, offsetY;
  let dragging = false;

  function startDrag(event) {
    if (event.target.closest("button")) {
      // Let the button handle its click, don't start drag
      return;
    }

    const isTouch = event.type.startsWith("touch");
    const point = isTouch ? event.touches[0] : event;
    // console.log(point);
    dragging = true;

    const rect = el.getBoundingClientRect();

    offsetX = point.clientX - rect.left;
    offsetY = point.clientY - rect.top;
    console.log({ rect, offsetX, offsetY });
    // Disable text selection
    document.body.style.userSelect = "none";
    el.style.pointerEvents = "none";

    document.addEventListener(isTouch ? "touchmove" : "mousemove", onMove, {
      passive: false,
    });
    document.addEventListener(isTouch ? "touchend" : "mouseup", onEnd);
  }

  function onMove(event) {
    if (!dragging) return;

    const isTouch = event.type.startsWith("touch");
    const point = isTouch ? event.touches[0] : event;

    event.preventDefault();

    el.style.position = "fixed";
    el.style.left = `${point.clientX - offsetX}px`;
    el.style.top = `${point.clientY - offsetY}px`;
    el.style.zIndex = "999";
  }

  function onEnd(event) {
    dragging = false;

    const isTouch = event.type.startsWith("touch");
    const point = isTouch ? event.changedTouches[0] : event;

    document.body.style.userSelect = "";
    el.style.pointerEvents = "auto";

    document.removeEventListener(isTouch ? "touchmove" : "mousemove", onMove);
    document.removeEventListener(isTouch ? "touchend" : "mouseup", onEnd);

    // temporarily hide dragged element to detect real drop target
    const prevVisibility = el.style.visibility;
    el.style.visibility = "hidden";
    const dropZone = document
      .elementFromPoint(point.clientX, point.clientY)
      ?.closest(".drop-zone");
    el.style.visibility = prevVisibility;

    console.log("dropZone:", dropZone);

    if (dropZone) {
      dispatch("drop", { zone: dropZone.dataset.zone });
    }

    // Reset styling; Svelte will re-parent the element
    requestAnimationFrame(() => {
      if (!el) return;
      el.style.position = "static";
      el.style.left = "";
      el.style.top = "";
      el.style.zIndex = "";
    });
  }
</script>

<div
  bind:this={el}
  class="draggable choices__item choices__item--selectable"
  onmousedown={startDrag}
  ontouchstart={startDrag}
  style={"border: 2px solid " + color}
>
  <span class="choices__item-circle" style={"background: " + color}></span>
  {title}
  <button
    type="button"
    class="choices__button"
    data-button=""
    aria-label={"Remove" + title}
    onclick={() => dispatch("deselect", { id: id })}
  ></button>
</div>

<style>
  :global(.draggable) {
    border: 2px solid rgb(202, 53, 124);
    box-shadow: none;
    cursor: grab;
    display: inline-block;
    touch-action: none; /* Prevent scrolling during touch drag */
  }

  .choices__item.choices__item--selectable {
    --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
      "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    --color-gray-50: oklch(98.5% 0.002 247.839);
    --color-gray-400: oklch(70.7% 0.022 261.325);
    --color-gray-700: oklch(37.3% 0.034 259.733);
    --color-black: #000;
    --color-white: #fff;
    --spacing: 0.25rem;
    --text-xl: 1.25rem;
    --text-xl--line-height: calc(1.75 / 1.25);
    --text-2xl: 1.5rem;
    --text-2xl--line-height: calc(2 / 1.5);
    --font-weight-bold: 700;
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
    --default-transition-duration: 0.15s;
    --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    --default-font-family: var(--font-sans);
    --default-mono-font-family: var(--font-mono);
    text-size-adjust: 100%;
    tab-size: 4;
    font-feature-settings: var(--default-font-feature-settings, normal);
    font-variation-settings: var(--default-font-variation-settings, normal);
    -webkit-tap-highlight-color: transparent;
    --govuk-frontend-version: "5.9.0";
    --govuk-frontend-breakpoint-mobile: 20rem;
    --govuk-frontend-breakpoint-tablet: 40.0625rem;
    --govuk-frontend-breakpoint-desktop: 48.0625rem;
    --tw-duration: 0.2s;
    --tw-ease: var(--ease-in-out);
    --cross-icon-url: url("data:image/svg+xml,%3csvg%20width='21'%20height='21'%20viewBox='0%200%2021%2021'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20fill='%23000'%20fill-rule='evenodd'%3e%3cpath%20d='M2.592.044l18.364%2018.364-2.548%202.548L.044%202.592z'%20/%3e%3cpath%20d='M0%2018.364L18.364%200l2.548%202.548L2.548%2020.912z'%20/%3e%3c/g%3e%3c/svg%3e");
    --choices-item-bg-color: #f3f2f1;
    --choices-item-border-color: #b1b4b6;
    --choices-item-text-color: black;
    --choices-item-divider-padding: 10px;
    --choices-item-border-radius: 5px;
    --selected-chip-bg-color: #fff;
    --selected-item-circle-color: #1d70b8;
    list-style: none;
    font-size: 16px !important;
    padding: 0px 5px !important;
    cursor: default !important;
    margin: 5px 5px 0px 0px !important;
    box-sizing: border-box;
    font-family: "GDS Transport", arial, sans-serif;
    gap: 0px;
    display: inline-flex;
    align-items: center;
    background-color: var(--selected-chip-bg-color, #f3f2f1);
    line-height: 1;
    color: var(--choices-item-text-color, #0b0c0c);
    border-radius: var(--choices-item-border-radius, 0);
    border: 2px solid rgb(202, 53, 124);
    box-shadow: none;
  }

  .choices__item-circle {
    --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
      "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    --color-gray-50: oklch(98.5% 0.002 247.839);
    --color-gray-400: oklch(70.7% 0.022 261.325);
    --color-gray-700: oklch(37.3% 0.034 259.733);
    --color-black: #000;
    --color-white: #fff;
    --spacing: 0.25rem;
    --text-xl: 1.25rem;
    --text-xl--line-height: calc(1.75 / 1.25);
    --text-2xl: 1.5rem;
    --text-2xl--line-height: calc(2 / 1.5);
    --font-weight-bold: 700;
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
    --default-transition-duration: 0.15s;
    --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    --default-font-family: var(--font-sans);
    --default-mono-font-family: var(--font-mono);
    text-size-adjust: 100%;
    tab-size: 4;
    font-feature-settings: var(--default-font-feature-settings, normal);
    font-variation-settings: var(--default-font-variation-settings, normal);
    -webkit-tap-highlight-color: transparent;
    --govuk-frontend-version: "5.9.0";
    --govuk-frontend-breakpoint-mobile: 20rem;
    --govuk-frontend-breakpoint-tablet: 40.0625rem;
    --govuk-frontend-breakpoint-desktop: 48.0625rem;
    --tw-duration: 0.2s;
    --tw-ease: var(--ease-in-out);
    --cross-icon-url: url("data:image/svg+xml,%3csvg%20width='21'%20height='21'%20viewBox='0%200%2021%2021'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20fill='%23000'%20fill-rule='evenodd'%3e%3cpath%20d='M2.592.044l18.364%2018.364-2.548%202.548L.044%202.592z'%20/%3e%3cpath%20d='M0%2018.364L18.364%200l2.548%202.548L2.548%2020.912z'%20/%3e%3c/g%3e%3c/svg%3e");
    --choices-item-bg-color: #f3f2f1;
    --choices-item-border-color: #b1b4b6;
    --choices-item-text-color: black;
    --choices-item-divider-padding: 10px;
    --choices-item-border-radius: 5px;
    --selected-chip-bg-color: #fff;
    --selected-item-circle-color: #1d70b8;
    list-style: none;
    font-size: 16px !important;
    cursor: default !important;
    line-height: 1;
    color: var(--choices-item-text-color, #0b0c0c);
    border-width: 0px;
    border-style: solid;
    border-color: initial;
    border-image: initial;
    margin: 0px;
    padding: 0px;
    box-sizing: border-box;
    font-family: "GDS Transport", arial, sans-serif;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-right: 8px;
    border-radius: 50%;
    padding-right: 6px !important;
    background: rgb(202, 53, 124);
  }

  .choices__button {
    --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
      "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
    --color-gray-50: oklch(98.5% 0.002 247.839);
    --color-gray-400: oklch(70.7% 0.022 261.325);
    --color-gray-700: oklch(37.3% 0.034 259.733);
    --color-black: #000;
    --color-white: #fff;
    --spacing: 0.25rem;
    --text-xl: 1.25rem;
    --text-xl--line-height: calc(1.75 / 1.25);
    --text-2xl: 1.5rem;
    --text-2xl--line-height: calc(2 / 1.5);
    --font-weight-bold: 700;
    --radius-sm: 0.25rem;
    --radius-md: 0.375rem;
    --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
    --default-transition-duration: 0.15s;
    --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    --default-font-family: var(--font-sans);
    --default-mono-font-family: var(--font-mono);
    text-size-adjust: 100%;
    tab-size: 4;
    -webkit-tap-highlight-color: transparent;
    --govuk-frontend-version: "5.9.0";
    --govuk-frontend-breakpoint-mobile: 20rem;
    --govuk-frontend-breakpoint-tablet: 40.0625rem;
    --govuk-frontend-breakpoint-desktop: 48.0625rem;
    --tw-duration: 0.2s;
    --tw-ease: var(--ease-in-out);
    --cross-icon-url: url("data:image/svg+xml,%3csvg%20width='21'%20height='21'%20viewBox='0%200%2021%2021'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20fill='%23000'%20fill-rule='evenodd'%3e%3cpath%20d='M2.592.044l18.364%2018.364-2.548%202.548L.044%202.592z'%20/%3e%3cpath%20d='M0%2018.364L18.364%200l2.548%202.548L2.548%2020.912z'%20/%3e%3c/g%3e%3c/svg%3e");
    --choices-item-bg-color: #f3f2f1;
    --choices-item-border-color: #b1b4b6;
    --choices-item-text-color: black;
    --choices-item-divider-padding: 10px;
    --choices-item-border-radius: 5px;
    --selected-chip-bg-color: #fff;
    --selected-item-circle-color: #1d70b8;
    list-style: none;
    letter-spacing: inherit;
    color: inherit;
    font: inherit;
    text-indent: -9999px;
    appearance: none;
    background-color: rgba(0, 0, 0, 0);
    cursor: pointer;
    border-width: 0px;
    border-style: initial;
    border-image: initial;
    box-sizing: border-box;
    font-family: "GDS Transport", arial, sans-serif;
    width: 30px !important;
    height: 30px !important;
    border-radius: 6px;
    border-left: none !important;
    border-right: none !important;
    margin: 5px 0px 5px 8px !important;
    border-color: rgb(177, 180, 182);
    padding: 10px 20px 10px 10px;
    padding-left: 12px;
    background-image: var(--cross-icon-url);
    background-repeat: no-repeat;
    background-size: 12px;
    opacity: 0.75;
    background-position: center center;
  }

  .choices__item button:hover {
    background-color: rgb(227, 227, 227) !important;
    box-shadow: rgb(80, 90, 95) 0px 0px !important;
  }

  .choices__button:focus {
    background-color: rgb(255, 221, 0);
    box-shadow: rgb(11, 12, 12) 0px 2px;
  }
</style>
