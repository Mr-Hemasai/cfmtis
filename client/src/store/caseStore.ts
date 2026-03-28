import { create } from "zustand";
import { CaseRecord, CaseSummary, PatternAlert, RecoveryTotals, RiskAccount } from "../types";

type CaseState = {
  cases: CaseSummary[];
  activeCase: CaseRecord | null;
  riskData: RiskAccount[];
  recoveryData: {
    totals: RecoveryTotals | null;
    accounts: Array<{ accountNumber: string; balance: number; status: string }>;
    log: Array<{ timestamp: string; level: string; message: string }>;
  };
  patternAlerts: PatternAlert[];
  analysis: { status: string; progress: number; currentStep: string; steps: string[] };
  uploadedFiles: Array<Record<string, unknown>>;
  frozenAccounts: Set<string>;
  setCases: (cases: CaseSummary[]) => void;
  setActiveCase: (record: CaseRecord) => void;
  setRiskData: (items: RiskAccount[]) => void;
  setRecoveryData: (payload: CaseState["recoveryData"]) => void;
  setPatternAlerts: (alerts: PatternAlert[]) => void;
  setAnalysis: (analysis: Partial<CaseState["analysis"]>) => void;
  setUploadedFiles: (files: Array<Record<string, unknown>>) => void;
  markFrozen: (accountId: string) => void;
};

export const useCaseStore = create<CaseState>((set) => ({
  cases: [],
  activeCase: null,
  riskData: [],
  recoveryData: { totals: null, accounts: [], log: [] },
  patternAlerts: [],
  analysis: { status: "PENDING", progress: 0, currentStep: "", steps: [] },
  uploadedFiles: [],
  frozenAccounts: new Set(),
  setCases: (cases) => set({ cases }),
  setActiveCase: (record) => set({ activeCase: record }),
  setRiskData: (items) => set({ riskData: items }),
  setRecoveryData: (payload) => set({ recoveryData: payload }),
  setPatternAlerts: (alerts) => set({ patternAlerts: alerts }),
  setAnalysis: (analysis) =>
    set((state) => ({ analysis: { ...state.analysis, ...analysis } })),
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  markFrozen: (accountId) =>
    set((state) => {
      const next = new Set(state.frozenAccounts);
      next.add(accountId);
      const frozenAccount = state.riskData.find((item) => item.id === accountId);
      const nextRecoveryTotals = state.recoveryData.totals
        ? {
            ...state.recoveryData.totals,
            frozen:
              state.recoveryData.totals.frozen +
              (frozenAccount && !frozenAccount.isFrozen ? frozenAccount.currentBalance : 0)
          }
        : null;

      return {
        frozenAccounts: next,
        riskData: state.riskData.map((item) =>
          item.id === accountId ? { ...item, isFrozen: true, accountStatus: "FROZEN" } : item
        ),
        recoveryData: {
          ...state.recoveryData,
          totals: nextRecoveryTotals,
          accounts: state.recoveryData.accounts.map((item) =>
            frozenAccount && item.accountNumber === frozenAccount.accountNumber
              ? { ...item, status: "FROZEN" }
              : item
          )
        }
      };
    })
}));
