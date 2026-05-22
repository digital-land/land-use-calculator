let instructions = {
  steps: {
    1: getData({ file: "landUseBreakdown.bin", result: "C1" }),
    2: getData({ file: "unregisteredLand.bin", result: "B1" }),
    3: getData({ file: "LABreakdown.bin", result: "C2" }),
    4: getData({ file: "England.bin", result: "B2" }),
    5: getData({ file: "Regions.bin", result: "C3" }),
    6: maskData({ mask: "B1", array: "C1", result: "C4" }),
    7: getBreakdowns({
      breakdowns: ["C2", "B2", "C3"],
      input: "C4",
      result: "JSON1",
    }),
    8: makeVis({ input: "JSON1", type: "splitBar", result: "V1" }),
    9: makeNarrative({ input: "JSON1", type: "splitBar", result: "N1" }),
    10: interpolate({ input: ["V1", "N1"], type: "tctc", result: "R1"}),
  },
  meta: {
    C1: "landUse.csv",
    B1: "unregisteredLand.csv",
    C2: "la.csv",
    B2: "england.csv",
    C3: "regions.csv",
  },
};
