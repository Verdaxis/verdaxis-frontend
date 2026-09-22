export const SITE_ORIGIN = 'https://verdaxis.exchange';
export const SOCIAL_IMAGE_PATH = '/verdaxis-social-card.png';
export const SOCIAL_IMAGE_ALT = 'Verdaxis — Low Carbon Fuels Exchange';

export const SUPPORTED_PUBLIC_LANGUAGES = ['en', 'zh'] as const;
export type PublicLanguage = (typeof SUPPORTED_PUBLIC_LANGUAGES)[number];

interface LocalizedMetadata {
  title: string;
  description: string;
}

interface LocalizedRouteMetadata {
  en: LocalizedMetadata;
  zh: LocalizedMetadata;
}

export interface RouteMetadata extends LocalizedMetadata {
  language: PublicLanguage;
  robots: 'index,follow,max-image-preview:large' | 'noindex,nofollow,noarchive';
  canonical?: string;
  type: 'website' | 'article';
}

const publicRoutes: Record<string, LocalizedRouteMetadata> = {
  '': {
    en: {
      title: 'Low-Carbon Fuels Exchange | Verdaxis',
      description: 'Explore Verdaxis, a neutral digital marketplace for low-carbon fuel supply, demand, pricing, and compliance information.',
    },
    zh: {
      title: '低碳燃料交易平台 | Verdaxis',
      description: '探索 Verdaxis 低碳燃料交易平台，了解供需、价格发现与合规信息。',
    },
  },
  'how-it-works': {
    en: {
      title: 'How Verdaxis Works | Verdaxis',
      description: 'See how Verdaxis connects low-carbon fuel market participants through structured listings, transparent market information, and controlled execution.',
    },
    zh: {
      title: 'Verdaxis 如何运作 | Verdaxis',
      description: '了解 Verdaxis 如何通过结构化挂单、透明市场信息和受控执行连接低碳燃料市场参与者。',
    },
  },
  fuels: {
    en: {
      title: 'Low-Carbon Fuel Coverage | Verdaxis',
      description: 'Explore the maritime, aviation, and land-transport fuel pathways covered by Verdaxis.',
    },
    zh: {
      title: '低碳燃料范围 | Verdaxis',
      description: '了解 Verdaxis 覆盖的海运、航空和陆路运输低碳燃料路径。',
    },
  },
  'fuels/maritime': {
    en: {
      title: 'Maritime Fuel Coverage | Verdaxis',
      description: 'Compare low-carbon marine fuel types, production pathways, energy content, and environmental attributes.',
    },
    zh: {
      title: '海运低碳燃料 | Verdaxis',
      description: '比较低碳船用燃料类型、生产路径、能量含量和环境属性。',
    },
  },
  'fuels/aviation': {
    en: {
      title: 'Aviation Fuel Coverage | Verdaxis',
      description: 'Explore sustainable aviation fuels, feedstock pathways, and the environmental attributes used for market comparison.',
    },
    zh: {
      title: '航空可持续燃料 | Verdaxis',
      description: '了解可持续航空燃料、原料路径以及用于市场比较的环境属性。',
    },
  },
  'fuels/land': {
    en: {
      title: 'Land Transport Fuel Coverage | Verdaxis',
      description: 'Explore lower-carbon fuels for road transport and power applications, including their pathways and market attributes.',
    },
    zh: {
      title: '陆路运输低碳燃料 | Verdaxis',
      description: '了解道路运输和能源应用的低碳燃料、生产路径与市场属性。',
    },
  },
  compliance: {
    en: {
      title: 'Maritime Fuel Compliance | Verdaxis',
      description: 'Understand the maritime fuel compliance context Verdaxis uses for market information, including carbon intensity and regulatory exposure.',
    },
    zh: {
      title: '船用燃料合规 | Verdaxis',
      description: '了解 Verdaxis 市场信息所使用的船用燃料合规背景，包括碳强度和法规影响。',
    },
  },
  'for-producers': {
    en: {
      title: 'Verdaxis for Fuel Producers | Verdaxis',
      description: 'Learn how low-carbon fuel producers can present supply, qualification details, and future capacity to market participants.',
    },
    zh: {
      title: '面向燃料生产商 | Verdaxis',
      description: '了解低碳燃料生产商如何向市场参与者展示供应、资质信息和未来产能。',
    },
  },
  'for-buyers': {
    en: {
      title: 'Verdaxis for Fuel Buyers | Verdaxis',
      description: 'Learn how fuel buyers can compare qualified low-carbon supply, market context, and compliance-related attributes.',
    },
    zh: {
      title: '面向燃料买家 | Verdaxis',
      description: '了解燃料买家如何比较符合条件的低碳供应、市场背景和合规属性。',
    },
  },
  'for-traders': {
    en: {
      title: 'Verdaxis for Fuel Traders | Verdaxis',
      description: 'Learn how professional fuel traders can monitor structured low-carbon markets and access transparent price information.',
    },
    zh: {
      title: '面向燃料交易商 | Verdaxis',
      description: '了解专业燃料交易商如何监测结构化低碳市场并获取透明价格信息。',
    },
  },
  'for-financiers': {
    en: {
      title: 'Verdaxis for Financiers | Verdaxis',
      description: 'Learn how financiers and auditors can review low-carbon fuel market, qualification, and compliance information.',
    },
    zh: {
      title: '面向金融机构与审计方 | Verdaxis',
      description: '了解金融机构和审计方如何查看低碳燃料市场、资质和合规信息。',
    },
  },
  governance: {
    en: {
      title: 'Governance and Trust | Verdaxis',
      description: 'Review the governance principles and role boundaries intended to support a neutral low-carbon fuel marketplace.',
    },
    zh: {
      title: '治理与信任 | Verdaxis',
      description: '了解用于支持中立低碳燃料市场的治理原则和角色边界。',
    },
  },
  pilot: {
    en: {
      title: 'Verdaxis Pilot Programme | Verdaxis',
      description: 'Learn about the Verdaxis pilot programme, its current scope, and the types of market participants it is intended to support.',
    },
    zh: {
      title: 'Verdaxis 试点计划 | Verdaxis',
      description: '了解 Verdaxis 试点计划的当前范围以及计划支持的市场参与者类型。',
    },
  },
  partners: {
    en: {
      title: 'Industry Partners | Verdaxis',
      description: 'Learn about the industry relationships and market resources Verdaxis is developing for the low-carbon fuel ecosystem.',
    },
    zh: {
      title: '行业合作伙伴 | Verdaxis',
      description: '了解 Verdaxis 正在为低碳燃料生态系统建立的行业合作关系和市场资源。',
    },
  },
  education: {
    en: {
      title: 'Low-Carbon Fuel Education | Verdaxis',
      description: 'Read practical explainers about carbon intensity, fuel compliance, environmental claims, and low-carbon fuel markets.',
    },
    zh: {
      title: '低碳燃料知识 | Verdaxis',
      description: '阅读有关碳强度、燃料合规、环境声明和低碳燃料市场的实用解读。',
    },
  },
  roadmap: {
    en: {
      title: 'Platform Roadmap | Verdaxis',
      description: 'Review the planned sequence for Verdaxis market, verification, matching, and compliance capabilities.',
    },
    zh: {
      title: '平台路线图 | Verdaxis',
      description: '了解 Verdaxis 市场、核验、匹配和合规能力的计划实施顺序。',
    },
  },
  'tools/energy-calculator': {
    en: {
      title: 'Fuel Energy Calculator | Verdaxis',
      description: 'Compare marine fuels by energy content and examine how fuel properties can affect voyage and compliance costs.',
    },
    zh: {
      title: '燃料能量计算器 | Verdaxis',
      description: '按能量含量比较船用燃料，并了解燃料属性可能对航次和合规成本产生的影响。',
    },
  },
  'map/producers': {
    en: {
      title: 'Low-Carbon Fuel Project Map | Verdaxis',
      description: 'Explore a public map of low-carbon fuel production projects by location, pathway, status, and timeline.',
    },
    zh: {
      title: '低碳燃料项目地图 | Verdaxis',
      description: '按地点、生产路径、状态和时间查看公开的低碳燃料生产项目地图。',
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy | Verdaxis',
      description: 'Read the Verdaxis privacy policy and learn how account, platform, and technical information is handled.',
    },
    zh: {
      title: '隐私政策 | Verdaxis',
      description: '阅读 Verdaxis 隐私政策，了解账户、平台和技术信息的处理方式。',
    },
  },
  terms: {
    en: {
      title: 'Terms of Service | Verdaxis',
      description: 'Read the terms that govern access to and use of the Verdaxis platform.',
    },
    zh: {
      title: '服务条款 | Verdaxis',
      description: '阅读适用于访问和使用 Verdaxis 平台的服务条款。',
    },
  },
};

