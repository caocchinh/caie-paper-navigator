import { SUBJECTS } from "./constants";

// Validate paper type (must be 1 digit, not 0)
export const validatePaperType = (value: string): string | null => {
  if (!value) return null;
  if (value.length !== 1) return "Please enter a valid paper type";
  if (value === "0") return "Paper type cannot be 0";
  if (!/^\d$/.test(value)) return "Paper type must be a number";
  return null;
};

// Validate variant (must be 1 digit)
export const validateVariant = (value: string): string | null => {
  if (!value) return null;
  if (value.length !== 1) return "Please enter a valid variant";
  if (!/^\d$/.test(value)) return "Variant must be a number";
  return null;
};

// Validate year (must be 2 digits, between 2009 and current year)
export const validateYear = (value: string): string | null => {
  if (!value) return null;

  const currentYear = new Date().getFullYear();

  // Handle full year input (e.g., "2020")
  let yearNum: number;
  if (value.length >= 4) {
    yearNum = parseInt(value);
  } else if (value.length === 2) {
    yearNum = parseInt(`20${value}`);
  } else {
    return "Please enter a valid year";
  }

  if (isNaN(yearNum)) return "Invalid year format";
  if (yearNum < 2009) return "Year must be 2009 or later";
  if (yearNum > currentYear)
    return `Year cannot exceed current year (${currentYear})`;

  return null;
};

// Validate quick code format
export const validateQuickCode = (code: string): string | null => {
  if (!code) return null;

  const regex = /^(\d{4})\/(\d{2})\/(F\/M|M\/J|O\/N)\/(\d{2})$/;
  if (!regex.test(code)) {
    return "Invalid format. Correct: [Subject Code]/[Paper Number]/[Season]/[Year]";
  }

  const match = code.match(regex);
  if (!match)
    return "Invalid format. Correct: [Subject Code]/[Paper Number]/[Season]/[Year]";

  const subjectCode = match[1];
  const subject = SUBJECTS.find((s) => s.code === subjectCode);
  if (!subject) {
    return `Subject with code ${subjectCode} is not supported yet`;
  }

  // Validate the year
  const yearDigits = match[4];
  const fullYear = parseInt(`20${yearDigits}`);
  const currentYear = new Date().getFullYear();

  if (fullYear > currentYear) {
    return `Year cannot exceed current year (${currentYear})`;
  }

  if (fullYear < 2009) {
    return "Year must be 2009 or later";
  }

  return null;
};

// Parse quick code and extract values
export interface ParsedQuickCode {
  subjectCode: string;
  paperType: string;
  variant: string;
  season: string;
  year: string;
}

export const parseQuickCode = (code: string): ParsedQuickCode | null => {
  const regex = /^(\d{4})\/(\d{2})\/(F\/M|M\/J|O\/N)\/(\d{2})$/;
  const match = code.match(regex);

  if (!match) return null;

  const [, subjectCode, paperNumber, season, year] = match;

  // Map season to ID
  let seasonId = "";
  if (season === "M/J") seasonId = "s";
  else if (season === "O/N") seasonId = "w";
  else if (season === "F/M") seasonId = "m";

  return {
    subjectCode,
    paperType: paperNumber.charAt(0),
    variant: paperNumber.charAt(1),
    season: seasonId,
    year,
  };
};
