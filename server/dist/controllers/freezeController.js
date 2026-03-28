import { prisma } from "../prisma/client.js";
export const freezeAccount = async (req, res) => {
    const caseId = String(req.params.id);
    const accountId = String(req.params.accountId);
    const tracedAccount = (await prisma.tracedAccount.findFirst({
        where: {
            caseId,
            OR: [{ id: accountId }, { accountNumber: accountId }]
        }
    })) ?? null;
    const account = tracedAccount
        ? await prisma.tracedAccount.update({
            where: { id: tracedAccount.id },
            data: {
                isFrozen: true,
                accountStatus: "FROZEN"
            }
        })
        : null;
    const accountNumber = account?.accountNumber ?? accountId;
    await prisma.freezeAction.create({
        data: {
            caseId,
            officerId: req.officer.officerId,
            accountNumber,
            note: account
                ? "Single account freeze triggered from case workspace."
                : "Analyzer graph freeze requested for account not materialized in traced accounts."
        }
    });
    return res.json(account ?? {
        id: accountId,
        accountNumber,
        isFrozen: true,
        accountStatus: "FROZEN",
        source: "ANALYZER_GRAPH"
    });
};
export const freezeBulk = async (req, res) => {
    const caseId = String(req.params.id);
    const criticalAccounts = await prisma.tracedAccount.findMany({
        where: {
            caseId,
            riskLevel: "CRITICAL",
            isFrozen: false
        }
    });
    await prisma.tracedAccount.updateMany({
        where: {
            caseId,
            riskLevel: "CRITICAL",
            isFrozen: false
        },
        data: {
            isFrozen: true,
            accountStatus: "FROZEN"
        }
    });
    if (criticalAccounts.length) {
        await prisma.freezeAction.createMany({
            data: criticalAccounts.map((account) => ({
                caseId,
                officerId: req.officer.officerId,
                accountNumber: account.accountNumber,
                note: "Bulk critical freeze action"
            }))
        });
    }
    return res.json({ frozen: criticalAccounts.length });
};
export const freezeLog = async (req, res) => {
    const caseId = String(req.params.id);
    const log = await prisma.freezeAction.findMany({
        where: { caseId },
        include: { officer: true },
        orderBy: { timestamp: "desc" }
    });
    return res.json(log);
};