export const EDUCATION_SLUGS = [
  'what-is-carbon-intensity',
  'physical-vs-book-and-claim',
  'compliance-vs-credits',
  'scope-3-claims',
  'energy-content-matters',
  'fueleu-maritime-guide',
] as const;

const educationRoutes: Record<(typeof EDUCATION_SLUGS)[number], LocalizedRouteMetadata> = {
  'what-is-carbon-intensity': {
    en: { title: 'What Is Carbon Intensity? | Verdaxis', description: 'Learn how carbon intensity is measured and why it matters for low-carbon fuel pricing, procurement, and compliance.' },
    zh: { title: '什么是碳强度？ | Verdaxis', description: '了解碳强度的计算方法，以及它对低碳燃料定价、采购和合规的重要性。' },
  },
  'physical-vs-book-and-claim': {
    en: { title: 'Physical vs Book and Claim | Verdaxis', description: 'Understand how physical delivery and Book and Claim transfer environmental value, evidence, and chain-of-custody information.' },
    zh: { title: '实物交付与 Book and Claim | Verdaxis', description: '了解实物交付与 Book and Claim 如何转移环境价值、证据和产销监管链信息。' },
  },
  'compliance-vs-credits': {
    en: { title: 'Compliance vs Carbon Credits | Verdaxis', description: 'Learn the difference between mandatory environmental compliance and voluntary carbon credits in fuel markets.' },
    zh: { title: '合规与碳信用的区别 | Verdaxis', description: '了解燃料市场中强制性环境合规与自愿碳信用之间的区别。' },
  },
  'scope-3-claims': {
    en: { title: 'Making Scope 3 Claims Safely | Verdaxis', description: 'Learn what reliable Scope 3 fuel claims require from carbon-intensity data, chain of custody, and controls against double counting.' },
    zh: { title: '如何安全进行范围 3 声明 | Verdaxis', description: '了解可靠的范围 3 燃料声明对碳强度数据、产销监管链和防止重复计算控制的要求。' },
  },
  'energy-content-matters': {
    en: { title: 'Why Fuel Energy Content Matters | Verdaxis', description: 'Learn why price per tonne can hide differences in usable energy and total voyage cost between marine fuels.' },
    zh: { title: '燃料能量含量为何重要 | Verdaxis', description: '了解为什么每吨价格可能掩盖船用燃料在可用能量和航次总成本方面的差异。' },
  },
  'fueleu-maritime-guide': {
    en: { title: 'FuelEU Maritime Guide for Buyers | Verdaxis', description: 'Review the core FuelEU Maritime concepts that affect fuel procurement, greenhouse-gas intensity, and compliance planning.' },
    zh: { title: '燃料买家 FuelEU Maritime 指南 | Verdaxis', description: '了解影响燃料采购、温室气体强度和合规规划的 FuelEU Maritime 核心概念。' },
  },
};

