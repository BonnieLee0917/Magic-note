const API_URL = "https://api-magicnote.xiaomengli.online";
const API_TOKEN = "mn-2026-secret-token";

async function apiCall(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-token": API_TOKEN,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export type AnalysisResult = {
  title: string;
  summary: string;
  keyInsights: string[];
  tags: string[];
  domain: string;
  followUpQuestions: string[];
};

export type LocalizedResult = {
  zh: AnalysisResult;
  en: AnalysisResult;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type LocalizedQuiz = {
  zh: { questions: QuizQuestion[] };
  en: { questions: QuizQuestion[] };
};

export async function analyzeScreenshot(base64Image: string): Promise<LocalizedResult> {
  return apiCall("/api/analyze/screenshot", { image: base64Image });
}

export async function analyzeLink(url: string): Promise<LocalizedResult> {
  return apiCall("/api/analyze/link", { url });
}

export async function analyzeText(text: string): Promise<LocalizedResult> {
  return apiCall("/api/analyze/text", { text });
}

export async function generateQuiz(card: {
  title: string;
  summary: string;
  tags: string[];
  domain: string;
}): Promise<LocalizedQuiz> {
  return apiCall("/api/quiz/generate", card);
}
