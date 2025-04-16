import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {PaperSearch} from "@/components/paper-search";
import {ExternalLink, Trash} from "lucide-react";
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
    <div className="container mx-auto p-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Past Paper Search Tool</h1>
        <p className="text-muted-foreground">Find and access Cambridge examination past papers for IGCSE and A-Levels</p>
      </header>

      <Card className="max-w-xl mx-auto">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Search for Papers</h2>
          <PaperSearch
            paperType="qp"
            onLinkGenerated={handlePaperGenerated}
            isClearData={isClearData}
            setIsClearData={setIsClearData}
          />
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent
          className="w-[100%] xl:max-w-xl"
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
                  <ExternalLink size={18} />
                  Open Question Paper
                </Button>

                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                  onClick={() => openInNewTab(getMarkingSchemeLink(paperDetails.link))}
                >
                  <ExternalLink size={18} />
                  Open Marking Scheme
                </Button>

                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
                  onClick={() => {
                    openInNewTab(paperDetails.link);
                    openInNewTab(getMarkingSchemeLink(paperDetails.link));
                  }}
                >
                  <ExternalLink size={18} />
                  Open Both
                </Button>
                <Button
                  className="flex items-center justify-center gap-2 cursor-pointer w-full"
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
                  Links will open in new tabs. If you have pop-up blockers enabled, you may need to allow them for this site.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <a
            href="https://bestexamhelp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium"
          >
            Powered by bestexamhelp.com. Build and maintain by VECTR.
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
