import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../utils/env.js";
fs.mkdirSync(path.resolve(env.UPLOAD_DIR), { recursive: true });
export const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, path.resolve(env.UPLOAD_DIR)),
        filename: (_req, file, cb) => {
            const name = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
            cb(null, name);
        }
    }),
    limits: {
        fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024
    }
});
