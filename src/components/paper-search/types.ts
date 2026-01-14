export interface FormValues {
  curriculum: string;
  subject: string;
  paperType: string;
  variant: string;
  season: string;
  year: string;
}

export interface FormErrors {
  curriculum?: string;
  subject?: string;
  paperType?: string;
  variant?: string;
  season?: string;
  year?: string;
}

export interface PaperDetails {
  subjectCode: string;
  subjectName: string;
  paperNumber: string;
  season: string;
  year: string;
}

export interface PaperSearchHandles {
  focusQuickSearch: () => void;
}

export type DocumentType = "qp" | "ms" | "er" | "gt";

export interface PaperSearchProps {
  onSubmit: (
    formValues: FormValues,
    options?: { showDialog?: boolean; isQuickSearch?: boolean }
  ) => void;
  onClear: () => void;
  isClearData: boolean;
  setIsClearData: (isClearData: boolean) => void;
  preferencesLoaded?: boolean;
  showDialogOnLoad?: boolean;
}

// Extended PaperDetails with link for App.tsx usage
export interface PaperDetailsWithLink extends PaperDetails {
  link: string;
}
