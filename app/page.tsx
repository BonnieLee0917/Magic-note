"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AnalysisResult,
  LocalizedResult,
  LocalizedQuiz,
  QuizQuestion,
  analyzeLink,
  analyzeScreenshot,
  analyzeText,
  generateQuiz,
} from "./lib/api";
import { Lang, t, TKey } from "./i18n";

type NavKey = "Inbox" | "Library" | "Pensieve" | "Quiz" | "Map" | "Profile";
type InputMode = "text" | "link" | "screenshot";
type Theme = "light" | "dark";
type PensieveFilter = "today" | "starred";
type ReviewAction = "remember" | "fuzzy" | "forgot";

type Annotation = {
  id: string;
  type: 'highlight' | 'note' | 'highlight_note';
  highlightText?: string;
  note?: string;
  text?: string; // legacy
  createdAt: string;
};

type ReviewSchedule = {
  nextReviewAt: string;
  interval: number;
  level: number;
};

type StoredCard = {
  id: string;
  sourceType: InputMode;
  createdAt: string;
  zh: AnalysisResult;
  en: AnalysisResult;
  isPensieve: boolean;
  annotations: Annotation[];
  reviewSchedule: ReviewSchedule;
  rawContent?: string;
  sourceUrl?: string;
};

const STORAGE_KEY = "magic-note-cards";
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

const EMPTY_RESULT: AnalysisResult = {
  title: "",
  summary: "",
  keyInsights: [],
  tags: [],
  domain: "",
  followUpQuestions: [],
};

const navItems: Array<{ key: NavKey; label: TKey }> = [
  { key: "Inbox", label: "navInbox" },
  { key: "Library", label: "navLibrary" },
  { key: "Pensieve", label: "navPensieve" },
  { key: "Quiz", label: "navQuiz" },
  { key: "Map", label: "navMap" },
  { key: "Profile", label: "navProfile" },
];

const headerMap: Record<NavKey, TKey> = {
  Inbox: "headerInbox",
  Library: "headerLibrary",
  Pensieve: "headerPensieve",
  Quiz: "headerQuiz",
  Map: "headerMap",
  Profile: "headerProfile",
};

function getDefaultSchedule(createdAt?: string): ReviewSchedule {
  const next = new Date(createdAt ?? Date.now());
  next.setDate(next.getDate() + REVIEW_INTERVALS[0]);
  return {
    nextReviewAt: next.toISOString(),
    interval: REVIEW_INTERVALS[0],
    level: 0,
  };
}

function coerceResult(value: unknown): AnalysisResult {
  if (!value || typeof value !== "object") return EMPTY_RESULT;
  const data = value as Partial<AnalysisResult>;
  return {
    title: typeof data.title === "string" ? data.title : "",
    summary: typeof data.summary === "string" ? data.summary : "",
    keyInsights: Array.isArray(data.keyInsights) ? data.keyInsights.filter((item): item is string => typeof item === "string") : [],
    tags: Array.isArray(data.tags) ? data.tags.filter((item): item is string => typeof item === "string") : [],
    domain: typeof data.domain === "string" ? data.domain : "",
    followUpQuestions: Array.isArray(data.followUpQuestions)
      ? data.followUpQuestions.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function migrateCard(raw: unknown): StoredCard | null {
  if (!raw || typeof raw !== "object") return null;
  const card = raw as Record<string, unknown>;
  const legacy = coerceResult(card);
  const zh = coerceResult(card.zh ?? legacy);
  const en = coerceResult(card.en ?? legacy);
  const createdAt = typeof card.createdAt === "string" ? card.createdAt : new Date().toISOString();

  const annotations = Array.isArray(card.annotations)
    ? card.annotations
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Record<string, unknown>;
          // Support legacy { text, createdAt } format
          if (typeof entry.text === "string" && !entry.type) {
            return {
              id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
              type: 'note' as const,
              note: entry.text,
              createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
            };
          }
          return {
            id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
            type: (entry.type === 'highlight' || entry.type === 'note' || entry.type === 'highlight_note') ? entry.type : 'note',
            highlightText: typeof entry.highlightText === "string" ? entry.highlightText : undefined,
            note: typeof entry.note === "string" ? entry.note : (typeof entry.text === "string" ? entry.text : undefined),
            createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
          } as Annotation;
        })
        .filter((item): item is Annotation => Boolean(item))
    : [];

  const reviewScheduleSource = card.reviewSchedule as Partial<ReviewSchedule> | undefined;
  const reviewSchedule: ReviewSchedule = {
    nextReviewAt: typeof reviewScheduleSource?.nextReviewAt === "string"
      ? reviewScheduleSource.nextReviewAt
      : getDefaultSchedule(createdAt).nextReviewAt,
    interval: typeof reviewScheduleSource?.interval === "number" ? reviewScheduleSource.interval : REVIEW_INTERVALS[0],
    level: typeof reviewScheduleSource?.level === "number" ? reviewScheduleSource.level : 0,
  };

  return {
    id: typeof card.id === "string" ? card.id : crypto.randomUUID(),
    sourceType: card.sourceType === "link" || card.sourceType === "screenshot" ? card.sourceType : "text",
    createdAt,
    zh,
    en,
    isPensieve: Boolean(card.isPensieve) || annotations.length > 0,
    annotations,
    reviewSchedule,
    rawContent: typeof card.rawContent === "string" ? card.rawContent : undefined,
    sourceUrl: typeof card.sourceUrl === "string" ? card.sourceUrl : undefined,
  };
}

function getLocalizedCard(card: StoredCard, lang: Lang): AnalysisResult {
  return lang === "zh" ? card.zh : card.en;
}

