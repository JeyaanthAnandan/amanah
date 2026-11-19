import raw from "../../content/conditions.json";

export type Condition = {
  id: string;
  gene: string;
  name_en: string;
  name_ar: string;
  inheritance: "autosomal recessive";
  severityTier: "high" | "moderate";
  summary_en: string;
  summary_ar: string;
  living_with_en: string;
  living_with_ar: string;
  treatment_en: string;
  treatment_ar: string;
  sourceUrl: string;
  reviewStatus: string;
};

export const CONDITIONS = raw as Condition[];
export const GENES = CONDITIONS.map((c) => c.gene);
export const conditionById = (id: string) => CONDITIONS.find((c) => c.id === id);
export const conditionForGene = (gene: string) => CONDITIONS.find((c) => c.gene === gene);
