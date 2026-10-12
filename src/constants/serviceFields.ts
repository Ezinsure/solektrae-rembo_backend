// Each key MUST match a column on the Customer entity.
// To add a new field: add a column to Customer + one line here.
export const FIELD_CATALOG = [
  // Family
  { key: "fatherName", group: "family", type: "text",
    label: { en: "Father's name", fr: "Nom du père", rw: "Izina rya se" } },
  { key: "motherName", group: "family", type: "text",
    label: { en: "Mother's name", fr: "Nom de la mère", rw: "Izina rya nyina" } },
  { key: "spouseName", group: "family", type: "text",
    label: { en: "Spouse's name", fr: "Nom du conjoint ~ de la conjointe", rw: "Izina ry'uwo mwashakanye" } },

  // Personal
  { key: "height", group: "personal", type: "number",
    label: { en: "Height (cm)", fr: "Taille (cm)", rw: "Uburebure (cm)" } },
  { key: "hovName", group: "personal", type: "text",
    label: { en: "Name of the Head of Village", fr: "Nom du chef du village", rw: "Amazina y'umukuru w'umudugudu" } },
  { key: "hovNumber", group: "personal", type: "phone",
    label: { en: "Phone Number of the Head of Village", fr: "Numéro de téléphone du chef du village", rw: "Telefone y'umukuru w'umudugudu" } },

  // Address
  { key: "district", group: "address", type: "text", label: { en: "District", fr: "District", rw: "Akarere" } },
  { key: "sector", group: "address", type: "text", label: { en: "Sector", fr: "Secteur", rw: "Umurenge" } },
  { key: "cell", group: "address", type: "text", label: { en: "Cell", fr: "Cellule", rw: "Akagari" } },
  { key: "village", group: "address", type: "text", label: { en: "Village", fr: "Village", rw: "Umudugudu" } },
  { key: "street", group: "address", type: "text", label: { en: "Street Number", fr: "Numero de Rue", rw: "Nomero y' Umuhanda" } },
] as const;

export const FIELD_KEYS = FIELD_CATALOG.map((f) => f.key) as unknown as [string, ...string[]];

export const FIELD_GROUPS = [
  { key: "family", label: "Family" },
  { key: "personal", label: "Personal" },
  { key: "address", label: "Address" },
];

export type ServiceField = { key: string; required: boolean };