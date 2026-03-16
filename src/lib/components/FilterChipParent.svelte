<script>
  import { createEventDispatcher } from "svelte";
  import FilterChip from "./FilterChip.svelte";
  import { makeFileNameReadable } from "$lib/utils";
  import Button from "./Button.svelte";

  let {
    startingPosition,
    selectedSubLayers,
    selected = $bindable(),
    policyLens = $bindable(),
    categoryToColor,
    openPanelAndScrollToMap,
  } = $props();

  const dispatch = createEventDispatcher();

  // Unified chip data for both zones
  const chipData = $derived.by(() => {
    const all = {};
    const ids = [...(selected ?? []), policyLens].filter(Boolean);
    for (const id of ids) {
      const found = startingPosition?.find((d) => d.filename === id);
      if (found) {
        all[id] = {
          id: found.filename,
          title: makeFileNameReadable(found.filename),
          category: found.Tier,
          color: categoryToColor[found.Tier],
          subLayers: selectedSubLayers[found.filename],
        };
      }
    }
    return all;
  });
  //   $inspect(chipData);

  // Zones derived from selected + policyLens
  const zones = $derived.by(() => ({
    zone1: policyLens ? [policyLens] : [],
    zone2: selected ?? [],
  }));

  // Categories per zone
  const zoneCategories = $derived.by(() =>
    Object.fromEntries(
      Object.entries(zones).map(([zoneName, chipIds]) => [
        zoneName,
        [...new Set(chipIds.map((id) => chipData[id]?.category))],
      ]),
    ),
  );

  // Update functions only change selected/policyLens
  function moveChip(id, newZone) {
    if (newZone === "zone1") {
      if (policyLens !== "England") selected.push(policyLens);
      policyLens = id;
      selected = selected.filter((c) => c !== id);
    } else {
      selected = [...selected.filter((c) => c !== id), id];
      if (policyLens === id) policyLens = "England";
    }
    dispatch("lensChanged");
  }

  function removeFromSelected(id) {
    selected = selected.filter((c) => c !== id);
    dispatch("itemRemoved");
  }

  function removePolicyLens() {
    policyLens = "England";
    dispatch("lensChanged");
  }
</script>

<div id="filter-tooltip"></div>
<!-- <h3 style="margin: 0 0 0 10px; padding-left: 10px">Selected area</h3>
<div class="filters-and-legend-container">
  <div class="drop-zone" data-zone="zone1">
    {#key policyLens}
    {#each zones.zone1 as id}
      {#if id !== "England"}
        <FilterChip
          {...chipData[id]}
          currentZone="zone1"
          on:drop={(e) => {
            //   console.log("DROPPED!", id, e.detail.zone);
            // addToSelected(id);
            moveChip(id, e.detail.zone);
          }}
          on:deselect={(e) => {
            removePolicyLens(e.detail.id);
          }}
        />
      {/if}
    {/each}
    {/key}
  </div>
  <div>
    <p>Category:</p>
    <div class="categories-legend">
      {#each zoneCategories["zone1"] as category}
        <div class="categories-legend-item">
          <span
            class="choices__item-circle"
            style={"background: " + categoryToColor[category]}
          ></span>
          {category}
        </div>
      {/each}
    </div>
  </div>
</div> -->

<div class="filters-and-legend-container">
  <div class="drop-zone" data-zone="zone2">
    <h3>Selected filters</h3>
    <div>
      <div class="categories-legend">
        Categories included:

        {#each zoneCategories["zone2"] as category}
          <div class="categories-legend-item">
            <span
              class="choices__item-circle"
              style={"background: " +
                categoryToColor[category] +
                "; margin-right: 10px"}
            ></span>
            {category}
          </div>
        {/each}
      </div>
      <hr />
    </div>
    {#each zones.zone2 as id}
      {#if id !== "England"}
        <FilterChip
          {...chipData[id]}
          currentZone="zone2"
          on:drop={(e) => {
            // console.log("DROPPED!", id, e.detail.zone);
            moveChip(id, e.detail.zone);
            // removeFromSelected(id);
          }}
          on:deselect={(e) => {
            removeFromSelected(e.detail.id);
          }}
        />
      {/if}
    {/each}
    <div class="button-container">
      <Button
        textContent="Edit filters"
        buttonType="default"
        onClickFunction={openPanelAndScrollToMap}
      />
    </div>
  </div>
</div>

<style>
  .button-container {
    margin-top: 10px;
  }

  .filters-and-legend-container {
    display: flex;
    /* grid-template-columns: 2fr 1fr; */
  }

  .drop-zone {
    /* background: #eee; */
    /* border: 2px dashed #ccc; */
    /* min-height: 100px; */
    background-color: #f3f2f1;
    min-height: 50px;
    margin: 0px 10px 10px 10px;
    padding: 10px;
  }

  .choices__item-circle {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
  }

  .categories-legend {
    display: flex;
    flex-wrap: wrap;
    /* grid-template-columns: 1fr; */
    padding-bottom: 10px;
  }

  .categories-legend-item {
    display: flex;
    padding-left: 10px;
    min-height: 1.5rem;
  }

  #filter-tooltip {
    position: absolute;
    display: inline-block;
    height: auto;
    width: auto;
    z-index: 100;
    background-color: #333;
    color: #fff;
    text-align: left;
    border-radius: 4px;
    padding: 5px;
    left: 50%;
    transform: translateX(3%);
    visibility: hidden;
    pointer-events: none;
  }
</style>
