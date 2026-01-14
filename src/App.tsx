import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaperSearch, PaperSearchHandles } from "@/components/paper-search";
import { ExternalLink, Github, Trash, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { FormValues, DocumentType } from "@/components/paper-search/types";
import { loadPreferences, savePreference } from "@/lib/storage";
import { openInNewTab } from "@/lib/utils";
import { generatePaperUrl } from "@/lib/url-generator";

export function App() {
  // Store form values to generate URLs on-demand when buttons are clicked
  const [currentFormValues, setCurrentFormValues] = useState<FormValues | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isClearData, setIsClearData] = useState(false);
  const [showPinRecommendation, setShowPinRecommendation] = useState(true);
  const [showDialogOnLoad, setShowDialogOnLoad] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const paperSearchRef = useRef<PaperSearchHandles>(null);
  const quickSearchUsedRef = useRef(false);

  // Load settings from storage on component mount
  useEffect(() => {
    const initPreferences = async () => {
      const preferences = await loadPreferences();
      setShowPinRecommendation(!preferences.hidePinRecommendation);

      // Validate year from form values
      const currentYear = new Date().getFullYear();
      const formYear = preferences.formValues?.year;
      if (formYear) {
        const yearNum = parseInt(`20${formYear}`);
        if (yearNum > currentYear || yearNum < 2009) {
          setShowDialogOnLoad(false);
        } else {
          setShowDialogOnLoad(preferences.showDialogOnLoad);
        }
      } else {
        setShowDialogOnLoad(preferences.showDialogOnLoad);
      }

      setPreferencesLoaded(true);
    };

    initPreferences();
  }, []);

  // Handle closing the pin recommendation
  const handleClosePinRecommendation = useCallback(() => {
    setShowPinRecommendation(false);
    savePreference("hidePinRecommendation", true);
  }, []);

  // Handle dialog preference change
  const handleDialogPreferenceChange = useCallback((checked: boolean) => {
    setShowDialogOnLoad(checked);
    savePreference("showDialogOnLoad", checked);
  }, []);

  // Handle form submission - stores form values for on-demand URL generation
  const handleFormSubmit = useCallback(
    (
      formValues: FormValues,
      options?: { showDialog?: boolean; isQuickSearch?: boolean }
    ) => {
      quickSearchUsedRef.current = options?.isQuickSearch || false;
      setCurrentFormValues(formValues);

      if (options?.showDialog) {
        setDialogOpen(true);
      }
    },
    []
  );

  // Handle dialog open/close
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);

    // Focus quick search input when dialog closes if quick search was used
    if (!open && quickSearchUsedRef.current) {
      paperSearchRef.current?.focusQuickSearch();
    }
  }, []);

  // Handle clear data action
  const handleClearData = useCallback(() => {
    setCurrentFormValues(null);
    setIsClearData(true);
    setDialogOpen(false);
    quickSearchUsedRef.current = false;
  }, []);

  // Open paper URL with specific document type
  const openPaper = useCallback(
    (docType: DocumentType) => {
      if (!currentFormValues) return;
      const result = generatePaperUrl(currentFormValues, docType);
      if (result) {
        openInNewTab(result.url);
      }
    },
    [currentFormValues]
  );

  // Get paper details for display (generate once for display purposes)
  const paperDetails = currentFormValues
    ? generatePaperUrl(currentFormValues, "qp")?.paperDetails
    : null;

  return (
    <div className="min-h-screen flex flex-col justify-between w-full items-center bg-white dark:bg-primary-foreground">
      {showPinRecommendation && (
        <div className="bg-blue-50 py-3 px-5 flex items-center justify-between w-full sticky top-0 z-10000">
          <p className="text-sm text-blue-700">
            📌 Pin this extension for better user experience and quick access
          </p>
          <button
            onClick={handleClosePinRecommendation}
            className="text-blue-700 hover:text-blue-900 cursor-pointer"
            aria-label="Close recommendation"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <Card className="mx-auto border-none shadow-none pb-8! w-full">
        <CardContent className="p-0!">
          <h2 className="text-xl font-semibold mb-6 text-center bg-linear-to-r from-slate-900 to-slate-700 text-white py-3 px-4 shadow-md">
            <span className="text-red-500 font-bold">CAIE</span> IGCSE/A-Level
            Past Papers Search
          </h2>
          <div className="max-w-xl mx-auto px-7">
            <PaperSearch
              ref={paperSearchRef}
              onSubmit={handleFormSubmit}
              onClear={handleClearData}
              isClearData={isClearData}
              setIsClearData={setIsClearData}
              preferencesLoaded={preferencesLoaded}
              showDialogOnLoad={showDialogOnLoad}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="w-[90%]"
          aria-describedby="paper-details-description"
        >
          <DialogHeader>
            <DialogTitle className="text-center!">Paper Details</DialogTitle>
          </DialogHeader>

          {paperDetails && (
            <div className="flex flex-col gap-4">
              <div id="paper-details-description" className="sr-only">
                Details for {paperDetails.subjectName} (
                {paperDetails.subjectCode}) paper from {paperDetails.season} 20
                {paperDetails.year}
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Subject:</div>
                  <div className="text-sm font-medium">
                    {paperDetails.subjectName} ({paperDetails.subjectCode})
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Paper Number:
                  </div>
                  <div className="text-sm font-medium">
                    {paperDetails.paperNumber}
                  </div>

                  <div className="text-sm text-muted-foreground">Season:</div>
                  <div className="text-sm font-medium">
                    {paperDetails.season}
                  </div>

                  <div className="text-sm text-muted-foreground">Year:</div>
                  <div className="text-sm font-medium">
                    20{paperDetails.year}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Paper Code:
                  </div>
                  <div className="text-sm font-medium">
                    {paperDetails.subjectCode}/{paperDetails.paperNumber}/
                    {paperDetails.season}/{paperDetails.year}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => openPaper("qp")}
                >
                  Question Paper
                  <ExternalLink size={16} />
                </Button>
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => openPaper("ms")}
                >
                  Mark Scheme
                  <ExternalLink size={16} />
                </Button>
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => openPaper("er")}
                >
                  Examiner Report
                  <ExternalLink size={16} />
                </Button>
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => openPaper("gt")}
                >
                  Grade Threshold
                  <ExternalLink size={16} />
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer flex-1"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Close
                  <X size={18} />
                </Button>
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleClearData}
                >
                  Clear Data
                  <Trash size={18} />
                </Button>
              </div>

              <div className="flex items-center justify-between py-4 px-6 bg-muted rounded-lg gap-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="auto-show-dialog"
                    className="text-sm font-medium"
                  >
                    Show dialog on startup
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically show this dialog when existing valid paper
                    data is found in manual input
                  </p>
                </div>
                <Switch
                  id="auto-show-dialog"
                  checked={showDialogOnLoad}
                  onCheckedChange={handleDialogPreferenceChange}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="text-center flex items-center flex-col justify-center gap-2 bg-gray-100 dark:bg-primary-foreground p-4 w-full">
        <div className="flex items-center justify-center gap-2 w-full">
          <a
            href="https://noteoverflow.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit our website"
            className="text-[10px] font-medium flex items-center gap-1"
          >
            Powered by bestexamhelp.com. Build and maintain by Noteoverflow
            founder
            <img
              src="/noteoverflow.png"
              alt="Noteoverflow"
              className="w-5 h-5"
            />
          </a>
          <a
            href="https://github.com/caocchinh"
            target="_blank"
            rel="noopener noreferrer"
            title="Developer's GitHub"
            className="text-sm font-medium"
          >
            <Github size={20} />
          </a>
        </div>
        <ModeToggle />
      </div>
    </div>
  );
}

export default App;