function buildNextSchedule(current: ReviewSchedule, action: ReviewAction): ReviewSchedule {
  const now = new Date();
  let level = current.level;
  if (action === "remember") level = Math.min(current.level + 1, REVIEW_INTERVALS.length - 1);
  if (action === "forgot") level = 0;
  const interval = REVIEW_INTERVALS[level];
  now.setDate(now.getDate() + interval);
  return { nextReviewAt: now.toISOString(), interval, level };
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [lang, setLang] = useState<Lang>("zh");
  const [activeNav, setActiveNav] = useState<NavKey>("Inbox");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<StoredCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quiz, setQuiz] = useState<LocalizedQuiz | null>(null);
  const [quizCardTitle, setQuizCardTitle] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [pensieveFilter, setPensieveFilter] = useState<PensieveFilter>("today");
  const [annotationDraft, setAnnotationDraft] = useState("");
  const [activeAnnotationCardId, setActiveAnnotationCardId] = useState<string | null>(null);
  const [pensieveReviewIndex, setPensieveReviewIndex] = useState(0);
  const [readingCardId, setReadingCardId] = useState<string | null>(null);
  const [highlightTooltip, setHighlightTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [highlightNoteInput, setHighlightNoteInput] = useState<{ text: string; note: string } | null>(null);
  const [clickedHighlightId, setClickedHighlightId] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("magic-note-theme") as Theme) || "dark";
    const savedLang = (localStorage.getItem("magic-note-lang") as Lang) || "zh";
    const rawCards = localStorage.getItem(STORAGE_KEY);
    const parsedCards = rawCards ? JSON.parse(rawCards) : [];
    const migratedCards = Array.isArray(parsedCards) ? parsedCards.map(migrateCard).filter((item): item is StoredCard => Boolean(item)) : [];

    setTheme(savedTheme);
    setLang(savedLang);
    setCards(migratedCards);
    setSelectedCardId(migratedCards[0]?.id ?? null);
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.lang = savedLang;
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards, mounted]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("magic-note-theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }

  function toggleLang() {
    const nextLang = lang === "zh" ? "en" : "zh";
    setLang(nextLang);
    localStorage.setItem("magic-note-lang", nextLang);
    document.documentElement.lang = nextLang;
  }

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null,
    [cards, selectedCardId],
  );

  const dueReviewCards = useMemo(
    () => cards.filter((card) => card.isPensieve && new Date(card.reviewSchedule.nextReviewAt).getTime() <= Date.now()),
    [cards],
  );

  const pensieveCards = useMemo(() => cards.filter((card) => card.isPensieve), [cards]);

  useEffect(() => {
    if (pensieveReviewIndex >= dueReviewCards.length) {
      setPensieveReviewIndex(Math.max(dueReviewCards.length - 1, 0));
    }
  }, [dueReviewCards.length, pensieveReviewIndex]);

  const currentReviewCard = dueReviewCards[pensieveReviewIndex] ?? null;

  const dashboard = useMemo(() => {
    const domainCount = new Map<string, number>();
    cards.forEach((card) => {
      const domain = getLocalizedCard(card, lang).domain || t("labelNoDomain", lang);
      domainCount.set(domain, (domainCount.get(domain) ?? 0) + 1);
    });

    const topDomain = Array.from(domainCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? t("labelNoDomain", lang);
    const allTags = Array.from(new Set(cards.flatMap((card) => getLocalizedCard(card, lang).tags))).slice(0, 6);

    return {
      totalCards: cards.length,
      reviewCount: dueReviewCards.length,
      quizReady: cards.length,
      topDomain,
      tags: allTags,
    };
  }, [cards, dueReviewCards.length, lang]);

  const mapGroups = useMemo(() => {
    const grouped = new Map<string, StoredCard[]>();
    cards.forEach((card) => {
      const key = getLocalizedCard(card, lang).domain || "General";
      grouped.set(key, [...(grouped.get(key) ?? []), card]);
    });
    return Array.from(grouped.entries());
  }, [cards, lang]);

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      let result: LocalizedResult;
      if (inputMode === "text") {
        if (!textInput.trim()) throw new Error(t("errorPasteText", lang));
        result = await analyzeText(textInput.trim());
      } else if (inputMode === "link") {
        if (!linkInput.trim()) throw new Error(t("errorEnterLink", lang));
        result = await analyzeLink(linkInput.trim());
      } else {
        if (!imageBase64) throw new Error(t("errorSelectImage", lang));
        result = await analyzeScreenshot(imageBase64);
      }

      const newCard: StoredCard = {
        id: crypto.randomUUID(),
        sourceType: inputMode,
        createdAt: new Date().toISOString(),
        zh: coerceResult(result.zh),
        en: coerceResult(result.en),
        isPensieve: false,
        annotations: [],
        reviewSchedule: getDefaultSchedule(),
        rawContent: result.rawContent || undefined,
        sourceUrl: result.sourceUrl || undefined,
      };

      setCards((prev) => [newCard, ...prev]);
      setSelectedCardId(newCard.id);
      setActiveNav("Library");
      setTextInput("");
      setLinkInput("");
      setImageBase64("");
      setImageName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric", lang));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateQuiz() {
    if (!selectedCard) return;
    const localized = getLocalizedCard(selectedCard, lang);
    setQuizLoading(true);
    setError("");
    try {
      const response = await generateQuiz({
        title: localized.title,
        summary: localized.summary,
        tags: localized.tags,
        domain: localized.domain,
      });
      setQuiz(response);
      setQuizCardTitle(localized.title);
      setSelectedAnswers({});
      setActiveNav("Quiz");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorQuiz", lang));
    } finally {
      setQuizLoading(false);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function updateCard(cardId: string, updater: (card: StoredCard) => StoredCard) {
    setCards((prev) => prev.map((card) => (card.id === cardId ? updater(card) : card)));
  }

  function saveAnnotation(cardId: string) {
    if (!annotationDraft.trim()) return;
    updateCard(cardId, (card) => ({
      ...card,
      isPensieve: true,
      annotations: [...card.annotations, { id: crypto.randomUUID(), type: 'note' as const, note: annotationDraft.trim(), createdAt: new Date().toISOString() }],
    }));
    setAnnotationDraft("");
    setActiveAnnotationCardId(null);
  }

  function deleteAnnotation(cardId: string, annotationId: string) {
    updateCard(cardId, (card) => ({
      ...card,
      annotations: card.annotations.filter((item) => item.id !== annotationId && item.createdAt !== annotationId),
      isPensieve: card.annotations.filter((item) => item.id !== annotationId && item.createdAt !== annotationId).length > 0 || card.isPensieve,
    }));
  }

  function togglePensieve(cardId: string) {
    updateCard(cardId, (card) => ({
      ...card,
      isPensieve: !card.isPensieve,
    }));
  }

  function handleReview(cardId: string, action: ReviewAction) {
    updateCard(cardId, (card) => ({
      ...card,
      reviewSchedule: buildNextSchedule(card.reviewSchedule, action),
      isPensieve: true,
    }));
    setPensieveReviewIndex((prev) => Math.max(prev, 0));
  }

  if (!mounted) return null;

  const localizedSelected = selectedCard ? getLocalizedCard(selectedCard, lang) : null;
  const quizQuestions: QuizQuestion[] = quiz?.[lang]?.questions ?? [];
  const readingCard = cards.find((c) => c.id === readingCardId) ?? null;
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = quizQuestions.length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
  const correctCount = quizQuestions.filter((q, i) => selectedAnswers[i] === q.correctIndex).length;

  return (
    <main className="min-h-screen text-[var(--text)] theme-transition">
      <div className="mx-auto flex min-h-screen max-w-[1480px] flex-col lg:flex-row">
        <aside className="theme-transition border-b border-[var(--card-border)] bg-[var(--sidebar-bg)] px-5 py-5 lg:min-h-screen lg:w-[280px] lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-start justify-between gap-4 lg:block">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--gold-light)] text-[18px] shadow-[0_0_20px_rgba(201,168,76,0.08)]">✨</div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("appName", lang)}</p>
                  <h1 className="font-display text-[30px] leading-none tracking-[-0.03em]">{t("appSubtitle", lang)}</h1>
                </div>
              </div>
              <p className="max-w-[24ch] text-sm leading-6 text-[var(--text-secondary)]">{t("appTagline", lang)}</p>
            </div>
            <div className="flex gap-2 lg:mt-4">
              <button className="toolbar-btn" onClick={toggleTheme} aria-label="toggle theme">{theme === "light" ? "🌙" : "☀️"}</button>
              <button className="toolbar-btn text-[13px] font-semibold" onClick={toggleLang} aria-label="toggle language">{lang === "zh" ? "EN" : "中"}</button>
            </div>
          </div>

          <nav className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:gap-1.5">
            {navItems.map((item) => {
              const active = item.key === activeNav;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveNav(item.key)}
                  className={`theme-transition rounded-[20px] px-4 py-3 text-left text-sm ${
                    active
                      ? "border border-[var(--highlight-border)] bg-[var(--card-bg)] text-[var(--text)] shadow-[0_14px_30px_rgba(15,23,42,0.08)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--card-bg)]/90 hover:text-[var(--text)]"
                  }`}
                >
                  {t(item.label, lang)}
                </button>
              );
            })}
          </nav>

          <div className="card-parchment mt-6 rounded-[24px] p-4 lg:mt-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelDashboard", lang)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Metric label={t("labelCards", lang)} value={String(dashboard.totalCards).padStart(2, "0")} />
              <Metric label={t("labelReview", lang)} value={String(dashboard.reviewCount).padStart(2, "0")} />
              <Metric label={t("labelQuizReady", lang)} value={String(dashboard.quizReady).padStart(2, "0")} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="magic-dot" />
              {t("labelTopDomain", lang)}：<span className="text-[var(--text)]">{dashboard.topDomain}</span>
            </div>
          </div>
        </aside>

        <section className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
            <div className="space-y-6">
              <header className="card-parchment rounded-[32px] px-6 py-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t(navItems.find((item) => item.key === activeNav)?.label || "navInbox", lang)}</p>
                    <h2 className="font-display mt-2 text-4xl leading-[0.95] tracking-[-0.04em] sm:text-[52px]">{t(headerMap[activeNav], lang)}</h2>
                  </div>
                  <p className="max-w-[34ch] text-sm leading-6 text-[var(--text-secondary)]">{t("subHeader", lang)}</p>
                </div>
              </header>

              {activeNav === "Inbox" && (
                <section className="card-parchment rounded-[32px] px-6 py-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:px-8">
                  <div className="flex flex-wrap items-center gap-3">
                    {([
                      { key: "text", label: "modeText" },
                      { key: "link", label: "modeLink" },
                      { key: "screenshot", label: "modeScreenshot" },
                    ] as Array<{ key: InputMode; label: TKey }>).map((mode) => {
                      const active = mode.key === inputMode;
                      return (
                        <button
                          key={mode.key}
                          onClick={() => setInputMode(mode.key)}
                          className={`theme-transition rounded-full px-4 py-2 text-sm ${
                            active ? "bg-[var(--btn-bg)] text-white shadow-[0_0_18px_rgba(201,168,76,0.18)]" : "bg-[var(--tag-bg)] text-[var(--text-secondary)] hover:text-[var(--text)]"
                          }`}
                        >
                          {t(mode.label, lang)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 space-y-4">
                    {inputMode === "text" && (
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder={t("placeholderText", lang)}
                        className="theme-transition min-h-[180px] w-full rounded-[24px] border border-[var(--input-border)] bg-[var(--input-bg)] px-5 py-4 text-sm leading-7 text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)]"
                      />
                    )}

                    {inputMode === "link" && (
                      <input
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder={t("placeholderLink", lang)}
                        className="theme-transition w-full rounded-[24px] border border-[var(--input-border)] bg-[var(--input-bg)] px-5 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)]"
                      />
                    )}

                    {inputMode === "screenshot" && (
                      <label className="theme-transition flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--input-border)] bg-[var(--input-bg)] px-6 py-10 text-center hover:border-[var(--accent)]">
                        <span className="text-sm font-medium text-[var(--text)]">{t("placeholderImage", lang)}</span>
                        <span className="mt-2 text-sm text-[var(--text-secondary)]">{t("placeholderImageSub", lang)}</span>
                        <span className="mt-4 rounded-full bg-[var(--gold-light)] px-3 py-1 text-xs text-[var(--accent)]">{imageName || t("noFile", lang)}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="theme-transition inline-flex items-center justify-center gap-3 rounded-full bg-[var(--btn-bg)] px-5 py-3 text-sm text-white hover:bg-[var(--btn-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? <span className="spinner" /> : <span>{t("btnAnalyze", lang)}</span>}
                    </button>
                    <p className="text-sm text-[var(--text-secondary)]">{t("analyzeHint", lang)}</p>
                  </div>

                  {error && <p className="mt-4 text-sm text-[var(--accent)]">{error}</p>}
                </section>
              )}

              {activeNav === "Library" && (
                <section>
                  <div className={cards.length <= 2 ? "space-y-4" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
                    {cards.length === 0 ? (
                      <EmptyState title={t("emptyLibraryTitle", lang)} body={t("emptyLibraryBody", lang)} />
                    ) : (
                      cards.map((card) => {
                        const localized = getLocalizedCard(card, lang);
                        return (
                          <button
                            key={card.id}
                            onClick={() => { setSelectedCardId(card.id); setReadingCardId(card.id); }}
                            className={`theme-transition rounded-[28px] border px-5 py-5 text-left ${
                              selectedCard?.id === card.id
                                ? "border-[var(--highlight-border)] bg-[var(--highlight-bg)] shadow-[0_18px_36px_rgba(201,168,76,0.12)]"
                                : "border-[var(--card-border)] bg-[var(--card-bg)] shadow-[0_20px_40px_rgba(15,23,42,0.04)] hover:-translate-y-0.5"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">{card.sourceType}</span>
                              <span className="text-xs text-[var(--text-secondary)]">{formatDate(card.createdAt, lang)}</span>
                            </div>
                            <h3 className="font-display mt-4 text-xl leading-tight tracking-[-0.02em] text-[var(--text)]">{localized.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{localized.summary}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {localized.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]">#{tag}</span>
                              ))}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              )}

              {activeNav === "Pensieve" && (
                <section className="space-y-6">
                  <div className="flex gap-2">
                    {([
                      { key: "today", label: "filterTodayReview" },
                      { key: "starred", label: "filterStarred" },
                    ] as Array<{ key: PensieveFilter; label: TKey }>).map((item) => (
                      <button
                        key={item.key}
                        onClick={() => setPensieveFilter(item.key)}
                        className={`theme-transition rounded-full px-4 py-2 text-sm ${
                          pensieveFilter === item.key ? "bg-[var(--btn-bg)] text-white" : "bg-[var(--tag-bg)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {t(item.label, lang)}
                      </button>
                    ))}
                  </div>

                  {pensieveFilter === "today" ? (
                    !currentReviewCard ? (
                      <EmptyState title={t("emptyReviewTitle", lang)} body={t("emptyReviewBody", lang)} />
                    ) : (
                      <PensieveReviewCard
                        card={currentReviewCard}
                        lang={lang}
                        onRemember={() => handleReview(currentReviewCard.id, "remember")}
                        onFuzzy={() => handleReview(currentReviewCard.id, "fuzzy")}
                        onForgot={() => handleReview(currentReviewCard.id, "forgot")}
                      />
                    )
                  ) : pensieveCards.length === 0 ? (
                    <EmptyState title={t("emptyPensieveTitle", lang)} body={t("emptyPensieveBody", lang)} />
                  ) : (
                    <div className="space-y-4">
                      {pensieveCards.map((card) => (
                        <PensieveStarredCard
                          key={card.id}
                          card={card}
                          lang={lang}
                          onDeleteAnnotation={deleteAnnotation}
                          onOpenAnnotation={() => {
                            setActiveAnnotationCardId(card.id);
                            setAnnotationDraft("");
                          }}
                          isEditing={activeAnnotationCardId === card.id}
                          annotationDraft={activeAnnotationCardId === card.id ? annotationDraft : ""}
                          onAnnotationDraftChange={setAnnotationDraft}
                          onSaveAnnotation={() => saveAnnotation(card.id)}
                          onCancelAnnotation={() => {
                            setActiveAnnotationCardId(null);
                            setAnnotationDraft("");
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeNav === "Quiz" && (
                <section className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  {!localizedSelected ? (
                    <EmptyState title={t("emptyQuizTitle", lang)} body={t("emptyQuizTitleBody", lang)} />
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelQuizSource", lang)}</p>
                          <h3 className="font-display mt-2 text-[36px] leading-tight tracking-[-0.03em]">{localizedSelected.title}</h3>
                        </div>
                        <button onClick={handleGenerateQuiz} disabled={quizLoading} className="inline-flex items-center justify-center gap-3 rounded-full bg-[var(--btn-bg)] px-5 py-3 text-sm text-white hover:bg-[var(--btn-hover)] disabled:opacity-70">
                          {quizLoading ? <span className="spinner" /> : <span>{t("btnGenerateQuiz", lang)}</span>}
                        </button>
                      </div>

                      {quizQuestions.length === 0 ? (
                        <p className="mt-6 text-sm leading-6 text-[var(--text-secondary)]">{t("emptyQuizBody", lang)}</p>
                      ) : (
                        <div className="mt-8 space-y-6">
                          <div className="flex items-center justify-between rounded-[24px] bg-[var(--gold-light)] px-4 py-3 text-sm text-[var(--accent)]">
                            <span>{t("quizGeneratedFor", lang)} {quizCardTitle}</span>
                            <span>{t("quizProgress", lang).replace('{current}', String(answeredCount)).replace('{total}', String(totalQuestions))}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 w-full rounded-full bg-[var(--input-bg)]">
                            <div className="h-2 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }} />
                          </div>
                          {quizQuestions.map((question, index) => {
                            const selected = selectedAnswers[index];
                            const showResult = selected !== undefined;
                            return (
                              <div key={index} className="rounded-[26px] border border-[var(--card-border)] p-5">
                                <p className="text-sm text-[var(--accent)]">{t("labelQuestion", lang)} {index + 1}</p>
                                <h4 className="mt-2 text-base font-medium leading-7 text-[var(--text)]">{question.question}</h4>
                                <div className="mt-4 grid gap-3">
                                  {question.options.map((option, optionIndex) => {
                                    const isPicked = selected === optionIndex;
                                    const isCorrect = question.correctIndex === optionIndex;
                                    const isWrong = showResult && isPicked && !isCorrect;
                                    return (
                                      <button
                                        key={`${option}-${optionIndex}`}
                                        onClick={() => { if (!showResult) setSelectedAnswers((prev) => ({ ...prev, [index]: optionIndex })); }}
                                        disabled={showResult}
                                        className={`rounded-[20px] border px-4 py-3 text-left text-sm transition-all ${
                                          showResult && isCorrect
                                            ? "border-green-500 bg-green-500/10"
                                            : isWrong
                                              ? "border-red-500 bg-red-500/10"
                                              : showResult
                                                ? "border-[var(--card-border)] opacity-50 cursor-not-allowed"
                                                : "border-[var(--card-border)] hover:bg-[var(--input-bg)] cursor-pointer"
                                        }`}
                                      >
                                        <span className="flex items-center justify-between">
                                          <span>{option}</span>
                                          {showResult && isCorrect && <span>✅</span>}
                                          {isWrong && <span>❌</span>}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {showResult && <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{question.explanation}</p>}
                              </div>
                            );
                          })}
                          {/* Score summary */}
                          {allAnswered && (
                            <div className="rounded-[26px] border border-[var(--highlight-border)] bg-[var(--highlight-bg)] p-6 text-center">
                              <p className="font-display text-2xl">{t("quizComplete", lang)}</p>
                              <p className="mt-2 text-lg text-[var(--text)]">{t("quizScore", lang)}：{correctCount}/{totalQuestions}</p>
                              <p className="text-sm text-[var(--text-secondary)]">{t("quizAccuracy", lang)}：{Math.round((correctCount / totalQuestions) * 100)}%</p>
                              <div className="mt-4 flex justify-center gap-3">
                                <button onClick={() => { handleGenerateQuiz(); }} className="rounded-full bg-[var(--btn-bg)] px-5 py-2 text-sm text-white">{t("btnRetry", lang)}</button>
                                <button onClick={() => { setQuiz(null); setSelectedAnswers({}); }} className="rounded-full bg-[var(--tag-bg)] px-5 py-2 text-sm text-[var(--text-secondary)]">{t("btnDismiss", lang)}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {activeNav === "Map" && (
                <section className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  {mapGroups.length === 0 ? (
                    <EmptyState title={t("emptyMapTitle", lang)} body={t("emptyMapBody", lang)} />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {mapGroups.map(([domain, domainCards], domainIndex) => (
                        <div key={domain} className="rounded-[28px] border border-[var(--card-border)] bg-[var(--input-bg)] p-5">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="font-display text-[30px]">{["✦", "✧", "✶", "✷", "✹"][domainIndex % 5]} {domain}</h3>
                            <span className="rounded-full bg-[var(--card-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]">{domainCards.length} cards</span>
                          </div>
                          <div className="mt-4 h-px bg-[linear-gradient(to_right,transparent,var(--accent),transparent)] opacity-40" />
                          <div className="mt-5 space-y-3">
                            {domainCards.map((card, index) => (
                              <button key={card.id} onClick={() => { setSelectedCardId(card.id); setActiveNav("Library"); }} className="block w-full rounded-[18px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-left text-sm text-[var(--text)] shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                                <span className="mr-2 text-[var(--accent)]">{index % 2 === 0 ? "✧" : "✦"}</span>{getLocalizedCard(card, lang).title}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeNav === "Profile" && (
                <section className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelProfile", lang)}</p>
                      <h3 className="font-display mt-2 text-[38px] leading-tight tracking-[-0.03em]">{t("profileName", lang)}</h3>
                      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{t("profileFocus", lang)}</p>
                    </div>
                    <div className="rounded-[24px] bg-[var(--gold-light)] px-5 py-4 text-sm text-[var(--accent)]">{t("pwaReady", lang)}</div>
                  </div>
                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <MetricCard title={t("labelCaptured", lang)} value={String(cards.length)} detail={t("labelCardsStored", lang)} />
                    <MetricCard title={t("labelDomains", lang)} value={String(mapGroups.length)} detail={t("labelAreasOfLearning", lang)} />
                    <MetricCard title={t("labelTopTags", lang)} value={dashboard.tags[0] || "—"} detail={dashboard.tags[1] || t("labelAddMore", lang)} />
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelSelectedCard", lang)}</p>
                    <h3 className="font-display mt-2 text-[34px] leading-tight tracking-[-0.03em]">{localizedSelected?.title || t("labelWaiting", lang)}</h3>
                  </div>
                  {selectedCard && (
                    <button onClick={handleGenerateQuiz} disabled={quizLoading} className="rounded-full bg-[var(--gold-light)] px-4 py-2 text-sm text-[var(--accent)] hover:shadow-[0_0_16px_rgba(201,168,76,0.18)] disabled:opacity-60">
                      {t("btnQuiz", lang)}
                    </button>
                  )}
                </div>

                {localizedSelected && selectedCard ? (
                  <>
                    <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{localizedSelected.summary}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {localizedSelected.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]">#{tag}</span>
                      ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setActiveAnnotationCardId(selectedCard.id);
                          setAnnotationDraft("");
                        }}
                        className="rounded-full bg-[var(--btn-bg)] px-4 py-2 text-sm text-white"
                      >
                        {t("btnAddAnnotation", lang)}
                      </button>
                      <button
                        onClick={() => togglePensieve(selectedCard.id)}
                        className="rounded-full bg-[var(--gold-light)] px-4 py-2 text-sm text-[var(--accent)]"
                      >
                        {selectedCard.isPensieve ? t("btnRemoveFromPensieve", lang) : t("btnSaveToPensieve", lang)}
                      </button>
                    </div>

                    {activeAnnotationCardId === selectedCard.id && (
                      <div className="mt-4 rounded-[24px] bg-[var(--input-bg)] p-4">
                        <textarea
                          value={annotationDraft}
                          onChange={(e) => setAnnotationDraft(e.target.value)}
                          placeholder={t("annotationPlaceholder", lang)}
                          className="min-h-[100px] w-full rounded-[18px] border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none"
                        />
                        <div className="mt-3 flex gap-2">
                          <button onClick={() => saveAnnotation(selectedCard.id)} className="rounded-full bg-[var(--btn-bg)] px-4 py-2 text-sm text-white">{t("btnSaveAnnotation", lang)}</button>
                          <button onClick={() => { setActiveAnnotationCardId(null); setAnnotationDraft(""); }} className="rounded-full bg-[var(--tag-bg)] px-4 py-2 text-sm text-[var(--text-secondary)]">{t("btnCancel", lang)}</button>
                        </div>
                      </div>
                    )}

                    <div className="mt-6">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelKeyInsights", lang)}</p>
                      <ul className="mt-4 space-y-3">
                        {localizedSelected.keyInsights.map((insight) => (
                          <li key={insight} className="flex gap-3 text-sm leading-6 text-[var(--text-secondary)]"><span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /><span>{insight}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 rounded-[24px] bg-[var(--gold-light)] p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelFollowUp", lang)}</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {localizedSelected.followUpQuestions.map((question) => <li key={question}>✧ {question}</li>)}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{t("emptyLibraryBody", lang)}</p>
                )}
              </section>

              <section className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelWorkflow", lang)}</p>
                <div className="mt-5 space-y-4 text-sm leading-6 text-[var(--text-secondary)]">
                  <WorkflowStep title={t("workflow1Title", lang)} body={t("workflow1Body", lang)} />
                  <WorkflowStep title={t("workflow2Title", lang)} body={t("workflow2Body", lang)} />
                  <WorkflowStep title={t("workflow3Title", lang)} body={t("workflow3Body", lang)} />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>

      {/* Fullscreen Reading Overlay */}
      {readingCard && (() => {
        const rc = readingCard;
        const localized = getLocalizedCard(rc, lang);
        const hasRaw = Boolean(rc.rawContent && rc.rawContent.trim());
        const highlights = rc.annotations.filter(a => a.type === 'highlight' || a.type === 'highlight_note');
        const allAnnotations = rc.annotations;

        function renderHighlightedText(text: string) {
          if (!highlights.length) return text;
          const result = text;
          const parts: Array<{ text: string; annotationId?: string }> = [];
          let remaining = result;
          // Simple approach: find and mark highlights
          for (const h of highlights) {
            if (!h.highlightText) continue;
            const idx = remaining.indexOf(h.highlightText);
            if (idx >= 0) {
              if (idx > 0) parts.push({ text: remaining.slice(0, idx) });
              parts.push({ text: h.highlightText, annotationId: h.id });
              remaining = remaining.slice(idx + h.highlightText.length);
            }
          }
          if (remaining) parts.push({ text: remaining });
          if (parts.length === 0) return text;
          return parts;
        }

        const textParts = hasRaw ? renderHighlightedText(rc.rawContent!) : null;

        function handleTextSelect() {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            setHighlightTooltip(null);
            return;
          }
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setHighlightTooltip({
            x: rect.left + rect.width / 2,
            y: rect.top - 10,
            text: sel.toString().trim(),
          });
        }

        function addHighlight(text: string, withNote: boolean) {
          if (withNote) {
            setHighlightNoteInput({ text, note: '' });
          } else {
            updateCard(rc.id, (card) => ({
              ...card,
              annotations: [...card.annotations, { id: crypto.randomUUID(), type: 'highlight' as const, highlightText: text, createdAt: new Date().toISOString() }],
            }));
          }
          setHighlightTooltip(null);
          window.getSelection()?.removeAllRanges();
        }

        function saveHighlightNote() {
          if (!highlightNoteInput) return;
          updateCard(rc.id, (card) => ({
            ...card,
            annotations: [...card.annotations, {
              id: crypto.randomUUID(),
              type: 'highlight_note' as const,
              highlightText: highlightNoteInput.text,
              note: highlightNoteInput.note,
              createdAt: new Date().toISOString(),
            }],
          }));
          setHighlightNoteInput(null);
        }

        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) { setReadingCardId(null); setHighlightTooltip(null); setHighlightNoteInput(null); setClickedHighlightId(null); } }}>
            <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-none bg-[var(--sidebar-bg)] shadow-2xl lg:my-4 lg:rounded-[32px]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--card-border)] px-6 py-4">
                <button onClick={() => { setReadingCardId(null); setHighlightTooltip(null); }} className="rounded-full bg-[var(--tag-bg)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]">{t("btnBack", lang)}</button>
                <div className="flex gap-2">
                  <button onClick={() => togglePensieve(rc.id)} className="rounded-full bg-[var(--gold-light)] px-4 py-2 text-sm text-[var(--accent)]">
                    {rc.isPensieve ? t("btnRemoveFromPensieve", lang) : t("btnSaveToPensieve", lang)}
                  </button>
                  <button onClick={() => { setReadingCardId(null); setHighlightTooltip(null); }} className="rounded-full bg-[var(--tag-bg)] px-3 py-2 text-sm text-[var(--text-secondary)]">{t("btnClose", lang)}</button>
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left: Original text (60%) */}
                <div className="relative flex-[3] overflow-y-auto border-r border-[var(--card-border)] p-6" onMouseUp={hasRaw ? handleTextSelect : undefined}>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelRawContent", lang)}</p>
                  {rc.sourceUrl && (
                    <a href={rc.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline">
                      {t("btnViewSource", lang)}
                    </a>
                  )}
                  {hasRaw ? (
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-8 text-[var(--text)]">
                      {Array.isArray(textParts) ? textParts.map((part, i) => 
                        part.annotationId ? (
                          <mark
                            key={i}
                            className="cursor-pointer rounded bg-yellow-400/30 px-0.5 whitespace-pre-line"
                            onClick={() => setClickedHighlightId(clickedHighlightId === part.annotationId ? null : part.annotationId!)}
                          >
                            {part.text}
                            {clickedHighlightId === part.annotationId && (() => {
                              const ann = allAnnotations.find(a => a.id === part.annotationId);
                              return ann ? (
                                <span className="relative">
                                  <span className="absolute -top-1 left-0 z-10 mt-[-60px] w-[250px] rounded-[16px] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                    {ann.note && <p className="text-sm text-[var(--text)]">{ann.note}</p>}
                                    {!ann.note && <p className="text-xs text-[var(--text-secondary)]">{t("btnHighlight", lang)}</p>}
                                    <div className="mt-2 flex gap-2">
                                      <button onClick={() => deleteAnnotation(rc.id, ann.id)} className="text-xs text-red-400">{t("btnDelete", lang)}</button>
                                    </div>
                                  </span>
                                </span>
                              ) : null;
                            })()}
                          </mark>
                        ) : <span key={i}>{part.text}</span>
                      ) : textParts}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-[var(--text-secondary)]">{t("labelNoRawContent", lang)}</p>
                      <div className="rounded-[20px] bg-[var(--input-bg)] p-4">
                        <h4 className="text-base font-medium text-[var(--text)]">{localized.title}</h4>
                        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{localized.summary}</p>
                        <div className="mt-4 space-y-2">
                          {localized.keyInsights.map((insight, i) => (
                            <p key={i} className="text-sm text-[var(--text-secondary)]">• {insight}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Highlight tooltip */}
                  {highlightTooltip && (
                    <div
                      className="fixed z-[60] flex gap-1 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1.5 shadow-xl"
                      style={{ left: highlightTooltip.x, top: highlightTooltip.y, transform: 'translate(-50%, -100%)' }}
                    >
                      <button onClick={() => addHighlight(highlightTooltip.text, false)} className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs text-[var(--text)] hover:bg-yellow-400/40">{t("btnHighlight", lang)}</button>
                      <button onClick={() => addHighlight(highlightTooltip.text, true)} className="rounded-full bg-[var(--gold-light)] px-3 py-1 text-xs text-[var(--accent)] hover:bg-[var(--accent)]/20">{t("btnHighlightNote", lang)}</button>
                    </div>
                  )}

                  {/* Highlight note input */}
                  {highlightNoteInput && (
                    <div className="mt-4 rounded-[20px] border border-[var(--highlight-border)] bg-[var(--highlight-bg)] p-4">
                      <p className="text-xs text-[var(--accent)]">✦ &ldquo;{highlightNoteInput.text}&rdquo;</p>
                      <textarea
                        value={highlightNoteInput.note}
                        onChange={(e) => setHighlightNoteInput({ ...highlightNoteInput, note: e.target.value })}
                        placeholder={t("highlightNotePlaceholder", lang)}
                        className="mt-2 min-h-[80px] w-full rounded-[14px] border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                        autoFocus
                      />
                      <div className="mt-2 flex gap-2">
                        <button onClick={saveHighlightNote} className="rounded-full bg-[var(--btn-bg)] px-4 py-1.5 text-xs text-white">{t("btnSaveAnnotation", lang)}</button>
                        <button onClick={() => setHighlightNoteInput(null)} className="rounded-full bg-[var(--tag-bg)] px-4 py-1.5 text-xs text-[var(--text-secondary)]">{t("btnCancel", lang)}</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: AI Analysis (40%) */}
                <div className="flex-[2] overflow-y-auto p-6">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelAiAnalysis", lang)}</p>
                  <h3 className="font-display mt-3 text-[28px] leading-tight tracking-[-0.03em]">{localized.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{localized.summary}</p>

                  <div className="mt-6">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelKeyInsights", lang)}</p>
                    <ul className="mt-3 space-y-2">
                      {localized.keyInsights.map((insight, i) => (
                        <li key={i} className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]">
                          <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {localized.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]">#{tag}</span>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[20px] bg-[var(--gold-light)] p-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelFollowUp", lang)}</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                      {localized.followUpQuestions.map((q, i) => <li key={i}>✧ {q}</li>)}
                    </ul>
                  </div>

                  {/* Annotations section */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelAnnotations", lang)}</p>
                      <button
                        onClick={() => { setActiveAnnotationCardId(rc.id); setAnnotationDraft(""); }}
                        className="rounded-full bg-[var(--gold-light)] px-3 py-1.5 text-xs text-[var(--accent)]"
                      >{t("btnAddAnnotation", lang)}</button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {allAnnotations.map((ann) => (
                        <div key={ann.id} className="rounded-[16px] bg-[var(--input-bg)] px-4 py-3">
                          {ann.highlightText && <p className="text-xs text-[var(--accent)]">🖍 &ldquo;{ann.highlightText}&rdquo;</p>}
                          {(ann.note || ann.text) && <p className="mt-1 text-sm text-[var(--text)]">{ann.note || ann.text}</p>}
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-[var(--text-secondary)]">{formatDateTime(ann.createdAt, lang)}</span>
                            <button onClick={() => deleteAnnotation(rc.id, ann.id)} className="text-xs text-red-400">{t("btnDelete", lang)}</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {activeAnnotationCardId === rc.id && (
                      <div className="mt-3">
                        <textarea
                          value={annotationDraft}
                          onChange={(e) => setAnnotationDraft(e.target.value)}
                          placeholder={t("annotationPlaceholder", lang)}
                          className="min-h-[80px] w-full rounded-[14px] border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text)] outline-none"
                          autoFocus
                        />
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => saveAnnotation(rc.id)} className="rounded-full bg-[var(--btn-bg)] px-4 py-1.5 text-xs text-white">{t("btnSaveAnnotation", lang)}</button>
                          <button onClick={() => { setActiveAnnotationCardId(null); setAnnotationDraft(""); }} className="rounded-full bg-[var(--tag-bg)] px-4 py-1.5 text-xs text-[var(--text-secondary)]">{t("btnCancel", lang)}</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generate quiz button */}
                  <button
                    onClick={() => { setSelectedCardId(rc.id); handleGenerateQuiz(); setReadingCardId(null); }}
                    disabled={quizLoading}
                    className="mt-6 w-full rounded-full bg-[var(--btn-bg)] px-5 py-3 text-sm text-white hover:bg-[var(--btn-hover)] disabled:opacity-70"
                  >
                    {quizLoading ? <span className="spinner" /> : t("btnGenerateQuiz", lang)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

function PensieveReviewCard({
  card,
  lang,
  onRemember,
  onFuzzy,
  onForgot,
}: {
  card: StoredCard;
  lang: Lang;
  onRemember: () => void;
  onFuzzy: () => void;
  onForgot: () => void;
}) {
  const localized = getLocalizedCard(card, lang);
  return (
    <article className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <span className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-xs text-[var(--accent)]">Lv.{card.reviewSchedule.level}</span>
        <span className="text-sm text-[var(--text-secondary)]">{t("labelNextReview", lang)} {formatDate(card.reviewSchedule.nextReviewAt, lang)}</span>
      </div>
      <h3 className="font-display mt-4 text-[34px] leading-tight tracking-[-0.03em]">{localized.title}</h3>
      <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{localized.summary}</p>
      <div className="mt-5 space-y-3">
        {localized.keyInsights.map((insight) => (
          <div key={insight} className="rounded-[20px] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-secondary)]">{insight}</div>
        ))}
      </div>
      {card.annotations.length > 0 && (
        <div className="mt-6 rounded-[24px] bg-[var(--gold-light)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelAnnotations", lang)}</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
            {card.annotations.map((annotation) => (
              <li key={annotation.id || annotation.createdAt}>✦ {annotation.note || annotation.text}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button onClick={onRemember} className="rounded-full bg-[var(--btn-bg)] px-4 py-3 text-sm text-white">{t("btnRemember", lang)}</button>
        <button onClick={onFuzzy} className="rounded-full bg-[var(--tag-bg)] px-4 py-3 text-sm text-[var(--text)]">{t("btnFuzzy", lang)}</button>
        <button onClick={onForgot} className="rounded-full bg-[var(--gold-light)] px-4 py-3 text-sm text-[var(--accent)]">{t("btnForgot", lang)}</button>
      </div>
    </article>
  );
}

function PensieveStarredCard({
  card,
  lang,
  onDeleteAnnotation,
  onOpenAnnotation,
  isEditing,
  annotationDraft,
  onAnnotationDraftChange,
  onSaveAnnotation,
  onCancelAnnotation,
}: {
  card: StoredCard;
  lang: Lang;
  onDeleteAnnotation: (cardId: string, createdAt: string) => void;
  onOpenAnnotation: () => void;
  isEditing: boolean;
  annotationDraft: string;
  onAnnotationDraftChange: (value: string) => void;
  onSaveAnnotation: () => void;
  onCancelAnnotation: () => void;
}) {
  const localized = getLocalizedCard(card, lang);
  return (
    <article className="rounded-[28px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[28px] leading-tight tracking-[-0.03em]">{localized.title}</h3>
        <span className="text-xs text-[var(--text-secondary)]">{t("labelNextReview", lang)} {formatDate(card.reviewSchedule.nextReviewAt, lang)}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{localized.summary}</p>
      <div className="mt-4 rounded-[24px] bg-[var(--input-bg)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelAnnotations", lang)}</p>
          <button onClick={onOpenAnnotation} className="rounded-full bg-[var(--gold-light)] px-3 py-1.5 text-xs text-[var(--accent)]">{t("btnAddAnnotation", lang)}</button>
        </div>
        <div className="mt-3 space-y-3">
          {card.annotations.map((annotation) => (
            <div key={annotation.id || annotation.createdAt} className="rounded-[18px] bg-[var(--card-bg)] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--text)]">{annotation.note || annotation.text}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{formatDateTime(annotation.createdAt, lang)}</p>
                </div>
                <button onClick={() => onDeleteAnnotation(card.id, annotation.id || annotation.createdAt)} className="text-xs text-[var(--accent)]">{t("btnDelete", lang)}</button>
              </div>
            </div>
          ))}
        </div>
        {isEditing && (
          <div className="mt-4">
            <textarea
              value={annotationDraft}
              onChange={(e) => onAnnotationDraftChange(e.target.value)}
              placeholder={t("annotationPlaceholder", lang)}
              className="min-h-[100px] w-full rounded-[18px] border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button onClick={onSaveAnnotation} className="rounded-full bg-[var(--btn-bg)] px-4 py-2 text-sm text-white">{t("btnSaveAnnotation", lang)}</button>
              <button onClick={onCancelAnnotation} className="rounded-full bg-[var(--tag-bg)] px-4 py-2 text-sm text-[var(--text-secondary)]">{t("btnCancel", lang)}</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[var(--input-bg)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[26px] bg-[var(--input-bg)] p-5">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{detail}</p>
    </div>
  );
}

function WorkflowStep({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-medium text-[var(--text)]">{title}</p>
      <p className="mt-1">{body}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[var(--card-border)] bg-[var(--input-bg)] p-8 text-left">
      <h3 className="font-display text-[32px] leading-tight text-[var(--text)]">{title}</h3>
      <p className="mt-3 max-w-[50ch] text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

function formatDate(value: string, lang: Lang) {
  return new Date(value).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}

function formatDateTime(value: string, lang: Lang) {
  return new Date(value).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
