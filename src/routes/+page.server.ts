import { parseCSVToObject } from "$lib/utils";
import { base } from "$app/paths";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, url }) => {
  const response = await fetch(`${base}/meta_feb_26.csv`);

  if (!response.ok) {
    throw new Error("Failed to fetch CSV");
  }

  const csvText = await response.text();

  const grid10mVariables = parseCSVToObject(csvText);

  let urlParams = {};

  for (const p of url.searchParams) {
    urlParams[p[0]] = p[1];
  }

  const urlSelected = url.searchParams.getAll("selected");

  let urlParamsString = url.searchParams.toString();

  return {
    grid10mVariables,
    urlParams,
    urlParamsString,
    urlSelected,
  };
};
