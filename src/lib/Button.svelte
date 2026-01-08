<script>
  import Icon from "./MaterialIcon.svelte";

  let {
    textContent = undefined,
    buttonType,
    componentNameProp = undefined,
    onClickFunction = undefined,
    onKeydownFunction = undefined,
    noPadding = false,
  } = $props();

  let buttonClass = $derived(
    buttonType === "default"
      ? "govuk-button"
      : buttonType === "secondary"
        ? "govuk-button govuk-button--secondary"
        : buttonType === "warning"
          ? "govuk-button govuk-button--warning"
          : buttonType === "dark background"
            ? "govuk-button govuk-button--inverse"
            : undefined
  );
</script>

{#if noPadding}
  {#if buttonType === "moreInfo"}
    <div>
      <button
        class="more-info-button"
        onclick={onClickFunction}
        onkeydown={onKeydownFunction}
        aria-label={textContent}
      >
        <Icon kind="info" />
      </button>
    </div>
  {:else if buttonType === "start"}
    <a
      href={"#"}
      role="button"
      draggable="false"
      class="govuk-button govuk-button--start"
      data-module="govuk-button"
      onclick={onClickFunction}
      onkeydown={onKeydownFunction}
    >
      {textContent}
      <svg
        class="govuk-button__start-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="17.5"
        height="19"
        viewBox="0 0 33 40"
        aria-hidden="true"
        focusable="false"
      >
        <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z"></path>
      </svg>
    </a>
  {:else if buttonType === "disabled"}
    <button
      type="submit"
      disabled
      aria-disabled="true"
      class="govuk-button"
      data-module="govuk-button"
      onclick={onClickFunction}
      onkeydown={onKeydownFunction}
    >
      {textContent}
    </button>
  {:else if buttonType === "table header"}
    <button
      type="button"
      class="text-header"
      onclick={onClickFunction}
      onkeydown={onKeydownFunction}
    >
      {textContent}
      <svg
        width="22"
        height="22"
        focusable="false"
        aria-hidden="true"
        role="img"
        viewBox="0 0 22 22"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          class="top-triangle"
          d="M8.1875 9.5L10.9609 3.95703L13.7344 9.5H8.1875Z"
          fill="currentColor"
        ></path>
        <path
          class="bottom-triangle"
          d="M13.7344 12.0781L10.9609 17.6211L8.1875 12.0781H13.7344Z"
          fill="currentColor"
        ></path>
      </svg>
    </button>
  {:else if buttonType === "link"}
    <button
      type="submit"
      class="link-button app-c-filter-summary__clear-filters govuk-link"
      onclick={onClickFunction}
      onkeydown={onKeydownFunction}
    >
      {textContent}
    </button>
  {:else}
    <button
      type="submit"
      class={buttonClass}
      data-module="govuk-button"
      onclick={onClickFunction}
      onkeydown={onKeydownFunction}
    >
      {textContent}
    </button>
  {/if}
{:else}
  <div class="p-4">
    {#if buttonType === "start"}
      <a
        href={"#"}
        role="button"
        draggable="false"
        class="govuk-button govuk-button--start"
        data-module="govuk-button"
        onclick={onClickFunction}
        onkeydown={onKeydownFunction}
      >
        {textContent}
        <svg
          class="govuk-button__start-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="17.5"
          height="19"
          viewBox="0 0 33 40"
          aria-hidden="true"
          focusable="false"
        >
          <path fill="currentColor" d="M0 0h13l20 20-20 20H0l20-20z"></path>
        </svg>
      </a>
    {:else if buttonType === "disabled"}
      <button
        type="submit"
        disabled
        aria-disabled="true"
        class="govuk-button"
        data-module="govuk-button"
        onclick={onClickFunction}
        onkeydown={onKeydownFunction}
      >
        {textContent}
      </button>
    {:else if buttonType === "table header"}
      <button
        type="button"
        class="text-header"
        onclick={onClickFunction}
        onkeydown={onKeydownFunction}
      >
        {textContent}
        <svg
          width="22"
          height="22"
          focusable="false"
          aria-hidden="true"
          role="img"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            class="top-triangle"
            d="M8.1875 9.5L10.9609 3.95703L13.7344 9.5H8.1875Z"
            fill="currentColor"
          ></path>
          <path
            class="bottom-triangle"
            d="M13.7344 12.0781L10.9609 17.6211L8.1875 12.0781H13.7344Z"
            fill="currentColor"
          ></path>
        </svg>
      </button>
    {:else if buttonType === "link"}
      <button
        type="submit"
        class="link-button app-c-filter-summary__clear-filters govuk-link"
        onclick={onClickFunction}
        onkeydown={onKeydownFunction}
      >
        {textContent}
      </button>
    {:else}
      <button
        type="button"
        class={buttonClass}
        data-module="govuk-button"
        onclick={onClickFunction}
        onkeydown={onKeydownFunction}
      >
        {textContent}
      </button>
    {/if}
  </div>
{/if}

<style>
  .text-header {
    display: flex;
    color: #005ea5;
    -webkit-appearance: button;
    background-color: transparent;
    background-image: none;
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: #e5e7eb;
    cursor: pointer;
    text-transform: none;
    font-family: inherit;
    font-feature-settings: inherit;
    font-variation-settings: inherit;
    font-size: 100%;
    font-weight: inherit;
    line-height: inherit;
    letter-spacing: inherit;

    margin: 0;
    padding: 0;
  }

  .link-button:not(:hover) {
    background: none; /* Removes background */
    border: none; /* Removes border */
    font-size: unset;
    color: #1d70b8;
  }

  .link-button:hover {
    background: none; /* Removes background */
    border: none; /* Removes border */
    font-size: unset;
    /* color: #1d70b8; */
  }

  .more-info-button {
    display: flex;
    flex: none;
    font-size: 1.25rem;
    padding-top: 2px;
    transition: all 75ms ease;
    cursor: pointer;

    letter-spacing: inherit;
    color: inherit;
    opacity: 1;
    background-color: rgba(0, 0, 0, 0);
    font: inherit;
    border-radius: 0px;

    box-sizing: border-box;
    border-width: 0px;
    border-style: solid;
    border-color: initial;
    border-image: initial;
    margin: 0px;
    padding: 0px;
  }

  /* For the scale on hover of group parent */
  :hover .more-info-button {
    transform: scale(1.25);
  }
  .more-info-button.custom-ring {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 1);
  }
</style>
