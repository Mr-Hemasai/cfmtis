import { Router } from "express";
import {
  freezeAccount,
  freezeBulk,
  freezeLog
} from "../controllers/freezeController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/:id/freeze/:accountId", requireRole("ADMIN", "OFFICER"), freezeAccount);
router.post("/:id/freeze/bulk", requireRole("ADMIN", "OFFICER"), freezeBulk);
router.get("/:id/freeze-log", freezeLog);

export default router;
