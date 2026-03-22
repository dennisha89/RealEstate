"use client";

// 3 UI languages. International market DATA support (Thailand, Taiwan, UK, etc.)
// is handled by data engines + currency formatters, not i18n.
export type Locale = "en" | "vi" | "zh";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "EN",
  vi: "VI",
  zh: "ZH",
};

export const LOCALE_DISPLAY: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文 (简体)",
};

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Nav
    "nav.dashboard": "Dashboard",
    "nav.analyze": "Analyze",
    "nav.markets": "Markets",
    "nav.discover": "Discover",
    "nav.pipeline": "Pipeline",
    "nav.simulator": "Simulator",
    "nav.rates": "Rates",
    "nav.coach": "Coach",
    "nav.settings": "Settings",

    // Dashboard
    "dash.greeting.morning": "Good morning",
    "dash.greeting.afternoon": "Good afternoon",
    "dash.greeting.evening": "Good evening",
    "dash.portfolio_up": "portfolio up",
    "dash.ytd": "YTD",
    "dash.next_move": "Your Next Move",
    "dash.next_move_desc":
      "123 Main St has been in pipeline 3 days. Market avg: 11 days. Act before someone else does.",
    "dash.make_offer": "Make Offer",
    "dash.quick_analyze": "Quick Analyze",
    "dash.enter_address": "Enter any US address...",
    "dash.trending": "Trending deals",
    "dash.rates_today": "Rates Today",
    "dash.buying_power": "Buying power",
    "dash.good_time_lock":
      "Good time to lock if you have a deal under contract.",
    "dash.market_signals": "Market Signals",
    "dash.explore_markets": "Explore Markets",
    "dash.pipeline": "Pipeline",
    "dash.view_pipeline": "View Pipeline",
    "dash.level": "Level",
    "dash.streak": "streak",
    "dash.next_achievement": "Next",

    // Common
    "common.buy": "BUY",
    "common.hold": "HOLD",
    "common.sell": "SELL",
    "common.pass": "PASS",
    "common.dig_deeper": "DIG DEEPER",
    "common.score": "Score",
    "common.cash_flow": "Cash Flow",
    "common.cap_rate": "Cap Rate",
    "common.dscr": "DSCR",
    "common.per_month": "/mo",
    "common.per_day": "/day",
    "common.bullish": "Bullish",
    "common.bearish": "Bearish",
    "common.neutral": "Neutral",
    "common.view_all": "View All",
    "common.loading": "Loading...",
    "common.search": "Search",
    "common.per_month_short": "/mo",
    "common.live": "Live",
    "common.refresh": "Refresh",
    "common.explore": "Explore",
    "common.re_analyze": "Re-analyze & Make Offer",
    "common.trending_now": "Trending now",
    "common.all_markets": "All markets",
    "common.view_all_pipeline": "View all",
    "common.next": "Next",

    // Metrics
    "metric.portfolio_value": "Portfolio Value",
    "metric.monthly_cf": "Monthly Cash Flow",
    "metric.total_equity": "Total Equity",
    "metric.median_price": "Median Price",
    "metric.yoy_appreciation": "YoY Appreciation",
    "metric.convergence": "Convergence",
    "metric.signals_bullish": "signals bullish",
    "metric.portfolio": "Portfolio",
    "metric.cash_flow": "Cash Flow",
    "metric.equity": "Equity",
    "metric.per_month": "per month",
    "metric.total": "total",
    "metric.30yr_fixed": "30-year fixed",

    // Markets
    "markets.title": "Markets",
    "markets.signal_convergence": "Signal Convergence",
    "markets.backtest_proof": "Backtest Proof",
    "markets.rankings": "Rankings",
    "markets.explore": "Explore",

    // Analyze
    "analyze.verdict": "Verdict",
    "analyze.what_you_pay": "What You Pay",
    "analyze.what_you_earn": "What You Earn",
    "analyze.key_metrics": "Key Metrics",
    "analyze.stress_test": "Stress Test",
    "analyze.monte_carlo": "Monte Carlo",
    "analyze.market_context": "Market Context",
    "analyze.financing": "Financing",

    // Pipeline
    "pipeline.deal_velocity": "Deal Velocity",
    "pipeline.opportunity_cost": "Opportunity Cost",
    "pipeline.cost_of_waiting": "Cost of Waiting",
    "pipeline.portfolio_impact": "If You Close This Deal",
    "pipeline.rate_sensitivity": "Rate Sensitivity",
    "pipeline.discovered": "Discovered",
    "pipeline.analyzing": "Analyzing",
    "pipeline.offer": "Offer",
    "pipeline.contract": "Contract",
    "pipeline.view_pipeline": "View Pipeline",

    // Simulator
    "sim.assumptions": "Assumptions",
    "sim.results": "Results",
    "sim.sensitivity": "Sensitivity",
    "sim.scenarios": "Scenarios",

    // AI
    "ai.insight": "AI Analysis",
    "ai.not_advice": "AI analysis is informational, not financial advice.",
    "ai.confidence": "Confidence",
    "ai.sources": "Sources",
    "ai.ask_anything": "Ask me anything",
    "ai.coach": "AI Coach",
    "ai.context_aware": "Context-aware",
    "ai.ask_placeholder": "Ask about any deal, market, or metric...",

    // Gamification
    "game.achievements": "Achievements",
    "game.unlocked": "unlocked",
    "game.xp_to_next": "XP to next level",
    "game.day_streak": "day streak",
    "game.level_progress": "Level Progress",

    // Language
    "lang.label": "Language",
    "lang.select": "Select language",
  },

  vi: {
    // Nav
    "nav.dashboard": "Bảng điều khiển",
    "nav.analyze": "Phân tích",
    "nav.markets": "Thị trường",
    "nav.discover": "Khám phá",
    "nav.pipeline": "Danh mục",
    "nav.simulator": "Mô phỏng",
    "nav.rates": "Lãi suất",
    "nav.coach": "Tư vấn AI",
    "nav.settings": "Cài đặt",

    // Dashboard
    "dash.greeting.morning": "Chào buổi sáng",
    "dash.greeting.afternoon": "Chào buổi chiều",
    "dash.greeting.evening": "Chào buổi tối",
    "dash.portfolio_up": "danh mục tăng",
    "dash.ytd": "từ đầu năm",
    "dash.next_move": "Bước tiếp theo",
    "dash.next_move_desc":
      "123 Main St đã ở trong danh mục 3 ngày. Trung bình thị trường: 11 ngày. Hành động trước khi người khác mua.",
    "dash.make_offer": "Đặt giá",
    "dash.quick_analyze": "Phân tích nhanh",
    "dash.enter_address": "Nhập địa chỉ bất kỳ tại Mỹ...",
    "dash.trending": "Giao dịch nổi bật",
    "dash.rates_today": "Lãi suất hôm nay",
    "dash.buying_power": "Sức mua",
    "dash.good_time_lock":
      "Thời điểm tốt để chốt lãi suất nếu bạn có hợp đồng.",
    "dash.market_signals": "Tín hiệu thị trường",
    "dash.explore_markets": "Khám phá thị trường",
    "dash.pipeline": "Danh mục giao dịch",
    "dash.view_pipeline": "Xem danh mục",
    "dash.level": "Cấp độ",
    "dash.streak": "chuỗi ngày",
    "dash.next_achievement": "Tiếp theo",

    // Common
    "common.buy": "MUA",
    "common.hold": "GIỮ",
    "common.sell": "BÁN",
    "common.pass": "BỎ QUA",
    "common.dig_deeper": "TÌM HIỂU THÊM",
    "common.score": "Điểm",
    "common.cash_flow": "Dòng tiền",
    "common.cap_rate": "Tỷ suất vốn hóa",
    "common.dscr": "DSCR",
    "common.per_month": "/tháng",
    "common.per_day": "/ngày",
    "common.bullish": "Tăng giá",
    "common.bearish": "Giảm giá",
    "common.neutral": "Trung tính",
    "common.view_all": "Xem tất cả",
    "common.loading": "Đang tải...",
    "common.search": "Tìm kiếm",
    "common.per_month_short": "/tháng",
    "common.live": "Trực tiếp",
    "common.refresh": "Làm mới",
    "common.explore": "Khám phá",
    "common.re_analyze": "Phân tích lại & Đặt giá",
    "common.trending_now": "Nổi bật hiện tại",
    "common.all_markets": "Tất cả thị trường",
    "common.view_all_pipeline": "Xem tất cả",
    "common.next": "Tiếp theo",

    // Metrics
    "metric.portfolio_value": "Giá trị danh mục",
    "metric.monthly_cf": "Dòng tiền hàng tháng",
    "metric.total_equity": "Tổng vốn chủ sở hữu",
    "metric.median_price": "Giá trung vị",
    "metric.yoy_appreciation": "Tăng trưởng năm/năm",
    "metric.convergence": "Hội tụ",
    "metric.signals_bullish": "tín hiệu tăng",
    "metric.portfolio": "Danh mục",
    "metric.cash_flow": "Dòng tiền",
    "metric.equity": "Vốn chủ sở hữu",
    "metric.per_month": "mỗi tháng",
    "metric.total": "tổng",
    "metric.30yr_fixed": "Cố định 30 năm",

    // Markets
    "markets.title": "Thị trường",
    "markets.signal_convergence": "Hội tụ tín hiệu",
    "markets.backtest_proof": "Bằng chứng kiểm tra",
    "markets.rankings": "Xếp hạng",
    "markets.explore": "Khám phá",

    // Analyze
    "analyze.verdict": "Kết luận",
    "analyze.what_you_pay": "Bạn trả",
    "analyze.what_you_earn": "Bạn kiếm được",
    "analyze.key_metrics": "Chỉ số chính",
    "analyze.stress_test": "Kiểm tra sức chịu đựng",
    "analyze.monte_carlo": "Mô phỏng Monte Carlo",
    "analyze.market_context": "Bối cảnh thị trường",
    "analyze.financing": "Tài chính",

    // Pipeline
    "pipeline.deal_velocity": "Tốc độ giao dịch",
    "pipeline.opportunity_cost": "Chi phí cơ hội",
    "pipeline.cost_of_waiting": "Chi phí chờ đợi",
    "pipeline.portfolio_impact": "Nếu bạn chốt giao dịch này",
    "pipeline.rate_sensitivity": "Độ nhạy lãi suất",
    "pipeline.discovered": "Phát hiện",
    "pipeline.analyzing": "Đang phân tích",
    "pipeline.offer": "Đặt giá",
    "pipeline.contract": "Hợp đồng",
    "pipeline.view_pipeline": "Xem danh mục",

    // Simulator
    "sim.assumptions": "Giả định",
    "sim.results": "Kết quả",
    "sim.sensitivity": "Độ nhạy",
    "sim.scenarios": "Kịch bản",

    // AI
    "ai.insight": "Phân tích AI",
    "ai.not_advice":
      "Phân tích AI chỉ mang tính thông tin, không phải tư vấn tài chính.",
    "ai.confidence": "Độ tin cậy",
    "ai.sources": "Nguồn",
    "ai.ask_anything": "Hỏi bất cứ điều gì",
    "ai.coach": "Tư vấn AI",
    "ai.context_aware": "Hiểu ngữ cảnh",
    "ai.ask_placeholder": "Hỏi về giao dịch, thị trường hoặc chỉ số...",

    // Gamification
    "game.achievements": "Thành tích",
    "game.unlocked": "đã mở khóa",
    "game.xp_to_next": "XP đến cấp tiếp theo",
    "game.day_streak": "chuỗi ngày",
    "game.level_progress": "Tiến độ cấp độ",

    // Language
    "lang.label": "Ngôn ngữ",
    "lang.select": "Chọn ngôn ngữ",
  },

  zh: {
    // Nav
    "nav.dashboard": "仪表板",
    "nav.analyze": "分析",
    "nav.markets": "市场",
    "nav.discover": "发现",
    "nav.pipeline": "交易管道",
    "nav.simulator": "模拟器",
    "nav.rates": "利率",
    "nav.coach": "AI顾问",
    "nav.settings": "设置",

    // Dashboard
    "dash.greeting.morning": "早上好",
    "dash.greeting.afternoon": "下午好",
    "dash.greeting.evening": "晚上好",
    "dash.portfolio_up": "投资组合上涨",
    "dash.ytd": "年初至今",
    "dash.next_move": "下一步行动",
    "dash.next_move_desc":
      "123 Main St 已在管道中3天。市场平均：11天。在其他人之前行动。",
    "dash.make_offer": "出价",
    "dash.quick_analyze": "快速分析",
    "dash.enter_address": "输入任何美国地址...",
    "dash.trending": "热门交易",
    "dash.rates_today": "今日利率",
    "dash.buying_power": "购买力",
    "dash.good_time_lock": "如果你有合同在手，现在是锁定利率的好时机。",
    "dash.market_signals": "市场信号",
    "dash.explore_markets": "探索市场",
    "dash.pipeline": "交易管道",
    "dash.view_pipeline": "查看管道",
    "dash.level": "等级",
    "dash.streak": "连续天数",
    "dash.next_achievement": "下一个",

    // Common
    "common.buy": "买入",
    "common.hold": "持有",
    "common.sell": "卖出",
    "common.pass": "放弃",
    "common.dig_deeper": "深入了解",
    "common.score": "评分",
    "common.cash_flow": "现金流",
    "common.cap_rate": "资本化率",
    "common.dscr": "偿债覆盖率",
    "common.per_month": "/月",
    "common.per_day": "/天",
    "common.bullish": "看涨",
    "common.bearish": "看跌",
    "common.neutral": "中性",
    "common.view_all": "查看全部",
    "common.loading": "加载中...",
    "common.search": "搜索",
    "common.per_month_short": "/月",
    "common.live": "实时",
    "common.refresh": "刷新",
    "common.explore": "探索",
    "common.re_analyze": "重新分析并出价",
    "common.trending_now": "当前热门",
    "common.all_markets": "全部市场",
    "common.view_all_pipeline": "查看全部",
    "common.next": "下一个",

    // Metrics
    "metric.portfolio_value": "投资组合价值",
    "metric.monthly_cf": "月现金流",
    "metric.total_equity": "总权益",
    "metric.median_price": "中位价格",
    "metric.yoy_appreciation": "同比增长",
    "metric.convergence": "信号汇聚",
    "metric.signals_bullish": "看涨信号",
    "metric.portfolio": "投资组合",
    "metric.cash_flow": "现金流",
    "metric.equity": "权益",
    "metric.per_month": "每月",
    "metric.total": "总计",
    "metric.30yr_fixed": "30年固定",

    // Markets
    "markets.title": "市场",
    "markets.signal_convergence": "信号汇聚",
    "markets.backtest_proof": "回测证据",
    "markets.rankings": "排名",
    "markets.explore": "探索",

    // Analyze
    "analyze.verdict": "结论",
    "analyze.what_you_pay": "你支付",
    "analyze.what_you_earn": "你赚取",
    "analyze.key_metrics": "关键指标",
    "analyze.stress_test": "压力测试",
    "analyze.monte_carlo": "蒙特卡洛模拟",
    "analyze.market_context": "市场背景",
    "analyze.financing": "融资方案",

    // Pipeline
    "pipeline.deal_velocity": "交易速度",
    "pipeline.opportunity_cost": "机会成本",
    "pipeline.cost_of_waiting": "等待成本",
    "pipeline.portfolio_impact": "如果你完成这笔交易",
    "pipeline.rate_sensitivity": "利率敏感度",
    "pipeline.discovered": "已发现",
    "pipeline.analyzing": "分析中",
    "pipeline.offer": "出价",
    "pipeline.contract": "合同",
    "pipeline.view_pipeline": "查看管道",

    // Simulator
    "sim.assumptions": "假设条件",
    "sim.results": "结果",
    "sim.sensitivity": "敏感度",
    "sim.scenarios": "情景分析",

    // AI
    "ai.insight": "AI分析",
    "ai.not_advice": "AI分析仅供参考，不构成财务建议。",
    "ai.confidence": "置信度",
    "ai.sources": "数据来源",
    "ai.ask_anything": "随便问我",
    "ai.coach": "AI顾问",
    "ai.context_aware": "上下文感知",
    "ai.ask_placeholder": "询问任何交易、市场或指标...",

    // Gamification
    "game.achievements": "成就",
    "game.unlocked": "已解锁",
    "game.xp_to_next": "距下一等级还需XP",
    "game.day_streak": "连续天数",
    "game.level_progress": "等级进度",

    // Language
    "lang.label": "语言",
    "lang.select": "选择语言",
  },
};

// END — only en/vi/zh. International market data support (Thailand, Taiwan, UK, etc.)
// is handled by data engines and currency formatters, not UI translations.

/* REMOVED: zh-TW, th, ms, ja, ko, es, fr, en-GB, en-AU translation blocks.
   These will be added when the user base expands to those markets. */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _REMOVED = "zh-TW";
