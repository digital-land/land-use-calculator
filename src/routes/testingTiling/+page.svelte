<script>
import {onMount} from 'svelte'

onMount(()=>{
  let SUNE,SUNW,SUSW

fetch("data/ten_metre/SUNE_10_imaginaryNewTown_B_idx_32_2601.bin").then(res=>res.arrayBuffer()).then(buf=>SUNE=buf)
fetch("data/ten_metre/SUNW_10_imaginaryNewTown_B_idx_32_2601.bin").then(res=>res.arrayBuffer()).then(buf=>SUNW=buf)
fetch("data/ten_metre/SUSW_10_imaginaryNewTown_B_idx_32_2601.bin").then(res=>res.arrayBuffer()).then(buf=>SUSW=buf)

    const tilerWorker = new Worker(
      new URL("$lib/workers/tilerWorker.js", import.meta.url),
      { type: "module" }
    )
    // Get the raw buffers
    const buffers = 	// const tiles = 
    {
      "8,10":SUNW,
      "9,10":SUNE,
      "8,11":SUSW
		// "0,0": [11, 14, 15],
		// "1,0": [8, 12, 13],
		// "2,0": [1, 2],
		// "0,1": [2, 3, 7],
		// "2,1": [0, 1, 4],
		// "2,2":[]
	};
    

    tilerWorker.postMessage(
      {
        tiles: buffers, // send raw ArrayBuffers
        width: 4
      },
      buffers, // transfer buffers (zero-copy)
    );

    tilerWorker.onmessage = (e) => {
      console.log(e)
  }
  ;}
)
</script>
<h1>Hello!</h1>