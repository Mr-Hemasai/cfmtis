import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { getCase } from "../api/cases";
import { getFiles, getGraph, getRecovery, getRisk } from "../api/analysis";
import { NavTabs } from "../components/layout/NavTabs";
import { Topbar } from "../components/layout/Topbar";
import { useCaseStore } from "../store/caseStore";
import { useGraphStore } from "../store/graphStore";

export const CaseWorkspacePage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeCase = useCaseStore((state) => state.activeCase);
  const setActiveCase = useCaseStore((state) => state.setActiveCase);
  const setRiskData = useCaseStore((state) => state.setRiskData);
  const setRecoveryData = useCaseStore((state) => state.setRecoveryData);
  const setPatternAlerts = useCaseStore((state) => state.setPatternAlerts);
  const setUploadedFiles = useCaseStore((state) => state.setUploadedFiles);
  const setGraph = useGraphStore((state) => state.setGraph);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const caseData = await getCase(id);
      setActiveCase({
        id: caseData.id,
        complaintId: caseData.complaintId,
        fraudType: caseData.fraudType,
        fraudAmount: caseData.fraudAmount,
        victimAccount: caseData.victimAccount,
        victimName: caseData.victimName,
        victimMobile: caseData.victimMobile,
        bankName: caseData.bankName,
        fraudTimestamp: caseData.fraudTimestamp,
        description: caseData.description,
        status: caseData.status,
        analysisStatus: caseData.analysisStatus
      });
      const [files, graph, risk, recovery] = await Promise.all([
        getFiles(id).catch(() => []),
        getGraph(id).catch(() => ({ nodes: [], edges: [], alerts: [], summary: null })),
        getRisk(id).catch(() => ({ items: [] })),
        getRecovery(id).catch(() => ({ totals: null, accounts: [], log: [] }))
      ]);
      setUploadedFiles(files);
      setGraph({ nodes: graph.nodes ?? [], edges: graph.edges ?? [], summary: graph.summary ?? null });
      setPatternAlerts(graph.alerts ?? []);
      setRiskData(risk.items ?? []);
      setRecoveryData(recovery);
      setLoading(false);
    };

    load();
  }, [id, setActiveCase, setGraph, setPatternAlerts, setRecoveryData, setRiskData, setUploadedFiles]);

  const analysisDone = useMemo(() => activeCase?.analysisStatus === "DONE", [activeCase?.analysisStatus]);
  const tab = location.pathname.split("/").pop();

  useEffect(() => {
    if (location.pathname === `/case/${id}`) {
      navigate(`/case/${id}/complaint`, { replace: true });
    }
  }, [id, location.pathname, navigate]);

  if (loading || !activeCase) {
    return (
      <div className="grid min-h-screen place-items-center bg-deep font-mono text-secondary">
        Loading active case workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep">
      <Topbar caseId={activeCase.complaintId} />
      <NavTabs caseId={id} analysisDone={analysisDone} />
      <main className="px-6 pb-6 pt-[110px]">
        <Outlet context={{ caseId: id, activeCase, tab, analysisDone }} />
      </main>
    </div>
  );
};