const privateRoutes: Array<{ pattern: RegExp; copy: LocalizedRouteMetadata }> = [
  { pattern: /^\/login\/?$/, copy: privateCopy('Sign In', '登录', 'Access your Verdaxis account.', '访问您的 Verdaxis 账户。') },
  { pattern: /^\/register\/?$/, copy: privateCopy('Create an Account', '注册账户', 'Create a Verdaxis account to begin platform onboarding.', '创建 Verdaxis 账户以开始平台入驻。') },
  { pattern: /^\/invite(?:\/[^/]+)?\/?$/, copy: privateCopy('Invitation', '邀请', 'Continue a private Verdaxis invitation.', '继续处理 Verdaxis 私密邀请。') },
  { pattern: /^\/verify-email\/?$/, copy: privateCopy('Email Verification', '邮箱验证', 'Complete or review email verification for a Verdaxis account.', '完成或查看 Verdaxis 账户的邮箱验证。') },
  { pattern: /^\/forgot-password\/?$/, copy: privateCopy('Reset Access', '重置访问权限', 'Request a password reset for a Verdaxis account.', '为 Verdaxis 账户申请重置密码。') },
  { pattern: /^\/reset-password\/?$/, copy: privateCopy('Set a New Password', '设置新密码', 'Set a new password using a private account recovery link.', '使用私密账户恢复链接设置新密码。') },
  { pattern: /^\/accept-invite\/?$/, copy: privateCopy('Accept Invitation', '接受邀请', 'Complete a private invitation to a Verdaxis organization.', '完成 Verdaxis 组织的私密邀请。') },
  { pattern: /^\/thank-you\/?$/, copy: privateCopy('Next Steps', '后续步骤', 'Review the next steps for Verdaxis account onboarding.', '查看 Verdaxis 账户入驻的后续步骤。') },
  { pattern: /^\/onboarding\/?$/, copy: privateCopy('Account Setup', '账户设置', 'Complete your private Verdaxis account profile.', '完成您的 Verdaxis 私密账户资料。') },
  { pattern: /^\/create-organization\/?$/, copy: privateCopy('Organization Setup', '组织设置', 'Set up an organization for your Verdaxis account.', '为您的 Verdaxis 账户设置组织。') },
  { pattern: /^\/kyc\/?$/, copy: privateCopy('Identity Verification', '身份验证', 'Complete identity verification for your Verdaxis account.', '完成 Verdaxis 账户的身份验证。') },
  { pattern: /^\/partners-preview\/?$/, copy: privateCopy('Partner Preview', '合作伙伴预览', 'Private partner presentation for review.', '供审阅的私密合作伙伴展示。') },
  { pattern: /^\/app\/?$/, copy: privateCopy('Platform Workspace', '平台工作区', 'Access the private Verdaxis platform workspace.', '访问 Verdaxis 私密平台工作区。') },
  { pattern: /^\/app\/home\/?$/, copy: privateCopy('Command Center', '指挥中心', 'Review private market activity and account actions.', '查看私密市场活动和账户操作。') },
  { pattern: /^\/app\/map\/?$/, copy: privateCopy('Intelligence Map', '情报地图', 'Review private market and port intelligence.', '查看私密市场和港口情报。') },
  { pattern: /^\/app\/(?:marketplace|m\/[^/]+\/[^/]+\/[^/]+)\/?$/, copy: privateCopy('Marketplace', '市场', 'Access the private Verdaxis low-carbon fuel marketplace.', '访问 Verdaxis 私密低碳燃料市场。') },
  { pattern: /^\/app\/curve\/?$/, copy: privateCopy('Forward Curve', '远期曲线', 'Monitor private forward-market information.', '监测私密远期市场信息。') },
  { pattern: /^\/app\/watchlist\/?$/, copy: privateCopy('Watchlist', '关注列表', 'Review private tracked market slices and events.', '查看私密关注市场切片和事件。') },
  { pattern: /^\/app\/analytics\/?$/, copy: privateCopy('Market Analytics', '市场分析', 'Review private supply-and-demand analytics.', '查看私密供需分析。') },
  { pattern: /^\/app\/trades\/?$/, copy: privateCopy('Trade History', '交易历史', 'Review private account trade activity.', '查看私密账户交易活动。') },
  { pattern: /^\/app\/rfqs\/?$/, copy: privateCopy('B100 RFQs', 'B100 询价', 'Review private UCOME B100 requests and supplier quotes.', '查看私密 UCOME B100 询价及供应商报价。') },
  { pattern: /^\/app\/quotes\/?$/, copy: privateCopy('Quotes', '报价', 'Review private supplier quote activity.', '查看私密供应商报价活动。') },
  { pattern: /^\/app\/compliance\/?$/, copy: privateCopy('Compliance', '合规', 'Review private fleet compliance information.', '查看私密船队合规信息。') },
  { pattern: /^\/app\/training\/?$/, copy: privateCopy('Training', '培训', 'Access private alternative-fuel training resources.', '访问私密替代燃料培训资源。') },
  { pattern: /^\/app\/settings\/?$/, copy: privateCopy('Settings', '设置', 'Manage private Verdaxis account and organization settings.', '管理私密 Verdaxis 账户和组织设置。') },
  { pattern: /^\/app\/admin(?:\/.*)?$/, copy: privateCopy('Administration', '管理', 'Access private Verdaxis administration tools.', '访问私密 Verdaxis 管理工具。') },
  { pattern: /^\/admin(?:\/.*)?$/, copy: privateCopy('Administration', '管理', 'Access private Verdaxis administration tools.', '访问私密 Verdaxis 管理工具。') },
];

