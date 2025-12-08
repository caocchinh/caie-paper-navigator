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
import {
  PaperDetails,
  PaperDetailsWithLink,
} from "@/components/paper-search/types";
import { loadPreferences, savePreference } from "@/lib/storage";
import { openInNewTab, getMarkingSchemeLink } from "@/lib/utils";

export function App() {
  const [paperDetails, setPaperDetails] = useState<PaperDetailsWithLink | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isClearData, setIsClearData] = useState(false);
  const [showPinRecommendation, setShowPinRecommendation] = useState(true);
  const [showDialogOnLoad, setShowDialogOnLoad] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const paperSearchRef = useRef<PaperSearchHandles>(null);
  const quickSearchUsed = useRef(false);

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

  // Handle paper details generation
  const handlePaperGenerated = useCallback(
    (
      link: string | null,
      details?: Omit<PaperDetails, "link">,
      showDialog?: boolean,
      isQuickSearch?: boolean
    ) => {
      if (!link) {
        setPaperDetails(null);
        return;
      }

      // Update quickSearchUsed based on value passed from PaperSearch component
      quickSearchUsed.current = isQuickSearch || false;

      // Only update paperDetails if needed
      setPaperDetails((prev) => {
        if (!prev || prev.link !== link) {
          return {
            link,
            ...details!,
          };
        }
        return prev; // Don't update if it's the same
      });

      // Handle dialog opening with a ref to avoid unnecessary renders
      const shouldOpenDialog =
        showDialog === true ||
        (showDialog === undefined && showDialogOnLoad === true);

      if (shouldOpenDialog && !dialogOpen) {
        setDialogOpen(true);
      }
    },
    [dialogOpen, showDialogOnLoad]
  );

  // Modify the Dialog component to use a better onOpenChange handler
  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);

      // Only focus on quick search input when dialog closes AND quick search was used
      if (!open && paperSearchRef.current && quickSearchUsed.current) {
        paperSearchRef.current?.focusQuickSearch();
      }
    },
    [paperSearchRef]
  );

  // Handle clear data action
  const handleClearData = useCallback(() => {
    setPaperDetails(null);
    setIsClearData(true);
    handleDialogOpenChange(false);
    quickSearchUsed.current = false;
  }, [handleDialogOpenChange]);

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
          <h2 className="text-xl font-semibold mb-6 text-center bg-linear-to-r from-slate-900 to-slate-700 text-white py-3 px-4  shadow-md">
            <span className="text-red-500 font-bold">CAIE</span> IGCSE/A-Level
            Past Papers Search
          </h2>
          <div className="max-w-xl mx-auto px-7">
            <PaperSearch
              ref={paperSearchRef}
              paperType="qp"
              onLinkGenerated={handlePaperGenerated}
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
          className="w-[90%] "
          aria-describedby="paper-details-description"
        >
          <DialogHeader>
            <DialogTitle className="text-center!">Paper Details</DialogTitle>
          </DialogHeader>

          {paperDetails && (
            <div className="space-y-6">
              <div id="paper-details-description" className="sr-only">
                Details for {paperDetails.subjectName} (
                {paperDetails.subjectCode}) paper from {paperDetails.season} 20
                {paperDetails.year}
              </div>
              <div className="bg-muted p-4 rounded-lg mb-4">
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

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                  onClick={() =>
                    openInNewTab(getMarkingSchemeLink(paperDetails.link))
                  }
                >
                  Open Marking Scheme
                  <ExternalLink size={18} />
                </Button>

                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                  onClick={() => openInNewTab(paperDetails.link)}
                >
                  Open Question Paper
                  <ExternalLink size={18} />
                </Button>

                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                  onClick={() => {
                    handleDialogOpenChange(false);
                  }}
                >
                  Close
                  <X size={18} />
                </Button>
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full bg-red-600 hover:bg-red-700 text-white"
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

      <div className="text-center flex items-center flex-col justify-center gap-2 bg-gray-100 dark:bg-primary-foreground  p-4 w-full">
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
