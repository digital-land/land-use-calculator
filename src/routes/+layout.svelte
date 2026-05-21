<script>
  import "../app.css";
  import PhaseBanner from "$lib/components/PhaseBanner.svelte";
    import WarningText from "$lib/components/WarningText.svelte";
  import {
    Header,
    ServiceNavigation,
    Footer,
  } from "@communitiesuk/svelte-component-library";
  import { page } from "$app/state";

  let { children } = $props();
  let currentPath = $derived(page.url.pathname);
  $inspect(currentPath);

  let applicationPages = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About and user guide" },
    { href: "/paintMapStats", label: "Experimental painting app" },
  ];

  let navigationItems = $derived(
    applicationPages.map((el) => ({
      ...el,
      isActive: currentPath === el.href,
    })),
  );
</script>

<!-- <Header rebrand={true}/> -->
<ServiceNavigation
  serviceName={"Land Analysis Platform"}
  serviceUrl="./"
  {navigationItems}
  customiseServiceNameLink={true}
/>
<PhaseBanner
  tagText={"PROTOTYPE"}
  bannerText={"This is an experimental product under development. All results are provisional and should not be used publicly. "}
  linkText={"Share your feedback (opens in a new tab)"}
  linkHref={"https://mhclg.sharepoint.com/:x:/s/HousingDiversification/ETTZ0xrT3yZMpeaX1GkOy1oBBqdv1ZFXJHiZK47qCUQMhw?e=FggJfN"}
  linkTarget={"_blank"}
/>
<WarningText text={"Shortlisted for the Government Geography Awards, 2026 - Knowledge Driven Policy Making Category"}
/>
{@render children()}
<Footer
  rebrand={true}
  removeCopyrightPadding={true}
  borderTopColor={"#1d70b8"}
/>
