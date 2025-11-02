<script lang="ts">
import { interpolateViridis } from "d3-scale-chromatic";

  let { histogram }: { histogram: Record<string, number> } = $props();

  let vals: number[] = [];
  let max = 1;

  $effect(() => {
    vals = Object.values(histogram).map(Number);
    max = Math.max(...vals, 1);
  });

  const keys = Object.keys(histogram);

  // Define viridis bucket mapping (same as your map)
  function viridisForBucket(key: string): string {
    const fillOpacity = 0.5; // same transparency as the map

    let normalized = 0;
    if (key === "<=1") normalized = 0.0;
    else if (key === "2 to 5") normalized = 0.1;
    else if (key === "6 to 10") normalized = 0.2;
    else if (key === "11 to 20") normalized = 0.35;
    else if (key === "21 to 50") normalized = 0.45;
    else if (key === "51 to 100") normalized = 0.55;
    else if (key === "101 to 200") normalized = 0.65;
    else if (key === "201 to 500") normalized = 0.8;
    else if (key === "over 500") normalized = 1.0;

    const rgbStr = interpolateViridis(1-normalized);
    // const numbers = rgbStr.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
    // const [r, g, b] = numbers;
    return  rgbStr;
  }
</script>

<svg width="700" height="130">
  <!-- Bars -->
  {#each keys as key, i}
    {#if max > 0}
      <rect
        x={(i * 600) / keys.length + 1}
        y={100 - (histogram[key] / max) * 100}
        width={(600 / keys.length) - 2}
        height={(histogram[key] / max) * 100}
        fill={viridisForBucket(key)}
      />
    {/if}

    <!-- X-axis labels -->
    <text
      x={(i * 600) / keys.length + (600 / keys.length) / 2}
      y="115"
      text-anchor="middle"
      font-size="10"
      fill="#333"
    >
      {key}
    </text>
  {/each}

  <!-- Axis line -->
  <line x1="0" y1="100" x2="700" y2="100" stroke="#333" stroke-width="0.5" />
</svg>

<style>
  text {
    font-family: sans-serif;
    user-select: none;
  }
</style>