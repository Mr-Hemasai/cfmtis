import { freezeAccountRequest, freezeBulkRequest } from "../api/freeze";
import { useCaseStore } from "../store/caseStore";
import { useGraphStore } from "../store/graphStore";

export const useFreeze = () => {
  const activeCase = useCaseStore((state) => state.activeCase);
  const markFrozen = useCaseStore((state) => state.markFrozen);
  const riskData = useCaseStore((state) => state.riskData);
  const markNodeFrozen = useGraphStore((state) => state.markNodeFrozen);

  const freezeAccount = async (accountId: string) => {
    if (!activeCase) return;
    markFrozen(accountId);
    markNodeFrozen(accountId);
    await freezeAccountRequest(activeCase.id, accountId);
  };

  const freezeCritical = async () => {
    if (!activeCase) return;
    await freezeBulkRequest(activeCase.id);
    riskData
      .filter((account) => account.riskLevel === "CRITICAL" && !account.isFrozen)
      .forEach((account) => {
        markFrozen(account.id);
        markNodeFrozen(account.id);
      });
  };

  return { freezeAccount, freezeCritical };
};
