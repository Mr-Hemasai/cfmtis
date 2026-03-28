import { api } from "./client";

export const uploadFiles = async (caseId: string, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const { data } = await api.post(`/cases/${caseId}/files`, formData);
  return data;
};

export const analyzeCase = async (caseId: string) => {
  const { data } = await api.post(`/cases/${caseId}/analyze`);
  return data;
};

export const getAnalysisStatus = async (caseId: string) => {
  const { data } = await api.get(`/cases/${caseId}/status`);
  return data;
};

export const getGraph = async (caseId: string) => {
  const { data } = await api.get(`/cases/${caseId}/graph`);
  return data;
};

export const getRisk = async (caseId: string) => {
  const { data } = await api.get(`/cases/${caseId}/risk`);
  return data;
};

export const getRecovery = async (caseId: string) => {
  const { data } = await api.get(`/cases/${caseId}/recovery`);
  return data;
};

export const getFiles = async (caseId: string) => {
  const { data } = await api.get(`/cases/${caseId}/files`);
  return data;
};