function privateCopy(enTitle: string, zhTitle: string, enDescription: string, zhDescription: string): LocalizedRouteMetadata {
  return {
    en: { title: `${enTitle} | Verdaxis`, description: enDescription },
    zh: { title: `${zhTitle} | Verdaxis`, description: zhDescription },
  };
}

const normalizePathname = (pathname: string): string => {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || '/';
  if (withoutQuery === '/') return '/';
  return `/${withoutQuery.replace(/^\/+|\/+$/g, '')}`;
};

function publicRoute(pathname: string): { language: PublicLanguage; routeKey: string } | null {
  const normalized = normalizePathname(pathname);
  const match = normalized.match(/^\/(en|zh)(?:\/(.*))?$/);
  if (!match) return null;
  return { language: match[1] as PublicLanguage, routeKey: match[2] ?? '' };
}

export const INDEXABLE_PUBLIC_PATHS = SUPPORTED_PUBLIC_LANGUAGES.flatMap((language) => [
  ...Object.keys(publicRoutes).map((routeKey) => routeKey ? `/${language}/${routeKey}` : `/${language}/`),
  ...EDUCATION_SLUGS.map((slug) => `/${language}/education/${slug}`),
]);

export function isKnownPublicPath(pathname: string): boolean {
  const route = publicRoute(pathname);
  if (!route) return false;
  if (Object.hasOwn(publicRoutes, route.routeKey)) return true;
  if (!route.routeKey.startsWith('education/')) return false;
  return Object.hasOwn(educationRoutes, route.routeKey.slice('education/'.length));
}

