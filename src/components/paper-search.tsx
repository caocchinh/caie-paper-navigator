"use client";

import {useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle} from "react";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {CURRICULUMS, seasonS, SUBJECTS} from "@/lib/constants";
import {Form} from "@/components/ui/form";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {GlowEffect} from "./ui/glow-effect";
import {Search, Plus, Minus, XCircle} from "lucide-react";

const formSchema = z.object({
  curriculum: z.string(),
  subject: z.string(),
  paperType: z
    .string()
    .length(1, {message: "Please enter a valid paper type"})
    .refine((val) => val !== "0", {message: "Paper type cannot be 0"}),
  variant: z.string().length(1, {message: "Please enter a valid variant"}),
  season: z.string(),
  year: z
    .string()
    .length(2, {message: "Please enter a valid year"})
    .refine(
      (val) => {
        const yearNum = parseInt(`20${val}`);
        return yearNum >= 2000;
      },
      {message: "Year must be 2000 or later"}
    )
    .refine(
      (val) => {
        const yearNum = parseInt(`20${val}`);
        return yearNum >= 2009;
      },
      {message: "Year must be 2009 or later"}
    )
    .refine(
      (val) => {
        const yearNum = parseInt(`20${val}`);
        const currentYear = new Date().getFullYear();
        return yearNum <= currentYear;
      },
      {message: `Year cannot exceed current year ${new Date().getFullYear()}`}
    ),
});

type FormValues = z.infer<typeof formSchema>;

// Define a type for the exposed methods
export interface PaperSearchHandles {
  focusQuickSearch: () => void;
}

interface PaperSearchProps {
  paperType: "qp" | "ms";
  onLinkGenerated: (
    link: string | null,
    details:
      | {
          subjectCode: string;
          subjectName: string;
          paperNumber: string;
          season: string;
          year: string;
        }
      | undefined,
    showDialog?: boolean,
    isQuickSearch?: boolean
  ) => void;
  isClearData: boolean;
  setIsClearData: (isClearData: boolean) => void;
  preferencesLoaded?: boolean;
  showDialogOnLoad?: boolean;
}

