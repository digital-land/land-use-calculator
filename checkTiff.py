import os
import rasterio

def is_problematic_geotiff(path):
    try:
        with rasterio.open(path) as src:
            if src.width == 0 or src.height == 0 or src.count == 0:
                return True, "Empty dimensions or no bands"
            if not any(src.read(i + 1).any() for i in range(src.count)):
                return True, "All bands contain only zero values"
            return False, "OK"
    except Exception as e:
        return True, str(e)

directory = "/static/data/LAs"
for fname in os.listdir(directory):
    if fname.endswith(".tif"):
        fpath = os.path.join(directory, fname)
        bad, reason = is_problematic_geotiff(fpath)
        if bad:
            print(f"{fname}: {reason}")