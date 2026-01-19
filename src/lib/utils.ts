export function parseCsv(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].trim().split(",");

  return lines.slice(1).map((line) => {
    // console.log(line);
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = values[i].replace("\r", "")));
    // console.log(row);
    return row;
  });
}

export function jsonToCsv(items, policyLens, policyLensItems, selected: string[]) {
  const title = `"Selected area covers : ${selected.map(d => makeFileNameReadable(d)).join(', ')}"\r\n`
  const footer =
    "\r\n Notes: \r\n 1. All figures are in hectares. \r\n 2. This is an experimental product under development.";
  const caveat =
    "Selected area figures relate to the area within " +
    (policyLensItems.find((d) => d.value == policyLens)?.sentenceText ?? 'the "' + makeFileNameReadable(policyLens) + '" layer') + " \r\n";
  const header = Object.keys(items[0]);
  const headerString = header.join(",");
  // handle null or undefined values here
  const replacer = (key, value) => value ?? "";
  const rowItems = items.map((row) =>
    header
      .map((fieldName) => JSON.stringify(row[fieldName], replacer))
      .join(",")
  );
  // join header and body, and break into separate lines
  const csv = [title, caveat, headerString, ...rowItems, footer].join("\r\n");
  return csv;
}

export function makeFileNameReadable(filename: string): string {
  return filename.replace(".tif", "").replaceAll("_", " ")
}

export function downloadJSON(data: any) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stats.json";
    a.click();

    URL.revokeObjectURL(url);
  }

export function downloadCSV(results: any[]) {
    const headers = [
      "file",
      "count",
      "sum",
      "mean",
      "median",
      "min",
      "max",
      "<=1",
      "2 to 5",
      "6 to 10",
      "11 to 20",
      "21 to 50",
      "51 to 100",
      "101 to 200",
      "201 to 500",
      "over 500",
    ];

    const rows = results.map((r) => [
      r.file,
      r.stats.count,
      r.stats.sum,
      r.stats.mean,
      r.stats.median,
      r.stats.min,
      r.stats.max,
      r.histogram["<=1"],
      r.histogram["2 to 5"],
      r.histogram["6 to 10"],
      r.histogram["11 to 20"],
      r.histogram["21 to 50"],
      r.histogram["51 to 100"],
      r.histogram["101 to 200"],
      r.histogram["201 to 500"],
      r.histogram["over 500"],
    ]);

    const csv =
      headers.join(",") + "\n" + rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "stats.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

export const colors = ['#00625E', '#932A72', '#85292A', '#BF4A1D', '#40611f', '#205083', '#333366']