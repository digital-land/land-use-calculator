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
  const title = `"Selected area covers : ${selected.join(', ')}"\r\n`
  const footer =
    "\r\n Notes: \r\n 1. All figures are in hectares. \r\n 2. This is an experimental product under development.";
  const caveat =
    "Figures relate to the area within " +
    policyLensItems.find((d) => d.value == policyLens).sentenceText;
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
  const csv = [title, headerString, ...rowItems, footer, caveat].join("\r\n");
  return csv;
}
