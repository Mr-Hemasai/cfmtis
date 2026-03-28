import { prisma } from "../prisma/client.js";
import { getAnalyzerSummary, getBankPerformanceAnalysis, getCaseAnalysisById, getRiskAnalysis } from "../services/analyzerEngine.js";
import { runAnalyzerForUpload } from "../services/analyzerService.js";
export const uploadDataset = async (req, res) => {
    const datasetFile = req.file ?? null;
    const officerId = req.officer?.officerId ?? null;
    if (!datasetFile) {
        return res.status(400).json({ message: "Dataset file is required" });
    }
    if (!officerId) {
        return res.status(401).json({ message: "Officer context missing" });
    }
    const result = await runAnalyzerForUpload(datasetFile.path, officerId);
    return res.status(201).json(result);
};
export const getCaseDetailById = async (req, res) => {
    const caseId = String(req.params.id);
    const analysis = await getCaseAnalysisById(caseId);
    if (!analysis) {
        return res.status(404).json({ message: "Case analysis not found" });
    }
    return res.json(analysis);
};
export const getSummary = async (_req, res) => {
    const summary = await getAnalyzerSummary();
    return res.json(summary);
};
export const getBanks = async (_req, res) => {
    const banks = await getBankPerformanceAnalysis();
    return res.json(banks);
};
export const getRisk = async (_req, res) => {
    const risk = await getRiskAnalysis();
    return res.json(risk);
};
export const getGraphByCase = async (req, res) => {
    const caseId = String(req.params.caseId);
    const analysis = await prisma.caseAnalysis.findUnique({ where: { caseId } });
    if (!analysis) {
        return res.status(404).json({ message: "Graph analysis not found" });
    }
    return res.json(analysis.moneyTrail ?? {});
};
