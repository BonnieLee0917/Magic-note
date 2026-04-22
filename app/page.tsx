"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  AnalysisResult,
  QuizQuestion,
  analyzeLink,
  analyzeScreenshot,
  analyzeText,
  generateQuiz,
} from "./lib/api";
import { Lang, t, TKey } from "./i18n";

type NavKey = "Inbox" | "Library" | "Review" | "Quiz" | "Map" | "Profile";
type InputMode = "text" | "link" | "screenshot";
type Theme = "light" | "dark";

type StoredCard = AnalysisResult & {
  id: string;
  sourceType: InputMode;
  createdAt: string;
};

const navItems: Array<{ key: NavKey; label: TKey }> = [
  { key: "Inbox", label: "navInbox" },
  { key: "Library", label: "navLibrary" },
  { key: "Review", label: "navReview" },
  { key: "Quiz", label: "navQuiz" },
  { key: "Map", label: "navMap" },
  { key: "Profile", label: "navProfile" },
];

const headerMap: Record<NavKey, TKey> = {
  Inbox: "headerInbox",
  Library: "headerLibrary",
  Review: "headerReview",
  Quiz: "headerQuiz",
  Map: "headerMap",
  Profile: "headerProfile",
};

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
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizCardTitle, setQuizCardTitle] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});

  useEffect(() => {
    const savedTheme = (localStorage.getItem("magic-note-theme") as Theme) || "dark";
    const savedLang = (localStorage.getItem("magic-note-lang") as Lang) || "zh";
    setTheme(savedTheme);
    setLang(savedLang);
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.lang = savedLang;
    setMounted(true);
  }, []);

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

  const dashboard = useMemo(() => {
    const domainCount = new Map<string, number>();
    cards.forEach((card) => {
      domainCount.set(card.domain, (domainCount.get(card.domain) ?? 0) + 1);
    });

    const topDomain = Array.from(domainCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? t("labelNoDomain", lang);
    const allTags = Array.from(new Set(cards.flatMap((card) => card.tags))).slice(0, 6);

    return {
      totalCards: cards.length,
      reviewCount: Math.min(cards.length, 5),
      quizReady: cards.length,
      topDomain,
      tags: allTags,
    };
  }, [cards, lang]);

  const mapGroups = useMemo(() => {
    const grouped = new Map<string, StoredCard[]>();
    cards.forEach((card) => {
      const key = card.domain || "General";
      grouped.set(key, [...(grouped.get(key) ?? []), card]);
    });
    return Array.from(grouped.entries());
  }, [cards]);

  async function handleAnalyze() {
    setLoading(true);
    setError("");
    try {
      let result: AnalysisResult;
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
        ...result,
        id: crypto.randomUUID(),
        sourceType: inputMode,
        createdAt: new Date().toISOString(),
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

  async function handleGenerateQuiz() {
    if (!selectedCard) return;
    setQuizLoading(true);
    setError("");
    try {
      const response = await generateQuiz({
        title: selectedCard.title,
        summary: selectedCard.summary,
        tags: selectedCard.tags,
        domain: selectedCard.domain,
      });
      setQuiz(response.questions ?? []);
      setQuizCardTitle(selectedCard.title);
      setSelectedAnswers({});
      setActiveNav("Quiz");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorQuiz", lang));
    } finally {
      setQuizLoading(false);
    }
  }

  if (!mounted) return null;

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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_390px]">
            <div className="space-y-6">
              <header className="card-parchment rounded-[32px] px-6 py-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t(navItems.find((item) => item.key === activeNav)?.label || "navInbox", lang)}</p>
                    <h2 className="font-display mt-2 text-4xl leading-[0.95] tracking-[-0.04em] sm:text-[52px]">
                      {t(headerMap[activeNav], lang)}
                    </h2>
                  </div>
                  <p className="max-w-[34ch] text-sm leading-6 text-[var(--text-secondary)]">{t("subHeader", lang)}</p>
                </div>
              </header>

              {(activeNav === "Inbox" || activeNav === "Library") && (
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
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {cards.length === 0 ? (
                    <EmptyState title={t("emptyLibraryTitle", lang)} body={t("emptyLibraryBody", lang)} />
                  ) : (
                    cards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
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
                        <h3 className="font-display mt-4 text-[28px] leading-tight tracking-[-0.02em] text-[var(--text)]">{card.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{card.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {card.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]">#{tag}</span>
                          ))}
                        </div>
                      </button>
                    ))
                  )}
                </section>
              )}

              {activeNav === "Review" && (
                <section className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  {cards.length === 0 ? (
                    <EmptyState title={t("emptyReviewTitle", lang)} body={t("emptyReviewBody", lang)} />
                  ) : (
                    <div className="space-y-4">
                      {cards.slice(0, 5).map((card, index) => (
                        <div key={card.id} className="rounded-[24px] border border-[var(--card-border)] bg-[var(--input-bg)] p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">🔮 {t("labelReview", lang)} {index + 1}</p>
                              <h3 className="font-display mt-2 text-[30px] leading-tight">{card.title}</h3>
                            </div>
                            <button onClick={() => { setSelectedCardId(card.id); setActiveNav("Library"); }} className="rounded-full bg-[var(--card-bg)] px-4 py-2 text-sm text-[var(--text)] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                              {t("btnOpenCard", lang)}
                            </button>
                          </div>
                          <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                            {card.keyInsights.slice(0, 3).map((insight) => (
                              <li key={insight} className="flex gap-3"><span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /><span>{insight}</span></li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeNav === "Quiz" && (
                <section className="card-parchment rounded-[32px] p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  {!selectedCard ? (
                    <EmptyState title={t("emptyQuizTitle", lang)} body={t("emptyQuizTitleBody", lang)} />
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelQuizSource", lang)}</p>
                          <h3 className="font-display mt-2 text-[36px] leading-tight tracking-[-0.03em]">{selectedCard.title}</h3>
                        </div>
                        <button onClick={handleGenerateQuiz} disabled={quizLoading} className="inline-flex items-center justify-center gap-3 rounded-full bg-[var(--btn-bg)] px-5 py-3 text-sm text-white hover:bg-[var(--btn-hover)] disabled:opacity-70">
                          {quizLoading ? <span className="spinner" /> : <span>{t("btnGenerateQuiz", lang)}</span>}
                        </button>
                      </div>

                      {quiz.length === 0 ? (
                        <p className="mt-6 text-sm leading-6 text-[var(--text-secondary)]">{t("emptyQuizBody", lang)}</p>
                      ) : (
                        <div className="mt-8 space-y-6">
                          <div className="rounded-[24px] bg-[var(--gold-light)] px-4 py-3 text-sm text-[var(--accent)]">{t("quizGeneratedFor", lang)} {quizCardTitle}</div>
                          {quiz.map((question, index) => {
                            const selected = selectedAnswers[index];
                            return (
                              <div key={index} className="rounded-[26px] border border-[var(--card-border)] p-5">
                                <p className="text-sm text-[var(--accent)]">{t("labelQuestion", lang)} {index + 1}</p>
                                <h4 className="mt-2 text-base font-medium leading-7 text-[var(--text)]">{question.question}</h4>
                                <div className="mt-4 grid gap-3">
                                  {question.options.map((option, optionIndex) => {
                                    const isPicked = selected === optionIndex;
                                    const isCorrect = question.correctIndex === optionIndex;
                                    const showResult = selected !== undefined;
                                    return (
                                      <button
                                        key={`${option}-${optionIndex}`}
                                        onClick={() => setSelectedAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                                        className={`rounded-[20px] border px-4 py-3 text-left text-sm ${
                                          showResult && isCorrect
                                            ? "border-[var(--highlight-border)] bg-[var(--highlight-bg)]"
                                            : isPicked
                                              ? "border-[var(--btn-bg)] bg-[var(--tag-bg)]"
                                              : "border-[var(--card-border)] hover:bg-[var(--input-bg)]"
                                        }`}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>
                                {selected !== undefined && <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">{question.explanation}</p>}
                              </div>
                            );
                          })}
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
                                <span className="mr-2 text-[var(--accent)]">{index % 2 === 0 ? "✧" : "✦"}</span>{card.title}
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
                    <h3 className="font-display mt-2 text-[34px] leading-tight tracking-[-0.03em]">{selectedCard?.title || t("labelWaiting", lang)}</h3>
                  </div>
                  {selectedCard && (
                    <button onClick={handleGenerateQuiz} disabled={quizLoading} className="rounded-full bg-[var(--gold-light)] px-4 py-2 text-sm text-[var(--accent)] hover:shadow-[0_0_16px_rgba(201,168,76,0.18)] disabled:opacity-60">
                      {t("btnQuiz", lang)}
                    </button>
                  )}
                </div>

                {selectedCard ? (
                  <>
                    <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{selectedCard.summary}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedCard.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[var(--tag-bg)] px-3 py-1 text-xs text-[var(--text-secondary)]">#{tag}</span>
                      ))}
                    </div>
                    <div className="mt-6">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelKeyInsights", lang)}</p>
                      <ul className="mt-4 space-y-3">
                        {selectedCard.keyInsights.map((insight) => (
                          <li key={insight} className="flex gap-3 text-sm leading-6 text-[var(--text-secondary)]"><span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /><span>{insight}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 rounded-[24px] bg-[var(--gold-light)] p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">{t("labelFollowUp", lang)}</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {selectedCard.followUpQuestions.map((question) => <li key={question}>✧ {question}</li>)}
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
    </main>
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
