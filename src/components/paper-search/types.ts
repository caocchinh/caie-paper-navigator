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

export interface PaperSearchProps {
  paperType: "qp" | "ms";
  onLinkGenerated: (
    link: string | null,
    details: PaperDetails | undefined,
    showDialog?: boolean,
    isQuickSearch?: boolean
  ) => void;
  isClearData: boolean;
  setIsClearData: (isClearData: boolean) => void;
  preferencesLoaded?: boolean;
  showDialogOnLoad?: boolean;
}
