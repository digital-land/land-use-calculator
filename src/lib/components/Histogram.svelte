<script lang="ts">
  let { histogram, color }: { histogram: Record<string, number>, color: string } = $props();

  let vals: number[] = [];
  let max = 1;

  $effect(() => {
    vals = Object.values(histogram).map(Number);
    max = Math.max(...vals, 1);
  });

  const keys = Object.keys(histogram);
</script>

<svg width=700>
  <!-- Bars -->
  {#each keys as key, i}
    {#if max > 0}
      <rect
        x={(i * 600) / keys.length + 1}
        y={100 - (histogram[key] / max) * 100}
        width={(600 / keys.length) - 2}
        height={(histogram[key] / max) * 100}
        fill={color}
      />
    {/if}

    <!-- X-axis labels -->
    <text
      x={(i * 600) / keys.length + (600 / keys.length) / 2}
      y="115"
      text-anchor="middle"
      font-size="10 "
      fill="#333"
    >
      {key}
    </text>
  {/each}

  <!-- Axis line -->
  <line x1="0" y1="100" x2="100" y2="100" stroke="#333" stroke-width="0.5" />
</svg>

<style>
  text {
    font-family: sans-serif;
    user-select: none;
  }
</style>
 