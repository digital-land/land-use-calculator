<script>
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import tileGrid from './tiles'

  
  onMount( async () => {
    console.time("tileWorker");
    const tilerWorker = new Worker(
      new URL("$lib/workers/tilerWorker.js", import.meta.url),
      { type: "module" },
    );

tilerWorker.onerror = (err) => {
  console.error("Worker error:", err);
};

    const tileCodes = { //QUESTION IS - How do we want to identify the tiles we need? A single bounding box approach maybe? 
      //Where the ultimate metadata provides the bounds of each feature layer 
      //Or the user selects their own area which has bounds.
      "8,10": `SUNE`,
      "9,10": `SUNW`,
      "8,11": `SUSW`
    };

    tilerWorker.postMessage({
      base,
      tileCodes: tileCodes, // send urls and relative positions
      width: 5000
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

<h1>Hello!</h1>
