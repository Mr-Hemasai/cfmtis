import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { analyzeCase as analyzeCaseApi, getFiles, getGraph, getRecovery, getRisk, uploadFiles } from "../api/analysis";
import { updateCase } from "../api/cases";
import { ComplaintForm } from "../components/complaint/ComplaintForm";
import { FileList } from "../components/complaint/FileList";
import { UploadZone } from "../components/complaint/UploadZone";
import { Button } from "../components/ui/Button";
import { useAnalysis } from "../hooks/useAnalysis";
import { useCaseStore } from "../store/caseStore";
import { useGraphStore } from "../store/graphStore";

type Context = {
  caseId: string;
  activeCase: Record<string, any>;
};

export const CaseComplaintTab = () => {
  const { caseId, activeCase } = useOutletContext<Context>();
  const navigate = useNavigate();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [polling, setPolling] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysis = useCaseStore((state) => state.analysis);
  const uploadedFiles = useCaseStore((state) => state.uploadedFiles);
  const setUploadedFiles = useCaseStore((state) => state.setUploadedFiles);
  const setAnalysis = useCaseStore((state) => state.setAnalysis);
  const setRiskData = useCaseStore((state) => state.setRiskData);
  const setRecoveryData = useCaseStore((state) => state.setRecoveryData);
  const setPatternAlerts = useCaseStore((state) => state.setPatternAlerts);
  const setGraph = useGraphStore((state) => state.setGraph);
  const mergedFiles = useMemo(() => {
    const persisted = (uploadedFiles as Array<Record<string, unknown>>).map((file, index) => ({
      id: String(file.id ?? `uploaded-${index}`),
      filename: String(file.filename ?? ""),
      sizeMb: Number(file.sizeMb ?? 0),
      fileType: String(file.fileType ?? "SERVER")
    }));
    const pending = pendingFiles
      .filter((file) => !persisted.some((saved) => saved.filename === file.name))
      .map((file, index) => ({
        id: `pending-${file.name}-${file.size}-${index}`,
        filename: file.name,
        sizeMb: file.size / 1024 / 1024,
        fileType: file.type || "LOCAL"
      }));

    return [...persisted, ...pending];
  }, [pendingFiles, uploadedFiles]);

  useAnalysis(caseId, polling, async (statusData) => {
    if (statusData.status === "FAILED") {
      setPolling(false);
      setAnalysisError(statusData.error ?? "Analysis failed for the uploaded document.");
      return;
    }

    const [files, graph, risk, recovery] = await Promise.all([
      getFiles(caseId),
      getGraph(caseId),
      getRisk(caseId),
      getRecovery(caseId)
    ]);
    setUploadedFiles(files);
    setGraph({ nodes: graph.nodes, edges: graph.edges, summary: graph.summary });
    setPatternAlerts(graph.alerts);
    setRiskData(risk.items);
    setRecoveryData(recovery);
    setPolling(false);
    navigate(`/case/${caseId}/graph`);
  });

  const handleSave = async (values: Record<string, string>) => {
    await updateCase(caseId, values);
  };

  const handleAnalyze = async () => {
    setAnalysisError(null);
    if (pendingFiles.length) {
      const uploaded = await uploadFiles(caseId, pendingFiles);
      setUploadedFiles(uploaded);
      setPendingFiles([]);
    }
    const response = await analyzeCaseApi(caseId);
    setAnalysis({ status: response.status, steps: response.steps, progress: 8, currentStep: response.steps[0] });
    setPolling(true);
  };

  return (
    <div className="grid gap-6">
      <ComplaintForm initialValues={activeCase} onSubmit={handleSave} />
      <section className="panel-card p-6">
        <div className="section-header">Upload Evidence Files</div>
        <UploadZone onFiles={(files) => setPendingFiles(files)} />
        <FileList files={mergedFiles} />
        {analysisError && (
          <div className="mt-4 rounded-[4px] border border-red/40 bg-red/8 px-4 py-3 text-sm text-red">
            {analysisError}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={() => setPendingFiles([])}>Clear</Button>
          <Button variant="primary" onClick={handleAnalyze}>Analyze &amp; Build Money Trail</Button>
        </div>
      </section>

      {polling && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#02050ae6]">
          <div className="panel-card w-[540px] p-8">
            <div className="font-cond text-2xl uppercase tracking-[0.24em] text-cyan">Analysis Running</div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-card">
              <div className="h-full bg-gradient-to-r from-blue to-cyan transition-all duration-700" style={{ width: `${analysis.progress}%` }} />
            </div>
            <div className="mt-4 font-mono text-sm text-primary">{analysis.currentStep || "Parsing transaction records..."}</div>
            <div className="mt-6 grid gap-2 text-xs text-secondary">
              {(analysis.steps.length ? analysis.steps : [
                "Parsing transaction records...",
                "Mapping sender/receiver account pairs...",
                "Building transaction graph structure...",
                "Detecting fragmentation patterns...",
                "Calculating risk scores per node..."
              ]).map((step) => (
                <div key={step}>{step}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
