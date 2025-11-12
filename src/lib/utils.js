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