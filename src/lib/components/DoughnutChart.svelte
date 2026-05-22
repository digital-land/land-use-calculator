<script lang="ts">
  import { arc, pie } from "d3-shape";
  import Button from "./Button.svelte";
  import type { DoughnutData } from "$lib/utils";

  let { data, title }: { data: DoughnutData[]; title: "selected" | "total" } =
    $props();
  console.log("doughnut data: ", data);

  interface DonutSlice {
    key: string; // aggregation key (prefix), e.g. "UK_corporate.public_sector"
    label: string; // last segment, e.g. "public_sector"
    depth: number; // 1..N
    total: number;
    selected: number;
    color: string;

    // Optional but helpful for UI:
    parentKey?: string;
    topKey: string; // e.g. "UK_corporate"
  }

  function splitPath(name: string): string[] {
    return name.split(".").filter(Boolean);
  }

  function prefix(parts: string[], depth: number): string {
    return parts.slice(0, depth).join(".");
  }

  function last(parts: string[], depth: number): string {
    return parts[Math.min(depth, parts.length) - 1] ?? parts[0] ?? "";
  }

  /**
   * Builds aggregated donut slices for each hierarchy depth.
   *
   * Returns a Map where key = depth (1..maxDepth) and value = slices at that depth.
   */
  function buildCutsByDepth(
    data: DoughnutData[],
    opts?: {
      // If true, also include a node’s “self” value when a parent exists as a datum.
      // In your dataset, parents and children both appear; usually you want sums of leaves,
      // but since you’re already giving total/selected per path, this just aggregates provided values.
      // Leave default false to avoid double counting if parent totals already include children.
      allowDoubleCount?: boolean;

      // How to pick colors for aggregated prefixes:
      // "top" keeps all descendants the same color as their top-level group (nice for drilldown).
      // "first" uses the first encountered color for that prefix.
      colorStrategy?: "top" | "first";
    },
  ): Map<number, DonutSlice[]> {
    const allowDoubleCount = opts?.allowDoubleCount ?? false;
    const colorStrategy = opts?.colorStrategy ?? "top";

    // Optional de-dupe rule if you want to avoid double counting when parent totals already include children.
    // Strategy: only count leaf nodes (items that are not a prefix of any other item).
    const items = allowDoubleCount ? data : leafOnly(data);

    // Find max depth
    let maxDepth = 1;
    const parsed = items.map((d) => {
      const parts = splitPath(d.name);
      maxDepth = Math.max(maxDepth, parts.length);
      return { ...d, parts };
    });

    // Create depth->(key->slice) accumulator
    const depthMaps = new Map<number, Map<string, DonutSlice>>();
    for (let depth = 1; depth <= maxDepth; depth++) {
      depthMaps.set(depth, new Map());
    }

    // Precompute top-level color map (for "top" strategy)
    const topColor = new Map<string, string>();
    for (const d of data) {
      const top = splitPath(d.name)[0];
      if (top && !topColor.has(top)) topColor.set(top, d.color);
    }

    for (const d of parsed) {
      const topKey = d.parts[0];

      for (let depth = 1; depth <= d.parts.length; depth++) {
        const key = prefix(d.parts, depth);
        const label = last(d.parts, depth).replaceAll("_", " ");
        const parentKey = depth > 1 ? prefix(d.parts, depth - 1) : undefined;

        const map = depthMaps.get(depth)!;
        const existing = map.get(key);

        const chosenColor = d.color;
        // colorStrategy === "top"
        //   ? (topColor.get(topKey) ?? d.color)
        //   : (existing?.color ?? d.color);

        if (!existing) {
          map.set(key, {
            key,
            label,
            depth,
            total: d.total,
            selected: d.selected,
            color: chosenColor,
            parentKey,
            topKey,
          });
        } else {
          existing.total += d.total;
          existing.selected += d.selected;
          existing.color = d.color;
          // keep existing color
        }
      }
    }

    // Convert to Map<number, DonutSlice[]>, sorted nicely (largest first is common for donut)
    const out = new Map<number, DonutSlice[]>();
    for (const [depth, map] of depthMaps) {
      const arr = [...map.values()].sort((a, b) => b.total - a.total);
      out.set(depth, arr);
    }
    return out;
  }

  /**
   * Keeps leaf nodes only to avoid double counting when parents already represent totals.
   * A node is non-leaf if any other name starts with `${name}.`
   */
  function leafOnly(data: DoughnutData[]): DoughnutData[] {
    const names = data.map((d) => d.name);
    const nameSet = new Set(names);

    // A name is a leaf if there is no other entry that begins with "name."
    return data.filter((d) => {
      const prefix = d.name + ".";
      // quick scan; O(n^2) worst case, but n here is usually small.
      // If this grows, we can optimize with a trie.
      for (const other of nameSet) {
        if (other !== d.name && other.startsWith(prefix)) return false;
      }
      return true;
    });
  }

  function slicesForFocus(
    cuts: Map<number, DonutSlice[]>,
    depth: number,
    focusKey?: string,
  ): DonutSlice[] {
    const level = cuts.get(depth) ?? [];
    if (!focusKey) {
      // root view: show only top-level
      return depth === 1
        ? level
        : level.filter((s) => s.depth === depth && !s.parentKey);
    }
    return level.filter((s) => s.parentKey === focusKey);
  }

  let depth = $state(1);
  let focusKey = $state<string | undefined>(undefined);

  const cuts = $derived(
    buildCutsByDepth(data, {
      allowDoubleCount: false, // change if needed
      colorStrategy: "top",
    }),
  );

  const slices = $derived(slicesForFocus(cuts, depth, focusKey));

  function canDrillInto(
    key: string,
    currentDepth: number,
    cuts: Map<number, DonutSlice[]>,
  ) {
    const next = cuts.get(currentDepth + 1);
    if (!next) return false;
    return next.some((s) => s.parentKey === key);
  }

  function drillInto(sliceKey: string) {
    if (!canDrillInto(sliceKey, depth, cuts)) return;
    focusKey = sliceKey;
    depth = depth + 1;
    console.log(focusKey, depth);
  }

  // function drillUp() {
  //   depth = Math.max(1, depth - 1);
  //   let shorter = focusKey?.split(".");
  //   if (shorter && shorter.length > 0) {
  //     shorter?.pop();
  //   }

  //   focusKey = shorter?.join(".");
  //   console.log(depth, focusKey);
  //   // you can also compute parent from cuts if you want proper breadcrumb behaviour
  // }

  function drillUp() {
    // If already at the top, do nothing
    if (depth <= 1) {
      depth = 1;
      focusKey = undefined;
      return;
    }

    depth -= 1;

    if (!focusKey) {
      // If somehow no focusKey but depth > 1, reset cleanly
      if (depth === 1) focusKey = undefined;
      return;
    }

    const parts = focusKey.split(".").filter(Boolean);

    // Move focus to parent (remove last segment)
    if (parts.length <= 1) {
      focusKey = undefined; // parent of a top-level node is root
    } else {
      parts.pop();
      focusKey = parts.join(".");
    }

    // Ensure root consistency
    if (depth === 1) focusKey = undefined;

    console.log("drillUp ->", { depth, focusKey });
  }

  $inspect(slices, cuts);

  let width = $state(0);
  const height = 440;
  let hoveredSegment = $state(null);
  $inspect(hoveredSegment);

  const pieGenerator = pie().value((d: DoughnutData) => d[title]);
  let pieData = $derived(pieGenerator(slices));
  let currentTotal = $derived(
    pieData.reduce((acc, curr) => acc + curr.value, 0),
  );
  $inspect(pieData);

  const arcGenerator = arc()
    .innerRadius((0.5 * height) / 2.4)
    .outerRadius((0.75 * height) / 2.2)
    .padRadius(40)
    .cornerRadius(2);

  const labelArcs = arc()
    .innerRadius((0.8 * height) / 2)
    .outerRadius((0.8 * height) / 2);
