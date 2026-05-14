#!/usr/bin/env python3
 
"""
Build a UINT64 pixel-membership array from multiple .bin files.
 
INPUT
-----
Directory of .bin files.
 
Each .bin file contains:
    uint32 pixel indices
 
Example:
    woodland.bin
    rivers.bin
    roads.bin
 
OUTPUT
------
1. layer_lookup.csv
    layer_name,bit_index
 
2. pixel_masks.uint64.bin
    uint64 array where each pixel stores bit membership
 
3. metadata.json
    useful reconstruction info
 
BIT ENCODING
------------
Bit 0  -> first layer
Bit 1  -> second layer
...
Bit 49 -> fiftieth layer
 
Example:
    mask = 5
 
Binary:
    00000101
 
Means:
    layer 0 = present
    layer 2 = present
"""
 
from pathlib import Path
import numpy as np
import pandas as pd
import json
 
# =============================================================================
# CONFIG
# =============================================================================
 
INPUT_DIR = Path("static/data/PUBLIC_BIN_LAYERS")
OUTPUT_MASK_FILE = "pixel_masks.uint64.bin"
OUTPUT_LOOKUP_CSV = "layer_lookup.csv"
OUTPUT_METADATA_JSON = "metadata.json"
 
MAX_LAYERS = 64
 
# =============================================================================
# FIND BIN FILES
# =============================================================================
 
bin_files = sorted(INPUT_DIR.glob("*.bin"))
 
if not bin_files:
    raise RuntimeError("No .bin files found")
 
if len(bin_files) > MAX_LAYERS:
    raise RuntimeError(
        f"Too many layers ({len(bin_files)}). "
        f"UINT64 supports max 64 layers."
    )
 
print(f"Found {len(bin_files)} layers")
 
# =============================================================================
# CREATE LOOKUP TABLE
# =============================================================================
 
lookup_rows = []
 
for bit_index, path in enumerate(bin_files):
    lookup_rows.append({
        "layer_name": path.stem,
        "bit_index": bit_index
    })
 
lookup_df = pd.DataFrame(lookup_rows)
lookup_df.to_csv(OUTPUT_LOOKUP_CSV, index=False)
 
print(f"Wrote {OUTPUT_LOOKUP_CSV}")
 
# =============================================================================
# FIND GLOBAL MAX PIXEL INDEX
# =============================================================================
 
global_max = 0
 
for path in bin_files:
    arr = np.fromfile(path, dtype=np.uint32)
 
    if arr.size == 0:
        continue
 
    local_max = int(arr.max())
 
    if local_max > global_max:
        global_max = local_max
 
print(f"Global max pixel index: {global_max:,}")
 
# =============================================================================
# CREATE UINT64 MASK ARRAY
# =============================================================================
 
# +1 because indices are zero-based
mask_array = np.zeros(global_max + 1, dtype=np.uint64)
 
print(
    f"Allocating UINT64 array with "
    f"{global_max + 1:,} entries "
    f"({mask_array.nbytes / 1024**3:.2f} GB)"
)
 
# =============================================================================
# POPULATE MASK ARRAY
# =============================================================================
 
for bit_index, path in enumerate(bin_files):
 
    print(f"Processing layer {bit_index}: {path.name}")
 
    indices = np.fromfile(path, dtype=np.uint32)
 
    if indices.size == 0:
        continue
 
    bitmask = np.uint64(1) << np.uint64(bit_index)
 
    # Vectorized OR assignment
    mask_array[indices] |= bitmask
 
# =============================================================================
# WRITE OUTPUT
# =============================================================================
 
mask_array.tofile(OUTPUT_MASK_FILE)
 
print(f"Wrote {OUTPUT_MASK_FILE}")
 
# =============================================================================
# WRITE METADATA
# =============================================================================
 
metadata = {
    "num_layers": len(bin_files),
    "dtype": "uint64",
    "num_pixels": int(mask_array.size),
    "max_pixel_index": int(global_max),
    "lookup_csv": OUTPUT_LOOKUP_CSV,
    "mask_file": OUTPUT_MASK_FILE
}
 
with open(OUTPUT_METADATA_JSON, "w") as f:
    json.dump(metadata, f, indent=2)
 
print(f"Wrote {OUTPUT_METADATA_JSON}")
 
print("Done.")