export const PaperSearch = forwardRef<PaperSearchHandles, PaperSearchProps>(({
  paperType, 
  onLinkGenerated, 
  isClearData, 
  setIsClearData,
  preferencesLoaded = true,
  showDialogOnLoad
}, ref) => {
  /*
   * Data Storage Behavior:
   * ---------------------
   * 1. Quick Search Data:
   *    - Stored in 'quickSearchValues' key in storage
   *    - Loaded independently from manual form data
   *    - Only syncs to form when quick search is submitted
   *
   * 2. Manual Form Data:
   *    - Stored in 'formValues' key in storage
   *    - Saved on every input change (keypress)
   *    - Only syncs to quick search when manual form is submitted or user explicitly sets sync flag
   *
   * 3. Synchronization:
   *    - Each input method maintains independent data until user interacts with it
   *    - Data from manual input is saved to local storage with every change
   *    - Quick search data is only saved when submitted
   *    - Sync flags control when data flows between the two storage containers
   */

  const [quickCode, setQuickCode] = useState<string>("");
  const [fullYear, setFullYear] = useState<string>("");
  const [quickCodeError, setQuickCodeError] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingSubject, setPendingSubject] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("cambridge-international-a-level");
  const curriculumLoaded = useRef(false);
  const initialLoadDone = useRef(false);
  const paperTypeChangeRef = useRef(false);
  const formValuesRef = useRef<FormValues | null>(null);
  const hasMountedRef = useRef(false);
  const hasGeneratedInitialUrl = useRef(false);
  const quickSearchUsed = useRef(false);
  const manualInputUsed = useRef(false);
  const quickSearchInputRef = useRef<HTMLInputElement>(null);
  const shouldSyncQuickSearchToForm = useRef(false);
  const shouldSyncFormToQuickSearch = useRef(false);
  const formInteractedRef = useRef(false);
  const previousCurriculumRef = useRef<string | null>(null);

  // Expose the focus method to parent components
  useImperativeHandle(ref, () => ({
    focusQuickSearch: () => {
      if (quickSearchInputRef.current) {
        quickSearchInputRef.current.focus();
      }
    }
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      curriculum: selectedCurriculum,
      subject: "",
      paperType: "",
      variant: "",
      season: "",
      year: "",
    },
  });

  // Function to mark a field as touched
  const markFieldAsTouched = (fieldName: string) => {
    setTouchedFields(prev => ({...prev, [fieldName]: true}));
  };

  // Watch all form values for reactive rendering
  const watchCurriculum = form.watch("curriculum");
  const watchSubject = form.watch("subject");
  const watchPaperType = form.watch("paperType");
  const watchVariant = form.watch("variant");
  const watchSeason = form.watch("season");

  // Update local state when form curriculum changes
  useEffect(() => {
    if (watchCurriculum && watchCurriculum !== selectedCurriculum) {
      setSelectedCurriculum(watchCurriculum);
    }
  }, [watchCurriculum, selectedCurriculum]);

  // Load initial curriculum from storage - run this before any other effects
  useEffect(() => {
    if (!hasMountedRef.current) {
      console.log("Loading initial curriculum from storage");
      
      // Try localStorage first (synchronous)
      try {
        const savedValues = localStorage.getItem("formValues");
        if (savedValues) {
          const parsedValues = JSON.parse(savedValues) as FormValues;
          if (parsedValues.curriculum) {
            console.log("Found curriculum in localStorage:", parsedValues.curriculum);
            // Update local state directly
            setSelectedCurriculum(parsedValues.curriculum);
            // Also update form
            form.setValue("curriculum", parsedValues.curriculum);
            previousCurriculumRef.current = parsedValues.curriculum;
          }
        }
      } catch (error) {
        console.error("Error loading curriculum from localStorage:", error);
      }
      
      // Then try Chrome storage as backup
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get("formValues", (result: {formValues?: FormValues}) => {
          if (result.formValues && result.formValues.curriculum) {
            console.log("Found curriculum in Chrome storage:", result.formValues.curriculum);
            // Update local state directly
            setSelectedCurriculum(result.formValues.curriculum);
            // Also update form
            form.setValue("curriculum", result.formValues.curriculum);
            previousCurriculumRef.current = result.formValues.curriculum;
          }
        });
      }
      
      hasMountedRef.current = true;
      
      // Validate any initial quick code on mount
      if (quickCode) {
        validateAndSetQuickCodeError(quickCode);
      }
    }
  }, [form, quickCode]); // Add dependencies

  // Filter subjects based on selected curriculum
  const filteredSubjects = SUBJECTS.filter((subject) => subject.curriculum === selectedCurriculum);

  // Generate quick code from form values (pure function without state updates)
  const generateQuickCode = useCallback((values: FormValues) => {
    const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
    if (!selectedSubject) return "";

    // Map season ID back to the format used in quick code
    let seasonCode = "";
    if (values.season === "s") seasonCode = "M/J";
    else if (values.season === "w") seasonCode = "O/N";
    else if (values.season === "m") seasonCode = "F/M";

    const paperNumber = `${values.paperType}${values.variant}`;
    return `${selectedSubject.code}/${paperNumber}/${seasonCode}/${values.year}`;
  }, []);

  // Submit form without causing infinite loops
  const submitFormSafely = useCallback(
    (values: FormValues) => {
      // Store values to prevent unnecessary re-renders
      formValuesRef.current = values;

      // Set the flag to indicate that manual input was used regardless of subject selection
      if (!quickSearchUsed.current) {
        manualInputUsed.current = true;
        shouldSyncFormToQuickSearch.current = true;
      }

      // Always save form values to storage, even if subject is not selected
      const saveFormValuesToStorage = (formValues: FormValues) => {
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get("formValues", (result) => {
              const existingValues = result.formValues || {};
              const updatedValues = {...existingValues, ...formValues};
              chrome.storage.local.set({formValues: updatedValues}, () => {
                console.log("Form values saved to Chrome storage on submission");
              });
              
              // If quick search was used, also update quick search values
              // But only if we have a subject to generate a code from
              if ((quickSearchUsed.current || shouldSyncFormToQuickSearch.current) && formValues.subject) {
                const newQuickCode = generateQuickCode(formValues);
                chrome.storage.local.set({quickSearchValues: {quickCode: newQuickCode}}, () => {
                  console.log("Quick search values updated from form values");
                });
              }
            });
          } else {
            try {
              const savedValues = localStorage.getItem("formValues");
              const existingValues = savedValues ? JSON.parse(savedValues) : {};
              const updatedValues = {...existingValues, ...formValues};
              localStorage.setItem("formValues", JSON.stringify(updatedValues));
              console.log("Form values saved to localStorage on submission");
              
              // If quick search was used, also update quick search values
              // But only if we have a subject to generate a code from
              if ((quickSearchUsed.current || shouldSyncFormToQuickSearch.current) && formValues.subject) {
                const newQuickCode = generateQuickCode(formValues);
                localStorage.setItem("quickSearchValues", JSON.stringify({quickCode: newQuickCode}));
                console.log("Quick search values updated from form values");
              }
            } catch (error) {
              console.error("Error saving to localStorage on submission:", error);
              // Fallback to direct save
              localStorage.setItem("formValues", JSON.stringify(formValues));
            }
          }
        } catch (error) {
          console.error("Error saving form values on submission:", error);
        }
      };

      // Save the values
      saveFormValuesToStorage(values);

      // Only proceed with URL generation if we have a subject selected
      const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
      if (!selectedSubject) {
        console.log("No subject selected, skipping URL generation");
        return;
      }

      const subjectCode = selectedSubject.code;
      const seasonId = values.season;
      const year = `20${values.year}`;
      const shortYear = values.year;
      const paperNumber = `${values.paperType}${values.variant}`;

      // Format URL
      const url = `https://bestexamhelp.com/exam/${values.curriculum}/${values.subject}/${year}/${subjectCode}_${seasonId}${shortYear}_${paperType}_${paperNumber}.pdf`;

      // Generate quick code without directly updating state
      const newQuickCode = generateQuickCode(values);

      // Find season label
      const seasonObj = seasonS.find((s) => s.id === seasonId);
      const seasonLabel = seasonObj ? seasonObj.label : "";

      // Pass paper details along with the link
      console.log("Call to onLinkGenerated from submitFormSafely with showDialog=true");
      
      // Set flag to indicate URL has been generated
      hasGeneratedInitialUrl.current = true;
      
      // Only set quickSearchUsed to true if this was called from handleQuickCodeSubmit
      // If not coming from quick search submit, explicitly set it to false
      if (!quickSearchUsed.current) {
        console.log("Manual search used");
        quickSearchUsed.current = false;
      } else {
        console.log("Quick search used");
      }
      
      onLinkGenerated(
        url,
        {
          subjectCode: selectedSubject.code,
          subjectName: selectedSubject.label,
          paperNumber: paperNumber,
          season: seasonLabel,
          year: shortYear,
        },
        true,
        quickSearchUsed.current
      );

      // Update quick code last to avoid triggering re-renders too early
      setQuickCode(newQuickCode);
      // Clear any existing quick code error since we're setting a valid code
      setQuickCodeError("");
    },
    [paperType, onLinkGenerated, generateQuickCode]
  );

  // Handle curriculum change
  useEffect(() => {
    // Always reset subject when curriculum changes, except during initial load
    if (isInitialized && hasMountedRef.current && selectedCurriculum !== previousCurriculumRef.current) {
      form.setValue("subject", "");
      form.trigger("subject");
    }
    
    curriculumLoaded.current = true;

    // Try to set pending subject if it exists and matches the current curriculum
    if (pendingSubject) {
      const subjectExists = SUBJECTS.some((s) => s.id === pendingSubject && s.curriculum === selectedCurriculum);

      if (subjectExists) {
        form.setValue("subject", pendingSubject);
        form.trigger("subject");
        
        // If we're coming from quick search, we need to submit the form
        if (quickSearchUsed.current && shouldSyncQuickSearchToForm.current) {
          console.log("Submitting form after curriculum change with pending subject:", pendingSubject);
          
          // Get current form values
          const currentValues = form.getValues();
          if (currentValues.paperType && currentValues.variant && 
              currentValues.season && currentValues.year) {
            // Submit the form with complete values, but don't use submitFormSafely directly
            // Instead use form.handleSubmit to avoid the reference error
            const formValues = {
              ...currentValues,
              subject: pendingSubject
            };
            
            // Only proceed with URL generation if we have a subject selected
            const selectedSubject = SUBJECTS.find((s) => s.id === formValues.subject);
            if (selectedSubject) {
              const subjectCode = selectedSubject.code;
              const seasonId = formValues.season;
              const year = `20${formValues.year}`;
              const shortYear = formValues.year;
              const paperNumber = `${formValues.paperType}${formValues.variant}`;

              // Format URL
              const url = `https://bestexamhelp.com/exam/${formValues.curriculum}/${formValues.subject}/${year}/${subjectCode}_${seasonId}${shortYear}_${paperType}_${paperNumber}.pdf`;

              // Generate quick code 
              const newQuickCode = generateQuickCode(formValues);

              // Find season label
              const seasonObj = seasonS.find((s) => s.id === seasonId);
              const seasonLabel = seasonObj ? seasonObj.label : "";
              
              // Set URL generated flag
              hasGeneratedInitialUrl.current = true;
              
              // Mark that quick search was used
              console.log("Quick search used during curriculum change");
              
              // Call onLinkGenerated with paper details
              onLinkGenerated(
                url,
                {
                  subjectCode: selectedSubject.code,
                  subjectName: selectedSubject.label,
                  paperNumber: paperNumber,
                  season: seasonLabel,
                  year: shortYear,
                },
                true,
                true // This is coming from quick search
              );

              // Update quick code state
              setQuickCode(newQuickCode);
              // Clear any existing quick code error
              setQuickCodeError("");
            }
          }
        }
        
        setPendingSubject(null);

        // If this was part of initialization, mark as initialized
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    }
    
    // Update the previous curriculum reference
    previousCurriculumRef.current = selectedCurriculum;
  }, [selectedCurriculum, form, isInitialized, pendingSubject, watchSubject, generateQuickCode, paperType, onLinkGenerated]);

  // Validate quick code as user types
  const validateQuickCode = (code: string): string => {
    if (!code) return "";

    const regex = /^(\d{4})\/(\d{2})\/(F\/M|M\/J|O\/N)\/(\d{2})$/;
    if (!regex.test(code)) {
      return "Invalid format. Correct: [Subject Code]/[Paper Number]/[Season]/[Year]";
    }

    const match = code.match(regex);
    if (!match) return "Invalid format. Correct: [Subject Code]/[Paper Number]/[Season]/[Year]";

    const subjectCode = match[1];
    const subject = SUBJECTS.find((s) => s.code === subjectCode);
    if (!subject) {
      return `Subject with code ${subjectCode} is not supported yet`;
    }
    
    // Validate the year doesn't exceed current year
    const yearDigits = match[4];
    const fullYear = parseInt(`20${yearDigits}`);
    const currentYear = new Date().getFullYear();
    if (fullYear > currentYear) {
      return `Year cannot exceed current year (${currentYear})`;
    }
    
    // Validate the year is 2009 or later
    if (fullYear < 2009) {
      return "Year must be 2009 or later";
    }

    return "";
  };

  useEffect(() => {
    if (isClearData) {
      form.reset();
      setQuickCode("");
      setFullYear("");
      setQuickCodeError("");
      setTouchedFields({});
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({formValues: null, quickSearchValues: null});
      } else {
        localStorage.removeItem("formValues");
        localStorage.removeItem("quickSearchValues");
      }
      setIsClearData(false);
      quickSearchUsed.current = false;
      manualInputUsed.current = false;
      shouldSyncQuickSearchToForm.current = false;
      shouldSyncFormToQuickSearch.current = false;
      previousCurriculumRef.current = null;
    }
  }, [isClearData, form, setIsClearData]);

  // Save form values whenever they change
  useEffect(() => {
    const saveFormValues = (values: Partial<FormValues>) => {
      try {
        if (values && Object.keys(values).length > 0) {         

          if (Object.keys(values).length > 0) {
            console.log("Saving form values to storage:", values);
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
              // Get existing values first to avoid wiping out values
              chrome.storage.local.get("formValues", (result) => {
                const existingValues = result.formValues || {};
                const updatedValues = {...existingValues, ...values};
                console.log(updatedValues, "skibidiiiiiiiiiiiiiiiiiiiii")
                chrome.storage.local.set({formValues: updatedValues}, () => {
                  console.log("Form values saved to Chrome storage");
                });
                
                // If we should sync form to quick search, update quick search values
                if (shouldSyncFormToQuickSearch.current) {
                  const completeValues = {...existingValues, ...values} as FormValues;
                  if (completeValues.subject && completeValues.paperType && 
                      completeValues.variant && completeValues.season && completeValues.year) {
                    const newQuickCode = generateQuickCode(completeValues);
                    chrome.storage.local.set({quickSearchValues: {quickCode: newQuickCode}}, () => {
                      console.log("Quick search values updated from form values");
                    });
                  }
                }
              });
            } else {
              // For localStorage, get existing values first before saving
              try {
                const savedValues = localStorage.getItem("formValues");
                const existingValues = savedValues ? JSON.parse(savedValues) : {};
                const updatedValues = {...existingValues, ...values};
                localStorage.setItem("formValues", JSON.stringify(updatedValues));
                console.log("Form values saved to localStorage");
                
                // If we should sync form to quick search, update quick search values
                if (shouldSyncFormToQuickSearch.current) {
                  const completeValues = {...existingValues, ...values} as FormValues;
                  if (completeValues.subject && completeValues.paperType && 
                      completeValues.variant && completeValues.season && completeValues.year) {
                    const newQuickCode = generateQuickCode(completeValues);
                    localStorage.setItem("quickSearchValues", JSON.stringify({quickCode: newQuickCode}));
                    console.log("Quick search values updated from form values");
                  }
                }
              } catch (error) {
                console.error("Error parsing or saving to localStorage:", error);
                // Fallback to direct save attempt
                try {
                  localStorage.setItem("formValues", JSON.stringify(values));
                } catch (fallbackError) {
                  console.error("Fallback localStorage save failed:", fallbackError);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error saving form values:", error);
      }
    };

    // Watch for form changes only after component is mounted
    const subscription = form.watch((values) => {
      // Only save if component has mounted and we have valid values
      if (hasMountedRef.current && values) {
        saveFormValues(values);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [form, generateQuickCode]);

  // Track paperType changes
  useEffect(() => {
    if (hasMountedRef.current) {
      paperTypeChangeRef.current = true;
    }
  }, [paperType]);

  // Main effect for form submission logic
  useEffect(() => {
    // Mark as mounted after first render
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    // Only run this effect if:
    // 1. Component is initialized
    // 2. We have valid form values
    // 3. Either paperType changed or this is the initial load
    if (isInitialized && initialLoadDone.current) {
      const values = form.getValues();
      const hasRequiredValues = values.subject && values.paperType && values.variant && values.season && values.year;

      if (hasRequiredValues && (paperTypeChangeRef.current || !formValuesRef.current)) {
        // Reset the flag
        paperTypeChangeRef.current = false;
        
        // Only auto-submit if paperType specifically changed
        // Don't auto-submit on initial load anymore since we load from storage separately
        if (paperTypeChangeRef.current) {
          console.log("Auto-submitting form after paperType change");
          submitFormSafely(values);
        }
      }
    }

    // Mark initialization complete
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
    }
  }, [isInitialized, form, submitFormSafely]);

  // Add individual field change handlers to ensure values are saved on each input
  const handleFieldChange = (field: keyof FormValues, value: string) => {
    // Mark that the form has been interacted with
    formInteractedRef.current = true;
    
    form.setValue(field, value);
    form.trigger(field);

    // Mark as manual input used
    manualInputUsed.current = true;
  };

  // Update the curriculum and subject handlers
  const handleCurriculumChange = (value: string) => {
    // Update local state immediately
    handleFieldChange("subject", "");
    form.setValue("subject", "");
    form.trigger("subject");
    console.log("curriculum changed")
    handleFieldChange("curriculum", value);
    setSelectedCurriculum(value);
    // Then update form
    // Reset subject when curriculum changes

  };

  const handleSubjectChange = (value: string) => {
    // Prevent empty selection
    
    handleFieldChange("subject", value);
  };

  const handleSeasonChange = (value: string) => {
    handleFieldChange("season", value);
  };

  // Handle year input
  const handleYearChange = (value: string) => {
    // Mark field as touched
    markFieldAsTouched("year");
    
    // Only allow numeric input and limit to a reasonable length (4 digits)
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setFullYear(numericValue);

    // Extract last two digits for the form
    const lastTwoDigits = numericValue.slice(-2).padStart(2, "0");
    handleFieldChange("year", lastTwoDigits);

    // Clear errors first
    form.clearErrors("year");

    // Validate year only if we have input
    if (numericValue) {
      // Safe parsing even for very long numbers by using the limited numericValue
      let yearToCheck: number;
      
      try {
        // If numericValue is at least 4 digits, use it directly
        if (numericValue.length >= 4) {
          yearToCheck = parseInt(numericValue);
        } else {
          // Otherwise, pad with 20 prefix (for 20XX format)
          yearToCheck = parseInt(`20${lastTwoDigits}`);
        }

        const currentYear = new Date().getFullYear();
        
        // Check if year is too early
        if (yearToCheck < 2000) {
          form.setError("year", {
            type: "manual",
            message: "Year must be 2000 or later",
          });
        } 
        // Check if year is before 2009
        else if (yearToCheck < 2009) {
          form.setError("year", {
            type: "manual",
            message: "Year must be 2009 or later",
          });
        }
        // Check if year exceeds current year
        else if (yearToCheck > currentYear) {
          form.setError("year", {
            type: "manual",
            message: `Year cannot exceed current year (${currentYear})`,
          });
        }
      } catch (error) {
        // Handle any parsing errors
        form.setError("year", {
          type: "manual",
          message: "Invalid year format",
        });
      }
    }
  };

  // Increment/decrement year
  const incrementYear = () => {
    markFieldAsTouched("year");
    const maxYear = new Date().getFullYear();
    
    if (!fullYear) {
      // If no input yet, set to current year
      handleYearChange(maxYear.toString());
    } else {
      // Otherwise increment if not exceeding max year
      const currentYear = parseInt(fullYear);
      if (currentYear < maxYear) {
        const newYear = (currentYear + 1).toString();
        handleYearChange(newYear);
      }
    }
  };

  const decrementYear = () => {
    markFieldAsTouched("year");
    const currentYear = fullYear ? parseInt(fullYear) : new Date().getFullYear();
    const newYear = (currentYear - 1).toString();
    handleYearChange(newYear);
  };

  // Handle paper type and variant increment/decrement
  const handlePaperTypeChange = (value: string) => {
    // Mark field as touched
    markFieldAsTouched("paperType");
    
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "");
    // Restrict to 1 digit
    const oneDigit = numericValue.slice(0, 1);

    // Check if paper type is 0
    if (oneDigit === "0") {
      form.setError("paperType", {
        type: "manual",
        message: "Paper type cannot be 0",
      });
    } else {
      form.clearErrors("paperType");
    }

    handleFieldChange("paperType", oneDigit);
  };

  const incrementPaperType = () => {
    markFieldAsTouched("paperType");
    const currentValue = form.getValues("paperType");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    // Start from 1 instead of 0
    const newValue = numValue === 0 || numValue === 9 ? "1" : ((numValue + 1) % 10).toString();
    handleFieldChange("paperType", newValue);
    form.clearErrors("paperType");
    form.trigger("paperType");
  };

  const decrementPaperType = () => {
    markFieldAsTouched("paperType");
    const currentValue = form.getValues("paperType");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    // Ensure it doesn't go to 0 when decrementing
    const newValue = numValue === 0 || numValue === 1 ? "9" : (numValue - 1 || 9).toString();
    handleFieldChange("paperType", newValue);
    form.clearErrors("paperType");
    form.trigger("paperType");
  };

  const handleVariantChange = (value: string) => {
    // Mark field as touched
    markFieldAsTouched("variant");
    
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "");
    // Restrict to 1 digit
    const oneDigit = numericValue.slice(0, 1);

    handleFieldChange("variant", oneDigit);
  };

  const incrementVariant = () => {
    markFieldAsTouched("variant");
    const currentValue = form.getValues("variant");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    const newValue = ((numValue + 1) % 10).toString();
    handleFieldChange("variant", newValue);
    form.clearErrors("variant");
  };

  const decrementVariant = () => {
    markFieldAsTouched("variant");
    const currentValue = form.getValues("variant");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    const newValue = ((numValue + 9) % 10).toString();
    handleFieldChange("variant", newValue);
    form.clearErrors("variant");
  };

  // Check if all form fields are valid
  const isFormValid = () => {
    const values = form.getValues();
    const yearValue = values.year;
    const yearNum = yearValue ? parseInt(`20${yearValue}`) : 0;
    const hasErrors = Object.keys(form.formState.errors).length > 0;

    return !!(
      values.curriculum &&
      values.subject &&
      values.paperType?.length === 1 &&
      values.paperType !== "0" &&
      values.variant?.length === 1 &&
      values.season &&
      values.year?.length === 2 &&
      yearNum >= 2009 &&
      yearNum <= new Date().getFullYear() &&
      !hasErrors
    );
  };

  // Add this function to validate quick code at the beginning
  const validateAndSetQuickCodeError = (value: string) => {
    const error = validateQuickCode(value);
    setQuickCodeError(error);
    return error;
  };

  // Parse quick code input and find paper
  const handleQuickCodeSubmit = () => {
    try {
      // Always validate the code first
      const error = validateAndSetQuickCodeError(quickCode);
      
      // Return if there is an error or the input is empty
      if (error || !quickCode) {
        console.log("Quick code is empty or invalid:", error || "Empty input");
        return;
      }

      // Format examples: 9702/42/M/J/20 or 9708/11/O/N/20
      const regex = /^(\d{4})\/(\d{2})\/(F\/M|M\/J|O\/N)\/(\d{2})$/;
      const match = quickCode.match(regex);

      if (!match) {
        setQuickCodeError("Invalid format. Correct: [Subject Code]/[Paper Number]/[Season]/[Year]");
        return;
      }

      // Mark that quick search was used to prevent duplicate dialog
      quickSearchUsed.current = true;
      shouldSyncQuickSearchToForm.current = true;
      manualInputUsed.current = false;
      console.log("Setting quick search flag to true");
      
      // Save quick search value to storage
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({quickSearchValues: {quickCode}}, () => {
            console.log("Quick search values saved to Chrome storage");
          });
        } else {
          localStorage.setItem("quickSearchValues", JSON.stringify({quickCode}));
          console.log("Quick search values saved to localStorage");
        }
      } catch (error) {
        console.error("Error saving quick search values:", error);
      }
      
      // Destructure match without capturing unused variables
      const [, subjectCode, paperNumber, season, year] = match;

      // Find subject by code
      const subject = SUBJECTS.find((s) => s.code === subjectCode);
      if (!subject) {
        setQuickCodeError(`Subject with code ${subjectCode} is not supported yet`);
        return;
      }

      // Map season to the correct format
      let seasonId = "";
      if (season === "M/J") seasonId = "s";
      else if (season === "O/N") seasonId = "w";
      else if (season === "F/M") seasonId = "m";

      // Check if we need to change curriculum
      if (selectedCurriculum !== subject.curriculum) {
        console.log("Curriculum needs to change from", selectedCurriculum, "to", subject.curriculum);
        // First set curriculum and use pendingSubject to handle the subject update after curriculum is processed
        form.setValue("curriculum", subject.curriculum);
        markFieldAsTouched("curriculum");
        setSelectedCurriculum(subject.curriculum);
        // Set the subject ID as pending to be applied after curriculum updates
        setPendingSubject(subject.id);
      } else {
        // If curriculum doesn't need to change, set subject directly
        form.setValue("subject", subject.id);
        markFieldAsTouched("subject");
      }

      // Split paperNumber into paperType and variant
      const paperType = paperNumber.charAt(0);
      const variant = paperNumber.charAt(1);

      // Set the rest of the form values
      form.setValue("paperType", paperType);
      form.setValue("variant", variant);
      form.setValue("season", seasonId);
      form.setValue("year", year);

      // Also update the fullYear state with the 20XX format
      setFullYear(`20${year}`);

      // Mark fields as touched since this is a form fill
      markFieldAsTouched("paperType");
      markFieldAsTouched("variant");
      markFieldAsTouched("season");
      markFieldAsTouched("year");

      // Trigger validation
      form.trigger();

      // Submit the form with the complete values
      const formValues = {
        curriculum: subject.curriculum,
        subject: subject.id,
        paperType,
        variant,
        season: seasonId,
        year,
      };

      // Explicitly save form values to storage
      console.log("Quick code submitted, saving form values:", formValues);
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get("formValues", (result) => {
          const existingValues = result.formValues || {};
          const updatedValues = {...existingValues, ...formValues};
          chrome.storage.local.set({formValues: updatedValues}, () => {
            console.log("Form values saved to Chrome storage from quick code");
          });
        });
      } else {
        try {
          const savedValues = localStorage.getItem("formValues");
          const existingValues = savedValues ? JSON.parse(savedValues) : {};
          const updatedValues = {...existingValues, ...formValues};
          localStorage.setItem("formValues", JSON.stringify(updatedValues));
          console.log("Form values saved to localStorage from quick code");
        } catch (error) {
          console.error("Error saving to localStorage from quick code:", error);
          // Fallback
          localStorage.setItem("formValues", JSON.stringify(formValues));
        }
      }

      // Only submit the form if we're not waiting for curriculum change
      if (selectedCurriculum === subject.curriculum) {
        submitFormSafely(formValues);
      }
    } catch (error) {
      console.error("Error in quick code submission:", error);
    }
  };

  // Handle Enter key in the quick code input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleQuickCodeSubmit();
    }
  };

  // Handle quick code input change
  const handleQuickCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setQuickCode(value);
    validateAndSetQuickCodeError(value);
    
    // When user starts typing in quick search, mark that it's being used
    if (value && !quickSearchUsed.current) {
      quickSearchUsed.current = true;
      shouldSyncQuickSearchToForm.current = true;
      manualInputUsed.current = false;
    }
    
    // Save quick search value to storage on every change
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({quickSearchValues: {quickCode: value}}, () => {
          console.log("Quick search values saved to Chrome storage on change");
        });
      } else {
        localStorage.setItem("quickSearchValues", JSON.stringify({quickCode: value}));
        console.log("Quick search values saved to localStorage on change");
      }
    } catch (error) {
      console.error("Error saving quick search values on change:", error);
    }
  };

  // Add this new useEffect to specifically handle loading data when preferencesLoaded changes
  useEffect(() => {
    // Only attempt to load form values when preferencesLoaded becomes true
    // AND we haven't already generated a URL
    if (preferencesLoaded && !hasGeneratedInitialUrl.current) {
      console.log("PaperSearch: preferencesLoaded is now true, loading values");
      
      const loadQuickSearchValues = () => {
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            console.log("Attempting to load quick search values from Chrome storage");
            chrome.storage.local.get("quickSearchValues", (result: {quickSearchValues?: {quickCode: string}}) => {
              if (result.quickSearchValues && result.quickSearchValues.quickCode) {
                console.log("Found quick search values in Chrome storage:", result.quickSearchValues);
                setQuickCode(result.quickSearchValues.quickCode);
                // Validate the loaded code
                validateAndSetQuickCodeError(result.quickSearchValues.quickCode);
                // Don't trigger handleQuickCodeSubmit automatically
              } else {
                console.log("No quick search values found in Chrome storage");
              }
            });
          } else {
            // Load from localStorage
            console.log("Attempting to load quick search values from localStorage");
            const savedValues = localStorage.getItem("quickSearchValues");
            
            if (savedValues) {
              try {
                const parsedValues = JSON.parse(savedValues) as {quickCode: string};
                console.log("Found quick search values in localStorage:", parsedValues);
                if (parsedValues.quickCode) {
                  setQuickCode(parsedValues.quickCode);
                  // Validate the loaded code
                  validateAndSetQuickCodeError(parsedValues.quickCode);
                  // Don't trigger handleQuickCodeSubmit automatically
                }
              } catch (error) {
                console.error("Error parsing saved quick search values:", error);
              }
            } else {
              console.log("No quick search values found in localStorage");
            }
          }
        } catch (error) {
          console.error("Error loading quick search from storage:", error);
        }
      };
      
      const loadFromStorage = () => {
        try {
          if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
            console.log("Attempting to load form values from Chrome storage");
            chrome.storage.local.get("formValues", (result: {formValues?: FormValues}) => {
              if (result.formValues && Object.keys(result.formValues).length > 0) {
                console.log("Found form values in Chrome storage:", result.formValues);
                applyFormValues(result.formValues);
              } else {
                console.log("No form values found in Chrome storage");
              }
            });
          } else {
            // Load from localStorage
            console.log("Attempting to load form values from localStorage");
            const savedValues = localStorage.getItem("formValues");
            console.log("Raw localStorage value:", savedValues);
            
            if (savedValues) {
              try {
                const parsedValues = JSON.parse(savedValues) as FormValues;
                console.log("Found form values in localStorage:", parsedValues);
                applyFormValues(parsedValues);
              } catch (error) {
                console.error("Error parsing saved form values:", error);
              }
            } else {
              console.log("No form values found in localStorage");
            }
          }
        } catch (error) {
          console.error("Error loading form values from storage:", error);
        }
      };
      
      const applyFormValues = (values: FormValues) => {
        console.log("Applying form values:", values);
        
        // Only apply form values if quick search was not previously used
        // or we should explicitly sync from form to quick search
        if (!quickSearchUsed.current || shouldSyncFormToQuickSearch.current) {
          // Set curriculum first
          form.setValue("curriculum", values.curriculum || "cambridge-international-a-level");
          if (values.curriculum) {
            markFieldAsTouched("curriculum");
          }
          
          // Only set subject if it was explicitly set before
          if (values.subject) {
            form.setValue("subject", values.subject);
            markFieldAsTouched("subject");
          }
          
          // Set other values
          if (values.paperType) {
            form.setValue("paperType", values.paperType);
            markFieldAsTouched("paperType");
            form.trigger("paperType");
          }
          if (values.variant) {
            form.setValue("variant", values.variant);
            markFieldAsTouched("variant");
            form.trigger("variant");
          }
          if (values.season) {
            form.setValue("season", values.season);
            markFieldAsTouched("season");
            form.trigger("season");
          }
          if (values.year) {
            form.setValue("year", values.year);
            markFieldAsTouched("year");
            setFullYear(values.year.length === 2 ? `20${values.year}` : values.year);
            form.trigger("year");
          }
          
          // After applying all values, mark as initialized
          setIsInitialized(true);
          
          // Validate all fields at once
          form.trigger().then(() => {
            const currentValues = form.getValues();
            if (currentValues.subject && currentValues.paperType && currentValues.variant && 
                currentValues.season && currentValues.year) {
              generateUrlFromValues(currentValues);
            }
          });
        }
      };
      
      const generateUrlFromValues = (values: FormValues) => {
        const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
        if (!selectedSubject) {
          console.log("Subject is not supported yet");
          return;
        }
        
        const subjectCode = selectedSubject.code;
        const seasonId = values.season;
        const year = `20${values.year}`;
        const shortYear = values.year;
        const paperNumber = `${values.paperType}${values.variant}`;
        const url = `https://bestexamhelp.com/exam/${values.curriculum}/${values.subject}/${year}/${subjectCode}_${seasonId}${shortYear}_${paperType}_${paperNumber}.pdf`;
        
        // Only update quick code if quick search should be synced with form
        if (shouldSyncFormToQuickSearch.current) {
          // Generate quick code
          const newQuickCode = generateQuickCode(values);
          setQuickCode(newQuickCode);
          // Clear any existing quick code error
          setQuickCodeError("");
        }
        
        // Find season label
        const seasonObj = seasonS.find((s) => s.id === seasonId);
        const seasonLabel = seasonObj ? seasonObj.label : "";
        
        // Mark that we've generated a URL to prevent infinite loops
        hasGeneratedInitialUrl.current = true;
        
        console.log("Generating URL with showDialogOnLoad:", showDialogOnLoad);
        onLinkGenerated(
          url,
          {
            subjectCode: selectedSubject.code,
            subjectName: selectedSubject.label,
            paperNumber: paperNumber,
            season: seasonLabel,
            year: shortYear,
          },
          showDialogOnLoad,
          false // Initial load is not quick search
        );
      };
      
      // First load the quick search values
      loadQuickSearchValues();
      
      // Then load the form values separately
      if (!quickSearchUsed.current) {
        loadFromStorage();
      }
    }
  }, [preferencesLoaded, form, paperType, onLinkGenerated, generateQuickCode, showDialogOnLoad]);

  // Add an effect to validate the quick code whenever it changes
  useEffect(() => {
    // Validate on every change, even when empty (to handle initial load)
    validateAndSetQuickCodeError(quickCode);
  }, [quickCode]);

  const handleFormSubmission = (e: React.FormEvent) => {
    // Explicitly set that manual input is being used
    manualInputUsed.current = true;
    shouldSyncFormToQuickSearch.current = true;
    quickSearchUsed.current = false;
    console.log("Manual form submission, setting manualInputUsed to true");
    form.handleSubmit(submitFormSafely)(e);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-3 mb-5 h-full border-2 p-5 rounded-sm relative">
        
        <Label htmlFor="quick-code" className="text-sm text-red-500">Quick Paper Code</Label>
        <div className="flex justify-center gap-2 h-full">
          <Input
            id="quick-code"
            placeholder="e.g. 9702/42/M/J/20"
            value={quickCode}
            onChange={handleQuickCodeChange}
            onKeyDown={handleKeyDown}
            className={`max-w-md text-center ${quickCodeError ? "border-red-500" : ""}`}
            ref={quickSearchInputRef}
          />
          <div className="h-full relative">
            <GlowEffect
              colors={["#FF5733", "#33FF57", "#3357FF", "#F1C40F"]}
              mode="colorShift"
              blur="soft"
              duration={3}
            />
            <Button
              onClick={handleQuickCodeSubmit}
              className={`cursor-pointer h-full relative z-10 ${(!!quickCodeError || quickCode === "") ? "opacity-50" : ""}`}
              disabled={!!quickCodeError || quickCode === ""}
            >
              Find
              <Search className="w-4 h-4 ml" />
            </Button>
          </div>
        </div>
        {quickCodeError ? (
          <p className="text-xs text-red-500">{quickCodeError}</p>
        ) : (
         <>
          <p className="text-xs text-muted-foreground"><span className="font-bold">Enter code in format: </span>[Subject Code]/[Paper Number]/[Season]/[Year]</p>
          <p className="text-xs text-muted-foreground"><span className="font-bold">Tip:</span> Press enter twice to access the marking scheme quickly</p></>

        )}
      </div>

      <Form {...form}>
        <form
          onSubmit={handleFormSubmission}
          className="space-y-4 w-full border-2 p-5 mb-4 rounded-sm"
        >
        <Label htmlFor="curriculum" className="text-sm text-red-500">Manual Input</Label>
        <div>
            <label
              htmlFor="curriculum"
              className="block text-sm font-medium mb-1"
            >
              Curriculum
            </label>
            <select
              id="curriculum"
              className="w-full p-2 border rounded-md cursor-pointer"
              value={selectedCurriculum}
              onChange={(e) => {
                handleCurriculumChange(e.target.value);
              }}
            >
              <option
                value=""
                hidden
                className="dark:bg-[#323339] dark:text-white"
              >
                Select curriculum
              </option>
              {CURRICULUMS.map((curriculum) => (
                <option
                  key={curriculum.id}
                  value={curriculum.id}
                  className="dark:bg-[#323339] dark:text-white"
                >
                  {curriculum.label}
                </option>
              ))}
            </select>
            {form.formState.errors.curriculum && <p className="text-xs text-red-500 mt-1">{form.formState.errors.curriculum.message}</p>}
          </div>

          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium mb-1"
            >
              Subject
            </label>
            <select
              id="subject"
              className="w-full p-2 border rounded-md cursor-pointer"
              value={watchSubject || ""}
              onChange={(e) => {
                handleSubjectChange(e.target.value);
              }}
            >
              <option
                value=""
                hidden
                className="dark:bg-[#323339] dark:text-white"
              >
                Select subject
              </option>
              {filteredSubjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                  className="dark:bg-[#323339] dark:text-white"
                >
                  {subject.label} ({subject.code})
                </option>
              ))}
            </select>
            {form.formState.errors.subject && <p className="text-xs text-red-500 mt-1">{form.formState.errors.subject.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 w-full">
            <div className="flex items-center justify-between gap-6">
              <div className="w-1/2">
                <label
                  htmlFor="paperType"
                  className="block text-sm font-medium mb-1"
                >
                  Paper Type
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
                    onClick={decrementPaperType}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id="paperType"
                    className="mx-2 text-center flex-grow h-10 border rounded-md w-full "
                    type="text"
                    placeholder="e.g. 4"
                    value={watchPaperType || ""}
                    onChange={(e) => handlePaperTypeChange(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
                    onClick={incrementPaperType}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {touchedFields.paperType && form.formState.errors.paperType && 
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.paperType.message}</p>}
              </div>

              <div className="w-1/2">
                <label
                  htmlFor="variant"
                  className="block text-sm font-medium mb-1"
                >
                  Variant
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
                    onClick={decrementVariant}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id="variant"
                    className="mx-2 text-center flex-grow h-10 border rounded-md w-full"
                    type="text"
                    placeholder="e.g. 2"
                    value={watchVariant || ""}
                    onChange={(e) => handleVariantChange(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
                    onClick={incrementVariant}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {touchedFields.variant && form.formState.errors.variant && 
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.variant.message}</p>}
              </div>
            </div>

            <div>
              <label
                htmlFor="season"
                className="block text-sm font-medium mb-1"
              >
                Exam Season
              </label>
              <select
                id="season"
                className="w-full p-2 border rounded-md cursor-pointer"
                value={watchSeason || ""}
                onChange={(e) => {
                  handleSeasonChange(e.target.value);
                }}
              >
                <option
                  value=""
                  hidden
                  className="dark:bg-[#323339] dark:text-white"
                >
                  Select season
                </option>
                {seasonS.map((season) => (
                  <option
                    key={season.id}
                    value={season.id}
                    className="dark:bg-[#323339] dark:text-white"
                  >
                    {season.label} - {season.fullName}
                  </option>
                ))}
              </select>
              {form.formState.errors.season && <p className="text-xs text-red-500 mt-1">{form.formState.errors.season.message}</p>}
            </div>

            <div>
              <label
                htmlFor="year"
                className="block text-sm font-medium mb-1"
              >
                Year
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
                  onClick={decrementYear}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  id="year"
                  className="mx-2 text-center flex-grow h-10 border rounded-md"
                  type="text"
                  placeholder="e.g. 2020"
                  value={fullYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                />
                <button
                  type="button"
                  className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer dark:active:bg-[#36373e] active:bg-gray-200 aspect-square"
                  onClick={incrementYear}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {touchedFields.year && form.formState.errors.year && 
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.year.message}</p>}
            </div>
          </div>

          <div className="mt-4">
              <button
                type="submit"
                className={`w-full p-2 text-white rounded-md cursor-pointer bg-primary dark:bg-white dark:text-black ${!isFormValid() && "opacity-50 pointer-events-none"}`}
                disabled={!isFormValid() || form.formState.isSubmitting}
              >
                {!isFormValid() ? "Please fill all fields" : "Find Paper"}
                <Search className="w-4 h-4 ml-2 inline" />
              </button>
             
          </div>
        </form>
      </Form>
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
});
