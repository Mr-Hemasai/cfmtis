import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

const caseSchema = z.object({
  complaintId: z.string().min(5).optional(),
  fraudType: z.string(),
  fraudAmount: z.coerce.number(),
  victimAccount: z.string(),
  victimName: z.string(),
  victimMobile: z.string(),
  bankName: z.string(),
  fraudTimestamp: z.string().datetime().or(z.string()),
  description: z.string(),
  status: z.enum(["ACTIVE", "PENDING", "CLOSED", "ARCHIVED"]).optional()
});

export const listCases = async (_req: Request, res: Response) => {
  const cases = await prisma.case.findMany({
    include: { officer: true, accounts: true },
    orderBy: { createdAt: "desc" }
  });

  return res.json({
    items: cases.map((item) => ({
      id: item.id,
      complaintId: item.complaintId,
      victimName: item.victimName,
      fraudAmount: item.fraudAmount,
      fraudType: item.fraudType,
      status: item.status,
      riskLevel:
        item.accounts.some((account: { riskLevel: string }) => account.riskLevel === "CRITICAL")
          ? "CRITICAL"
          : item.accounts.some((account: { riskLevel: string }) => account.riskLevel === "HIGH")
            ? "HIGH"
            : "MEDIUM",
      analysisStatus: item.analysisStatus,
      createdAt: item.createdAt,
      officer: {
        name: item.officer.name,
        rank: item.officer.rank
      }
    }))
  });
};

export const createCase = async (req: AuthenticatedRequest, res: Response) => {
  const data = caseSchema.parse(req.body);
  const complaintId =
    data.complaintId ??
    `CMP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}${String(
      new Date().getDate()
    ).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const record = await prisma.case.create({
    data: {
      ...data,
      complaintId,
      fraudTimestamp: new Date(String(data.fraudTimestamp)),
      officerId: req.officer!.officerId
    }
  });

  return res.status(201).json(record);
};

export const getCase = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
  const record = await prisma.case.findUnique({
    where: { id: caseId },
    include: {
      officer: true,
      files: true,
      accounts: true,
      patternAlerts: true
    }
  });

  if (!record) return res.status(404).json({ message: "Case not found" });
  return res.json(record);
};

export const updateCase = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
  const data = caseSchema.partial().parse(req.body);
  const record = await prisma.case.update({
    where: { id: caseId },
    data: {
      ...data,
      fraudTimestamp: data.fraudTimestamp ? new Date(String(data.fraudTimestamp)) : undefined
    }
  });

  return res.json(record);
};

export const deleteCase = async (req: Request, res: Response) => {
  await prisma.case.delete({ where: { id: String(req.params.id) } });
  return res.status(204).send();
};
