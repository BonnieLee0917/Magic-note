export type Lang = "zh" | "en";

const translations = {
  // App
  appName: { zh: "Magic Note", en: "Magic Note" },
  appTagline: { zh: "捕获一次，提炼精华，从容复习", en: "Capture once. Distill fast. Review with calm focus." },
  appSubtitle: { zh: "静谧知识殿堂", en: "Quiet knowledge" },

  // Nav
  navInbox: { zh: "🦉 猫头鹰邮局", en: "🦉 Owl Post" },
  navLibrary: { zh: "📜 咒语图书馆", en: "📜 Spell Library" },
  navReview: { zh: "🔮 冥想盆", en: "🔮 Pensieve" },
  navQuiz: { zh: "⚡ 魔法测验", en: "⚡ Spell Quiz" },
  navMap: { zh: "🌙 星图", en: "🌙 Star Map" },
  navProfile: { zh: "🗝️ 密室", en: "🗝️ Chamber" },

  // Headers
  headerInbox: { zh: "捕获值得记住的一切", en: "Capture what matters" },
  headerLibrary: { zh: "知识卡片图书馆", en: "A clean library of insights" },
  headerReview: { zh: "重温值得保留的想法", en: "Revisit the ideas worth keeping" },
  headerQuiz: { zh: "测验你真正学到了什么", en: "Test what you actually learned" },
  headerMap: { zh: "按领域查看你的知识", en: "See your knowledge by domain" },
  headerProfile: { zh: "你的学习节奏", en: "Your study rhythm" },

  // Sub headers
  subHeader: { zh: "极简设计，AI 替你处理繁重工作，界面只留安静。", en: "Minimal by design. AI handles the heavy lifting; the interface stays out of the way." },

  // Input modes
  modeText: { zh: "📝 文字", en: "📝 Text" },
  modeLink: { zh: "🔗 链接", en: "🔗 Link" },
  modeScreenshot: { zh: "📷 截图", en: "📷 Screenshot" },

  // Placeholders
  placeholderText: { zh: "粘贴一段文章摘录、会议笔记或想保留的灵感…", en: "Paste an article excerpt, meeting note, or idea you want to keep." },
  placeholderLink: { zh: "https://example.com/article", en: "https://example.com/article" },
  placeholderImage: { zh: "选择一张截图", en: "Select a screenshot" },
  placeholderImageSub: { zh: "PNG 或 JPG → 转为 base64 → AI 分析", en: "PNG or JPG → convert to base64 → analyze with AI" },
  noFile: { zh: "未选择文件", en: "No file selected" },

  // Buttons
  btnAnalyze: { zh: "✨ AI 分析", en: "✨ Analyze with AI" },
  btnQuiz: { zh: "测验", en: "Quiz" },
  btnGenerateQuiz: { zh: "⚡ 生成 AI 测验", en: "⚡ Generate AI quiz" },
  btnOpenCard: { zh: "打开卡片", en: "Open card" },

  // Labels
  labelDashboard: { zh: "仪表盘", en: "Dashboard" },
  labelCards: { zh: "卡片", en: "Cards" },
  labelReview: { zh: "复习", en: "Review" },
  labelQuizReady: { zh: "可测验", en: "Quiz ready" },
  labelTopDomain: { zh: "热门领域", en: "Top domain" },
  labelNoDomain: { zh: "暂无领域", en: "No domain yet" },
  labelSelectedCard: { zh: "选中的卡片", en: "Selected card" },
  labelWaiting: { zh: "等待你的第一张卡片", en: "Waiting for your first card" },
  labelKeyInsights: { zh: "关键洞察", en: "Key insights" },
  labelFollowUp: { zh: "后续问题", en: "Follow-up questions" },
  labelWorkflow: { zh: "工作流", en: "Workflow" },
  labelQuizSource: { zh: "测验来源", en: "Quiz source" },
  labelQuestion: { zh: "问题", en: "Question" },
  labelProfile: { zh: "密室", en: "Chamber" },
  labelCaptured: { zh: "已捕获", en: "Captured" },
  labelDomains: { zh: "领域", en: "Domains" },
  labelTopTags: { zh: "热门标签", en: "Top tags" },
  labelCardsStored: { zh: "知识卡片已存储", en: "Knowledge cards stored" },
  labelAreasOfLearning: { zh: "学习领域", en: "Areas of learning" },
  labelAddMore: { zh: "添加更多内容以查看趋势", en: "Add more content to see trends" },

  // Empty states
  emptyLibraryTitle: { zh: "✨ 还没有卡片", en: "✨ No cards yet" },
  emptyLibraryBody: { zh: "从猫头鹰邮局开始，用文字、链接或截图。AI 摘要将出现在这里。", en: "Start from Owl Post with text, links, or screenshots. Your AI summaries will appear here." },
  emptyReviewTitle: { zh: "🔮 暂无需要复习的", en: "🔮 Nothing to review" },
  emptyReviewBody: { zh: "分析你的第一条笔记，然后回来进行间隔复习。", en: "Analyze your first note, then come back for spaced reflection." },
  emptyQuizBody: { zh: "暂无测验。生成一个来练习回忆吧。", en: "No quiz yet. Generate one to practice recall from this card." },
  emptyQuizTitle: { zh: "未选择卡片", en: "No card selected" },
  emptyQuizTitleBody: { zh: "先打开一张知识卡片，然后从中生成测验。", en: "Open a knowledge card first, then generate a quiz from it." },
  emptyMapTitle: { zh: "🌙 星图为空", en: "🌙 Knowledge map is empty" },
  emptyMapBody: { zh: "随着卡片积累，领域会自动在这里组织。", en: "As cards accumulate, domains will organize themselves here." },

  // Workflow
  workflow1Title: { zh: "1 · 捕获", en: "1 · Capture" },
  workflow1Body: { zh: "截图、链接或文字，零仪式直接输入。", en: "Screenshot, link, or text goes in with zero ceremony." },
  workflow2Title: { zh: "2 · 提炼", en: "2 · Distill" },
  workflow2Body: { zh: "AI 返回标题、摘要、标签、洞察和后续问题。", en: "AI returns title, summary, tags, insights, and next questions." },
  workflow3Title: { zh: "3 · 复习", en: "3 · Review" },
  workflow3Body: { zh: "通过测验和复习将知识转化为可重复的记忆。", en: "Turn saved knowledge into repeatable recall via quiz and review." },

  // Misc
  analyzeHint: { zh: "结构化输出包括摘要、洞察、标签、领域和后续问题。", en: "Structured output includes summary, insights, tags, domain, and follow-up questions." },
  profileName: { zh: "Magic Note 用户", en: "Magic Note User" },
  profileFocus: { zh: "将捕获转化为知识", en: "Turn captures into knowledge" },
  pwaReady: { zh: "基于 Cloudflare Pages 的 PWA", en: "PWA-ready on Cloudflare Pages" },
  quizGeneratedFor: { zh: "测验生成自", en: "Quiz generated for" },
  errorPasteText: { zh: "请先粘贴一些文字。", en: "Please paste some text first." },
  errorEnterLink: { zh: "请输入有效链接。", en: "Please enter a valid link." },
  errorSelectImage: { zh: "请选择一张图片上传。", en: "Please select an image to upload." },
  errorGeneric: { zh: "出了点问题。", en: "Something went wrong." },
  errorQuiz: { zh: "测验生成失败。", en: "Quiz generation failed." },
} as const;

export type TKey = keyof typeof translations;

export function t(key: TKey, lang: Lang): string {
  return translations[key]?.[lang] ?? key;
}
