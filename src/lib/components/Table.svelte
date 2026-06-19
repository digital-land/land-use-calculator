<script lang="ts">
  import Button from "./Button.svelte";
  import { InsetText } from "@communitiesuk/svelte-component-library";
  import type { TableMetadata } from "$lib/utils";

  let {
    data = undefined,
    metaData = undefined,
    caption = undefined,
    colourScale = undefined,
    sortState = $bindable({ column: "unique", order: "descending" }),
    selectedRestriction = $bindable(),
    mobile,
  } = $props<{ caption: string; metaData: TableMetadata }>();
  //   $inspect(sortState);
  let localCopyOfData = $state([...data]);
  let openInsets = $state(data.map((d) => false));
  // $inspect(openInsets);
  function hasUniqueValues(array, key) {
    const seen = new Set();
    for (const obj of array) {
      if (seen.has(obj[key])) {
        return false; // Duplicate found
      }
      seen.add(obj[key]);
    }
    return true; // All values are unique
  }
  // $inspect(sortState);

  let columns = [];

  for (const column in localCopyOfData[0]) {
    // create a variable to store whether the key is unique or not
    const keyIsUnique = hasUniqueValues(localCopyOfData, column);
    // get data type of each column
    const columnDataType = typeof localCopyOfData[0][column];
    // for each one create an object and push it into the array
    const columnObject = {
      key: column,
      isUnique: keyIsUnique,
      dataType: columnDataType,
    };
    if (column !== "subLayers") {
      columns.push(columnObject);
    }
  }

  const metrics = columns
    .filter((column) => column.dataType === "number")
    .map((column) => column.key);

  //   let sortState = $state({ column: "sortedColumn", order: "ascending" });

  function updateSortState(columnToSort, sortOrder) {
    sortState.column = columnToSort;
    sortState.order = sortOrder;
  }

  function sortFunction() {
    if (localCopyOfData[0]) {
      if (typeof localCopyOfData[0][sortState["column"]] === "number") {
        if (sortState.order === "ascending") {
          localCopyOfData.sort(
            (a, b) => +a[sortState.column] - +b[sortState.column],
          );
        } else {
          localCopyOfData.sort(
            (a, b) => +b[sortState.column] - +a[sortState.column],
          );
        }
      }
      if (typeof localCopyOfData[0][sortState["column"]] === "string") {
        if (sortState.order === "ascending") {
          localCopyOfData.sort((a, b) =>
            a[sortState["column"]].localeCompare(b[sortState["column"]]),
          );
        } else {
          localCopyOfData.sort((a, b) =>
            b[sortState["column"]].localeCompare(a[sortState["column"]]),
          );
        }
      }
    }
  }
  if (sortState?.column !== "sortedColumn") {
    sortFunction();
  }

  // calculate the min and max of each metric
  const minAndMaxValues = {}; // create an empty object to store them in
  for (const metric of metrics) {
    // get the values
    const metricValues = localCopyOfData.map((item) => item[metric]);
    const min = Math.min(...metricValues);
    const max = Math.max(...metricValues);
    // store them
    minAndMaxValues[metric] = { min, max };
  }

  localCopyOfData = localCopyOfData.map((row) => {
    const rowWithNorms = { ...row };

    for (const metric of metrics) {
      const { min, max } = minAndMaxValues[metric];
      const value = row[metric];
      const normalisedValue = (value - min) / (max - min);

      rowWithNorms[`${metric}__normalised`] = normalisedValue;
    }

    return rowWithNorms;
  });

  function normToColor(norm) {
    const hue = 120 * norm;
    return `hsl(${hue}, 100%, 80%)`;
  }

  function normToColorReverse(norm) {
    const hue = 120 * (1 - norm);
    return `hsl(${hue}, 100%, 80%)`;
  }

  const colorKey = Object.entries({ Good: 1, Ok: 0.5, Bad: 0 });
</script>

