import os
import math

# Parameters
input_file = "static/data/LAs/la_boundaries100_rnm.bin"
output_dir = "chunks"
os.makedirs(output_dir, exist_ok=True)

width = 5728           # columns
bytes_per_pixel = 2    # UInt16
target_chunk_size = 10 * 1024 * 1024  # 10 MB

bytes_per_row = width * bytes_per_pixel

# Round chunk size down to the nearest full row (and even number of bytes)
chunk_size = (target_chunk_size // bytes_per_row) * bytes_per_row
chunk_size -= chunk_size % 2  # just in case

print(f"Chunk size (bytes): {chunk_size:,}")

# Read file
with open(input_file, "rb") as f:
    data = f.read()

total_bytes = len(data)
total_chunks = math.ceil(total_bytes / chunk_size)
print(f"Total bytes: {total_bytes:,}, chunks: {total_chunks}")

for i in range(total_chunks):
    start = i * chunk_size
    end = min(start + chunk_size, total_bytes)
    chunk = data[start:end]

    # Ensure even number of bytes (required for Uint16Array)
    if len(chunk) % 2 != 0:
        chunk += b'\x00'

    chunk_file = os.path.join(output_dir, f"chunk_{i}.bin")
    with open(chunk_file, "wb") as cf:
        cf.write(chunk)

    print(f"Created {chunk_file}: {len(chunk):,} bytes")

print("✅ Done! All chunks aligned to 2-byte boundaries.")
