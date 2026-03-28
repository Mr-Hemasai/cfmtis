import { Router } from "express";
import { listFiles, uploadFiles } from "../controllers/fileController.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.use(requireAuth);
router.post("/:id/files", upload.array("files"), uploadFiles);
router.get("/:id/files", listFiles);

export default router;
