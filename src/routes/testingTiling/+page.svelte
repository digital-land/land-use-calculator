<script>
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import tileGrid from "./tiles";

  //MAKE A SELECTION
  let bbox=[445_942, 149_055, 454_704, 155_813]
  let bottomLeft = Math.floor((bbox[0]/100000)*2)*50000 + "," + Math.floor((bbox[1]/100000)*2)*50000
  let topRight = Math.ceil((bbox[2]/100000)*2)*50000 + "," + Math.ceil((bbox[3]/100000)*2)*50000
  //make list of all tiles
  //check which tiles exist in layer metadata file
  //add tiles that do exist into tileCodes
  //if no tiles exist, alert user
  //send tileCodes to tilerWorker

  console.log("bottomLeft",bottomLeft)
  console.log("topRight",topRight)

  onMount(async () => {
    console.time("tileWorker");

    const tilerWorker = new Worker(
      new URL("$lib/workers/tilerWorker.js", import.meta.url),
      { type: "module" },
    );

    tilerWorker.onerror = (err) => {
      console.error("Worker error:", err);
    };

    const tileCodes = {
      //QUESTION IS - How do we want to identify the tiles we need? A single bounding box approach maybe?
      //Where the ultimate metadata provides the bounds of each feature layer
      //Or the user selects their own area which has bounds.
      "8,10": `SUNE`,
      "9,10": `SUNW`,
      "8,11": `SUSW`,
    };

    tilerWorker.postMessage({
      base,
      tileCodes: tileCodes, // send urls and relative positions
      width: 5000,
      sourceFolder: 'ten_metre',
      grid10mVariables: {
    "imaginaryNewTown": {
        "grid_size": "10",
        "data_type": "B",
        "datum": "idx",
        "data_structure": "32",
        "tile_codes": [
            "SUSW",
            "SUNW",
            "SUNE"
        ]
    }
}
    });

    tilerWorker.onmessage = (e) => {
      if (e.data.error) {
        console.warn(e.data.error);
        return;
      }
      console.log(e.data);
      console.timeEnd("tileWorker");
    };
  });

</script>

<h1>Check the console for timings and data</h1>