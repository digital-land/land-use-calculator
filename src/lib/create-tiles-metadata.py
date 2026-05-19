import os
import csv

root_dir = "/Users/mikelister1/Documents/land-use-calculator/static/data/20260417-full"

grids = sorted([
    d for d in os.listdir(root_dir)
    if os.path.isdir(os.path.join(root_dir, d))
])

datasets = {}
# structure:
# {
#   var_name: {
#       "meta": (date, grid_size, data_type, datum, data_structure),
#       "grids": set([...])
#   }
# }

for grid in grids:
    grid_path = os.path.join(root_dir, grid)

    for file in os.listdir(grid_path):
        if not file.endswith(".bin"):
            continue

        name = file.replace(".bin", "")
        parts = name.split("_")

        if len(parts) < 7:
            continue  # skip malformed

        file_grid = parts[0]
        grid_size = parts[1]
        var = parts[2]
        data_type = parts[3]
        datum = parts[4]
        data_structure = parts[5]
        date = parts[6]

        # Optional sanity check
        if file_grid != grid.split("_")[0]:
            print(f"Warning: mismatch {file_grid} vs folder {grid.split("_")[0]}")

        if var not in datasets:
            datasets[var] = {
                "meta": (date, grid_size, data_type, datum, data_structure),
                "grids": set()
            }

        datasets[var]["grids"].add(grid)

# Write CSV
output_file = "output.csv"

header = [
    "var", "date", "grid_size", "data_type",
    "datum", "data_structure"
] + grids

with open(output_file, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(header)

    for var, info in sorted(datasets.items()):
        date, grid_size, data_type, datum, data_structure = info["meta"]

        row = [
            var,
            date,
            grid_size,
            data_type,
            datum,
            data_structure
        ]

        for grid in grids:
            row.append(1 if grid in info["grids"] else 0)

        writer.writerow(row)