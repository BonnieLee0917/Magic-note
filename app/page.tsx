"use client";

import { ChangeEvent, useMemo, useState } from "react";
import {
  AnalysisResult,
  QuizQuestion,
  analyzeLink,
  analyzeScreenshot,
  analyzeText,
  generateQuiz,
} from "./lib/api";

type NavKey = "Inbox" | "Library" | "Review" | "Quiz" | "Map" | "Profile";
type InputMode = "screenshot" | "link" | "text";

type StoredCard = AnalysisResult & {
  id: string;
  sourceType: InputMode;
  createdAt: string;
};

const navItems: NavKey[] = ["Inbox", "Library", "Review", "Quiz", "Map", "Profile"];

const emptyProfile = {
  name: "Magic Note User",
  focus: "Turn captures into knowledge",
};

export default function Home() {
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

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) ?? cards[0] ?? null,
    [cards, selectedCardId],
  );

  const dashboard = useMemo(() => {
    const domainCount = new Map<string, number>();
    cards.forEach((card) => {
      domainCount.set(card.domain, (domainCount.get(card.domain) ?? 0) + 1);
    });

    const topDomain = Array.from(domainCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No domain yet";
    const allTags = Array.from(new Set(cards.flatMap((card) => card.tags))).slice(0, 6);

    return {
      totalCards: cards.length,
      reviewCount: Math.min(cards.length, 5),
      quizReady: cards.length,
      topDomain,
      tags: allTags,
    };
  }, [cards]);

  async function handleAnalyze() {
    setLoading(true);
    setError("");

    try {
      let result: AnalysisResult;

      if (inputMode === "text") {
        if (!textInput.trim()) throw new Error("Please paste some text first.");
        result = await analyzeText(textInput.trim());
      } else if (inputMode === "link") {
        if (!linkInput.trim()) throw new Error("Please enter a valid link.");
        result = await analyzeLink(linkInput.trim());
      } else {
        if (!imageBase64) throw new Error("Please select an image to upload.");
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
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
      const result = reader.result;
      if (typeof result === "string") {
        setImageBase64(result);
      }
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
      setError(err instanceof Error ? err.message : "Quiz generation failed.");
    } finally {
      setQuizLoading(false);
    }
  }

  const mapGroups = useMemo(() => {
    const grouped = new Map<string, StoredCard[]>();
    cards.forEach((card) => {
      const key = card.domain || "General";
      grouped.set(key, [...(grouped.get(key) ?? []), card]);
    });
    return Array.from(grouped.entries());
  }, [cards]);

  return (
    <main className="min-h-screen bg-[#fafaf8] text-[#18181b]">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col lg:flex-row">
        <aside className="border-b border-[#e7e5df] bg-[#f7f6f2] px-5 py-5 lg:min-h-screen lg:w-[250px] lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-center justify-between lg:block">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f3ecda] text-[18px]">✦</div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Magic Note</p>
                  <h1 className="text-xl font-semibold tracking-[-0.03em]">Quiet knowledge</h1>
                </div>
              </div>
              <p className="max-w-[22ch] text-sm leading-6 text-[#6b7280]">
                Capture once. Distill fast. Review with calm focus.
              </p>
            </div>
          </div>

          <nav className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-1 lg:gap-1">
            {navItems.map((item) => {
              const active = item === activeNav;
              return (
                <button
                  key={item}
                  onClick={() => setActiveNav(item)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                    active
                      ? "bg-white text-[#18181b] shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
                      : "text-[#6b7280] hover:bg-white/80 hover:text-[#18181b]"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-[24px] border border-[#ece9df] bg-white p-4 lg:mt-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Dashboard</p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Metric label="Cards" value={String(dashboard.totalCards).padStart(2, "0")} />
              <Metric label="Review" value={String(dashboard.reviewCount).padStart(2, "0")} />
              <Metric label="Quiz ready" value={String(dashboard.quizReady).padStart(2, "0")} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-[#6b7280]">
              <span className="magic-dot" />
              Top domain: <span className="text-[#18181b]">{dashboard.topDomain}</span>
            </div>
          </div>
        </aside>

        <section className="flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_380px]">
            <div className="space-y-6">
              <header className="rounded-[32px] border border-[#ebe7dc] bg-white px-6 py-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">{activeNav}</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-[40px]">
                      {activeNav === "Inbox" && "Capture what matters"}
                      {activeNav === "Library" && "A clean library of insights"}
                      {activeNav === "Review" && "Revisit the ideas worth keeping"}
                      {activeNav === "Quiz" && "Test what you actually learned"}
                      {activeNav === "Map" && "See your knowledge by domain"}
                      {activeNav === "Profile" && "Your study rhythm"}
                    </h2>
                  </div>
                  <p className="max-w-[34ch] text-sm leading-6 text-[#6b7280]">
                    Minimal by design. AI handles the heavy lifting; the interface stays out of the way.
                  </p>
                </div>
              </header>

              {(activeNav === "Inbox" || activeNav === "Library") && (
                <section className="rounded-[32px] border border-[#ebe7dc] bg-white px-6 py-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:px-8">
                  <div className="flex flex-wrap items-center gap-3">
                    {(["text", "link", "screenshot"] as InputMode[]).map((mode) => {
                      const active = mode === inputMode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setInputMode(mode)}
                          className={`rounded-full px-4 py-2 text-sm capitalize transition ${
                            active ? "bg-[#1f2937] text-white" : "bg-[#f5f4ef] text-[#6b7280] hover:text-[#18181b]"
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 space-y-4">
                    {inputMode === "text" && (
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Paste an article excerpt, meeting note, or idea you want to keep."
                        className="min-h-[180px] w-full rounded-[24px] border border-[#e7e5df] bg-[#fbfbf9] px-5 py-4 text-sm leading-7 text-[#18181b] outline-none transition placeholder:text-[#9ca3af] focus:border-[#c9a84c]"
                      />
                    )}

                    {inputMode === "link" && (
                      <input
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        placeholder="https://example.com/article"
                        className="w-full rounded-[24px] border border-[#e7e5df] bg-[#fbfbf9] px-5 py-4 text-sm text-[#18181b] outline-none transition placeholder:text-[#9ca3af] focus:border-[#c9a84c]"
                      />
                    )}

                    {inputMode === "screenshot" && (
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-[#d8d2c2] bg-[#fbfbf8] px-6 py-10 text-center transition hover:border-[#c9a84c] hover:bg-[#faf8f1]">
                        <span className="text-sm font-medium text-[#18181b]">Select a screenshot</span>
                        <span className="mt-2 text-sm text-[#6b7280]">PNG or JPG → convert to base64 → analyze with AI</span>
                        <span className="mt-4 rounded-full bg-[#f3ecda] px-3 py-1 text-xs text-[#8a7a53]">
                          {imageName || "No file selected"}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      onClick={handleAnalyze}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-3 rounded-full bg-[#1f2937] px-5 py-3 text-sm text-white transition hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? <span className="spinner" /> : <span>Analyze with AI</span>}
                    </button>
                    <p className="text-sm text-[#6b7280]">Structured output includes summary, insights, tags, domain, and follow-up questions.</p>
                  </div>

                  {error && <p className="mt-4 text-sm text-[#b45309]">{error}</p>}
                </section>
              )}

              {activeNav === "Library" && (
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {cards.length === 0 ? (
                    <EmptyState
                      title="No cards yet"
                      body="Start from Inbox with text, links, or screenshots. Your AI summaries will appear here."
                    />
                  ) : (
                    cards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`rounded-[28px] border px-5 py-5 text-left transition ${
                          selectedCard?.id === card.id
                            ? "border-[#d8c28a] bg-[#fffdf6] shadow-[0_18px_36px_rgba(201,168,76,0.12)]"
                            : "border-[#ebe7dc] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.04)] hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-[#f5f4ef] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#8a7a53]">
                            {card.sourceType}
                          </span>
                          <span className="text-xs text-[#9ca3af]">{formatDate(card.createdAt)}</span>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[#18181b]">{card.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[#6b7280]">{card.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {card.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-[#f7f6f2] px-3 py-1 text-xs text-[#6b7280]">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))
                  )}
                </section>
              )}

              {activeNav === "Review" && (
                <section className="rounded-[32px] border border-[#ebe7dc] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  {cards.length === 0 ? (
                    <EmptyState title="Nothing to review" body="Analyze your first note, then come back for spaced reflection." />
                  ) : (
                    <div className="space-y-4">
                      {cards.slice(0, 5).map((card, index) => (
                        <div key={card.id} className="rounded-[24px] border border-[#eee8da] bg-[#fcfbf7] p-5">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Review {index + 1}</p>
                              <h3 className="mt-2 text-lg font-semibold">{card.title}</h3>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedCardId(card.id);
                                setActiveNav("Library");
                              }}
                              className="rounded-full bg-white px-4 py-2 text-sm text-[#18181b] shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
                            >
                              Open card
                            </button>
                          </div>
                          <ul className="mt-4 space-y-2 text-sm leading-6 text-[#6b7280]">
                            {card.keyInsights.slice(0, 3).map((insight) => (
                              <li key={insight} className="flex gap-3">
                                <span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[#c9a84c]" />
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {activeNav === "Quiz" && (
                <section className="rounded-[32px] border border-[#ebe7dc] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  {!selectedCard ? (
                    <EmptyState title="No card selected" body="Open a knowledge card first, then generate a quiz from it." />
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Quiz source</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{selectedCard.title}</h3>
                        </div>
                        <button
                          onClick={handleGenerateQuiz}
                          disabled={quizLoading}
                          className="inline-flex items-center justify-center gap-3 rounded-full bg-[#1f2937] px-5 py-3 text-sm text-white transition hover:bg-[#111827] disabled:opacity-70"
                        >
                          {quizLoading ? <span className="spinner" /> : <span>Generate AI quiz</span>}
                        </button>
                      </div>

                      {quiz.length === 0 ? (
                        <p className="mt-6 text-sm leading-6 text-[#6b7280]">No quiz yet. Generate one to practice recall from this card.</p>
                      ) : (
                        <div className="mt-8 space-y-6">
                          <div className="rounded-[24px] bg-[#faf8f1] px-4 py-3 text-sm text-[#8a7a53]">Quiz generated for {quizCardTitle}</div>
                          {quiz.map((question, index) => {
                            const selected = selectedAnswers[index];
                            return (
                              <div key={index} className="rounded-[26px] border border-[#ece7da] p-5">
                                <p className="text-sm text-[#8a7a53]">Question {index + 1}</p>
                                <h4 className="mt-2 text-base font-medium leading-7 text-[#18181b]">{question.question}</h4>
                                <div className="mt-4 grid gap-3">
                                  {question.options.map((option, optionIndex) => {
                                    const isPicked = selected === optionIndex;
                                    const isCorrect = question.correctIndex === optionIndex;
                                    const showResult = selected !== undefined;
                                    return (
                                      <button
                                        key={option}
                                        onClick={() => setSelectedAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                                        className={`rounded-[20px] border px-4 py-3 text-left text-sm transition ${
                                          showResult && isCorrect
                                            ? "border-[#d8c28a] bg-[#fff7de]"
                                            : isPicked
                                              ? "border-[#1f2937] bg-[#f5f5f4]"
                                              : "border-[#ece7da] hover:bg-[#faf9f6]"
                                        }`}
                                      >
                                        {option}
                                      </button>
                                    );
                                  })}
                                </div>
                                {selected !== undefined && (
                                  <p className="mt-4 text-sm leading-6 text-[#6b7280]">{question.explanation}</p>
                                )}
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
                <section className="rounded-[32px] border border-[#ebe7dc] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  {mapGroups.length === 0 ? (
                    <EmptyState title="Knowledge map is empty" body="As cards accumulate, domains will organize themselves here." />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {mapGroups.map(([domain, domainCards]) => (
                        <div key={domain} className="rounded-[28px] border border-[#ece7da] bg-[#fcfbf7] p-5">
                          <div className="flex items-center justify-between gap-4">
                            <h3 className="text-lg font-semibold">{domain}</h3>
                            <span className="rounded-full bg-white px-3 py-1 text-xs text-[#6b7280]">{domainCards.length} cards</span>
                          </div>
                          <div className="mt-5 space-y-3">
                            {domainCards.map((card) => (
                              <button
                                key={card.id}
                                onClick={() => {
                                  setSelectedCardId(card.id);
                                  setActiveNav("Library");
                                }}
                                className="block w-full rounded-[18px] bg-white px-4 py-3 text-left text-sm text-[#18181b] shadow-[0_8px_18px_rgba(15,23,42,0.05)]"
                              >
                                {card.title}
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
                <section className="rounded-[32px] border border-[#ebe7dc] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Profile</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{emptyProfile.name}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{emptyProfile.focus}</p>
                    </div>
                    <div className="rounded-[24px] bg-[#faf8f1] px-5 py-4 text-sm text-[#8a7a53]">
                      PWA-ready on Cloudflare Pages
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <MetricCard title="Captured" value={String(cards.length)} detail="Knowledge cards stored" />
                    <MetricCard title="Domains" value={String(mapGroups.length)} detail="Areas of learning" />
                    <MetricCard title="Top tags" value={dashboard.tags[0] || "—"} detail={(dashboard.tags[1] || "Add more content to see trends")} />
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section className="rounded-[32px] border border-[#ebe7dc] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Selected card</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{selectedCard?.title || "Waiting for your first card"}</h3>
                  </div>
                  {selectedCard && (
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={quizLoading}
                      className="rounded-full bg-[#f3ecda] px-4 py-2 text-sm text-[#8a7a53] transition hover:bg-[#efe4c1] disabled:opacity-60"
                    >
                      Quiz
                    </button>
                  )}
                </div>

                {selectedCard ? (
                  <>
                    <p className="mt-4 text-sm leading-7 text-[#6b7280]">{selectedCard.summary}</p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {selectedCard.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-[#f7f6f2] px-3 py-1 text-xs text-[#6b7280]">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Key insights</p>
                      <ul className="mt-4 space-y-3">
                        {selectedCard.keyInsights.map((insight) => (
                          <li key={insight} className="flex gap-3 text-sm leading-6 text-[#6b7280]">
                            <span className="mt-[10px] h-1.5 w-1.5 rounded-full bg-[#c9a84c]" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 rounded-[24px] bg-[#faf8f1] p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Follow-up questions</p>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6b7280]">
                        {selectedCard.followUpQuestions.map((question) => (
                          <li key={question}>{question}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm leading-6 text-[#6b7280]">
                    Use Inbox to upload a screenshot, paste a link, or drop in raw text. AI will return a structured knowledge card here.
                  </p>
                )}
              </section>

              <section className="rounded-[32px] border border-[#ebe7dc] bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">Workflow</p>
                <div className="mt-5 space-y-4 text-sm leading-6 text-[#6b7280]">
                  <WorkflowStep title="1 · Capture" body="Screenshot, link, or text goes in with zero ceremony." />
                  <WorkflowStep title="2 · Distill" body="AI returns title, summary, tags, insights, and next questions." />
                  <WorkflowStep title="3 · Review" body="Turn saved knowledge into repeatable recall via quiz and review." />
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
    <div className="rounded-[20px] bg-[#f8f7f3] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a7a53]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
    </div>
  );
}

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[26px] bg-[#fbfaf6] p-5">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#8a7a53]">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#18181b]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">{detail}</p>
    </div>
  );
}

function WorkflowStep({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="font-medium text-[#18181b]">{title}</p>
      <p className="mt-1">{body}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#d7d0bf] bg-[#fcfbf7] p-8 text-left">
      <h3 className="text-lg font-semibold text-[#18181b]">{title}</h3>
      <p className="mt-3 max-w-[50ch] text-sm leading-6 text-[#6b7280]">{body}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
