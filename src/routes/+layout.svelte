<script>
  import "../app.css";
  import PhaseBanner from "$lib/PhaseBanner.svelte";
  import { ServiceNavigation } from "@communitiesuk/svelte-component-library";

  let { children } = $props();
</script>

<ServiceNavigation
  serviceName={"Development Land Analysis Platform"}
  serviceUrl="./"
  navigationItems={[
    { href: "./about", label: "About and user guide" },
    { href: "./paintMapStats", label: "Experimental painting app" },
  ]}
/>
<PhaseBanner
  tagText={"PROTOTYPE"}
  bannerText={"This is an experimental product under development. All results are provisional and should not be used publicly. "}
  linkText={"Share your feedback (opens in a new tab)"}
  linkHref={"https://mhclg.sharepoint.com/:x:/s/HousingDiversification/ETTZ0xrT3yZMpeaX1GkOy1oBBqdv1ZFXJHiZK47qCUQMhw?e=FggJfN"}
  linkTarget={"_blank"}
/>
{@render children()}
