"use client";

import {useState, useEffect, useRef, useCallback} from "react";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {CURRICULUMS, SESSIONS, SUBJECTS} from "@/lib/constants";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

const formSchema = z.object({
  curriculum: z.string(),
  subject: z.string(),
  paperType: z
    .string()
    .length(1, {message: "Paper type must be 1 digit"})
    .refine((val) => val !== "0", {message: "Paper type cannot be 0"}),
  variant: z.string().length(1, {message: "Variant must be 1 digit"}),
  session: z.string(),
  year: z
    .string()
    .length(2, {message: "Year must be 2 digits"})
    .refine(
      (val) => {
        const yearNum = parseInt(`20${val}`);
        return yearNum >= 2000;
      },
      {message: "Year must be 2000 or later"}
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
}

export function PaperSearch({paperType, onLinkGenerated}: PaperSearchProps) {
  const [quickCode, setQuickCode] = useState<string>("");
  const [fullYear, setFullYear] = useState<string>("");
  const [quickCodeError, setQuickCodeError] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(true);
  const [pendingSubject, setPendingSubject] = useState<string | null>(null);
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
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get("formValues", (result: {formValues?: FormValues}) => {
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
                }
                if (result.formValues?.variant) {
                  form.setValue("variant", result.formValues.variant);
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
                }
                if (parsedValues.variant) {
                  form.setValue("variant", parsedValues.variant);
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
            } catch (e) {
              console.error("Error parsing saved form values:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error loading stored values:", error);
      }
    };

    loadStoredValues();
  }, [form, submitFormSafely, paperType, onLinkGenerated, generateQuickCode]);

  // Save form values whenever they change
  useEffect(() => {
    const saveFormValues = (values: Partial<FormValues>) => {
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
              chrome.storage.local.set({formValues: validValues});
            } else {
              // Fallback to localStorage
              localStorage.setItem("formValues", JSON.stringify(validValues));
            }
          }
        }
      } catch (error) {
        console.error("Error saving form values:", error);
      }
    };

    const subscription = form.watch((values) => {
      if (values) {
        saveFormValues(values);
      }
    });

    return () => subscription.unsubscribe();
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
    } else {
      form.clearErrors("year");
    }
  };

  // Increment/decrement year
  const incrementYear = () => {
    const currentYear = fullYear ? parseInt(fullYear) : new Date().getFullYear();
    const newYear = (currentYear + 1).toString();
    handleYearChange(newYear);
  };

  const decrementYear = () => {
    const currentYear = fullYear ? parseInt(fullYear) : new Date().getFullYear();
    const newYear = (currentYear - 1).toString();
    handleYearChange(newYear);
  };

  // Handle paper type and variant increment/decrement
  const handlePaperTypeChange = (value: string) => {
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
    const currentValue = form.getValues("paperType");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    // Start from 1 instead of 0
    const newValue = numValue === 0 || numValue === 9 ? "1" : ((numValue + 1) % 10).toString();
    form.setValue("paperType", newValue);
    form.clearErrors("paperType");
  };

  const decrementPaperType = () => {
    const currentValue = form.getValues("paperType");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    // Ensure it doesn't go to 0 when decrementing
    const newValue = numValue === 0 || numValue === 1 ? "9" : (numValue - 1 || 9).toString();
    form.setValue("paperType", newValue);
    form.clearErrors("paperType");
  };

  const handleVariantChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "");
    // Restrict to 1 digit
    const oneDigit = numericValue.slice(0, 1);
    form.setValue("variant", oneDigit);
  };

  const incrementVariant = () => {
    const currentValue = form.getValues("variant");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    const newValue = ((numValue + 1) % 10).toString();
    form.setValue("variant", newValue);
  };

  const decrementVariant = () => {
    const currentValue = form.getValues("variant");
    const numValue = currentValue ? parseInt(currentValue) : 0;
    const newValue = ((numValue + 9) % 10).toString();
    form.setValue("variant", newValue);
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
    <div className="space-y-6">
      <div className="space-y-3 mb-5">
        <Label htmlFor="quick-code">Quick Paper Code</Label>
        <div className="flex justify-center gap-2">
          <Input
            id="quick-code"
            placeholder="e.g. 9702/42/M/J/20"
            value={quickCode}
            onChange={handleQuickCodeChange}
            onKeyDown={handleKeyDown}
            className={`max-w-md text-center ${quickCodeError ? "border-red-500" : ""}`}
          />
          <Button
            onClick={handleQuickCodeSubmit}
            size="sm"
            className="cursor-pointer"
            disabled={!!quickCodeError && quickCode !== ""}
          >
            Find
          </Button>
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
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="curriculum"
            render={({field}) => (
              <FormItem>
                <FormLabel>Curriculum</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select curriculum" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRICULUMS.map((curriculum) => (
                      <SelectItem
                        key={curriculum.id}
                        value={curriculum.id}
                      >
                        {curriculum.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subject"
            render={({field}) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredSubjects.map((subject) => (
                      <SelectItem
                        key={subject.id}
                        value={subject.id}
                      >
                        {subject.label} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paperType"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Paper Type</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={decrementPaperType}
                          className="h-10 w-10"
                        >
                          -
                        </Button>
                        <Input
                          className="mx-2 text-center"
                          type="text"
                          placeholder="e.g. 4"
                          value={field.value}
                          onChange={(e) => handlePaperTypeChange(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={incrementPaperType}
                          className="h-10 w-10"
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variant"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Variant</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={decrementVariant}
                          className="h-10 w-10"
                        >
                          -
                        </Button>
                        <Input
                          className="mx-2 text-center"
                          type="text"
                          placeholder="e.g. 2"
                          value={field.value}
                          onChange={(e) => handleVariantChange(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={incrementVariant}
                          className="h-10 w-10"
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="session"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Exam Season</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SESSIONS.map((session) => (
                        <SelectItem
                          key={session.id}
                          value={session.id}
                        >
                          {session.label} - {session.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({field}) => {
                // Use field for React Hook Form integration
                return (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={decrementYear}
                          className="h-10 w-10"
                        >
                          -
                        </Button>
                        <Input
                          className="mx-2 text-center"
                          type="text"
                          placeholder="e.g. 2020"
                          value={fullYear}
                          onChange={(e) => handleYearChange(e.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={incrementYear}
                          className="h-10 w-10"
                        >
                          +
                        </Button>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Enter full year (e.g. 2020).</p>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>

          <div className="mt-4">
            <Button
              type="submit"
              className="w-full cursor-pointer"
              disabled={!isFormValid() || form.formState.isSubmitting}
            >
              Find Paper
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
