"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  provider: "google" | "github";
  avatar: string;
};

type KnowledgeCard = {
  id: string;
  userId: string;
  inputType: "text" | "link" | "image";
  raw: string;
  title: string;
  summary: string;
  tags: string[];
  concepts: string[];
  domain: string;
  relatedIds: string[];
  createdAt: string;
  nextReviewAt: string;
  lastReviewedAt?: string;
  reviewCount: number;
  confidence?: number;
  quizQuestion: string;
};

type View = "dashboard" | "inbox" | "library" | "review" | "quiz" | "map" | "profile";

const STORAGE_KEY = "magic-note-v1";

const domainKeywords: Record<string, string[]> = {
  Product: ["product", "user", "feature", "metric", "roadmap", "growth", "strategy", "mvp"],
  Engineering: ["api", "react", "next", "typescript", "database", "system", "code", "deploy"],
  Design: ["design", "ui", "ux", "visual", "layout", "typography", "interaction"],
  Learning: ["learn", "memory", "study", "review", "quiz", "recall", "knowledge"],
  Business: ["market", "revenue", "saas", "pricing", "customer", "business"],
  Life: ["habit", "health", "daily", "personal", "mindset", "routine"],
};

const seedCards = (userId: string): KnowledgeCard[] => [
  createCard(userId, "text", "Spaced repetition helps move fragile knowledge into long-term memory through active recall and increasing intervals."),
  createCard(userId, "link", "https://www.nngroup.com/articles/recognition-vs-recall/"),
  createCard(userId, "text", "A great dashboard should help users answer: what changed, what matters, and what should I do next?"),
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function titleFrom(raw: string) {
  const cleaned = raw.replace(/^https?:\/\//, "").replace(/[\W_]+/g, " ").trim();
  return cleaned.split(" ").slice(0, 6).join(" ").replace(/\b\w/g, (m) => m.toUpperCase()) || "Untitled Spell";
}

function summarize(raw: string) {
  if (raw.startsWith("http")) return `A saved knowledge link about ${titleFrom(raw).toLowerCase()}, ready for retrieval and review.`;
  const sentence = raw.trim().slice(0, 160);
  return sentence.length < raw.trim().length ? `${sentence}...` : sentence;
}

function inferDomain(raw: string) {
  const lower = raw.toLowerCase();
  for (const [domain, words] of Object.entries(domainKeywords)) {
    if (words.some((w) => lower.includes(w))) return domain;
  }
  return "General Magic";
}

function inferTags(raw: string, domain: string) {
  const words = raw
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4)
    .slice(0, 4);
  return Array.from(new Set([domain.toLowerCase(), ...words])).slice(0, 5);
}

function inferConcepts(raw: string) {
  const lower = raw.toLowerCase();
  const concepts = [
    ["active recall", ["recall", "quiz", "remember"]],
    ["knowledge graph", ["knowledge", "concept", "graph"]],
    ["user experience", ["ux", "ui", "user"]],
    ["system design", ["architecture", "system", "database", "api"]],
    ["product strategy", ["strategy", "roadmap", "metric", "growth"]],
  ].filter(([, keys]) => (keys as string[]).some((k) => lower.includes(k))).map(([name]) => name as string);
  return concepts.length ? concepts.slice(0, 3) : [inferDomain(raw), "memory loop"];
}

function quizFrom(title: string, summary: string) {
  return `Without looking, explain the core idea behind “${title}” and why it matters. Hint: ${summary.slice(0, 48)}...`;
}

function computeRelatedIds(card: Omit<KnowledgeCard, "relatedIds">, cards: KnowledgeCard[]) {
  return cards
    .filter((c) => c.id !== card.id)
    .map((c) => {
      const overlap = c.tags.filter((tag) => card.tags.includes(tag)).length + (c.domain === card.domain ? 2 : 0);
      return { id: c.id, score: overlap };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.id);
}

function createCard(userId: string, inputType: KnowledgeCard["inputType"], raw: string): KnowledgeCard {
  const domain = inferDomain(raw);
  const title = titleFrom(raw);
  const summary = summarize(raw);
  const tags = inferTags(raw, domain);
  const concepts = inferConcepts(raw);
  const days = Math.floor(Math.random() * 3);
  const next = new Date();
  next.setDate(next.getDate() + days);
  return {
    id: uid(),
    userId,
    inputType,
    raw,
    title,
    summary,
    tags,
    concepts,
    domain,
    relatedIds: [],
    createdAt: new Date().toISOString(),
    nextReviewAt: next.toISOString(),
    reviewCount: 0,
    quizQuestion: quizFrom(title, summary),
  };
}

function recalcRelationships(cards: KnowledgeCard[]) {
  return cards.map((card) => ({ ...card, relatedIds: computeRelatedIds(card, cards) }));
}

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<KnowledgeCard[]>([]);
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");
  const [captureText, setCaptureText] = useState("");
  const [captureLink, setCaptureLink] = useState("");
  const [captureImageName, setCaptureImageName] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [quizCardId, setQuizCardId] = useState<string | null>(null);
  const [quizReveal, setQuizReveal] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setUser(data.user ?? null);
        setCards(data.cards ?? []);
      }
    } catch {}
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, cards }));
  }, [mounted, user, cards]);

  const domains = useMemo(() => ["All", ...Array.from(new Set(cards.map((c) => c.domain)))], [cards]);
  const tags = useMemo(() => ["All", ...Array.from(new Set(cards.flatMap((c) => c.tags)))], [cards]);

  const filteredCards = useMemo(() => {
    const lower = query.toLowerCase();
    return cards.filter((card) => {
      const matchesQuery = !query || [card.title, card.summary, card.domain, ...card.tags, ...card.concepts].join(" ").toLowerCase().includes(lower);
      const matchesDomain = domainFilter === "All" || card.domain === domainFilter;
      const matchesTag = tagFilter === "All" || card.tags.includes(tagFilter);
      return matchesQuery && matchesDomain && matchesTag;
    });
  }, [cards, query, domainFilter, tagFilter]);

  const dueCards = useMemo(() => cards.filter((c) => new Date(c.nextReviewAt) <= new Date()).sort((a, b) => +new Date(a.nextReviewAt) - +new Date(b.nextReviewAt)), [cards]);
  const selectedCard = filteredCards.find((c) => c.id === selectedCardId) ?? filteredCards[0] ?? null;
  const quizCard = cards.find((c) => c.id === quizCardId) ?? dueCards[0] ?? filteredCards[0] ?? null;

  const stats = useMemo(() => {
    const reviewed = cards.filter((c) => c.reviewCount > 0).length;
    const domainCount = new Set(cards.map((c) => c.domain)).size;
    const streak = Math.min(12, Math.max(1, reviewed + dueCards.length));
    return { captured: cards.length, reviewed, domainCount, streak };
  }, [cards, dueCards.length]);

  function signIn(provider: User["provider"]) {
    const nextUser: User = {
      id: provider === "google" ? "user-google-bonnie" : "user-github-bonnie",
      name: "Bonnie Lee",
      email: provider === "google" ? "bonnie@gmail.com" : "bonnie@github.dev",
      provider,
      avatar: provider === "google" ? "✨" : "🪄",
    };
    setUser(nextUser);
    setCards((existing) => existing.length ? existing : recalcRelationships(seedCards(nextUser.id)));
    setView("dashboard");
  }

  function capture(inputType: KnowledgeCard["inputType"], value: string) {
    if (!user || !value.trim()) return;
    const newCard = createCard(user.id, inputType, value.trim());
    const nextCards = recalcRelationships([newCard, ...cards.filter((c) => c.userId === user.id)]);
    setCards(nextCards);
    setCaptureText("");
    setCaptureLink("");
    setCaptureImageName("");
    setSelectedCardId(newCard.id);
    setView("library");
  }

  function reviewCard(cardId: string, confidence: number) {
    setCards((prev) => prev.map((card) => {
      if (card.id !== cardId) return card;
      const interval = confidence >= 4 ? Math.max(2, card.reviewCount * 3 + confidence) : 1;
      const next = new Date();
      next.setDate(next.getDate() + interval);
      return {
        ...card,
        confidence,
        reviewCount: card.reviewCount + 1,
        lastReviewedAt: new Date().toISOString(),
        nextReviewAt: next.toISOString(),
      };
    }));
  }

  if (!mounted) return null;

  return (
    <main className="relative z-10 min-h-screen pb-24 md:pb-8">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Hero user={user} stats={stats} onSignIn={signIn} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <Sidebar view={view} setView={setView} stats={stats} />
          </aside>

          <section className="space-y-6">
            {view === "dashboard" && (
              <Dashboard cards={cards} dueCards={dueCards} stats={stats} setView={setView} />
            )}

            {view === "inbox" && (
              <InboxView
                captureText={captureText}
                setCaptureText={setCaptureText}
                captureLink={captureLink}
                setCaptureLink={setCaptureLink}
                captureImageName={captureImageName}
                setCaptureImageName={setCaptureImageName}
                capture={capture}
                canCapture={!!user}
              />
            )}

            {view === "library" && (
              <div className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
                <LibraryView
                  cards={filteredCards}
                  query={query}
                  setQuery={setQuery}
                  domainFilter={domainFilter}
                  setDomainFilter={setDomainFilter}
                  tagFilter={tagFilter}
                  setTagFilter={setTagFilter}
                  domains={domains}
                  tags={tags}
                  selectedCardId={selectedCard?.id ?? null}
                  setSelectedCardId={setSelectedCardId}
                />
                <CardDetail card={selectedCard} cards={cards} />
              </div>
            )}

            {view === "review" && (
              <ReviewView dueCards={dueCards} onRate={reviewCard} />
            )}

            {view === "quiz" && (
              <QuizView card={quizCard} quizReveal={quizReveal} setQuizReveal={setQuizReveal} setQuizCardId={setQuizCardId} cards={cards} />
            )}

            {view === "map" && (
              <MapView cards={cards} />
            )}

            {view === "profile" && (
              <ProfileView user={user} stats={stats} domains={domains.slice(1)} />
            )}
          </section>
        </div>
      </div>

      <nav className="glass-panel fixed inset-x-3 bottom-3 z-20 grid grid-cols-6 p-2 lg:hidden">
        {[
          ["dashboard", "✦", "Home"],
          ["inbox", "📥", "Inbox"],
          ["library", "📚", "Library"],
          ["review", "⏳", "Review"],
          ["quiz", "❓", "Quiz"],
          ["map", "🕸️", "Map"],
        ].map(([key, icon, label]) => (
          <button key={key} className={`nav-item ${view === key ? "active" : ""}`} onClick={() => setView(key as View)}>
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function Hero({ user, stats, onSignIn }: { user: User | null; stats: { captured: number; reviewed: number; domainCount: number; streak: number }; onSignIn: (provider: User["provider"]) => void; }) {
  return (
    <section className="card-parchment overflow-hidden p-6 md:p-8 shadow-glow">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.35em] text-gold/70">Magic Note · Knowledge OS</p>
          <h1 className="text-4xl font-semibold leading-tight text-parchment-light md:text-6xl">
            Turn fragments into a <span className="text-gold">living spellbook</span>.
          </h1>
          <p className="mt-4 max-w-2xl text-parchment/75 md:text-lg">
            Capture screenshots, links, and notes. Let AI mock-processing extract title, summary, tags, concepts, review schedule, and quiz prompts — all wrapped in a magical academy interface.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {!user ? (
              <>
                <button className="btn-magic" onClick={() => onSignIn("google")}>Continue with Google</button>
                <button className="btn-secondary" onClick={() => onSignIn("github")}>Sign in with GitHub</button>
              </>
            ) : (
              <div className="glass-panel flex items-center gap-3 px-4 py-3 text-sm">
                <span className="text-2xl">{user.avatar}</span>
                <div>
                  <div className="font-semibold text-gold-light">{user.name}</div>
                  <div className="text-parchment/60">{user.email} · {user.provider}</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Captured" value={stats.captured} icon="📜" />
          <StatCard label="Reviewed" value={stats.reviewed} icon="🔁" />
          <StatCard label="Domains" value={stats.domainCount} icon="🪐" />
          <StatCard label="Streak" value={`${stats.streak}d`} icon="🔥" />
        </div>
      </div>
    </section>
  );
}

function Sidebar({ view, setView, stats }: { view: View; setView: (view: View) => void; stats: { captured: number; reviewed: number; domainCount: number; streak: number } }) {
  const items: [View, string, string][] = [
    ["dashboard", "✦", "Dashboard"],
    ["inbox", "📥", "Inbox"],
    ["library", "📚", "Library"],
    ["review", "⏳", "Review"],
    ["quiz", "❓", "Quiz"],
    ["map", "🕸️", "Map"],
    ["profile", "🧙", "Profile"],
  ];
  return (
    <div className="glass-panel sticky top-6 p-4">
      <div className="mb-4 border-b border-gold/10 pb-4">
        <div className="text-lg font-semibold text-gold">Wizard Navigation</div>
        <div className="mt-1 text-sm text-parchment/60">6 top-level product areas + profile</div>
      </div>
      <div className="space-y-2">
        {items.map(([key, icon, label]) => (
          <button key={key} onClick={() => setView(key)} className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition ${view === key ? "bg-gold/15 text-gold shadow-magic" : "text-parchment/75 hover:bg-white/5 hover:text-parchment"}`}>
            <span className="flex items-center gap-3"><span>{icon}</span>{label}</span>
            {key === "review" && stats.reviewed < stats.captured && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs">due</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return <div className="glass-panel p-4"><div className="text-2xl">{icon}</div><div className="mt-3 text-2xl font-semibold text-gold">{value}</div><div className="text-sm text-parchment/60">{label}</div></div>;
}

function Dashboard({ cards, dueCards, stats, setView }: { cards: KnowledgeCard[]; dueCards: KnowledgeCard[]; stats: { captured: number; reviewed: number; domainCount: number; streak: number }; setView: (v: View) => void; }) {
  const recent = cards.slice(0, 3);
  const byDomain = Object.entries(cards.reduce<Record<string, number>>((acc, card) => { acc[card.domain] = (acc[card.domain] || 0) + 1; return acc; }, {}));
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card-parchment p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Daily Ritual</div>
              <h2 className="mt-2 text-2xl font-semibold">Today&apos;s magical command center</h2>
            </div>
            <button className="btn-magic" onClick={() => setView("inbox")}>Capture New Note</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="glass-panel p-4"><div className="text-sm text-parchment/60">Pending review</div><div className="mt-2 text-3xl font-semibold text-gold">{dueCards.length}</div></div>
            <div className="glass-panel p-4"><div className="text-sm text-parchment/60">Knowledge cards</div><div className="mt-2 text-3xl font-semibold text-gold">{stats.captured}</div></div>
            <div className="glass-panel p-4"><div className="text-sm text-parchment/60">Active domains</div><div className="mt-2 text-3xl font-semibold text-gold">{stats.domainCount}</div></div>
          </div>
        </div>
        <div className="glass-panel p-6">
          <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Progress</div>
          <h3 className="mt-2 text-xl font-semibold">Learning constellation</h3>
          <div className="mt-5 space-y-4">
            {[{ label: "Capture habit", value: Math.min(100, stats.captured * 18) }, { label: "Retention loop", value: Math.min(100, stats.reviewed * 22 + 15) }, { label: "Domain coverage", value: Math.min(100, stats.domainCount * 20) }].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><span className="text-gold">{item.value}%</span></div>
                <div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-gradient-to-r from-gold-dark to-gold" style={{ width: `${item.value}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-semibold">Recent spells</h3><button className="btn-secondary" onClick={() => setView("library")}>Open Library</button></div>
          <div className="space-y-3">
            {recent.map((card) => <MiniCard key={card.id} card={card} />)}
            {!recent.length && <EmptyState title="No knowledge yet" subtitle="Sign in and capture your first magical note." />}
          </div>
        </div>
        <div className="glass-panel p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-xl font-semibold">Domain atlas</h3><button className="btn-secondary" onClick={() => setView("map")}>View Map</button></div>
          <div className="space-y-3">
            {byDomain.map(([domain, count]) => (
              <div key={domain} className="rounded-xl border border-gold/10 p-4">
                <div className="flex items-center justify-between"><span className="font-medium">{domain}</span><span className="text-gold">{count}</span></div>
                <div className="mt-3 h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-gradient-to-r from-purple-light to-gold" style={{ width: `${Math.min(100, count * 25)}%` }} /></div>
              </div>
            ))}
            {!byDomain.length && <EmptyState title="No domains yet" subtitle="AI domain detection appears after your first capture." />}
          </div>
        </div>
      </div>
    </div>
  );
}

function InboxView(props: { captureText: string; setCaptureText: (v: string) => void; captureLink: string; setCaptureLink: (v: string) => void; captureImageName: string; setCaptureImageName: (v: string) => void; capture: (type: KnowledgeCard["inputType"], value: string) => void; canCapture: boolean; }) {
  const { captureText, setCaptureText, captureLink, setCaptureLink, captureImageName, setCaptureImageName, capture, canCapture } = props;
  return (
    <div className="space-y-6">
      {!canCapture && <div className="glass-panel p-4 text-sm text-gold-light">Sign in first to unlock multi-user scoped capture and storage.</div>}
      <div className="grid gap-6 xl:grid-cols-3">
        <CapturePanel title="Quick text spell" subtitle="Paste an insight, idea, or quote." actionLabel="Enchant Text" value={captureText} onChange={setCaptureText} onAction={() => capture("text", captureText)} placeholder="Write what you learned today..." />
        <CapturePanel title="Save a link" subtitle="Drop an article or resource URL." actionLabel="Bind Link" value={captureLink} onChange={setCaptureLink} onAction={() => capture("link", captureLink)} placeholder="https://..." />
        <div className="card-parchment p-6">
          <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Screenshot capture</div>
          <h3 className="mt-2 text-xl font-semibold">Image to knowledge</h3>
          <p className="mt-2 text-sm text-parchment/65">MVP mode stores the filename as a screenshot artifact, then mock-AI processes it into a card.</p>
          <label className="mt-5 block rounded-xl border border-dashed border-gold/30 p-6 text-center hover:border-gold/60">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCaptureImageName(e.target.files?.[0]?.name || "")} />
            <div className="text-3xl">🖼️</div>
            <div className="mt-2 text-sm text-parchment/70">{captureImageName || "Tap to choose screenshot"}</div>
          </label>
          <button className="btn-magic mt-4 w-full" onClick={() => capture("image", captureImageName)} disabled={!captureImageName}>Distill Screenshot</button>
        </div>
      </div>

      <div className="glass-panel p-6">
        <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Mock AI pipeline</div>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {[
            ["1", "Capture", "Raw text / link / image filename"],
            ["2", "Understand", "Title, summary, tags, concepts"],
            ["3", "Organize", "Dynamic domain + related cards"],
            ["4", "Retain", "Review schedule + quiz prompt"],
          ].map(([n, t, d]) => <div key={n} className="rounded-xl border border-gold/10 p-4"><div className="text-gold">Step {n}</div><div className="mt-2 font-semibold">{t}</div><div className="mt-2 text-sm text-parchment/65">{d}</div></div>)}
        </div>
      </div>
    </div>
  );
}

function CapturePanel({ title, subtitle, actionLabel, value, onChange, onAction, placeholder }: { title: string; subtitle: string; actionLabel: string; value: string; onChange: (v: string) => void; onAction: () => void; placeholder: string; }) {
  return (
    <div className="card-parchment p-6">
      <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Capture inbox</div>
      <h3 className="mt-2 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-parchment/65">{subtitle}</p>
      <textarea className="input-magic mt-5 min-h-[180px]" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button className="btn-magic mt-4 w-full" onClick={onAction} disabled={!value.trim()}>{actionLabel}</button>
    </div>
  );
}

function LibraryView(props: { cards: KnowledgeCard[]; query: string; setQuery: (v: string) => void; domainFilter: string; setDomainFilter: (v: string) => void; tagFilter: string; setTagFilter: (v: string) => void; domains: string[]; tags: string[]; selectedCardId: string | null; setSelectedCardId: (id: string) => void; }) {
  const { cards, query, setQuery, domainFilter, setDomainFilter, tagFilter, setTagFilter, domains, tags, selectedCardId, setSelectedCardId } = props;
  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><div className="text-sm uppercase tracking-[0.25em] text-gold/60">Knowledge retrieval</div><h2 className="mt-2 text-2xl font-semibold">Library</h2></div>
        <div className="text-sm text-parchment/60">Semantic-ish search + keyword filter + tags</div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <input className="input-magic" placeholder="Search cards, concepts, tags..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="input-magic" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}>{domains.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        <select className="input-magic" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>{tags.map((t) => <option key={t} value={t}>{t}</option>)}</select>
      </div>
      <div className="mt-5 space-y-3">
        {cards.map((card) => (
          <button key={card.id} onClick={() => setSelectedCardId(card.id)} className={`w-full rounded-xl border p-4 text-left transition ${selectedCardId === card.id ? "border-gold/50 bg-gold/10 shadow-magic" : "border-gold/10 hover:border-gold/30 hover:bg-white/5"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-parchment-light">{card.title}</div>
                <div className="mt-1 text-sm text-parchment/65">{card.summary}</div>
              </div>
              <span className="rounded-full bg-purple/50 px-3 py-1 text-xs text-gold-light">{card.domain}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{card.tags.map((tag) => <span key={tag} className="tag-magic">#{tag}</span>)}</div>
          </button>
        ))}
        {!cards.length && <EmptyState title="No cards match your spell" subtitle="Try a different tag, domain, or search term." />}
      </div>
    </div>
  );
}

function CardDetail({ card, cards }: { card: KnowledgeCard | null; cards: KnowledgeCard[] }) {
  if (!card) return <div className="glass-panel p-6"><EmptyState title="Select a knowledge card" subtitle="Open any card from the library to inspect AI summary, concepts, and related knowledge." /></div>;
  const related = cards.filter((c) => card.relatedIds.includes(c.id));
  return (
    <div className="space-y-6">
      <div className="card-parchment p-6">
        <div className="flex items-start justify-between gap-3"><div><div className="text-sm uppercase tracking-[0.25em] text-gold/60">Knowledge card</div><h3 className="mt-2 text-2xl font-semibold">{card.title}</h3></div><span className="rounded-full bg-gold/10 px-3 py-1 text-sm text-gold">{card.inputType}</span></div>
        <p className="mt-4 text-parchment/75">{card.summary}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <InfoBlock title="Tags" items={card.tags.map((t) => `#${t}`)} />
          <InfoBlock title="Concepts" items={card.concepts} />
        </div>
      </div>
      <div className="glass-panel p-6">
        <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Related cards</div>
        <div className="mt-4 space-y-3">
          {related.map((item) => <MiniCard key={item.id} card={item} />)}
          {!related.length && <EmptyState title="No strong relation yet" subtitle="Capture more notes in the same domain to grow the graph." />}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border border-gold/10 p-4"><div className="text-sm text-parchment/60">{title}</div><div className="mt-3 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="tag-magic">{item}</span>)}</div></div>;
}

function ReviewView({ dueCards, onRate }: { dueCards: KnowledgeCard[]; onRate: (cardId: string, confidence: number) => void; }) {
  const current = dueCards[0];
  return (
    <div className="card-parchment p-6">
      <div className="flex items-center justify-between gap-3"><div><div className="text-sm uppercase tracking-[0.25em] text-gold/60">Learning loop</div><h2 className="mt-2 text-2xl font-semibold">Review queue</h2></div><div className="rounded-full bg-gold/10 px-3 py-1 text-sm text-gold">{dueCards.length} due</div></div>
      {!current ? <div className="mt-6"><EmptyState title="All clear for now" subtitle="No review cards are due. Capture or wait for tomorrow’s review cycle." /></div> : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel p-5">
            <div className="text-lg font-semibold text-gold-light">{current.title}</div>
            <p className="mt-3 text-parchment/75">{current.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">{current.concepts.map((c) => <span key={c} className="tag-magic">{c}</span>)}</div>
          </div>
          <div className="glass-panel p-5">
            <div className="text-sm text-parchment/60">How confident are you?</div>
            <div className="mt-4 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((n) => <button key={n} className="btn-secondary px-0" onClick={() => onRate(current.id, n)}>{n}</button>)}</div>
            <div className="mt-4 text-sm text-parchment/65">Low confidence schedules tomorrow. High confidence unlocks longer spaced repetition intervals.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizView({ card, quizReveal, setQuizReveal, setQuizCardId, cards }: { card: KnowledgeCard | null; quizReveal: boolean; setQuizReveal: (v: boolean) => void; setQuizCardId: (v: string) => void; cards: KnowledgeCard[]; }) {
  return (
    <div className="space-y-6">
      <div className="card-parchment p-6">
        <div className="flex items-center justify-between gap-3"><div><div className="text-sm uppercase tracking-[0.25em] text-gold/60">AI quiz</div><h2 className="mt-2 text-2xl font-semibold">Recall challenge</h2></div><select className="input-magic max-w-xs" value={card?.id || ""} onChange={(e) => { setQuizCardId(e.target.value); setQuizReveal(false); }}>{cards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
        {!card ? <div className="mt-6"><EmptyState title="No quiz material yet" subtitle="Capture some cards first, then start self-testing." /></div> : (
          <div className="mt-6 space-y-4">
            <div className="glass-panel p-5"><div className="text-sm text-gold-light">Question</div><p className="mt-3 text-lg">{card.quizQuestion}</p></div>
            <button className="btn-magic" onClick={() => setQuizReveal(!quizReveal)}>{quizReveal ? "Hide answer" : "Reveal answer"}</button>
            {quizReveal && <div className="glass-panel p-5"><div className="text-sm text-gold-light">Answer cue</div><p className="mt-3 text-parchment/75">{card.summary}</p><div className="mt-4 flex flex-wrap gap-2">{card.tags.map((t) => <span key={t} className="tag-magic">#{t}</span>)}</div></div>}
          </div>
        )}
      </div>
    </div>
  );
}

function MapView({ cards }: { cards: KnowledgeCard[] }) {
  const domains = Object.entries(cards.reduce<Record<string, KnowledgeCard[]>>((acc, card) => { (acc[card.domain] ||= []).push(card); return acc; }, {}));
  return (
    <div className="glass-panel p-6">
      <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Knowledge map</div>
      <h2 className="mt-2 text-2xl font-semibold">Domain constellation</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {domains.map(([domain, entries], i) => (
          <div key={domain} className="card-parchment p-5" style={{ transform: `rotate(${i % 2 === 0 ? "-1.2deg" : "1.2deg"})` }}>
            <div className="flex items-center justify-between"><div className="text-lg font-semibold text-gold-light">{domain}</div><div className="text-2xl">{["🪐","✨","🌙","📖","🔮","🧭"][i % 6]}</div></div>
            <div className="mt-4 space-y-2">{entries.map((card) => <div key={card.id} className="rounded-lg border border-gold/10 px-3 py-2 text-sm text-parchment/75">{card.title}</div>)}</div>
          </div>
        ))}
        {!domains.length && <EmptyState title="The sky is empty" subtitle="Capture notes to watch domains appear as constellations." />}
      </div>
    </div>
  );
}

function ProfileView({ user, stats, domains }: { user: User | null; stats: { captured: number; reviewed: number; domainCount: number; streak: number }; domains: string[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="card-parchment p-6">
        <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Profile</div>
        <div className="mt-4 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-3xl">{user?.avatar || "🧙"}</div><div><div className="text-2xl font-semibold">{user?.name || "Guest Wizard"}</div><div className="text-parchment/60">{user?.email || "Sign in to sync your spellbook"}</div></div></div>
        <div className="mt-6 space-y-3 text-sm text-parchment/75">
          <div className="rounded-xl border border-gold/10 p-4">Multi-user ready architecture: each card is scoped with <span className="text-gold">userId</span>.</div>
          <div className="rounded-xl border border-gold/10 p-4">PWA installable, offline shell cached, mobile-first navigation included.</div>
        </div>
      </div>
      <div className="glass-panel p-6">
        <div className="text-sm uppercase tracking-[0.25em] text-gold/60">Progress ledger</div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <StatCard label="Captured Items" value={stats.captured} icon="📜" />
          <StatCard label="Reviewed" value={stats.reviewed} icon="✅" />
          <StatCard label="Domains" value={stats.domainCount} icon="🪐" />
          <StatCard label="Streak" value={`${stats.streak}d`} icon="🔥" />
        </div>
        <div className="mt-6 rounded-xl border border-gold/10 p-4"><div className="text-sm text-parchment/60">Known domains</div><div className="mt-3 flex flex-wrap gap-2">{domains.map((d) => <span key={d} className="tag-magic">{d}</span>)}{!domains.length && <span className="text-sm text-parchment/50">None yet</span>}</div></div>
      </div>
    </div>
  );
}

function MiniCard({ card }: { card: KnowledgeCard }) {
  return <div className="rounded-xl border border-gold/10 p-4"><div className="flex items-center justify-between gap-3"><div className="font-semibold text-parchment-light">{card.title}</div><span className="text-xs text-gold">{card.domain}</span></div><div className="mt-2 text-sm text-parchment/65">{card.summary}</div></div>;
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="rounded-xl border border-dashed border-gold/20 p-6 text-center"><div className="text-lg font-semibold text-gold-light">{title}</div><div className="mt-2 text-sm text-parchment/60">{subtitle}</div></div>;
}
