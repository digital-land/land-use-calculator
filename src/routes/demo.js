export default {
  label: "Land layers",
  children: [
    {
      label: "Ownership",
      children: [
        {
          label: "Central Government",
          children: [{ label: "DEFRA" }, { label: "MOD" }, { label: "Other" }],
        },
        { label: "Local Government" },
        { label: "Church" },
        { label: "UK Company" },
        { label: "Overseas Company" },
        { label: "Crown" },
        { label: "Private individual" },
        { label: "Unregistered" },
      ],
    },
    {
      label: "Use and cover",
      children: [
        {
          label: "Developed",
          children: [
            {
              label: "Housing",
              children: [
                { label: "Private owned" },
                { label: "Private rented" },
                { label: "Social rented" },
                { label: "Community land trust" },
              ],
            },
            { label: "Commerce" },
            { label: "Industry" },
            { label: "Education" },
            { label: "Health" },
            { label: "Solar" },
          ],
        },
        {
          label: "Undeveloped",
          children: [
            { label: "Agriculture" },
            { label: "Forest" },
            { label: "Wild" },
            { label: "Recreation space" },
          ],
        },
      ],
    },
    {
      label: "Protections",
      children: [
        { label: "Greenbelt" },
        {
          label: "Nature protections",
          children: [
            { label: "National nature reserve" },
            { label: "Local nature reserve" },
            { label: "National park" },
            { label: "RAMSAR site" },
          ],
        },
        {
          label: "Heritage protections",
          children: [
            { label: "UNESCO World Heritage site" },
            { label: "Conservation area" },
            { label: "Listed building" },
            { label: "Registered Park or Garden" },
          ],
        },
        { label: "No protections" },
      ],
    },
    {
      label: "Density",
      children: [
        { label: "Title deed density" },
        { label: "Population density" },
        { label: "Building density" },
      ],
    },
    {
      label: "Economics",
      children: [
        { label: "Land value" },
        { label: "Housing price" },
        { label: "Housing demand" },
      ],
    },
    {
      label: "Availability",
      children: [
        {
          label: "Call for sites",
          children: [
            { label: "Housing" },
            { label: "Employment" },
            { label: "Retail" },
            { label: "Community" },
            { label: "Open spaces" },
            { label: "Environmental mitigation" },
          ],
        },
        { label: "On the market" },
        { label: "Permission to develop" },
      ],
    },
    {
      label: "Environmental",
      children: [
        { label: "Air quality" },
        { label: "Noise" },
        { label: "Soil contamination" },
      ],
    },
    {
      label: "Activity",
      children: [
        { label: "Strava" },
        { label: "Road traffic" },
        { label: "Commerce" },
      ],
    },
    {
      label: "Infrastructure limitations",
      children: [
        { label: "Electricity" },
        { label: "Water" },
        { label: "Sewerage" },
        { label: "Gas" },
      ],
    },
    {
      label: "User added layers",
      children: [
        { label: "Zone 1" },
        { label: "Zone 2" },
        { label: "Zone 3" },
        { label: "Paint another..." },
        { label: "Upload another..." },
      ],
    },
  ],
};