export function resolveRouteMetadata(pathname: string, preferredLanguage: string = 'en'): RouteMetadata {
  const route = publicRoute(pathname);
  if (route) {
    const educationSlug = route.routeKey.startsWith('education/')
      ? route.routeKey.slice('education/'.length) as keyof typeof educationRoutes
      : null;
    const fixedMetadata = Object.hasOwn(publicRoutes, route.routeKey) ? publicRoutes[route.routeKey] : undefined;
    const articleMetadata = educationSlug && Object.hasOwn(educationRoutes, educationSlug)
      ? educationRoutes[educationSlug]
      : undefined;
    const localized = fixedMetadata ?? articleMetadata;
    if (localized) {
      const copy = localized[route.language];
      return {
        ...copy,
        language: route.language,
        robots: 'index,follow,max-image-preview:large',
        canonical: `${SITE_ORIGIN}${route.routeKey ? `/${route.language}/${route.routeKey}` : `/${route.language}/`}`,
        type: educationSlug ? 'article' : 'website',
      };
    }

    if (/^partners\/[^/]+$/.test(route.routeKey)) {
      const copy = privateCopy('Partner Information', '合作伙伴信息', 'Review Verdaxis partner information.', '查看 Verdaxis 合作伙伴信息。')[route.language];
      return { ...copy, language: route.language, robots: 'noindex,nofollow,noarchive', type: 'website' };
    }
  }

  const language: PublicLanguage = preferredLanguage.split('-')[0] === 'zh' ? 'zh' : 'en';
  const privateRoute = privateRoutes.find(({ pattern }) => pattern.test(normalizePathname(pathname)));
  if (privateRoute) {
    return {
      ...privateRoute.copy[language],
      language,
      robots: 'noindex,nofollow,noarchive',
      type: 'website',
    };
  }

  const copy = language === 'zh'
    ? { title: '页面未找到 | Verdaxis', description: '找不到您请求的页面。' }
    : { title: 'Page Not Found | Verdaxis', description: 'The requested page could not be found.' };
  return { ...copy, language, robots: 'noindex,nofollow,noarchive', type: 'website' };
}

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

export function renderMetadataTags(metadata: RouteMetadata, forceNoIndex = false): string {
  const robots = forceNoIndex ? 'noindex,nofollow,noarchive' : metadata.robots;
  const canonical = metadata.canonical;
  const socialImage = `${SITE_ORIGIN}${SOCIAL_IMAGE_PATH}`;
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : '',
    '<meta property="og:site_name" content="Verdaxis" />',
    `<meta property="og:type" content="${metadata.type}" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : '',
    `<meta property="og:locale" content="${metadata.language === 'zh' ? 'zh_CN' : 'en_SG'}" />`,
    `<meta property="og:image" content="${socialImage}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(SOCIAL_IMAGE_ALT)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`,
    `<meta name="twitter:image" content="${socialImage}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(SOCIAL_IMAGE_ALT)}" />`,
  ];
  return tags.filter(Boolean).join('\n    ');
}

export function renderRouteHtml(html: string, metadata: RouteMetadata, forceNoIndex = false): string {
  const start = '<!-- route-metadata:start -->';
  const end = '<!-- route-metadata:end -->';
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex) throw new Error('index.html route metadata markers are missing');
  const before = html.slice(0, startIndex + start.length);
  const after = html.slice(endIndex);
  return `${before}\n    ${renderMetadataTags(metadata, forceNoIndex)}\n    ${after}`
    .replace(/<html lang="[^"]*">/, `<html lang="${metadata.language}">`);
}
