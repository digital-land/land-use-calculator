import os
import math
import numpy as np

# Parameters
input_file = "static/data/LAs/la_boundaries100_rnm.bin"
output_dir = "chunks"
os.makedirs(output_dir, exist_ok=True)

width = 5728           # columns
bytes_per_pixel = 2    # UInt16
target_chunk_size = 10 * 1024 * 1024  # 10 MB

# Calculate rows per chunk
bytes_per_row = width * bytes_per_pixel
rows_per_chunk = target_chunk_size // bytes_per_row
print(f"Each chunk will have ~{rows_per_chunk} rows")

# Read the full binary file as bytes
with open(input_file, "rb") as f:
    full_buffer = f.read()

total_rows = len(full_buffer) // bytes_per_row
print(f"Total rows in raster: {total_rows}")

chunk_index = 0
for row_start in range(0, total_rows, rows_per_chunk):
    row_end = min(row_start + rows_per_chunk, total_rows)
    start_byte = row_start * bytes_per_row
    end_byte = row_end * bytes_per_row

    chunk_data = full_buffer[start_byte:end_byte]
    chunk_file = os.path.join(output_dir, f"chunk_{chunk_index}.bin")
    with open(chunk_file, "wb") as cf:
        cf.write(chunk_data)

    print(f"Created {chunk_file}: rows {row_start}-{row_end-1}, size {len(chunk_data)} bytes")
    chunk_index += 1

print(f"Done! {chunk_index} chunks created in '{output_dir}'")