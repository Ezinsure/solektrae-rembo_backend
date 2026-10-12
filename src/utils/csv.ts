const DANGEROUS = /^[=\-@\t\r]/;

export const csvCell = (value: any) => {
  let s = value === null || value === undefined ? "" : String(value);
  if (DANGEROUS.test(s) || (s.startsWith("+") && !/^\+\d+$/.test(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const toCsv = (headers: string[], rows: any[][]) =>
  "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

export const kigaliDate = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString("en-GB", { timeZone: "Africa/Kigali" }) : "";