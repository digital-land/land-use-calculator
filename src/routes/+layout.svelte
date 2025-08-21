<script>
  import PhaseBanner from "$lib/PhaseBanner.svelte";
  import { ServiceNavigation } from "@communitiesuk/svelte-component-library";

  let { children } = $props();
</script>

<ServiceNavigation
  serviceName={"MHCLG Land Stats tool"}
  serviceUrl="/"
  navigationItems={[{ href: "./about", label: "About" }]}
/>
<PhaseBanner
  tagText={"PROTOTYPE"}
  bannerText={"This is an experimental product under development. "}
  linkText={"Share feedback (opens in a new tab)"}
  linkHref={"https://mhclg.sharepoint.com/:x:/s/HousingDiversification/ETTZ0xrT3yZMpeaX1GkOy1oBBqdv1ZFXJHiZK47qCUQMhw?e=FggJfN"}
  linkTarget={"_blank"}
/>
{@render children()}
