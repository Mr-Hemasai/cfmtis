import { execFileSync } from "node:child_process";
import path from "node:path";
import { logger } from "../utils/logger.js";
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const SCRIPT_PATH = path.resolve(process.cwd(), "python", "analyzer_engine.py");
const runPythonAnalyzer = (mode, filePath) => {
    try {
        const stdout = execFileSync(PYTHON_BIN, [SCRIPT_PATH, mode, filePath], {
            cwd: path.resolve(process.cwd()),
            encoding: "utf8",
            maxBuffer: 20 * 1024 * 1024
        });
        return JSON.parse(stdout);
    }
    catch (error) {
        logger.warn({
            filePath,
            mode,
            error: error instanceof Error ? error.message : String(error)
        }, "Python analyzer unavailable, falling back to TypeScript analyzer");
        return null;
    }
};
export const getPythonParsedDataset = (filePath) => runPythonAnalyzer("parse", filePath);
export const getPythonAnalyzerReport = (filePath) => runPythonAnalyzer("report", filePath);
