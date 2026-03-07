export type AiReportSection = {
  title: string;
  body: string;
};

export type AiReportResponse = {
  accountId: string;
  identifier: string;
  createdAtIso: string;
  autoUpdateFrequencyDays: number;
  strengths: AiReportSection[];
  areasForImprovement: AiReportSection[];
  actionableRecommendations: AiReportSection[];
};