</script>

<div
  class="chart-container flex flex-col items-center justify-around md:flex-row"
>
  <Button
    buttonType={focusKey?.split(".").length > 0 ? "default" : "disabled"}
    onClickFunction={drillUp}
    textContent={"Go up one level"}
  />
  <div class="svg-container w-[500px]" bind:clientWidth={width}>
    {#if width}
      <svg {width} {height} class="chart">
        <g
          class="donut-container"
          transform="translate({width / 2 - 5} {height / 2 + 20})"
        >
          {#each pieData
            .filter((d) => d.value > 0)
            .sort((a, b) => b.value - a.value) as d, i}
            {console.log(d)}
            <path
              class={i}
              pointer-events={"all"}
              cursor={canDrillInto(d.data.key, depth, cuts)
                ? "pointer"
                : "auto"}
              d={arcGenerator(d)}
              stroke="none"
              stroke-width="0"
              fill={d.data.color}
              onmousemove={() => (hoveredSegment = d.data.key)}
              onmouseleave={() => (hoveredSegment = null)}
              onclick={() => drillInto(d.data.key)}
              onkeydown={(e) =>
                e.code === "Space" || e.code === "Enter"
                  ? drillInto(d.data.key)
                  : null}
            />
            <!-- labels -->
            <text
              x="0"
              y="0"
              text-anchor="middle"
              font-size={"0.8em"}
              opacity={hoveredSegment === d.data.key ? 1 : 0}
              class="fill-gray-100"
              transform="translate({labelArcs.centroid(d).join(' ')})"
              >{d.data.label}
            </text>
            <text
              x="0"
              y="1.2em"
              text-anchor="middle"
              font-size="0.8em"
              font-weight="700"
              class="fill-gray-100"
              opacity={hoveredSegment === d.data.key ? 1 : 0}
              transform="translate({labelArcs.centroid(d).join(' ')})"
              style:z-index={hoveredSegment === d.data.key ? 10 : 0}
              >{d.data[title].toLocaleString() +
                " ha (" +
                ((d.data[title] / currentTotal) * 100).toFixed(0) +
                "%)"}
            </text>
            <!-- <text
              x="0"
              y="2.4em"
              text-anchor="middle"
              font-size="0.8em"
              class="fill-gray-100"
              transform="translate({labelArcs.centroid(d).join(' ')})"
              >{((d.data[title] / currentTotal) * 100).toFixed(0) + "%"}
            </text> -->
          {/each}
        </g>
        <!-- chart title -->
        <g transform="translate({width / 2 - 5} {height / 2})">
          <text
            x="0"
            y="0.5em"
            font-weight="bold"
            text-anchor="middle"
            font-size="2em"
            class="fill-gray-100"
            >{title}
          </text>
          <text
            x="0"
            y="2.5em"
            font-weight="bold"
            text-anchor="middle"
            font-size="1em"
            class="fill-gray-100"
            >{currentTotal.toLocaleString()} ha
          </text>
        </g>
      </svg>
    {/if}
  </div>
</div>

<style>
  path {
    transition: all 0.5s ease;
  }
  /* path:hover {
    stroke: black;
    stroke-width: 2px;
    transition: all 0.2s ease;
  } */
  text {
    transition: all 0.5s ease;
    pointer-events: none;
  }
</style>
