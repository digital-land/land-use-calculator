<script lang="ts">
  import { arc, pie } from "d3-shape";
  import Button from "./Button.svelte";
  import { convertPixelsToHectares } from "$lib/utils";
  import type { DoughnutData } from "$lib/utils";

  let {
    data,
    title,
    gridSize,
  }: {
    data: DoughnutData[];
    title: "selected" | "total" | "inverse";
    gridSize: number;
  } = $props();
  // console.log("doughnut data: ", data);

  interface DonutSlice {
    key: string; // aggregation key (prefix), e.g. "UK_corporate.public_sector"
    label: string; // last segment, e.g. "public_sector"
    depth: number; // 1..N
    total: number;
    selected: number;
    inverse: number;
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
            inverse: d.total - d.selected,
            color: chosenColor,
            parentKey,
            topKey,
          });
        } else {
          existing.total += d.total;
          existing.selected += d.selected;
          existing.color = d.color;
          // keep existing color
          existing.inverse += d.total - d.selected;
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
    // console.log(focusKey, depth);
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

  // $inspect(slices, cuts);

  let width = $state(0);
  const height = 440;
  let hoveredSegment = $state<string | null>(null);
  // $inspect(hoveredSegment);

  const pieGenerator = pie<DonutSlice>().value((d) => d[title]);
  let pieData = $derived(pieGenerator(slices));
  let currentTotal = $derived(
    pieData.reduce((acc, curr) => acc + curr.value, 0),
  );

  type MetricKey = "selected" | "total" | "inverse";

  function valueFor(slice: DonutSlice, metric: MetricKey): number {
    return slice[metric] ?? 0;
  }

  function sumSlices(slices: DonutSlice[], metric: MetricKey): number {
    return slices.reduce((acc, slice) => acc + valueFor(slice, metric), 0);
  }

  function findSliceByKey(
    cuts: Map<number, DonutSlice[]>,
    key: string,
  ): DonutSlice | undefined {
    const sliceDepth = key.split(".").filter(Boolean).length;
    return cuts.get(sliceDepth)?.find((slice) => slice.key === key);
  }

  const metric = $derived(title as MetricKey);

  const rootSlices = $derived(cuts.get(1) ?? []);

  // const rootTotal = $derived(sumSlices(rootSlices, metric));

  const currentViewTotal = $derived(sumSlices(slices, metric));

  const contextSubjectKey = $derived(hoveredSegment ?? focusKey);

  const contextSubject = $derived(
    contextSubjectKey ? findSliceByKey(cuts, contextSubjectKey) : undefined,
  );

  const contextParent = $derived(
    contextSubject?.parentKey
      ? findSliceByKey(cuts, contextSubject.parentKey)
      : undefined,
  );

  const contextSubjectValue = $derived(
    contextSubject ? valueFor(contextSubject, metric) : currentViewTotal,
  );

  const contextParentValue = $derived(
    contextParent ? valueFor(contextParent, metric) : rootTotal,
  );

  const contextPercentOfTotal = $derived(
    rootTotal > 0 ? (contextSubjectValue / rootTotal) * 100 : 0,
  );

  const contextPercentOfParent = $derived(
    contextParentValue > 0
      ? (contextSubjectValue / contextParentValue) * 100
      : 0,
  );

  const currentViewPercentOfTotal = $derived(
    rootTotal > 0 ? (currentViewTotal / rootTotal) * 100 : 0,
  );

  const contextLabel = $derived(
    contextSubject?.label ??
      (focusKey ? focusKey.split(".").at(-1) : "All land"),
  );

  const arcGenerator = arc()
    .innerRadius((0.5 * height) / 2.4)
    .outerRadius((0.75 * height) / 2.2)
    .padRadius(40)
    .cornerRadius(2);

  const labelArcs = arc()
    .innerRadius((0.8 * height) / 2)
    .outerRadius((0.8 * height) / 2);

  function buildBreadcrumb(
    cuts: Map<number, DonutSlice[]>,
    focusKey?: string,
  ): DonutSlice[] {
    if (!focusKey) return [];

    const result: DonutSlice[] = [];

    let currentKey: string | undefined = focusKey;

    while (currentKey) {
      const depth = currentKey.split(".").length;

      const slice = cuts.get(depth)?.find((s) => s.key === currentKey);

      if (!slice) break;

      result.push(slice);
      currentKey = slice.parentKey;
    }

    return result.reverse();
  }

  const breadcrumb = $derived(buildBreadcrumb(cuts, focusKey));
  $inspect(breadcrumb);

  const rootTotal = $derived(
    (cuts.get(1) ?? []).reduce((sum, s) => sum + s[title], 0),
  );

  // const parentValue = breadcrumb[i - 1]?.[title];

  // const percentOfParent =
  //   parentValue > 0 ? (slice[title] / parentValue) * 100 : 100;
</script>

<div
  class="chart-container flex flex-col items-center justify-around md:flex-row"
>
  <Button
    buttonType={focusKey?.split(".").length > 0 ? "default" : "disabled"}
    onClickFunction={drillUp}
    textContent={"Go up one level"}
  />

  {#if breadcrumb.length > 0}
    <div class="breadcrumb-container">
      {#each breadcrumb as slice, i}
        {@const parentValue = breadcrumb[i - 1]?.[title]}
        {@const percentOfParent =
          parentValue > 0 ? (slice[title] / parentValue) * 100 : 100}

        <div class="breadcrumb-row">
          <div class="breadcrumb-label">
            {slice.label}
          </div>

          <div class="breadcrumb-bar">
            <div
              class="breadcrumb-fill"
              style="
              width: {(slice[title] / rootTotal) * 100}%;
              background-color: {slice.color};
            "
            ></div>
          </div>

          <div class="breadcrumb-value">
            {((slice[title] / rootTotal) * 100).toFixed(1)}%
            <!-- {#if parentValue}
              ({percentOfParent.toFixed(1)}% of {parentValue})
            {/if} -->
          </div>
        </div>
      {/each}
    </div>
  {/if}

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
            <!-- {console.log(d)} -->
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
              >{convertPixelsToHectares(
                d.data[title],
                gridSize,
              ).toLocaleString() +
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
            >{convertPixelsToHectares(currentTotal, gridSize).toLocaleString()} ha
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

  .context-panel {
    padding: 0.75rem;
  }

  .context-bar {
    display: flex;
    width: 100%;
    height: 20px;
    overflow: hidden;
    border-radius: 4px;
    background: #444;
  }

  .context-bar > div {
    transition: width 0.3s ease;
  }

  .context-muted {
    opacity: 0.35;
    height: 20px;
  }

  .context-highlight {
    opacity: 1;
    filter: brightness(1.2);
    height: 20px;
  }

  .context-remainder {
    background: repeating-linear-gradient(
      45deg,
      rgba(156, 163, 175, 0.25),
      rgba(156, 163, 175, 0.25) 6px,
      rgba(156, 163, 175, 0.12) 6px,
      rgba(156, 163, 175, 0.12) 12px
    );
  }

  .breadcrumb-container {
    width: 100%;
    margin-bottom: 1rem;
  }

  .breadcrumb-row {
    display: grid;
    grid-template-columns: 150px 1fr 60px;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .breadcrumb-bar {
    height: 12px;
    background: #9c9c9c;
    border-radius: 6px;
    overflow: hidden;
  }

  .breadcrumb-fill {
    height: 100%;
    transition: width 0.3s ease;
  }

  .breadcrumb-value {
    text-align: right;
    font-size: 0.9rem;
  }

  .breadcrumb-label {
    text-transform: capitalize;
  }
</style>
