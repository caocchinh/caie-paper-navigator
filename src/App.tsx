import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {PaperSearch} from "@/components/paper-search";
import {ExternalLink, Github, Trash, X} from "lucide-react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";

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

  // Load pin recommendation preference from Chrome storage on component mount
  useEffect(() => {
    chrome.storage.local.get(['hidePinRecommendation'], (result) => {
      const isHidden = result.hidePinRecommendation === true;
      setShowPinRecommendation(!isHidden);
    });
  }, []);

  // Handle closing the pin recommendation
  const handleClosePinRecommendation = () => {
    setShowPinRecommendation(false);
    chrome.storage.local.set({ hidePinRecommendation: true });
  };

  // Handle paper details generation
  const handlePaperGenerated = (link: string | null, details?: Omit<PaperDetails, "link">, showDialog: boolean = true) => {
    if (!link) {
      setPaperDetails(null);
      return;
    }

    setPaperDetails({
      link,
      ...details!,
    });

    // Only open the dialog when showDialog is true
    if (showDialog) {
      setDialogOpen(true);
    }
  };

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

  return (
    <div className="mx-auto">
      {showPinRecommendation && (
        <div className="bg-blue-50 p-3 rounded-md flex items-center justify-between">
          <p className="text-sm text-blue-700">
            📌 Pin this extension for better user experience and quick access
          </p>
          <button 
            onClick={handleClosePinRecommendation}
            className="text-blue-700 hover:text-blue-900"
            aria-label="Close recommendation"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <Card className="mx-auto border-none shadow-none">
        <CardContent className="!p-0">
          <h2 className="text-xl font-semibold mb-6 text-center bg-black text-white py-[9px]">
            <span className="text-re">CAIE</span> IGCSE/A-Level Past Papers Search
          </h2>
        <div className="max-w-xl mx-auto px-7">
        <PaperSearch
            paperType="qp"
            onLinkGenerated={handlePaperGenerated}
            isClearData={isClearData}
            setIsClearData={setIsClearData}
          />
        </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent
          className="w-[90%]"
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
                    setDialogOpen(false);
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
                    setDialogOpen(false);
                  }}
                >
                  Clear Data
                  <Trash size={18} />
                </Button>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-center text-muted-foreground">
                  Links will open in new tabs. If you have pop-up blockers enabled, you may need to allow them for this extension.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="my-8 text-center">
        <div className="flex items-center justify-center gap-2">
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
      </div>
    </div>
  );
}

export default App;
