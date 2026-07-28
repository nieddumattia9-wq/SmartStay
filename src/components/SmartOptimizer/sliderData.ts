export type SliderOption = {
  id: string;
  title: string;
  shortLabel: string;
  description: string;
  color: string;
  textColor: string;
};

export const sliderOptions = [
  {
    id: "maximum-comfort",
    title: "Maximum Comfort",
    shortLabel: "Maximum Comfort",
    description:
      "Prioritize stronger quality, reviews and location among the options that fit your search.",
    color: "#2563EB",
    textColor: "#2563EB",
  },
  {
    id: "comfort",
    title: "Comfort",
    shortLabel: "Comfort",
    description:
      "Give more weight to quality, reviews and location while still protecting value.",
    color: "#3B82F6",
    textColor: "#1D4ED8",
  },
  {
    id: "balanced",
    title: "Balanced",
    shortLabel: "Balanced",
    description:
      "Balance total price, distance, quality and reliability.",
    color: "#16E06E",
    textColor: "#047857",
  },
  {
    id: "savings",
    title: "Savings",
    shortLabel: "Savings",
    description:
      "Give more weight to lower total prices while still considering quality and reliability.",
    color: "#2BBF6A",
    textColor: "#15803D",
  },
  {
    id: "maximum-savings",
    title: "Maximum Savings",
    shortLabel: "Maximum Savings",
    description:
      "Prioritize the lowest reliable total prices while respecting your search limits.",
    color: "#18B75A",
    textColor: "#166534",
  },
] as const satisfies readonly SliderOption[];

export type SliderOptionId =
  typeof sliderOptions[number]["id"];
