"use client";

import {useState, useEffect, useRef, useCallback} from "react";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {CURRICULUMS, SESSIONS, SUBJECTS} from "@/lib/constants";
import {Form} from "@/components/ui/form";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {GlowEffect} from "./ui/glow-effect";
import {Search, Plus, Minus, RefreshCw, XCircle} from "lucide-react";

const formSchema = z.object({
  curriculum: z.string(),
  subject: z.string(),
  paperType: z
    .string()
    .length(1, {message: "Please enter a valid paper type"})
    .refine((val) => val !== "0", {message: "Paper type cannot be 0"}),
  variant: z.string().length(1, {message: "Please enter a valid variant"}),
  session: z.string(),
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
        const currentYear = new Date().getFullYear();
        return yearNum <= currentYear;
      },
      {message: "Year cannot exceed current year"}
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface PaperSearchProps {
  paperType: "qp" | "ms";
  onLinkGenerated: (
    link: string | null,
    details:
      | {
          subjectCode: string;
          subjectName: string;
          paperNumber: string;
          session: string;
          year: string;
        }
      | undefined,
    showDialog?: boolean
  ) => void;
  isClearData: boolean;
  setIsClearData: (isClearData: boolean) => void;
}

export function PaperSearch({paperType, onLinkGenerated, isClearData, setIsClearData}: PaperSearchProps) {
  const [quickCode, setQuickCode] = useState<string>("");
  const [fullYear, setFullYear] = useState<string>("");
  const [quickCodeError, setQuickCodeError] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(true);
  const [pendingSubject, setPendingSubject] = useState<string | null>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const curriculumLoaded = useRef(false);
  const initialLoadDone = useRef(false);
  const paperTypeChangeRef = useRef(false);
  const formValuesRef = useRef<FormValues | null>(null);
  const hasMountedRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      curriculum: "cambridge-international-a-level",
      subject: "",
      paperType: "",
      variant: "",
      session: "",
      year: "",
    },
  });

  // Function to mark a field as touched
  const markFieldAsTouched = (fieldName: string) => {
    setTouchedFields(prev => ({...prev, [fieldName]: true}));
  };

  // Watch curriculum for subject filtering
  const watchCurriculum = form.watch("curriculum");

  // Filter subjects based on selected curriculum
  const filteredSubjects = SUBJECTS.filter((subject) => subject.curriculum === watchCurriculum);

  // Handle curriculum change
  useEffect(() => {
    // Don't reset subject on initial load
    if (isInitialized && !pendingSubject) {
      form.setValue("subject", "");
    }

    curriculumLoaded.current = true;

    // Try to set pending subject if it exists and matches the current curriculum
    if (pendingSubject) {
      const subjectExists = SUBJECTS.some((s) => s.id === pendingSubject && s.curriculum === watchCurriculum);

      if (subjectExists) {
        form.setValue("subject", pendingSubject);
        form.trigger("subject");
        setPendingSubject(null);

        // If this was part of initialization, mark as initialized
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    }
  }, [watchCurriculum, form, isInitialized, pendingSubject]);

  // Validate quick code as user types
  const validateQuickCode = (code: string): string => {
    if (!code) return "";

    const regex = /^(\d{4})\/(\d{2})\/(F\/M|M\/J|O\/N)\/(\d{2})$/;
    if (!regex.test(code)) {
      return "Invalid format. Please use format like: 9702/42/M/J/20";
    }

    const match = code.match(regex);
    if (!match) return "Invalid format";

    const subjectCode = match[1];
    const subject = SUBJECTS.find((s) => s.code === subjectCode);
    if (!subject) {
      return `Subject with code ${subjectCode} not found`;
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
        chrome.storage.local.set({formValues: null});
      } else {
        localStorage.clear();
      }
      setIsClearData(false);
    }
  }, [isClearData, form, setIsClearData]);

  // Generate quick code from form values (pure function without state updates)
  const generateQuickCode = useCallback((values: FormValues) => {
    const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
    if (!selectedSubject) return "";

    // Map session ID back to the format used in quick code
    let sessionCode = "";
    if (values.session === "s") sessionCode = "M/J";
    else if (values.session === "w") sessionCode = "O/N";
    else if (values.session === "m") sessionCode = "F/M";

    const paperNumber = `${values.paperType}${values.variant}`;
    return `${selectedSubject.code}/${paperNumber}/${sessionCode}/${values.year}`;
  }, []);

  // Submit form without causing infinite loops
  const submitFormSafely = useCallback(
    (values: FormValues) => {
      // Store values to prevent unnecessary re-renders
      formValuesRef.current = values;

      const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
      if (!selectedSubject) return;

      const subjectCode = selectedSubject.code;
      const sessionId = values.session;
      const year = `20${values.year}`;
      const shortYear = values.year;
      const paperNumber = `${values.paperType}${values.variant}`;

      // Format URL
      const url = `https://bestexamhelp.com/exam/${values.curriculum}/${values.subject}/${year}/${subjectCode}_${sessionId}${shortYear}_${paperType}_${paperNumber}.pdf`;

      // Generate quick code without directly updating state
      const newQuickCode = generateQuickCode(values);

      // Find session label
      const sessionObj = SESSIONS.find((s) => s.id === sessionId);
      const sessionLabel = sessionObj ? sessionObj.label : "";

      // Pass paper details along with the link
      onLinkGenerated(
        url,
        {
          subjectCode: selectedSubject.code,
          subjectName: selectedSubject.label,
          paperNumber: paperNumber,
          session: sessionLabel,
          year: shortYear,
        },
        true
      );

      // Update quick code last to avoid triggering re-renders too early
      setQuickCode(newQuickCode);
    },
    [paperType, onLinkGenerated, generateQuickCode]
  );

  // Load saved form values when component mounts
  useEffect(() => {
    const loadStoredValues = () => {
      // Only load stored values on initial mount
      if (hasMountedRef.current) return;

      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get("formValues", (result: {formValues?: FormValues}) => {
            try {
              if (result.formValues) {
                // Apply each field individually to ensure proper handling
                form.setValue("curriculum", result.formValues.curriculum || "cambridge-international-a-level");

                // Set subject after a short delay to ensure curriculum is applied
                setTimeout(() => {
                  if (result.formValues?.subject) {
                    form.setValue("subject", result.formValues.subject);
                  }

                  // Set other values
                  if (result.formValues?.paperType) {
                    form.setValue("paperType", result.formValues.paperType);
                    form.trigger("paperType");
                  }
                  if (result.formValues?.variant) {
                    form.setValue("variant", result.formValues.variant);
                    form.trigger("variant");
                  }
                  if (result.formValues?.session) {
                    form.setValue("session", result.formValues.session);
                  }
                  if (result.formValues?.year) {
                    form.setValue("year", result.formValues.year);
                    setFullYear(result.formValues.year.length === 2 ? `20${result.formValues.year}` : result.formValues.year);
                  }

                  // Trigger form validation
                  form.trigger();

                  // Generate the URL but don't show the dialog
                  const values = form.getValues();
                  const hasRequiredValues = values.subject && values.paperType && values.variant && values.session && values.year;

                  if (hasRequiredValues) {
                    const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
                    if (selectedSubject) {
                      const subjectCode = selectedSubject.code;
                      const sessionId = values.session;
                      const year = `20${values.year}`;
                      const shortYear = values.year;
                      const paperNumber = `${values.paperType}${values.variant}`;
                      const url = `https://bestexamhelp.com/exam/${values.curriculum}/${values.subject}/${year}/${subjectCode}_${sessionId}${shortYear}_${paperType}_${paperNumber}.pdf`;

                      // Generate quick code
                      const newQuickCode = generateQuickCode(values);
                      setQuickCode(newQuickCode);

                      // Find session label
                      const sessionObj = SESSIONS.find((s) => s.id === sessionId);
                      const sessionLabel = sessionObj ? sessionObj.label : "";

                      // Generate the URL and details, but pass false for showDialog
                      onLinkGenerated(
                        url,
                        {
                          subjectCode: selectedSubject.code,
                          subjectName: selectedSubject.label,
                          paperNumber: paperNumber,
                          session: sessionLabel,
                          year: shortYear,
                        },
                        false
                      ); // Don't show dialog on initial load
                    }
                  }
                }, 100);
              }
            } catch (error) {
              console.error("Error parsing saved form values:", error);
            }
          });
        } else {
          // Same implementation for localStorage with the false flag for dialog
          const savedValues = localStorage.getItem("formValues");
          if (savedValues) {
            try {
              const parsedValues = JSON.parse(savedValues) as FormValues;

              // Apply values with the same careful approach
              form.setValue("curriculum", parsedValues.curriculum || "cambridge-international-a-level");

              setTimeout(() => {
                if (parsedValues.subject) {
                  form.setValue("subject", parsedValues.subject);
                }
                if (parsedValues.paperType) {
                  form.setValue("paperType", parsedValues.paperType);
                  form.trigger("paperType");
                }
                if (parsedValues.variant) {
                  form.setValue("variant", parsedValues.variant);
                  form.trigger("variant");
                }
                if (parsedValues.session) {
                  form.setValue("session", parsedValues.session);
                }
                if (parsedValues.year) {
                  form.setValue("year", parsedValues.year);
                  setFullYear(parsedValues.year.length === 2 ? `20${parsedValues.year}` : parsedValues.year);
                }

                form.trigger();

                const values = form.getValues();
                const hasRequiredValues = values.subject && values.paperType && values.variant && values.session && values.year;

                if (hasRequiredValues) {
                  const selectedSubject = SUBJECTS.find((s) => s.id === values.subject);
                  if (selectedSubject) {
                    const subjectCode = selectedSubject.code;
                    const sessionId = values.session;
                    const year = `20${values.year}`;
                    const shortYear = values.year;
                    const paperNumber = `${values.paperType}${values.variant}`;
                    const url = `https://bestexamhelp.com/exam/${values.curriculum}/${values.subject}/${year}/${subjectCode}_${sessionId}${shortYear}_${paperType}_${paperNumber}.pdf`;

                    // Generate quick code
                    const newQuickCode = generateQuickCode(values);
                    setQuickCode(newQuickCode);

                    // Find session label
                    const sessionObj = SESSIONS.find((s) => s.id === sessionId);
                    const sessionLabel = sessionObj ? sessionObj.label : "";

                    // Generate the URL but don't show dialog
                    onLinkGenerated(
                      url,
                      {
                        subjectCode: selectedSubject.code,
                        subjectName: selectedSubject.label,
                        paperNumber: paperNumber,
                        session: sessionLabel,
                        year: shortYear,
                      },
                      false
                    ); // Don't show dialog on initial load
                  }
                }
              }, 100);
            } catch (error) {
              console.error("Error parsing saved form values:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading stored values:", error);
      }
    };

    loadStoredValues();
    // Set hasMountedRef to true after initial load
    hasMountedRef.current = true;
  }, [form, submitFormSafely, paperType, onLinkGenerated, generateQuickCode]);

  // Save form values whenever they change
  useEffect(() => {
    // Debounce storage save to prevent conflicts with user input
    let saveTimeout: NodeJS.Timeout;

    const saveFormValues = (values: Partial<FormValues>) => {
      clearTimeout(saveTimeout);

      saveTimeout = setTimeout(() => {
        try {
          if (values && Object.keys(values).length > 0) {
            // Filter out empty values
            const validValues: Record<string, string> = {};
            Object.entries(values).forEach(([key, value]) => {
              if (value && typeof value === "string" && value.trim() !== "") {
                validValues[key] = value;
              }
            });

            if (Object.keys(validValues).length > 0) {
              if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
                // Get existing values first to avoid wiping out values
                chrome.storage.local.get("formValues", (result) => {
                  const existingValues = result.formValues || {};
                  const updatedValues = {...existingValues, ...validValues};
                  chrome.storage.local.set({formValues: updatedValues});
                });
              } else {
                // For localStorage, get existing values first before saving
                try {
                  const savedValues = localStorage.getItem("formValues");
                  const existingValues = savedValues ? JSON.parse(savedValues) : {};
                  const updatedValues = {...existingValues, ...validValues};
                  localStorage.setItem("formValues", JSON.stringify(updatedValues));
                } catch (error) {
                  console.error("Error parsing or saving to localStorage:", error);
                  // Fallback to direct save attempt
                  try {
                    localStorage.setItem("formValues", JSON.stringify(validValues));
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
      }, 500); // Add debounce delay
    };

    const subscription = form.watch((values) => {
      if (values && hasMountedRef.current) {
        saveFormValues(values);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(saveTimeout);
    };
  }, [form]);

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
      const hasRequiredValues = values.subject && values.paperType && values.variant && values.session && values.year;

      if (hasRequiredValues && (paperTypeChangeRef.current || !formValuesRef.current)) {
        // Reset the flag
        paperTypeChangeRef.current = false;
        // Submit form
        submitFormSafely(values);
      }
    }

    // Mark initialization complete
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
    }
  }, [isInitialized, form, submitFormSafely]);

  // Handle year input
  const handleYearChange = (value: string) => {
    // Mark field as touched
    markFieldAsTouched("year");
    
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "");
    setFullYear(numericValue);

    // Extract last two digits for the form
    const lastTwoDigits = numericValue.slice(-2).padStart(2, "0");
    form.setValue("year", lastTwoDigits);

    // Validate year is 2000 or later
    if (numericValue && parseInt(numericValue) < 2000) {
      form.setError("year", {
        type: "manual",
        message: "Year must be 2000 or later",
      });
    } 
    // Validate year doesn't exceed current year
    else if (numericValue && parseInt(numericValue) > new Date().getFullYear()) {
      form.setError("year", {
        type: "manual",
        message: "Year cannot exceed current year",
      });
    } else {
      form.clearErrors("year");
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

    form.setValue("paperType", oneDigit);
  };

  const incrementPaperType = () => {
    markFieldAsTouched("paperType");
    const currentValue = form.getValues("paperType");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    // Start from 1 instead of 0
    const newValue = numValue === 0 || numValue === 9 ? "1" : ((numValue + 1) % 10).toString();
    form.setValue("paperType", newValue);
    form.clearErrors("paperType");
    form.trigger("paperType");
  };

  const decrementPaperType = () => {
    markFieldAsTouched("paperType");
    const currentValue = form.getValues("paperType");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    // Ensure it doesn't go to 0 when decrementing
    const newValue = numValue === 0 || numValue === 1 ? "9" : (numValue - 1 || 9).toString();
    form.setValue("paperType", newValue);
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

    // Check if variant is 0
    if (oneDigit === "0") {
      form.setError("variant", {
        type: "manual",
        message: "Variant cannot be 0",
      });
    } else {
      form.clearErrors("variant");
    }

    form.setValue("variant", oneDigit);
  };

  const incrementVariant = () => {
    markFieldAsTouched("variant");
    const currentValue = form.getValues("variant");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    const newValue = ((numValue + 1) % 10).toString();
    form.setValue("variant", newValue);
    form.clearErrors("variant");
  };

  const decrementVariant = () => {
    markFieldAsTouched("variant");
    const currentValue = form.getValues("variant");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    const newValue = ((numValue + 9) % 10).toString();
    form.setValue("variant", newValue);
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
      values.session &&
      values.year?.length === 2 &&
      yearNum >= 2000 &&
      !hasErrors
    );
  };

  // Parse quick code input and find paper
  const handleQuickCodeSubmit = () => {
    try {
      if (quickCodeError) return;

      // Format examples: 9702/42/M/J/20 or 9708/11/O/N/20
      const regex = /^(\d{4})\/(\d{2})\/(F\/M|M\/J|O\/N)\/(\d{2})$/;
      const match = quickCode.match(regex);

      if (!match) {
        setQuickCodeError("Invalid format. Please use format like: 9702/42/M/J/20");
        return;
      }

      // Destructure match without capturing unused variables
      const [, subjectCode, paperNumber, session, year] = match;

      // Find subject by code
      const subject = SUBJECTS.find((s) => s.code === subjectCode);
      if (!subject) {
        setQuickCodeError(`Subject with code ${subjectCode} not found`);
        return;
      }

      // Map session to the correct format
      let sessionId = "";
      if (session === "M/J") sessionId = "s";
      else if (session === "O/N") sessionId = "w";
      else if (session === "F/M") sessionId = "m";

      // First set curriculum
      form.setValue("curriculum", subject.curriculum);

      // Wait for next tick to ensure curriculum is set before setting subject
      setTimeout(() => {
        // Now we can set subject since curriculum is set
        form.setValue("subject", subject.id);

        // Split paperNumber into paperType and variant
        const paperType = paperNumber.charAt(0);
        const variant = paperNumber.charAt(1);

        // Set the rest of the form values
        form.setValue("paperType", paperType);
        form.setValue("variant", variant);
        form.setValue("session", sessionId);
        form.setValue("year", year);

        // Also update the fullYear state with the 20XX format
        setFullYear(`20${year}`);

        // Mark fields as touched since this is a form fill
        markFieldAsTouched("paperType");
        markFieldAsTouched("variant");
        markFieldAsTouched("year");

        // Trigger validation
        form.trigger();

        // Submit the form with the complete values
        const formValues = {
          curriculum: subject.curriculum,
          subject: subject.id,
          paperType,
          variant,
          session: sessionId,
          year,
        };

        submitFormSafely(formValues);
      }, 0);
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
    setQuickCodeError(validateQuickCode(value));
  };

  return (
    <div className="space-y-6 w-full">
      <div className="space-y-3 mb-5 h-full border-2 p-5 rounded-sm">
        <Label htmlFor="quick-code">Quick Paper Code</Label>
        <div className="flex justify-center gap-2 h-full">
          <Input
            id="quick-code"
            placeholder="e.g. 9702/42/M/J/20"
            value={quickCode}
            onChange={handleQuickCodeChange}
            onKeyDown={handleKeyDown}
            className={`max-w-md text-center ${quickCodeError ? "border-red-500" : ""}`}
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
              className="cursor-pointer h-full relative z-10"
              disabled={!!quickCodeError && quickCode !== ""}
            >
              Find
              <Search className="w-4 h-4 ml" />
            </Button>
          </div>
        </div>
        {quickCodeError ? (
          <p className="text-xs text-red-500">{quickCodeError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Enter code in format: [Subject Code]/[Paper Number]/[Session]/[Year]</p>
        )}
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submitFormSafely)}
          className="space-y-4 w-full"
        >
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
              value={form.getValues().curriculum || ""}
              onChange={(e) => {
                form.setValue("curriculum", e.target.value);
                form.trigger("curriculum");
              }}
            >
              <option
                value=""
                disabled
              >
                Select curriculum
              </option>
              {CURRICULUMS.map((curriculum) => (
                <option
                  key={curriculum.id}
                  value={curriculum.id}
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
              value={form.getValues().subject || ""}
              onChange={(e) => {
                form.setValue("subject", e.target.value);
                form.trigger("subject");
              }}
            >
              <option
                value=""
                disabled
              >
                Select subject
              </option>
              {filteredSubjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.label} ({subject.code})
                </option>
              ))}
            </select>
            {form.formState.errors.subject && <p className="text-xs text-red-500 mt-1">{form.formState.errors.subject.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 w-full">
            <div className="flex items-center justify-between gap-4">
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
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer active:bg-gray-200"
                    onClick={decrementPaperType}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id="paperType"
                    className="mx-2 text-center flex-grow h-10 border rounded-md w-full "
                    type="text"
                    placeholder="e.g. 4"
                    value={form.getValues().paperType || ""}
                    onChange={(e) => handlePaperTypeChange(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer active:bg-gray-200"
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
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer active:bg-gray-200"
                    onClick={decrementVariant}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    id="variant"
                    className="mx-2 text-center flex-grow h-10 border rounded-md w-full"
                    type="text"
                    placeholder="e.g. 2"
                    value={form.getValues().variant || ""}
                    onChange={(e) => handleVariantChange(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer active:bg-gray-200"
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
                htmlFor="session"
                className="block text-sm font-medium mb-1"
              >
                Exam Season
              </label>
              <select
                id="session"
                className="w-full p-2 border rounded-md cursor-pointer"
                value={form.getValues().session || ""}
                onChange={(e) => {
                  form.setValue("session", e.target.value);
                  form.trigger("session");
                }}
              >
                <option
                  value=""
                  disabled
                >
                  Select season
                </option>
                {SESSIONS.map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {session.label} - {session.fullName}
                  </option>
                ))}
              </select>
              {form.formState.errors.session && <p className="text-xs text-red-500 mt-1">{form.formState.errors.session.message}</p>}
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
                  className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer"
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
                  className="h-10 w-10 border rounded-md flex items-center justify-center cursor-pointer"
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
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className={`w-full p-2 text-white rounded-md cursor-pointer bg-black ${!isFormValid() && "opacity-50 pointer-events-none"}`}
                disabled={!isFormValid() || form.formState.isSubmitting}
              >
                {!isFormValid() ? "Please fill all fields" : "Find Paper"}
                <Search className="w-4 h-4 ml-2 inline" />
              </button>
              <button
                type="button"
                className="w-full p-2 text-white bg-red-600 hover:bg-red-700 rounded-md cursor-pointer flex items-center justify-center"
                onClick={() => setIsClearData(true)}
              >
                Clear All
                <XCircle className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
