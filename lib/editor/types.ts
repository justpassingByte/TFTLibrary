// ─── Block Types ─────────────────────────────────────────────────────────────

export type BlockType =
  | 'paragraph'
  | 'heading-1'
  | 'heading-2'
  | 'image'
  | 'list'
  | 'callout';

export interface ParagraphContent {
  text: string;
}

export interface HeadingContent {
  text: string;
}

export interface ImageContent {
  url: string;
  alt?: string;
  caption?: string;
}

export interface ListContent {
  items: string[];
  ordered: boolean;
}

export interface CalloutContent {
  text: string;
  variant: 'info' | 'tip' | 'warning' | 'danger';
}

export type BlockContent =
  | ParagraphContent
  | HeadingContent
  | ImageContent
  | ListContent
  | CalloutContent;

export interface Block {
  id: string;
  type: BlockType;
  content: BlockContent;
}

// ─── Article Model ────────────────────────────────────────────────────────────

export type ArticleStatus = 'draft' | 'published';

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readTime: string;
  status: ArticleStatus;
  blocks: Block[];
}

// ─── AI Assist ────────────────────────────────────────────────────────────────

export type AIAction = 'rewrite' | 'expand' | 'summarize' | 'generate';

export interface AIAssistRequest {
  text: string;
  action: AIAction;
  context?: string; // article title / surrounding block content
}

export interface AIAssistResponse {
  result: string;
  action: AIAction;
}
