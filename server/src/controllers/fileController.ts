import { Request, Response } from "express";
import { prisma } from "../prisma/client.js";

export const uploadFiles = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (!files.length) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const created = await prisma.$transaction(
    files.map((file) =>
      prisma.uploadedFile.create({
        data: {
          caseId,
          filename: file.originalname,
          fileType: file.mimetype,
          sizeMb: Number((file.size / 1024 / 1024).toFixed(2)),
          storageKey: file.path
        }
      })
    )
  );

  return res.status(201).json(created);
};

export const listFiles = async (req: Request, res: Response) => {
  const caseId = String(req.params.id);
  const files = await prisma.uploadedFile.findMany({
    where: { caseId },
    orderBy: { filename: "asc" }
  });

  return res.json(files);
};
