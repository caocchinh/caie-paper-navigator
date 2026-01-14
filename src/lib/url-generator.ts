import { SUBJECTS, seasonS } from "./constants";
import type {
  FormValues,
  PaperDetails,
  DocumentType,
} from "@/components/paper-search/types";

export interface GeneratedPaperResult {
  url: string;
  paperDetails: PaperDetails;
}

/**
 * Generate a paper URL and details from form values
 */
export const generatePaperUrl = (
  formValues: FormValues,
  documentType: DocumentType
): GeneratedPaperResult | null => {
  const selectedSubject = SUBJECTS.find((s) => s.id === formValues.subject);
  if (!selectedSubject) return null;

  const subjectCode = selectedSubject.code;
  const seasonId = formValues.season;
  const year = `20${formValues.year}`;
  const shortYear = formValues.year;
  const paperNumber = `${formValues.paperType}${formValues.variant}`;

  // Build paper code based on document type
  let paperCode = `${subjectCode}-${seasonId}${shortYear}-${documentType}`;
  if (documentType === "ms" || documentType === "qp") {
    paperCode = `${paperCode}-${paperNumber}`;
  }

  const url = `https://bestexamhelp.com/exam/${formValues.curriculum}/${formValues.subject}/${year}/${paperCode}.php`;

  const seasonObj = seasonS.find((s) => s.id === seasonId);
  const seasonLabel = seasonObj ? seasonObj.label : "";

  const paperDetails: PaperDetails = {
    subjectCode: selectedSubject.code,
    subjectName: selectedSubject.label,
    paperNumber,
    season: seasonLabel,
    year: shortYear,
  };

  return { url, paperDetails };
};

/**
 * Generate a quick code string from form values
 * Format: [Subject Code]/[Paper Number]/[Season]/[Year]
 * Example: 9701/42/M/J/20
 */
export const generateQuickCode = (formValues: FormValues): string => {
  const selectedSubject = SUBJECTS.find((s) => s.id === formValues.subject);
  if (!selectedSubject) return "";

  let seasonCode = "";
  if (formValues.season === "s") seasonCode = "M/J";
  else if (formValues.season === "w") seasonCode = "O/N";
  else if (formValues.season === "m") seasonCode = "F/M";

  const paperNumber = `${formValues.paperType}${formValues.variant}`;
  return `${selectedSubject.code}/${paperNumber}/${seasonCode}/${formValues.year}`;
};

/**
 * Check if form values are complete and valid for generating a URL
 */
export const isFormComplete = (formValues: FormValues): boolean => {
  const yearNum = formValues.year ? parseInt(`20${formValues.year}`) : 0;

  return !!(
    formValues.curriculum &&
    formValues.subject &&
    formValues.paperType?.length === 1 &&
    formValues.paperType !== "0" &&
    formValues.variant?.length === 1 &&
    formValues.season &&
    formValues.year?.length === 2 &&
    yearNum >= 2009 &&
    yearNum <= new Date().getFullYear()
  );
};
