curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh

cargo new raster_ops --lib            
cd raster_ops

raster_ops % wasm-pack build --target web --release

convert tiff files to .bin:
mkdir -p static/bitpacked_bin
for f in static/bitpacked/*.tif; do
    gdal_translate -b 1 -ot Byte -of ENVI "$f" "static/bitpacked_bin/$(basename "$f" .tif).bin"
done


# Build all bitpacked BINs (default)
make

# Build all categorical BINs
make categorical_bin

# Clean bitpacked BINs
make clean

# Clean categorical BINs
make clean_categorical