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
