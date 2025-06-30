<script>
let {tableData, blendedArrayLength, selectedArea} = $props()
let landArea = $derived(tableData.find(e=>e.name=="ENGLAND 100M")?.area || 0)
</script>

{#if landArea && selectedArea}
<h2>
  The total area of land in {selectedArea} is {landArea.toLocaleString()} ha. Removing areas with the selected restrictions there are {(landArea - blendedArrayLength).toLocaleString()} ha.
</h2>
{/if}