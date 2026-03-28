import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { prisma } from "../prisma/client.js";
import { signToken } from "../utils/jwt.js";

export const login = async (req: Request, res: Response) => {
  const { badgeNumber, password } = req.body as { badgeNumber: string; password: string };
  const officer = await prisma.officer.findUnique({ where: { badgeNumber } });

  if (!officer || !(await bcrypt.compare(password, officer.passwordHash))) {
    return res.status(401).json({ message: "Invalid badge number or password" });
  }

  const token = signToken({
    officerId: officer.id,
    badgeNumber: officer.badgeNumber,
    role: officer.role
  });

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 8 * 60 * 60 * 1000
  });

  return res.json({
    token,
    officer: {
      id: officer.id,
      badgeNumber: officer.badgeNumber,
      name: officer.name,
      rank: officer.rank,
      department: officer.department,
      role: officer.role
    }
  });
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("token");
  return res.status(204).send();
};

export const me = async (req: Request, res: Response) => {
  const officer = (req as Request & { officer?: { officerId: string } }).officer;
  if (!officer) return res.status(401).json({ message: "Not authenticated" });

  const record = await prisma.officer.findUnique({ where: { id: officer.officerId } });
  if (!record) return res.status(404).json({ message: "Officer not found" });

  return res.json({
    id: record.id,
    badgeNumber: record.badgeNumber,
    name: record.name,
    rank: record.rank,
    department: record.department,
    role: record.role
  });
};
