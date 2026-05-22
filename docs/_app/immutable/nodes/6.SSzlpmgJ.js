import"../chunks/CWj6FrbW.js";import"../chunks/GClNN-Zi.js";import{b9 as t,ae as S,bg as C,M as q,X as a,ah as I,aX as e,aL as M}from"../chunks/DwOPbnjg.js";import{s as i}from"../chunks/CMzGVNpQ.js";import{d as n}from"../chunks/BYd4ZheD.js";import{S as F}from"../chunks/BPgWcXpj.js";var G=I(`<div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">GeoSpatial analysis with Web Workers and WebAssembly</h1> <p></p> <blockquote style="font-size: 200%; margin-top: 30%">What proportion of national parks are built up areas?</blockquote></div> <div style="/* position:sticky; top: 45vh; right: 20px; */"><div style="/* position:sticky; top: 50vh; left: 20px; */ aspect-ratio:756/491;"><iframe loading="lazy" title="Gumlet video player" src="https://play.gumlet.io/embed/69a81ed93a5494380470004b" style="*/ border:none; height: 45%; width: 45%; */" referrerpolicy="origin" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"></iframe></div></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">GeoTIFF - turning vector data into raster data</h1> <div class="slide-content"><img alt="Pixelated lightbulb showing conversion from vector to raster"/></div></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">We want to analyse the data in a range of ways</h1> <div class="slide-content"><img alt="QGIS tools available"/></div></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">The data is just an array</h1> <div class="slide-content"><img alt="1s and 0s showing a map"/></div></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">Lets do some JavaScript</h1> <div class="slide-content"><pre><code></code></pre></div></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">Web Workers</h1> <div class="slide-content"><!></div> <p class="govuk-body" style="font-size: 200%; margin-top: 200px">We can move work off the main thread.</p></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><img alt="Many copies of Agent Smith from the Matrix" width="80%"/></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">WebAssembly, or <span class="rainbow svelte-1kppjvx">wasm</span></h1> <div class="slide-content"><p class="govuk-body">WebAssembly is a type of code that can be run in modern web browsers. It
      is a low-level assembly-like language with a compact binary format that
      runs with near-native performance and provides languages such as C/C++, C#
      and Rust with a compilation target so that they can run on the web.</p></div></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><h1 class="slide-heading govuk-heading-l">Can we make things faster still?</h1> <br/><br/> <p class="govuk-body">Yes: Use .bin files instead of GeoTIFF, arrays of indices instead of 0s and
    1s, and more, but we won't get into that now...</p> <br/><br/> <div class="slide-content"><style>code {
        background: #f4f4f4;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: "Courier New", monospace;
      }
      pre {
        background: #f4f4f4;
        padding: 15px;
        border-radius: 5px;
        overflow-x: auto;
        font-family: "Courier New", monospace;
        line-height: 1.4;
      }
      blockquote {
        border-left: 4px solid #ddd;
        margin: 1em 0;
        padding-left: 20px;
        color: #666;
        font-style: italic;
      }
      table {
        border-collapse: collapse;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        width: 100%;
        margin: 1em 0;
      }
      th,
      td {
        border: 1px solid #ddd;
        padding: 8px 12px;
        text-align: left;
      }
      th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
      ul,
      ol {
        margin: 1em 0;
        padding-left: 2em;
      }
      li {
        margin: 0.5em 0;
      }</style> <table><thead><tr><th align="left">Task Type</th><th align="left">Main thread JS (including async)</th><th align="left">Web Worker</th><th align="left">WebAssembly (wasm)</th><th align="left">Wasm in Worker</th></tr></thead><tbody><tr><td align="left">DOM access</td><td align="left">✅</td><td align="left">❌</td><td align="left">❌</td><td align="left">❌</td></tr><tr><td align="left">Non-blocking UI</td><td align="left">⚠️</td><td align="left">✅</td><td align="left">❌</td><td align="left">✅</td></tr><tr><td align="left">CPU-heavy task</td><td align="left">❌</td><td align="left">⚠️</td><td align="left">✅</td><td align="left">✅✅</td></tr></tbody></table> <blockquote style="font-size: 200%; margin-top: 30%"><a href="./">What proportion of national parks are built up areas?</a></blockquote></div></div> <div class="slide govuk-width-container govuk-main-wrapper govuk-main-wrapper--l svelte-1kppjvx"><div class="slide-content"><blockquote style="font-size: 200%; margin-top: 30%">Do built up areas in National Parks have more conservation areas than BUAs
      generally?</blockquote> <img alt="Beautiful place" width="80%"/></div></div>`,1);function D(w){var p=G(),r=t(S(p),4),g=t(a(r),2),y=a(g);e(g),e(r);var s=t(r,2),c=t(a(s),2),x=a(c);e(c),e(s);var l=t(s,2),h=t(a(l),2),_=a(h);e(h),e(l);var o=t(l,2),m=t(a(o),2),u=a(m),W=a(u);W.textContent=`const size = 37_000_000;
const numArrays = 10;

// Create arrays
const arrays = Array.from({ length: numArrays }, () => new Array(size));

// Fill them with random 0s and 1s
for (let k = 0; k < numArrays; k++) {
    const arr = arrays[k];
    for (let i = 0; i < size; i++) {
        arr[i] = Math.random() < 0.5 ? 1 : 0;
    }
}


arrays




const result = new Array(size);

for (let i = 0; i < size; i++) {
    let value = 0;

    for (let k = 0; k < numArrays; k++) {
        value |= arrays[k][i];
        if (value === 1) break; // Early exit optimization
    }

    result[i] = value;
}

result`,e(u),e(m),e(o);var d=t(o,2),k=t(a(d),2),A=a(k);F(A),e(k),M(2),e(d);var v=t(d,2),j=a(v);e(v);var f=t(v,6),b=a(f),z=t(a(b),2);e(b),e(f),C(()=>{i(y,"src",`${n??""}/lightbulb.png`),i(x,"src",`${n??""}/QGIStools.png`),i(_,"src",`${n??""}/massive-array.png`),i(j,"src",`${n??""}/agent-smith.jpg`),i(z,"src",`${n??""}/Ambleside.png`)}),q(w,p)}export{D as component};
