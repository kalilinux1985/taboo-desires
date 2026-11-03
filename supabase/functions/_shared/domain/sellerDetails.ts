/** Optional "More about you" fields sellers can fill in on Settings. */
const range = (from: number, to: number, step = 1, suffix = "") =>
  Array.from(
    { length: Math.floor((to - from) / step) + 1 },
    (_, i) => `${from + i * step}${suffix}`,
  );

const HEIGHTS = Array.from({ length: 25 }, (_, i) => {
  const inches = 56 + i; // 4'8" to 6'8"
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
});

const YES_NO_SOMETIMES = ["Yes", "No", "Sometimes"];

export const SELLER_DETAIL_FIELDS = [
  {
    key: "country",
    label: "Country",
    options: [
      "United States",
      "Canada",
      "United Kingdom",
      "Ireland",
      "Australia",
      "New Zealand",
      "Germany",
      "France",
      "Spain",
      "Italy",
      "Netherlands",
      "Belgium",
      "Sweden",
      "Norway",
      "Denmark",
      "Finland",
      "Poland",
      "Portugal",
      "Austria",
      "Switzerland",
      "Czech Republic",
      "Mexico",
      "Brazil",
      "Argentina",
      "Colombia",
      "Chile",
      "South Africa",
      "Japan",
      "South Korea",
      "Philippines",
      "Thailand",
      "India",
      "Other",
    ],
    primary: true,
  },
  {
    key: "ageRange",
    label: "Age",
    options: ["18-20", "21-25", "26-30", "30-40", "40-50", "50+"],
    primary: true,
  },
  {
    key: "gender",
    label: "Gender",
    options: [
      "Female",
      "Male",
      "Trans woman",
      "Trans man",
      "Non-binary",
      "Other",
    ],
    primary: true,
  },
  {
    key: "ethnicity",
    label: "Ethnicity",
    options: [
      "Caucasian (White)",
      "Black",
      "Hispanic / Latina",
      "Asian",
      "Middle Eastern",
      "Native American",
      "Pacific Islander",
      "Mixed",
      "Other",
    ],
  },
  {
    key: "bodySize",
    label: "Body size",
    options: [
      "Petite",
      "Slim",
      "Athletic",
      "Average",
      "Curvy",
      "Plus size",
      "BBW",
    ],
  },
  { key: "shoeSize", label: "Shoe size (US)", options: range(4, 14, 0.5) },
  {
    key: "showFace",
    label: "Will show face",
    options: ["Yes", "No", "Sometimes"],
    hint: "Are you willing to show your face?",
  },
  {
    key: "occupation",
    label: "Occupation",
    options: [
      "Student",
      "Office worker",
      "Healthcare",
      "Fitness / Trainer",
      "Hospitality",
      "Retail",
      "Teacher",
      "Creative / Artist",
      "Model",
      "Self-employed",
      "Stay at home",
      "Other",
    ],
  },
  { key: "tattoos", label: "Tattoos", options: ["None", "A few", "Many"] },
  {
    key: "piercings",
    label: "Piercings",
    options: ["None", "Ears only", "A few", "Many"],
  },
  {
    key: "hairColor",
    label: "Hair color",
    options: [
      "Blonde",
      "Brunette",
      "Black",
      "Red",
      "Auburn",
      "Gray",
      "Dyed / Colorful",
      "Bald",
    ],
  },
  {
    key: "eyeColor",
    label: "Eye color",
    options: ["Brown", "Blue", "Green", "Hazel", "Gray", "Other"],
  },
  { key: "smokes", label: "Smokes", options: YES_NO_SOMETIMES },
  { key: "drinks", label: "Drinks", options: YES_NO_SOMETIMES },
  { key: "height", label: "Height", options: HEIGHTS },
  {
    key: "relationshipStatus",
    label: "Relationship status",
    options: [
      "Single",
      "In a relationship",
      "Married",
      "It's complicated",
      "Prefer not to say",
    ],
  },
] as const;

export type SellerDetailKey = (typeof SELLER_DETAIL_FIELDS)[number]["key"];
export type SellerDetails = Partial<Record<SellerDetailKey, string>>;

export const SELLER_DETAIL_KEYS = SELLER_DETAIL_FIELDS.map((f) => f.key);

/** Returns an error message for the first value that isn't one of its field's choices, else null. */
export function invalidSellerDetail(details: SellerDetails): string | null {
  for (const field of SELLER_DETAIL_FIELDS) {
    const value = details[field.key];
    if (
      value !== undefined &&
      !(field.options as readonly string[]).includes(value)
    ) {
      return `Invalid ${field.label.toLowerCase()}`;
    }
  }
  return null;
}
