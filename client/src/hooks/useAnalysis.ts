import { useEffect } from "react";
import { getAnalysisStatus } from "../api/analysis";
import { useCaseStore } from "../store/caseStore";

export const useAnalysis = (caseId?: string, enabled = false, onDone?: () => void) => {
  const setAnalysis = useCaseStore((state) => state.setAnalysis);

  useEffect(() => {
    if (!caseId || !enabled) return;

    const timer = window.setInterval(async () => {
      const data = await getAnalysisStatus(caseId);
      setAnalysis(data);
      if (data.status === "DONE" || data.status === "FAILED") {
        window.clearInterval(timer);
        onDone?.();
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [caseId, enabled, onDone, setAnalysis]);
};
