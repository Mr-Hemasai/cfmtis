const normalizeAccount = (value) => String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
const inferNodeType = (depth, withdrawalDetected) => {
    if (depth === 0)
        return "victim";
    if (withdrawalDetected || depth >= 3)
        return "suspect";
    return "mule";
};
export const getNodeType = (riskLevel, chainDepth, isFrozen, isVictim) => {
    if (isVictim)
        return "Victim";
    if (isFrozen)
        return "Frozen";
    if (riskLevel === "CRITICAL")
        return "Suspect";
    if (riskLevel === "HIGH")
        return "Mule";
    if (chainDepth >= 3)
        return "Transfer";
    return "Recovered";
};
export const buildMoneyTrailGraph = ({ victimAccount, transfers, withdrawals, smallTransactions, fallbackBankName }) => {
    const rootAccount = normalizeAccount(victimAccount) || "UNKNOWN-VICTIM";
    const normalizedTransfers = transfers
        .map((transfer) => ({
        id: transfer.txnId,
        from: normalizeAccount(transfer.senderAccount),
        to: normalizeAccount(transfer.receiverAccount),
        amount: Number(transfer.amount ?? 0),
        timestamp: transfer.timestamp,
        referenceId: transfer.referenceId,
        sourceSheet: "Money Transfer",
        layer: transfer.layerLevel ?? undefined,
        inferred: false,
        fromBank: transfer.senderBankName,
        toBank: transfer.receiverBankName
    }))
        .filter((transfer) => transfer.from && transfer.to && transfer.amount > 0);
    const bankByAccount = new Map();
    normalizedTransfers.forEach((transfer) => {
        if (transfer.fromBank)
            bankByAccount.set(transfer.from, transfer.fromBank);
        if (transfer.toBank)
            bankByAccount.set(transfer.to, transfer.toBank);
    });
    withdrawals.forEach((withdrawal) => {
        const accountNumber = normalizeAccount(withdrawal.accountNumber);
        if (accountNumber && withdrawal.bankName) {
            bankByAccount.set(accountNumber, withdrawal.bankName);
        }
    });
    if (!normalizedTransfers.length) {
        const inferredAccounts = new Map();
        withdrawals.forEach((withdrawal) => {
            const accountNumber = normalizeAccount(withdrawal.accountNumber);
            if (!accountNumber)
                return;
            const current = inferredAccounts.get(accountNumber) ?? { amount: 0, withdrawalDetected: false };
            current.amount += Number(withdrawal.amount ?? 0);
            current.withdrawalDetected = true;
            inferredAccounts.set(accountNumber, current);
        });
        smallTransactions.forEach((transaction) => {
            const accountNumber = normalizeAccount(transaction.accountNumber);
            if (!accountNumber)
                return;
            const current = inferredAccounts.get(accountNumber) ?? { amount: 0, withdrawalDetected: false };
            current.amount += Number(transaction.amount ?? 0);
            inferredAccounts.set(accountNumber, current);
        });
        const edges = [...inferredAccounts.entries()].map(([account, details], index) => ({
            id: `inferred-${index + 1}`,
            from: rootAccount,
            to: account,
            amount: details.amount,
            timestamp: null,
            sourceSheet: "Inferred Relationship",
            inferred: true
        }));
        const nodes = [
            {
                id: rootAccount,
                accountNumber: rootAccount,
                bank: fallbackBankName ?? bankByAccount.get(rootAccount) ?? "Unknown Bank",
                type: "victim",
                depth: 0,
                incomingCount: 0,
                outgoingCount: edges.length,
                totalIncoming: 0,
                totalOutgoing: edges.reduce((sum, edge) => sum + edge.amount, 0),
                withdrawalDetected: false,
                inferred: true
            },
            ...[...inferredAccounts.entries()].map(([account, details]) => ({
                id: account,
                accountNumber: account,
                bank: bankByAccount.get(account) ?? fallbackBankName ?? "Unknown Bank",
                type: inferNodeType(1, details.withdrawalDetected),
                depth: 1,
                incomingCount: 1,
                outgoingCount: 0,
                totalIncoming: details.amount,
                totalOutgoing: 0,
                withdrawalDetected: details.withdrawalDetected,
                inferred: true
            }))
        ];
        return {
            nodes,
            edges,
            rootAccount,
            maxDepth: nodes.length > 1 ? 1 : 0,
            graphMode: "RELATIONSHIP_FALLBACK"
        };
    }
    const adjacency = new Map();
    const incoming = new Map();
    normalizedTransfers.forEach((transfer) => {
        adjacency.set(transfer.from, [...(adjacency.get(transfer.from) ?? []), transfer]);
        incoming.set(transfer.to, [...(incoming.get(transfer.to) ?? []), transfer]);
    });
    const victimInGraph = normalizedTransfers.some((transfer) => transfer.from === rootAccount || transfer.to === rootAccount);
    const fallbackRoot = normalizedTransfers.find((transfer) => !incoming.has(transfer.from))?.from ?? normalizedTransfers[0]?.from ?? rootAccount;
    const selectedRoot = victimInGraph ? rootAccount : fallbackRoot;
    const visited = new Set();
    const depthMap = new Map([[selectedRoot, selectedRoot === rootAccount ? 0 : 1]]);
    const queue = [selectedRoot];
    while (queue.length) {
        const account = queue.shift();
        if (visited.has(account))
            continue;
        visited.add(account);
        for (const edge of adjacency.get(account) ?? []) {
            const nextDepth = (depthMap.get(account) ?? 0) + 1;
            const currentDepth = depthMap.get(edge.to);
            if (currentDepth === undefined || nextDepth < currentDepth) {
                depthMap.set(edge.to, nextDepth);
            }
            if (!visited.has(edge.to)) {
                queue.push(edge.to);
            }
        }
    }
    const reachableAccounts = new Set([...depthMap.keys(), selectedRoot]);
    const edges = normalizedTransfers.filter((transfer) => reachableAccounts.has(transfer.from) && reachableAccounts.has(transfer.to));
    const nodes = [...reachableAccounts].map((account) => {
        const incomingEdges = edges.filter((edge) => edge.to === account);
        const outgoingEdges = edges.filter((edge) => edge.from === account);
        const withdrawalDetected = withdrawals.some((withdrawal) => normalizeAccount(withdrawal.accountNumber) === account);
        const depth = account === rootAccount ? 0 : depthMap.get(account) ?? 1;
        return {
            id: account,
            accountNumber: account,
            bank: bankByAccount.get(account) ?? fallbackBankName ?? "Unknown Bank",
            type: account === rootAccount ? "victim" : inferNodeType(depth, withdrawalDetected),
            depth,
            incomingCount: incomingEdges.length,
            outgoingCount: outgoingEdges.length,
            totalIncoming: incomingEdges.reduce((sum, edge) => sum + edge.amount, 0),
            totalOutgoing: outgoingEdges.reduce((sum, edge) => sum + edge.amount, 0),
            withdrawalDetected,
            inferred: false
        };
    });
    return {
        nodes,
        edges,
        rootAccount,
        maxDepth: Math.max(...nodes.map((node) => node.depth), 0),
        graphMode: "TRANSFER"
    };
};
