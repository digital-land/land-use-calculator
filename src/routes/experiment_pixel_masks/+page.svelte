<script>
import { onMount } from "svelte";
/**
* Load:
*   pixel_masks.uint64.bin
*   layer_lookup.csv
*
* Then query:
*   - single pixel
*   - range of pixels
*   - arbitrary pixel lists
*
* Assumes:
*   - masks are stored as UINT64
*   - up to 64 layers
*/
 
// ============================================================================
// LOAD LOOKUP CSV
// ============================================================================
onMount(function(){
 console.log("I'm here")
async function loadLookup(csvUrl) {
    const text = await fetch(csvUrl).then(r => r.text());
 
    const lines = text.trim().split("\n");
 
    // remove header
    lines.shift();
 
    const lookup = new Map();
 
    for (const line of lines) {
        const [layerName, bitIndex] = line.split(",");
 
        lookup.set(Number(bitIndex), layerName);
    }
 
    return lookup;
}
 
// ============================================================================
// LOAD UINT64 MASK ARRAY
// ============================================================================
 
async function loadMasks(binUrl) {
 
    const buffer = await fetch(binUrl)
        .then(r => r.arrayBuffer());
 
    return new BigUint64Array(buffer);
}
 
// ============================================================================
// DECODE A SINGLE UINT64 MASK
// ============================================================================
 
function decodeMask(mask, lookup) {
 
    const layers = [];
 
    for (const [bitIndex, layerName] of lookup.entries()) {
 
        const bit = 1n << BigInt(bitIndex);
 
        if ((mask & bit) !== 0n) {
            layers.push(layerName);
        }
    }
 
    return layers;
}
 
// ============================================================================
// GET LAYERS FOR A SINGLE PIXEL
// ============================================================================
 
function getPixelLayers(pixelIndex, masks, lookup) {
 
    const mask = masks[pixelIndex];
 
    return decodeMask(mask, lookup);
}
 
// ============================================================================
// GET LAYERS FOR A RANGE OF PIXELS
// ============================================================================
 
function getRangeLayers(startIndex, endIndex, masks, lookup) {
 
    let combinedMask = 0n;
 
    for (let i = startIndex; i <= endIndex; i++) {
        combinedMask |= masks[i];
    }
 
    return decodeMask(combinedMask, lookup);
}
 
// ============================================================================
// GET LAYERS COMMON TO ALL PIXELS IN RANGE
// ============================================================================
 
function getCommonRangeLayers(startIndex, endIndex, masks, lookup) {
 
    let combinedMask = masks[startIndex];
 
    for (let i = startIndex + 1; i <= endIndex; i++) {
        combinedMask &= masks[i];
    }
 
    return decodeMask(combinedMask, lookup);
}
 
// ============================================================================
// GET LAYERS FOR ARBITRARY PIXEL LIST
// ============================================================================
 
function getPixelListLayers(pixelIndices, masks, lookup) {
 
    let combinedMask = 0n;
 
    for (const idx of pixelIndices) {
        combinedMask |= masks[idx];
    }
 
    return decodeMask(combinedMask, lookup);
}
 
// ============================================================================
// EXAMPLE USAGE
// ============================================================================
 
(async () => {
 
    const lookup = await loadLookup("data/PUBLIC_BIN_LAYERS/layer_lookup.csv");
 
    const masks = await loadMasks("data/PUBLIC_BIN_LAYERS/pixel_masks.uint64.bin");
 
    // ------------------------------------------------------------------------
    // Single pixel
    // ------------------------------------------------------------------------
 
    const pixelLayers = getPixelLayers(
        530072,
        masks,
        lookup
    );
 
    console.log("Single pixel:");
    console.log(pixelLayers);
 
    // ------------------------------------------------------------------------
    // Pixel range
    // ------------------------------------------------------------------------
 
    const rangeLayers = getRangeLayers(
        530000,
        530100,
        masks,
        lookup
    );
 
    console.log("Any layer in range:");
    console.log(rangeLayers);
 
    // ------------------------------------------------------------------------
    // Common layers in range
    // ------------------------------------------------------------------------
 
    const commonLayers = getCommonRangeLayers(
        530000,
        530100,
        masks,
        lookup
    );
 
    console.log("Layers common to all pixels:");
    console.log(commonLayers);
 
    // ------------------------------------------------------------------------
    // Arbitrary pixel list
    // ------------------------------------------------------------------------
 
    const arbitraryLayers = getPixelListLayers(
        [530072, 530080, 530099],
        masks,
        lookup
    );
 
    console.log("Layers in arbitrary pixels:");
    console.log(arbitraryLayers);
 
})();
})
</script>
<svelte>
   <h2> Look at the console to see the outputs of the experimental pixel masks</h2>
</svelte>