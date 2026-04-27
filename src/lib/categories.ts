export interface FPPCategory {
  code: string;
  name: string;
  group: string;
}

export const FPP_CATEGORIES: FPPCategory[] = [
  { code: "M1",    name: "Masculinos 1",   group: "Masculinos" },
  { code: "M2",    name: "Masculinos 2",   group: "Masculinos" },
  { code: "M3",    name: "Masculinos 3",   group: "Masculinos" },
  { code: "M4",    name: "Masculinos 4",   group: "Masculinos" },
  { code: "M5",    name: "Masculinos 5",   group: "Masculinos" },
  { code: "M6",    name: "Masculinos 6",   group: "Masculinos" },
  { code: "F1",    name: "Femininos 1",    group: "Femininos" },
  { code: "F2",    name: "Femininos 2",    group: "Femininos" },
  { code: "F3",    name: "Femininos 3",    group: "Femininos" },
  { code: "F4",    name: "Femininos 4",    group: "Femininos" },
  { code: "F5",    name: "Femininos 5",    group: "Femininos" },
  { code: "F6",    name: "Femininos 6",    group: "Femininos" },
  { code: "MX1",   name: "Mistos 1",       group: "Mistos" },
  { code: "MX2",   name: "Mistos 2",       group: "Mistos" },
  { code: "MX3",   name: "Mistos 3",       group: "Mistos" },
  { code: "MX4",   name: "Mistos 4",       group: "Mistos" },
  { code: "MX5",   name: "Mistos 5",       group: "Mistos" },
  { code: "MX6",   name: "Mistos 6",       group: "Mistos" },
  { code: "+35M",  name: "+35 Masculinos", group: "Veteranos" },
  { code: "+40M",  name: "+40 Masculinos", group: "Veteranos" },
  { code: "+45M",  name: "+45 Masculinos", group: "Veteranos" },
  { code: "+50M",  name: "+50 Masculinos", group: "Veteranos" },
  { code: "+55M",  name: "+55 Masculinos", group: "Veteranos" },
  { code: "+60M",  name: "+60 Masculinos", group: "Veteranos" },
  { code: "+35F",  name: "+35 Femininas",  group: "Veteranas" },
  { code: "+40F",  name: "+40 Femininas",  group: "Veteranas" },
  { code: "+45F",  name: "+45 Femininas",  group: "Veteranas" },
  { code: "+50F",  name: "+50 Femininas",  group: "Veteranas" },
  { code: "+55F",  name: "+55 Femininas",  group: "Veteranas" },
  { code: "+60F",  name: "+60 Femininas",  group: "Veteranas" },
  { code: "SUB18", name: "Sub-18",         group: "Jovens" },
  { code: "SUB16", name: "Sub-16",         group: "Jovens" },
  { code: "SUB14", name: "Sub-14",         group: "Jovens" },
  { code: "SUB12", name: "Sub-12",         group: "Jovens" },
];

export const FPP_CATEGORIES_BY_CODE = Object.fromEntries(
  FPP_CATEGORIES.map((c) => [c.code, c])
);

export function getCategoryName(code: string): string {
  return FPP_CATEGORIES_BY_CODE[code]?.name ?? code;
}
