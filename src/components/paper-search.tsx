"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
  memo,
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
import { generateQuickCode, isFormComplete } from "@/lib/url-generator";
import type {
  FormValues,
  FormErrors,
  PaperSearchHandles,
  PaperSearchProps,
} from "@/components/paper-search/types";
import { NumberInputWithButtons } from "./paper-search/NumberInputWithButtons";
import { SelectField } from "./paper-search/SelectField";
import { QuickSearchSection } from "./paper-search/QuickSearchSection";

// Re-export types for backward compatibility
export type { PaperSearchHandles } from "@/components/paper-search/types";

const PaperSearchInner = forwardRef<PaperSearchHandles, PaperSearchProps>(
  (
    {
      onSubmit,
      onClear,
      isClearData,
      setIsClearData,
      preferencesLoaded = true,
      showDialogOnLoad,
    },
    ref
  ) => {
    const [formValues, setFormValues] = useState<FormValues>({
      curriculum: "cambridge-international-a-level",
      subject: "",
      paperType: "",
      variant: "",
      season: "",
      year: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});

    // Quick search state
    const [quickCode, setQuickCode] = useState("");
    const [quickCodeError, setQuickCodeError] = useState("");
    const [fullYear, setFullYear] = useState("");

    // Refs for tracking state
    const quickSearchInputRef = useRef<HTMLInputElement>(null);
    const hasLoadedRef = useRef(false);
    const pendingSubjectRef = useRef<string | null>(null);

    // Expose focus method to parent
    useImperativeHandle(
      ref,
      () => ({
        focusQuickSearch: () => {
          quickSearchInputRef.current?.focus();
        },
      }),
      []
    );

    // Filter subjects based on selected curriculum
    const filteredSubjects = useMemo(
      () =>
        SUBJECTS.filter(
          (subject) => subject.curriculum === formValues.curriculum
        ),
      [formValues.curriculum]
    );

    // Update a single form field
    const updateFormField = useCallback(
      (field: keyof FormValues, value: string) => {
        setFormValues((prev) => {
          const newValues = { ...prev, [field]: value };
          saveFormValues(newValues);
          return newValues;
        });
      },
      []
    );

    const handleCurriculumChange = useCallback((value: string) => {
      setFormValues((prev) => {
        const newValues = { ...prev, curriculum: value, subject: "" };
        saveFormValues(newValues);
        return newValues;
      });
    }, []);

    const handleSubjectChange = useCallback(
      (value: string) => {
        updateFormField("subject", value);
      },
      [updateFormField]
    );

    const handleSeasonChange = useCallback(
      (value: string) => {
        updateFormField("season", value);
      },
      [updateFormField]
    );

    const handlePaperTypeChange = useCallback(
      (value: string) => {
        const numericValue = value.replace(/\D/g, "").slice(0, 1);
        updateFormField("paperType", numericValue);
        const error = validatePaperType(numericValue);
        setErrors((prev) => ({ ...prev, paperType: error || undefined }));
      },
      [updateFormField]
    );

    const handleVariantChange = useCallback(
      (value: string) => {
        const numericValue = value.replace(/\D/g, "").slice(0, 1);
        updateFormField("variant", numericValue);
        const error = validateVariant(numericValue);
        setErrors((prev) => ({ ...prev, variant: error || undefined }));
      },
      [updateFormField]
    );

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
      const hasErrors = Object.values(errors).some((e) => e);
      return isFormComplete(formValues) && !hasErrors;
    }, [formValues, errors]);

    // Memoized renderOption callbacks
    const renderSubjectOption = useCallback(
      (option: { label: string; code: string }) =>
        `${option.label} (${option.code})`,
      []
    );

    const renderSeasonOption = useCallback(
      (option: { label: string; fullName: string }) =>
        `${option.label} - ${option.fullName}`,
      []
    );

    const submitButtonClassName = useMemo(
      () =>
        `w-full p-2 text-white rounded-md cursor-pointer bg-primary dark:bg-white dark:text-black ${
          !isFormValid ? "opacity-50 pointer-events-none" : ""
        }`,
      [isFormValid]
    );

    const paperTypeError = useMemo(() => errors.paperType, [errors.paperType]);
    const variantError = useMemo(() => errors.variant, [errors.variant]);
    const yearError = useMemo(() => errors.year, [errors.year]);

    // Handle quick code change
    const handleQuickCodeChange = useCallback((value: string) => {
      setQuickCode(value);
      const error = validateQuickCode(value.trim());
      setQuickCodeError(error || "");
      saveQuickSearchValues(value);
    }, []);

    // Handle quick code submit
    const handleQuickCodeSubmit = useCallback(() => {
      const trimmedQuickCode = quickCode.trim();
      const error = validateQuickCode(trimmedQuickCode);
      if (error || !trimmedQuickCode) {
        setQuickCodeError(error || "");
        return;
      }

      const parsed = parseQuickCode(trimmedQuickCode);
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
        onSubmit(newFormValues, { showDialog: true, isQuickSearch: true });
      }
    }, [quickCode, formValues.curriculum, onSubmit]);

    // Handle form submission
    const handleFormSubmit = useCallback(
      (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        saveFormValues(formValues);
        // Update quick code display to match form
        const newQuickCode = generateQuickCode(formValues);
        setQuickCode(newQuickCode);
        setQuickCodeError("");

        onSubmit(formValues, { showDialog: true, isQuickSearch: false });
      },
      [formValues, isFormValid, onSubmit]
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
        clearAllValues();
        setIsClearData(false);
        hasLoadedRef.current = false;
      }
    }, [isClearData, setIsClearData]);

    // Handle pending subject after curriculum change (for quick search)
    useEffect(() => {
      if (pendingSubjectRef.current) {
        const pendingSubject = pendingSubjectRef.current;
        const subjectExists = SUBJECTS.some(
          (s) =>
            s.id === pendingSubject && s.curriculum === formValues.curriculum
        );

        if (subjectExists) {
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
              onSubmit(newFormValues, {
                showDialog: true,
                isQuickSearch: true,
              });
            }
          }
          pendingSubjectRef.current = null;
        }
      }
    }, [formValues.curriculum, quickCode, onSubmit]);

    // Load form values on mount
    useEffect(() => {
      if (preferencesLoaded && !hasLoadedRef.current) {
        hasLoadedRef.current = true;

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

            // If form is complete and showDialogOnLoad is true, submit
            if (isFormComplete(savedValues) && showDialogOnLoad) {
              onSubmit(savedValues, { showDialog: true, isQuickSearch: false });
            }
          }
        });
      }
    }, [preferencesLoaded, showDialogOnLoad, onSubmit]);

    return (
      <div className="space-y-6 w-full">
        <QuickSearchSection
          ref={quickSearchInputRef}
          quickCode={quickCode}
          onQuickCodeChange={handleQuickCodeChange}
          onSubmit={handleQuickCodeSubmit}
          error={quickCodeError}
        />
        <form
          onSubmit={handleFormSubmit}
          className="space-y-4 w-full border-2 p-5 mb-4 rounded-sm"
        >
          <Label htmlFor="curriculum" className="text-sm text-red-500">
            Manual Input
          </Label>

          <SelectField
            id="curriculum"
            label="Curriculum"
            value={formValues.curriculum}
            onChange={handleCurriculumChange}
            options={CURRICULUMS}
            placeholder="Select curriculum"
          />

          <SelectField
            id="subject"
            label="Subject"
            value={formValues.subject}
            onChange={handleSubjectChange}
            options={filteredSubjects}
            placeholder="Select subject"
            renderOption={renderSubjectOption}
          />

          <div className="grid grid-cols-1 gap-4 w-full">
            <div className="flex items-center justify-between gap-6">
              <div className="w-1/2">
                <NumberInputWithButtons
                  id="paperType"
                  label="Paper Type"
                  value={formValues.paperType}
                  onChange={handlePaperTypeChange}
                  onIncrement={incrementPaperType}
                  onDecrement={decrementPaperType}
                  placeholder="e.g. 4"
                  error={paperTypeError}
                />
              </div>

              <div className="w-1/2">
                <NumberInputWithButtons
                  id="variant"
                  label="Variant"
                  value={formValues.variant}
                  onChange={handleVariantChange}
                  onIncrement={incrementVariant}
                  onDecrement={decrementVariant}
                  placeholder="e.g. 2"
                  error={variantError}
                />
              </div>
            </div>

            <SelectField
              id="season"
              label="Exam Season"
              value={formValues.season}
              onChange={handleSeasonChange}
              options={seasonS}
              placeholder="Select season"
              renderOption={renderSeasonOption}
            />

            <NumberInputWithButtons
              id="year"
              label="Year"
              value={fullYear}
              onChange={handleYearChange}
              onIncrement={incrementYear}
              onDecrement={decrementYear}
              placeholder="e.g. 2020"
              error={yearError}
            />
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className={submitButtonClassName}
              disabled={!isFormValid}
            >
              {!isFormValid ? "Please fill all fields" : "Find Paper"}
              <Search className="w-4 h-4 ml-2 inline" />
            </button>
          </div>
        </form>

        <ClearButton onClick={onClear} />
      </div>
    );
  }
);

PaperSearchInner.displayName = "PaperSearch";

// Memoized ClearButton component
const ClearButton = memo(function ClearButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="w-full p-2 text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer flex items-center justify-center"
      onClick={onClick}
    >
      Clear All
      <XCircle className="w-4 h-4 ml-2" />
    </button>
  );
});

ClearButton.displayName = "ClearButton";

export const PaperSearch = memo(PaperSearchInner);
