import {useState, useEffect, useCallback} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {PaperSearch} from "@/components/paper-search";
import {ExternalLink, Github, Trash, X} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Paper details interface
interface PaperDetails {
  link: string;
  subjectCode: string;
  subjectName: string;
  paperNumber: string;
  session: string;
  year: string;
}

export function App() {
  const [paperDetails, setPaperDetails] = useState<PaperDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isClearData, setIsClearData] = useState(false);
  const [showPinRecommendation, setShowPinRecommendation] = useState(true);
  const [showDialogOnLoad, setShowDialogOnLoad] = useState(false); 
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load settings from storage on component mount
  useEffect(() => {
    // Function to load settings from either Chrome storage or localStorage
    const loadSettings = () => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.get(['hidePinRecommendation', 'showDialogOnLoad'], (result) => {
            // Pin recommendation
            const isHidden = result.hidePinRecommendation === true;
            setShowPinRecommendation(!isHidden);
            
            // Dialog on load - default to false if not set
            const dialogOnLoad = typeof result.showDialogOnLoad === 'boolean' ? result.showDialogOnLoad : false;
            
            // Force state update to trigger rerender
            setShowDialogOnLoad(false);
            
            // Then set the actual value after a small delay
            setTimeout(() => {
              console.log("Setting showDialogOnLoad to:", dialogOnLoad);
              setShowDialogOnLoad(dialogOnLoad);
              setPreferencesLoaded(true);
            }, 50);
            
            console.log("Loaded from Chrome storage:", { 
              hidePinRecommendation: result.hidePinRecommendation,
              showDialogOnLoad: dialogOnLoad 
            });
          });
        } catch (error) {
          console.error("Error loading from Chrome storage:", error);
          // Fall back to localStorage
          loadFromLocalStorage();
        }
      } else {
        // Fall back to localStorage
        loadFromLocalStorage();
      }
    };
    
    // Function to load settings from localStorage
    const loadFromLocalStorage = () => {
      try {
        // Pin recommendation
        const hidePinRecommendation = localStorage.getItem('hidePinRecommendation');
        if (hidePinRecommendation === 'true') {
          setShowPinRecommendation(false);
        }
        
        // Dialog on load - force proper boolean conversion
        const dialogOnLoad = localStorage.getItem('showDialogOnLoad');
        // Only explicitly set to true if the value is 'true', otherwise default to false
        const parsedValue = dialogOnLoad === 'true';
        
        // Force state update to trigger rerender
        setShowDialogOnLoad(false);
        
        // Then set the actual value after a small delay
        setTimeout(() => {
          console.log("Setting showDialogOnLoad to:", parsedValue);
          setShowDialogOnLoad(parsedValue);
          setPreferencesLoaded(true);
        }, 50);
        
        console.log("Loaded from localStorage:", { 
          hidePinRecommendation,
          showDialogOnLoad: dialogOnLoad,
          parsedValue
        });
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        // Even on error, mark as loaded to not block the app
        setPreferencesLoaded(true);
      }
    };
    
    loadSettings();
  }, []);

  // Handle closing the pin recommendation
  const handleClosePinRecommendation = () => {
    setShowPinRecommendation(false);
    
    // Save to Chrome storage if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({ hidePinRecommendation: true }, () => {
          console.log("Saved hidePinRecommendation to Chrome storage");
        });
      } catch (error) {
        console.error("Error saving to Chrome storage:", error);
        // Fall back to localStorage
        saveToLocalStorage();
      }
    } else {
      // Fall back to localStorage
      saveToLocalStorage();
    }
    
    // Helper function to save to localStorage
    function saveToLocalStorage() {
      try {
        localStorage.setItem('hidePinRecommendation', 'true');
        console.log("Saved hidePinRecommendation to localStorage");
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  };

  // Handle dialog preference change
  const handleDialogPreferenceChange = (checked: boolean) => {
    setShowDialogOnLoad(checked);
    
    // Save to Chrome storage if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        chrome.storage.local.set({ showDialogOnLoad: checked }, () => {
          console.log("Saved showDialogOnLoad to Chrome storage:", checked);
        });
      } catch (error) {
        console.error("Error saving to Chrome storage:", error);
        // Fall back to localStorage
        saveToLocalStorage();
      }
    } else {
      // Fall back to localStorage
      saveToLocalStorage();
    }
    
    // Helper function to save to localStorage
    function saveToLocalStorage() {
      try {
        localStorage.setItem('showDialogOnLoad', checked.toString());
        console.log("Saved showDialogOnLoad to localStorage:", checked);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  };

  // Handle paper details generation
  const handlePaperGenerated = useCallback((link: string | null, details?: Omit<PaperDetails, "link">, showDialog?: boolean) => {
    if (!link) {
      setPaperDetails(null);
      return;
    }

    console.log("Paper generated with showDialog:", showDialog, "showDialogOnLoad:", showDialogOnLoad);

    // Only update paperDetails if needed
    setPaperDetails(prev => {
      if (!prev || prev.link !== link) {
        return {
          link,
          ...details!,
        };
      }
      return prev; // Don't update if it's the same
    });

    // Handle dialog opening with a ref to avoid unnecessary renders
    const shouldOpenDialog = showDialog === true || (showDialog === undefined && showDialogOnLoad === true);
    
    if (shouldOpenDialog && !dialogOpen) {
      console.log("Opening dialog because:", 
        showDialog === true ? "showDialog is true" : "showDialog is undefined and preference is true");
      setDialogOpen(true);
    } else if (!shouldOpenDialog) {
      console.log("Not opening dialog because preference is false");
    }
  }, [dialogOpen, showDialogOnLoad]);

  // Function to open link in new tab
  const openInNewTab = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  // Function to get marking scheme link from question paper link
  const getMarkingSchemeLink = (qpLink: string) => {
    return qpLink.replace("_qp_", "_ms_");
  };

  // Modify the Dialog component to use a better onOpenChange handler
  const handleDialogOpenChange = (open: boolean) => {
    console.log("Dialog open state changed to:", open);
    setDialogOpen(open);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between w-full items-center bg-white dark:bg-primary-foreground">
      {showPinRecommendation && (
        <div className="bg-blue-50 py-3 px-5 flex items-center justify-between w-full sticky top-0 z-10">
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

      <Card className="mx-auto border-none shadow-none !pb-8 w-full">
        <CardContent className="!p-0">
          <h2 className="text-xl font-semibold mb-6 text-center bg-gradient-to-r from-slate-900 to-slate-700 text-white py-3 px-4  shadow-md">
            <span className="text-red-500 font-bold">CAIE</span> IGCSE/A-Level Past Papers Search
          </h2>
        <div className="max-w-xl mx-auto px-7">
        <PaperSearch
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

      <Dialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
      >
        <DialogContent
          className="w-[90%] "
          aria-describedby="paper-details-description"
        >
          <DialogHeader>
            <DialogTitle>Paper Details</DialogTitle>
          </DialogHeader>

          {paperDetails && (
            <div className="space-y-6">
              <div
                id="paper-details-description"
                className="sr-only"
              >
                Details for {paperDetails.subjectName} ({paperDetails.subjectCode}) paper from {paperDetails.session} 20{paperDetails.year}
              </div>
              <div className="bg-muted p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-muted-foreground">Subject:</div>
                  <div className="text-sm font-medium">
                    {paperDetails.subjectName} ({paperDetails.subjectCode})
                  </div>

                  <div className="text-sm text-muted-foreground">Paper Number:</div>
                  <div className="text-sm font-medium">{paperDetails.paperNumber}</div>

                  <div className="text-sm text-muted-foreground">Season:</div>
                  <div className="text-sm font-medium">{paperDetails.session}</div>

                  <div className="text-sm text-muted-foreground">Year:</div>
                  <div className="text-sm font-medium">20{paperDetails.year}</div>

                  <div className="text-sm text-muted-foreground">Paper Code:</div>
                  <div className="text-sm font-medium">
                    {paperDetails.subjectCode}/{paperDetails.paperNumber}/{paperDetails.session}/{paperDetails.year}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                  onClick={() => openInNewTab(paperDetails.link)}
                >
                  Open Question Paper
                  <ExternalLink size={18} />
                </Button>

                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                  onClick={() => openInNewTab(getMarkingSchemeLink(paperDetails.link))}
                >
                  Open Marking Scheme
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
                  className="flex items-center justify-center gap-2 cursor-pointer w-full bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setPaperDetails(null);
                    setIsClearData(true);
                    handleDialogOpenChange(false);
                  }}
                >
                  Clear Data
                  <Trash size={18} />
                </Button>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-center text-muted-foreground">
                    Links will open in new tabs. If you have pop-up blockers enabled, you may need to allow them for this extension.
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-0.5">
                      <Label 
                        htmlFor="auto-show-dialog" 
                        className="text-sm font-medium"
                      >
                        Show dialog on startup
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically show this dialog when valid paper data is found
                      </p>
                    </div>
                    <Switch
                      id="auto-show-dialog"
                      checked={showDialogOnLoad}
                      onCheckedChange={handleDialogPreferenceChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="text-center flex items-center flex-col justify-center gap-2 bg-gray-100 dark:bg-gray-900  p-4 w-full">
        <div className="flex items-center justify-center gap-2 w-full bg-gray-100 dark:bg-gray-900">
          <a
            href="https://www.instagram.com/vectr.vcp/"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit our Instagram"
            className="text-sm font-medium flex items-center gap-1"
          >
            Powered by bestexamhelp.com. Build and maintain by VECTR
            <img
              src="/vectr.png"
              alt="VECTR"
              className="w-5 h-5"
            />
          </a>
          <a
            href="https://github.com/ChinCao"
            target="_blank"
            rel="noopener noreferrer"
            title="Visit source code"
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
