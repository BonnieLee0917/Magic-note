export type Lang = "zh" | "en";

const translations = {
  // App
  appName: { zh: "Magic Note", en: "Magic Note" },
  appTagline: { zh: "一念捕获，魔法提炼，静待花开", en: "Capture once. Distill fast. Review with calm focus." },
  appSubtitle: { zh: "知识魔法殿堂", en: "Quiet knowledge" },

  // Nav
  navInbox: { zh: "🦉 猫头鹰邮局", en: "🦉 Owl Post" },
  navLibrary: { zh: "📜 咒语图书馆", en: "📜 Spell Library" },
  navReview: { zh: "🔮 冥想盆", en: "🔮 Pensieve" },
  navQuiz: { zh: "⚡ 魔法测验", en: "⚡ Spell Quiz" },
  navMap: { zh: "🌙 星图", en: "🌙 Star Map" },
  navProfile: { zh: "🗝️ 密室", en: "🗝️ Chamber" },

  // Headers
  headerInbox: { zh: "投递你的魔法素材", en: "Capture what matters" },
  headerLibrary: { zh: "你的咒语收藏馆", en: "A clean library of insights" },
  headerReview: { zh: "唤醒沉睡的记忆", en: "Revisit the ideas worth keeping" },
  headerQuiz: { zh: "检验你的魔法修行", en: "Test what you actually learned" },
  headerMap: { zh: "探索你的知识星图", en: "See your knowledge by domain" },
  headerProfile: { zh: "你的修炼档案", en: "Your study rhythm" },

  // Sub headers
  subHeader: { zh: "AI 替你提炼，界面只留安静。", en: "Minimal by design. AI handles the heavy lifting; the interface stays out of the way." },

  // Input modes
  modeText: { zh: "📝 文字", en: "📝 Text" },
  modeLink: { zh: "🔗 链接", en: "🔗 Link" },
  modeScreenshot: { zh: "📷 截图", en: "📷 Screenshot" },

  // Placeholders
  placeholderText: { zh: "粘贴文章、笔记或灵感碎片…", en: "Paste an article excerpt, meeting note, or idea you want to keep." },
  placeholderLink: { zh: "https://example.com/article", en: "https://example.com/article" },
  placeholderImage: { zh: "选择一张截图", en: "Select a screenshot" },
  placeholderImageSub: { zh: "支持 PNG / JPG，AI 自动解析", en: "PNG or JPG → convert to base64 → analyze with AI" },
  noFile: { zh: "未选择文件", en: "No file selected" },

  // Buttons
  btnAnalyze: { zh: "✨ AI 分析", en: "✨ Analyze with AI" },
  btnQuiz: { zh: "测验", en: "Quiz" },
  btnGenerateQuiz: { zh: "⚡ 生成测验", en: "⚡ Generate AI quiz" },
  btnOpenCard: { zh: "打开卡片", en: "Open card" },

  // Labels
  labelDashboard: { zh: "魔法仪表盘", en: "Dashboard" },
  labelCards: { zh: "卡片", en: "Cards" },
  labelReview: { zh: "复习", en: "Review" },
  labelQuizReady: { zh: "可测验", en: "Quiz ready" },
  labelTopDomain: { zh: "热门领域", en: "Top domain" },
  labelNoDomain: { zh: "暂无领域", en: "No domain yet" },
  labelSelectedCard: { zh: "当前卡片", en: "Selected card" },
  labelWaiting: { zh: "等待你的第一张卡片", en: "Waiting for your first card" },
  labelKeyInsights: { zh: "核心洞察", en: "Key insights" },
  labelFollowUp: { zh: "延伸思考", en: "Follow-up questions" },
  labelWorkflow: { zh: "魔法流程", en: "Workflow" },
  labelQuizSource: { zh: "测验来源", en: "Quiz source" },
  labelQuestion: { zh: "问题", en: "Question" },
  labelProfile: { zh: "密室", en: "Chamber" },
  labelCaptured: { zh: "已收录", en: "Captured" },
  labelDomains: { zh: "领域", en: "Domains" },
  labelTopTags: { zh: "热门标签", en: "Top tags" },
  labelCardsStored: { zh: "张知识卡片已入库", en: "Knowledge cards stored" },
  labelAreasOfLearning: { zh: "个学习领域", en: "Areas of learning" },
  labelAddMore: { zh: "继续积累，趋势即将浮现", en: "Add more content to see trends" },

  // Empty states
  emptyLibraryTitle: { zh: "✨ 图书馆还是空的", en: "✨ No cards yet" },
  emptyLibraryBody: { zh: "去猫头鹰邮局投递素材吧，AI 会为你生成知识卡片。", en: "Start from Owl Post with text, links, or screenshots. Your AI summaries will appear here." },
  emptyReviewTitle: { zh: "🔮 暂无待复习的记忆", en: "🔮 Nothing to review" },
  emptyReviewBody: { zh: "先去分析一条笔记，冥想盆会帮你安排复习节奏。", en: "Analyze your first note, then come back for spaced reflection." },
  emptyQuizBody: { zh: "还没有测验，点击生成来检验记忆吧。", en: "No quiz yet. Generate one to practice recall from this card." },
  emptyQuizTitle: { zh: "未选择卡片", en: "No card selected" },
  emptyQuizTitleBody: { zh: "先选一张知识卡片，再从中生成测验。", en: "Open a knowledge card first, then generate a quiz from it." },
  emptyMapTitle: { zh: "🌙 星图尚未点亮", en: "🌙 Knowledge map is empty" },
  emptyMapBody: { zh: "积累更多卡片，知识领域会自动在此聚合。", en: "As cards accumulate, domains will organize themselves here." },

  // Workflow
  workflow1Title: { zh: "1 · 捕获", en: "1 · Capture" },
  workflow1Body: { zh: "截图、链接或文字，随手投递，零负担。", en: "Screenshot, link, or text goes in with zero ceremony." },
  workflow2Title: { zh: "2 · 提炼", en: "2 · Distill" },
  workflow2Body: { zh: "AI 自动生成标题、摘要、标签、洞察与延伸问题。", en: "AI returns title, summary, tags, insights, and next questions." },
  workflow3Title: { zh: "3 · 复习", en: "3 · Review" },
  workflow3Body: { zh: "通过测验和间隔复习，把知识变成长期记忆。", en: "Turn saved knowledge into repeatable recall via quiz and review." },

  // Misc
  analyzeHint: { zh: "AI 将输出摘要、洞察、标签和延伸问题。", en: "Structured output includes summary, insights, tags, domain, and follow-up questions." },
  profileName: { zh: "Magic Note 巫师", en: "Magic Note User" },
  profileFocus: { zh: "将灵感化为知识", en: "Turn captures into knowledge" },
  pwaReady: { zh: "基于 Cloudflare Pages 的 PWA", en: "PWA-ready on Cloudflare Pages" },
  quizGeneratedFor: { zh: "测验来自", en: "Quiz generated for" },
  errorPasteText: { zh: "请先粘贴一些文字。", en: "Please paste some text first." },
  errorEnterLink: { zh: "请输入有效链接。", en: "Please enter a valid link." },
  errorSelectImage: { zh: "请选择一张图片。", en: "Please select an image to upload." },
  errorGeneric: { zh: "出了点问题，请重试。", en: "Something went wrong." },
  errorQuiz: { zh: "测验生成失败，请重试。", en: "Quiz generation failed." },
} as const;

export type TKey = keyof typeof translations;

export function t(key: TKey, lang: Lang): string {
  return translations[key]?.[lang] ?? key;
}
