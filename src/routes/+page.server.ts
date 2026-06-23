import { parseCSVToObject } from "$lib/utils";
import { asset } from "$app/paths";
import type { PageServerLoad } from "./$types";

// export const load: PageServerLoad = async ({ fetch, url }) => {
export const load: PageServerLoad = async ({ fetch }) => {
  const response: Response = await fetch(asset(`/output.csv`));

  if (!response.ok) {
    throw new Error("Failed to fetch CSV");
  }

  const csvText: string = await response.text();

  const grid10mVariables: object = parseCSVToObject(csvText);

  // let urlParams = new URLSearchParams(url.searchParams);

  // const urlSelected: string[] = urlParams.getAll("selected");
  // const urlPolicyLens: string = urlParams.getAll("policyLens")[0];

  // let urlParamsString = urlParams.toString();

  return {
    grid10mVariables,
    // urlParams: [...urlParams],
    // urlParamsString,
    // urlSelected,
    // urlPolicyLens,

    // Temporary defaults while prerendering/static hosting is in use
    urlParams: [],
    urlParamsString: "",
    urlSelected: [],
    urlPolicyLens: undefined,
  };
};
