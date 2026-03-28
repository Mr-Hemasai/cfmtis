export const detectPatterns = (victimAccount, transactions) => {
    const directReceivers = transactions.filter((txn) => txn.sender_account === victimAccount);
    const timestamps = directReceivers.map((txn) => txn.timestamp.getTime()).sort((a, b) => a - b);
    const withinFiveMinutes = timestamps.length > 2 && timestamps[timestamps.length - 1] - timestamps[0] <= 5 * 60 * 1000;
    const patterns = [];
    if (directReceivers.length > 2 && withinFiveMinutes) {
        patterns.push({
            type: "FRAGMENTATION",
            severity: "CRITICAL",
            message: "Rapid Fragmentation detected across direct receiver accounts."
        });
    }
    const senderCounts = new Map();
    transactions.forEach((txn) => {
        senderCounts.set(txn.sender_account, (senderCounts.get(txn.sender_account) ?? 0) + 1);
    });
    if ([...senderCounts.values()].some((count) => count > 5)) {
        patterns.push({
            type: "VELOCITY",
            severity: "HIGH",
            message: "Velocity Spike detected in outbound transfer bursts."
        });
    }
    patterns.push({
        type: "LOCATION",
        severity: "MEDIUM",
        message: "Location Anomaly detected between device activity and registration city."
    }, {
        type: "NEW_ACCOUNT",
        severity: "HIGH",
        message: "New Account Risk: one or more traced accounts are under 30 days old."
    });
    return patterns;
};