<div class="p-4">
  {#if colourScale === "On"}
    <div class="legend">
      <div>Colour key:</div>
      {#each colorKey as key}
        <div class="color-keys" style="background-color: {normToColor(key[1])}">
          {key[0]}
        </div>
      {/each}
    </div>
  {/if}

  <div class="table-container">
    <div id="table-caption" class="sticky-caption">{caption}</div>
    <table class="govuk-table" data-module="moj-sortable-table">
      <thead class="govuk-table__head"
        ><tr class="govuk-table__row">
          {#each columns as column}
            <th
              scope="col"
              class={`govuk-table__header ${column.dataType === "number" ? "govuk-table__header--numeric" : ""}`}
              title={metaData[column.key].explainer}
              aria-sort={sortState.column !== column.key
                ? "none"
                : sortState.column === column.key &&
                    sortState.order === "descending"
                  ? "descending"
                  : "ascending"}
            >
              <div class="header">
                <Button
                  textContent={metaData[column.key].shortLabel}
                  buttonType={"table header"}
                  onClickFunction={() => {
                    const newDirection =
                      sortState.column === column.key &&
                      sortState.order === "descending"
                        ? "ascending"
                        : "descending";

                    updateSortState(column.key, newDirection);
                    sortFunction();
                  }}
                ></Button>
              </div></th
            >
          {/each}
        </tr></thead
      >
      <tbody class="govuk-table__body">
        {#each localCopyOfData as row, i}
          <tr
            class={"govuk-table__row" +
              (selectedRestriction === row.name ? " selected" : "")}
            onclick={() => {
              selectedRestriction === row.name
                ? (selectedRestriction = undefined)
                : (selectedRestriction = row.name);
            }}
            onkeydown={(e) => {
              //   console.log(e.code);
              if (e.code == "Enter" || e.code == "Space") {
                selectedRestriction === row.name
                  ? (selectedRestriction = undefined)
                  : (selectedRestriction = row.name);
              }
            }}
            tabindex="0"
          >
            {#each columns as column}
              {#if column.dataType === "number"}
                {#if colourScale === "On"}
                  <td
                    class="govuk-table__cell govuk-table__cell--numeric"
                    style="background-color: {metaData[column.key].direction ===
                    'Higher is better'
                      ? normToColor(row[column.key + '__normalised'])
                      : normToColorReverse(row[column.key + '__normalised'])}"
                    >{row[column.key]}</td
                  >
                {:else}
                  <td class="govuk-table__cell govuk-table__cell--numeric"
                    >{row[column.key] !== 0
                      ? row[column.key]?.toLocaleString()
                      : "-"}</td
                  >
                {/if}
              {:else}
                <td class="govuk-table__cell">
                  <div style="display: flex;">
                    {row[column.key]}
                    {#if row.subLayers.length > 0}
                      <!-- <div
                      class="info-cell"
                      aria-expanded="false"
                      role="button"
                      onclick={(e) => {
                        e.stopPropagation();
                        openInsets[row.name] = !openInsets[row.name];
                      }}
                      onkeydown={(e) => {
                        console.log(e);
                        if (e.code == "Enter" || e.code == "Space") {
                          e.stopPropagation();
                          openInsets[row.name] = !openInsets[row.name];
                        }
                      }}
                      tabindex="0"
                    >
                      <svg
                        class="c h-16 w-16 inline"
                        viewBox="0 2 48 48"
                        style="width: 24px; height: 24px;"
                        aria-hidden="true"
                        ><path
                          fill="black"
                          d="M24.15 34q.65 0 1.075-.425.425-.425.425-1.075v-9.05q0-.6-.45-1.025Q24.75 22 24.15 22q-.65 0-1.075.425-.425.425-.425 1.075v9.05q0 .6.45 1.025.45.425 1.05.425ZM24 18.3q.7 0 1.175-.45.475-.45.475-1.15t-.475-1.2Q24.7 15 24 15q-.7 0-1.175.5-.475.5-.475 1.2t.475 1.15q.475.45 1.175.45ZM24 44q-4.25 0-7.9-1.525-3.65-1.525-6.35-4.225-2.7-2.7-4.225-6.35Q4 28.25 4 24q0-4.2 1.525-7.85Q7.05 12.5 9.75 9.8q2.7-2.7 6.35-4.25Q19.75 4 24 4q4.2 0 7.85 1.55Q35.5 7.1 38.2 9.8q2.7 2.7 4.25 6.35Q44 19.8 44 24q0 4.25-1.55 7.9-1.55 3.65-4.25 6.35-2.7 2.7-6.35 4.225Q28.2 44 24 44Zm0-20Zm0 17q7 0 12-5t5-12q0-7-5-12T24 7q-7 0-12 5T7 24q0 7 5 12t12 5Z"
                        ></path></svg
                      >
                    </div> -->
                      <!-- <div class="icon-container"> -->
                      <Button
                        textContent={"More information about the " +
                          row.name +
                          " layer"}
                        buttonType="moreInfo"
                        noPadding={true}
                        onClickFunction={(e) => {
                          e.stopPropagation();
                          openInsets[i] = !openInsets[i];
                        }}
                        onKeydownFunction={(e) => {
                          if (e.code == "Enter" || e.code == "Space") {
                            e.stopPropagation();
                            e.preventDefault();
                            openInsets[i] = !openInsets[i];
                          }
                        }}
                        ariaExpanded={openInsets[i]}
                      ></Button>
                    {/if}
                  </div>
                  <!-- </div> -->
                  <!-- <br /> -->
                  <!-- <span class="subLayers"
                      >(made up of {row.subLayers.join(", ")})</span
                    > -->
                  {#if openInsets[i]}
                    <InsetText
                      content={"Made up of:" +
                        "<ul><li>" +
                        row.subLayers.join("</li><li>") +
                        "</li></ul>"}
                      renderStringAsHTML={true}
                    ></InsetText>
                  {/if}
                </td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .table-container {
    /* max-height: 85vh;
    overflow-y: auto;
    overflow-x: scroll; */
    width: 100%;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: white;
  }

  .sticky-caption {
    position: sticky;
    top: 0;
    z-index: 2;
    background-color: white;
  }

  .legend {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin: 10px;
  }
  .color-keys {
    border-radius: 10%;
    padding: 6px;
  }

  .text-header {
    display: flex;
    color: #005ea5;
  }

  /* .selected {
    background-color: pink;
  } */
  .selected td:nth-child(2) {
    background-color: pink;
  }

  .selected td:nth-child(3) {
    background-color: crimson;
    color: white;
    font-weight: 700;
  }

  tr {
    cursor: pointer;
  }

  tr:not(.selected) td:not(:nth-child(1)) {
    background-color: whitesmoke;
  }

  /* .subLayers {
    font-style: italic;
    color: #707170;
    font-size: small;
  } */

  :global([aria-sort="ascending"].govuk-table__header .top-triangle) {
    fill: #222;
  }
  :global([aria-sort="ascending"].govuk-table__header .bottom-triangle) {
    fill: #bcbcbd;
  }
  :global([aria-sort="descending"].govuk-table__header .top-triangle) {
    fill: #bcbcbd;
  }
  :global([aria-sort="descending"].govuk-table__header .bottom-triangle) {
    fill: #222;
  }

  /* .info-cell {
    padding: 0 5px;
    margin: 0;
    display: inline-block;
    position: relative;
    transform: translateY(-1px);
    cursor: pointer;
  } */

  /* svg.inline {
    vertical-align: middle;
    overflow: visible;
    forced-color-adjust: auto;
    display: inline; 
  } */
</style>
