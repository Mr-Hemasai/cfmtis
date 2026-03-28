import { prisma } from "../prisma/client.js";
export const freezeAccount = async (req, res) => {
    const caseId = String(req.params.id);
    const account = await prisma.tracedAccount.update({
        where: { id: String(req.params.accountId) },
        data: {
            isFrozen: true,
            accountStatus: "FROZEN"
        }
    });
    await prisma.freezeAction.create({
        data: {
            caseId,
            officerId: req.officer.officerId,
            accountNumber: account.accountNumber,
            note: "Single account freeze triggered from case workspace."
        }
    });
    return res.json(account);
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
