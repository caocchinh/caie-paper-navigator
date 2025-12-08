"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { CURRICULUMS, seasonS, SUBJECTS } from "@/lib/constants";
import { Label } from "@/components/ui/label";
import { Search, XCircle } from "lucide-react";
import {
  validateQuickCode,
  validatePaperType,
  validateVariant,
  validateYear,
  parseQuickCode,
} from "@/lib/validation";
import {
  saveFormValues,
  loadFormValues,
  saveQuickSearchValues,
  loadQuickSearchValues,
  clearAllValues,
} from "@/lib/storage";
import type {
  FormValues,
  FormErrors,
  PaperSearchHandles,
  PaperSearchProps,
  PaperDetails,
} from "@/components/paper-search/types";
import { NumberInputWithButtons } from "./paper-search/NumberInputWithButtons";
import { SelectField } from "./paper-search/SelectField";
import { QuickSearchSection } from "./paper-search/QuickSearchSection";

// Re-export types for backward compatibility
export type { PaperSearchHandles } from "@/components/paper-search/types";

export const PaperSearch = forwardRef<PaperSearchHandles, PaperSearchProps>(
  (
    {
      paperType,
      onLinkGenerated,
      isClearData,
      setIsClearData,
      preferencesLoaded = true,
      showDialogOnLoad,
    },
    ref
  ) => {
    // Form state
    const [formValues, setFormValues] = useState<FormValues>({
      curriculum: "cambridge-international-a-level",
      subject: "",
      paperType: "",
      variant: "",
      season: "",
      year: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
      {}
    );

    // Quick search state
    const [quickCode, setQuickCode] = useState("");
    const [quickCodeError, setQuickCodeError] = useState("");
    const [fullYear, setFullYear] = useState("");

    // Refs for tracking state
    const quickSearchInputRef = useRef<HTMLInputElement>(null);
    const hasMountedRef = useRef(false);
    const hasGeneratedInitialUrl = useRef(false);
    const quickSearchUsedRef = useRef(false);
    const pendingSubjectRef = useRef<string | null>(null);
    const previousCurriculumRef = useRef<string | null>(null);
    const isInitializedRef = useRef(false);

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focusQuickSearch: () => {
        quickSearchInputRef.current?.focus();
      },
    }));

    // Filter subjects based on selected curriculum
    const filteredSubjects = useMemo(
      () =>
        SUBJECTS.filter(
          (subject) => subject.curriculum === formValues.curriculum
        ),
      [formValues.curriculum]
    );

    // Generate quick code from form values
    const generateQuickCode = useCallback((values: FormValues): string => {
      const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
      if (!selectedSubject) return "";

      let seasonCode = "";
      if (values.season === "s") seasonCode = "M/J";
      else if (values.season === "w") seasonCode = "O/N";
      else if (values.season === "m") seasonCode = "F/M";

      const paperNumber = `${values.paperType}${values.variant}`;
      return `${selectedSubject.code}/${paperNumber}/${seasonCode}/${values.year}`;
    }, []);

    // Generate URL and call onLinkGenerated
    const generateUrl = useCallback(
      (values: FormValues, showDialog: boolean, isQuickSearch: boolean) => {
        const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
        if (!selectedSubject) return;

        const subjectCode = selectedSubject.code;
        const seasonId = values.season;
        const year = `20${values.year}`;
        const shortYear = values.year;
        const paperNumber = `${values.paperType}${values.variant}`;

        const url = `https://bestexamhelp.com/exam/${values.curriculum}/${values.subject}/${year}/${subjectCode}_${seasonId}${shortYear}_${paperType}_${paperNumber}.pdf`;

        const seasonObj = seasonS.find((s) => s.id === seasonId);
        const seasonLabel = seasonObj ? seasonObj.label : "";

        const details: PaperDetails = {
          subjectCode: selectedSubject.code,
          subjectName: selectedSubject.label,
          paperNumber,
          season: seasonLabel,
          year: shortYear,
        };

        hasGeneratedInitialUrl.current = true;
        onLinkGenerated(url, details, showDialog, isQuickSearch);

        // Update quick code
        const newQuickCode = generateQuickCode(values);
        setQuickCode(newQuickCode);
        setQuickCodeError("");
      },
      [paperType, onLinkGenerated, generateQuickCode]
    );

    // Update a single form field
    const updateFormField = useCallback(
      (field: keyof FormValues, value: string) => {
        setFormValues((prev) => {
          const newValues = { ...prev, [field]: value };
          saveFormValues(newValues);
          return newValues;
        });
        setTouchedFields((prev) => ({ ...prev, [field]: true }));
      },
      []
    );

    const handleCurriculumChange = useCallback((value: string) => {
      // Reset subject when curriculum changes
      setFormValues((prev) => {
        const newValues = { ...prev, curriculum: value, subject: "" };
        saveFormValues(newValues);
        return newValues;
      });
      setTouchedFields((prev) => ({ ...prev, curriculum: true }));
    }, []);

    // Handle subject change
    const handleSubjectChange = useCallback(
      (value: string) => {
        updateFormField("subject", value);
      },
      [updateFormField]
    );

    // Handle season change
    const handleSeasonChange = useCallback(
      (value: string) => {
        updateFormField("season", value);
      },
      [updateFormField]
    );

    // Handle paper type change
    const handlePaperTypeChange = useCallback(
      (value: string) => {
        const numericValue = value.replace(/\D/g, "").slice(0, 1);
        updateFormField("paperType", numericValue);
        const error = validatePaperType(numericValue);
        setErrors((prev) => ({ ...prev, paperType: error || undefined }));
      },
      [updateFormField]
    );

    // Handle variant change
    const handleVariantChange = useCallback(
      (value: string) => {
        const numericValue = value.replace(/\D/g, "").slice(0, 1);
        updateFormField("variant", numericValue);
        const error = validateVariant(numericValue);
        setErrors((prev) => ({ ...prev, variant: error || undefined }));
      },
      [updateFormField]
    );

    // Handle year change
    const handleYearChange = useCallback(
      (value: string) => {
        const numericValue = value.replace(/\D/g, "").slice(0, 4);
        setFullYear(numericValue);

        const lastTwoDigits = numericValue.slice(-2).padStart(2, "0");
        updateFormField("year", lastTwoDigits);

        const error = validateYear(numericValue);
        setErrors((prev) => ({ ...prev, year: error || undefined }));
      },
      [updateFormField]
    );

    // Increment/decrement handlers
    const incrementPaperType = useCallback(() => {
      const numValue = formValues.paperType
        ? parseInt(formValues.paperType)
        : 0;
      const newValue =
        numValue === 0 || numValue === 9
          ? "1"
          : ((numValue + 1) % 10).toString();
      handlePaperTypeChange(newValue);
    }, [formValues.paperType, handlePaperTypeChange]);

    const decrementPaperType = useCallback(() => {
      const numValue = formValues.paperType
        ? parseInt(formValues.paperType)
        : 0;
      const newValue =
        numValue === 0 || numValue === 1 ? "9" : (numValue - 1 || 9).toString();
      handlePaperTypeChange(newValue);
    }, [formValues.paperType, handlePaperTypeChange]);

    const incrementVariant = useCallback(() => {
      const numValue = formValues.variant ? parseInt(formValues.variant) : 0;
      const newValue = ((numValue + 1) % 10).toString();
      handleVariantChange(newValue);
    }, [formValues.variant, handleVariantChange]);

    const decrementVariant = useCallback(() => {
      const numValue = formValues.variant ? parseInt(formValues.variant) : 0;
      const newValue = ((numValue + 9) % 10).toString();
      handleVariantChange(newValue);
    }, [formValues.variant, handleVariantChange]);

    const incrementYear = useCallback(() => {
      const maxYear = new Date().getFullYear();
      if (!fullYear) {
        handleYearChange(maxYear.toString());
      } else {
        const currentYear = parseInt(fullYear);
        if (currentYear < maxYear) {
          handleYearChange((currentYear + 1).toString());
        }
      }
    }, [fullYear, handleYearChange]);

    const decrementYear = useCallback(() => {
      const currentYear = fullYear
        ? parseInt(fullYear)
        : new Date().getFullYear();
      handleYearChange((currentYear - 1).toString());
    }, [fullYear, handleYearChange]);

    // Check if form is valid
    const isFormValid = useMemo(() => {
      const yearNum = formValues.year ? parseInt(`20${formValues.year}`) : 0;
      const hasErrors = Object.values(errors).some((e) => e);

      return !!(
        formValues.curriculum &&
        formValues.subject &&
        formValues.paperType?.length === 1 &&
        formValues.paperType !== "0" &&
        formValues.variant?.length === 1 &&
        formValues.season &&
        formValues.year?.length === 2 &&
        yearNum >= 2009 &&
        yearNum <= new Date().getFullYear() &&
        !hasErrors
      );
    }, [formValues, errors]);

    // Handle quick code change
    const handleQuickCodeChange = useCallback((value: string) => {
      setQuickCode(value);
      const error = validateQuickCode(value);
      setQuickCodeError(error || "");
      saveQuickSearchValues(value);
    }, []);

    // Handle quick code submit
    const handleQuickCodeSubmit = useCallback(() => {
      const error = validateQuickCode(quickCode);
      if (error || !quickCode) {
        setQuickCodeError(error || "");
        return;
      }

      const parsed = parseQuickCode(quickCode);
      if (!parsed) {
        setQuickCodeError(
          "Invalid format. Correct: [Subject Code]/[Paper Number]/[Season]/[Year]"
        );
        return;
      }

      const subject = SUBJECTS.find((s) => s.code === parsed.subjectCode);
      if (!subject) {
        setQuickCodeError(
          `Subject with code ${parsed.subjectCode} is not supported yet`
        );
        return;
      }

      quickSearchUsedRef.current = true;

      // Build new form values
      const newFormValues: FormValues = {
        curriculum: subject.curriculum,
        subject: subject.id,
        paperType: parsed.paperType,
        variant: parsed.variant,
        season: parsed.season,
        year: parsed.year,
      };

      // Check if curriculum needs to change
      if (formValues.curriculum !== subject.curriculum) {
        pendingSubjectRef.current = subject.id;
        setFormValues((prev) => ({
          ...prev,
          curriculum: subject.curriculum,
          subject: "",
        }));
      } else {
        setFormValues(newFormValues);
        saveFormValues(newFormValues);
        setFullYear(`20${parsed.year}`);
        generateUrl(newFormValues, true, true);
      }

      setTouchedFields({
        curriculum: true,
        subject: true,
        paperType: true,
        variant: true,
        season: true,
        year: true,
      });
    }, [quickCode, formValues.curriculum, generateUrl]);

    // Handle form submission
    const handleFormSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        quickSearchUsedRef.current = false;
        saveFormValues(formValues);
        generateUrl(formValues, true, false);
      },
      [formValues, isFormValid, generateUrl]
    );

    // Handle clear data
    useEffect(() => {
      if (isClearData) {
        setFormValues({
          curriculum: "cambridge-international-a-level",
          subject: "",
          paperType: "",
          variant: "",
          season: "",
          year: "",
        });
        setQuickCode("");
        setFullYear("");
        setQuickCodeError("");
        setErrors({});
        setTouchedFields({});
        clearAllValues();
        setIsClearData(false);
        quickSearchUsedRef.current = false;
        hasGeneratedInitialUrl.current = false;
      }
    }, [isClearData, setIsClearData]);

    // Handle pending subject after curriculum change
    useEffect(() => {
      if (pendingSubjectRef.current) {
        const pendingSubject = pendingSubjectRef.current;
        const subjectExists = SUBJECTS.some(
          (s) =>
            s.id === pendingSubject && s.curriculum === formValues.curriculum
        );

        if (subjectExists) {
          // Parse quick code again to get all values
          const parsed = parseQuickCode(quickCode);
          if (parsed) {
            const subject = SUBJECTS.find((s) => s.code === parsed.subjectCode);
            if (subject) {
              const newFormValues: FormValues = {
                curriculum: subject.curriculum,
                subject: subject.id,
                paperType: parsed.paperType,
                variant: parsed.variant,
                season: parsed.season,
                year: parsed.year,
              };
              setFormValues(newFormValues);
              saveFormValues(newFormValues);
              setFullYear(`20${parsed.year}`);
              generateUrl(newFormValues, true, true);
            }
          }
          pendingSubjectRef.current = null;
        }
      }
      previousCurriculumRef.current = formValues.curriculum;
    }, [formValues.curriculum, quickCode, generateUrl]);

    // Load form values on mount
    useEffect(() => {
      if (
        preferencesLoaded &&
        !hasGeneratedInitialUrl.current &&
        !hasMountedRef.current
      ) {
        hasMountedRef.current = true;

        // Load quick search values
        loadQuickSearchValues().then((savedQuickCode) => {
          if (savedQuickCode) {
            setQuickCode(savedQuickCode);
            const error = validateQuickCode(savedQuickCode);
            setQuickCodeError(error || "");
          }
        });

        // Load form values
        loadFormValues().then((savedValues) => {
          if (savedValues) {
            setFormValues(savedValues);
            if (savedValues.year) {
              setFullYear(
                savedValues.year.length === 2
                  ? `20${savedValues.year}`
                  : savedValues.year
              );
            }
            isInitializedRef.current = true;

            // Generate URL if all values are present
            if (
              savedValues.subject &&
              savedValues.paperType &&
              savedValues.variant &&
              savedValues.season &&
              savedValues.year
            ) {
              setTimeout(() => {
                generateUrl(savedValues, showDialogOnLoad ?? false, false);
              }, 0);
            }
          }
        });
      }
    }, [preferencesLoaded, showDialogOnLoad, generateUrl]);

    return (
      <div className="space-y-6 w-full">
        {/* Quick Search Section */}
        <QuickSearchSection
          ref={quickSearchInputRef}
          quickCode={quickCode}
          onQuickCodeChange={handleQuickCodeChange}
          onSubmit={handleQuickCodeSubmit}
          error={quickCodeError}
        />

        {/* Manual Input Form */}
        <form
          onSubmit={handleFormSubmit}
          className="space-y-4 w-full border-2 p-5 mb-4 rounded-sm"
        >
          <Label htmlFor="curriculum" className="text-sm text-red-500">
            Manual Input
          </Label>

          {/* Curriculum Select */}
          <SelectField
            id="curriculum"
            label="Curriculum"
            value={formValues.curriculum}
            onChange={handleCurriculumChange}
            options={CURRICULUMS}
            placeholder="Select curriculum"
          />

          {/* Subject Select */}
          <SelectField
            id="subject"
            label="Subject"
            value={formValues.subject}
            onChange={handleSubjectChange}
            options={filteredSubjects}
            placeholder="Select subject"
            renderOption={(option) => `${option.label} (${option.code})`}
          />

          <div className="grid grid-cols-1 gap-4 w-full">
            <div className="flex items-center justify-between gap-6">
              {/* Paper Type */}
              <div className="w-1/2">
                <NumberInputWithButtons
                  id="paperType"
                  label="Paper Type"
                  value={formValues.paperType}
                  onChange={handlePaperTypeChange}
                  onIncrement={incrementPaperType}
                  onDecrement={decrementPaperType}
                  placeholder="e.g. 4"
                  error={touchedFields.paperType ? errors.paperType : undefined}
                />
              </div>

              {/* Variant */}
              <div className="w-1/2">
                <NumberInputWithButtons
                  id="variant"
                  label="Variant"
                  value={formValues.variant}
                  onChange={handleVariantChange}
                  onIncrement={incrementVariant}
                  onDecrement={decrementVariant}
                  placeholder="e.g. 2"
                  error={touchedFields.variant ? errors.variant : undefined}
                />
              </div>
            </div>

            {/* Season Select */}
            <SelectField
              id="season"
              label="Exam Season"
              value={formValues.season}
              onChange={handleSeasonChange}
              options={seasonS}
              placeholder="Select season"
              renderOption={(option) => `${option.label} - ${option.fullName}`}
            />

            {/* Year */}
            <NumberInputWithButtons
              id="year"
              label="Year"
              value={fullYear}
              onChange={handleYearChange}
              onIncrement={incrementYear}
              onDecrement={decrementYear}
              placeholder="e.g. 2020"
              error={touchedFields.year ? errors.year : undefined}
            />
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className={`w-full p-2 text-white rounded-md cursor-pointer bg-primary dark:bg-white dark:text-black ${
                !isFormValid && "opacity-50 pointer-events-none"
              }`}
              disabled={!isFormValid}
            >
              {!isFormValid ? "Please fill all fields" : "Find Paper"}
              <Search className="w-4 h-4 ml-2 inline" />
            </button>
          </div>
        </form>

        {/* Clear All Button */}
        <button
          type="button"
          className="w-full p-2 text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer flex items-center justify-center"
          onClick={() => setIsClearData(true)}
        >
          Clear All
          <XCircle className="w-4 h-4 ml-2" />
        </button>
      </div>
    );
  }
);

PaperSearch.displayName = "PaperSearch";
