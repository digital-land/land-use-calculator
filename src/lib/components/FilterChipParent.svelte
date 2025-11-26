<script>
  import { createEventDispatcher } from "svelte";
  import FilterChip from "./FilterChip.svelte";

  let {
    selectedFilterChipData,
    selected = $bindable(),
    policyLens = $bindable(),
    categoryToColor,
  } = $props();

  const dispatch = createEventDispatcher();

  let zones = $state({
    zone1: [],
    zone2: selected,
  });

  let zoneCategories = $derived.by(() =>
    Object.fromEntries(
      Object.entries(zones).map(([zoneName, chipIds]) => [
        zoneName,
        [...new Set(chipIds.map((id) => selectedFilterChipData[id]?.category))],
      ])
    )
  );

  function moveChip(id, newZone) {
    // Remove from any zone it was in
    for (const zone in zones) {
      zones[zone] = zones[zone].filter((c) => c !== id);
    }

    // Add to target zone
    zones[newZone] = [...zones[newZone], id];
  }

  function moveExclusive(id, newZone) {
    // Remove from any zone it was in
    for (const zone in zones) {
      zones[zone] = zones[zone].filter((c) => c !== id);
    }

    // Remove old item and add it to the other zone
    let oldChip = zones[newZone].pop();
    if (oldChip) zones["zone2"].push(oldChip); // Hard coded!

    // Add to target zone
    zones[newZone] = [...zones[newZone], id];
    console.log(zones);
  }

  function removeFromSelected(id) {
    const index = selected.indexOf(id); // Find the index of the item to remove
    // console.log(index);
    if (index !== -1) {
      selected.splice(index, 1); // Remove one element at the found index
      //   console.log("parent");
      dispatch("itemRemoved");
    }
  }
</script>

<!-- <h3 style="margin: 0 0 0 10px; padding-left: 10px">Selected area</h3>
<div class="filters-and-legend-container">
  <div class="drop-zone" data-zone="zone1">
    {#each zones.zone1 as id}
      <FilterChip
        {...selectedFilterChipData[id]}
        currentZone="zone1"
        on:drop={(e) => {
          // console.log("DROPPED!", id, e.detail.zone, "about to move exclusive");
          moveChip(id, e.detail.zone);
        }}
        on:deselect={(e) => {
          removeFromSelected(e.detail.id);
        }}
      />
    {/each}
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

<h3 style="margin: 0 0 0 10px; padding-left: 10px">Selected filters</h3>
<div class="filters-and-legend-container">
  <div class="drop-zone" data-zone="zone2">
    {#each zones.zone2 as id}
      <FilterChip
        {...selectedFilterChipData[id]}
        currentZone="zone2"
        on:drop={(e) => {
          //   console.log("DROPPED!", id, e.detail.zone);
          moveExclusive(id, e.detail.zone);
        }}
        on:deselect={(e) => {
          removeFromSelected(e.detail.id);
        }}
      />
    {/each}
  </div>
  <div>
    <p>Categories:</p>
    <div class="categories-legend">
      {#each zoneCategories["zone2"] as category}
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
</div>

<style>
  .filters-and-legend-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
  }

  .drop-zone {
    /* background: #eee; */
    /* border: 2px dashed #ccc; */
    /* min-height: 100px; */
    background-color: #f3f2f1;
    min-height: 50px;
    margin: 10px;
    padding: 10px;
  }

  .choices__item-circle {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
  }

  .categories-legend {
    display: grid;
    grid-template-columns: 1fr;
  }

  .categories-legend-item {
    display: flex;
  }
</style>
