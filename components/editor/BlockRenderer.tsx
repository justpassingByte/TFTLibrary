import type { Block, ParagraphContent, HeadingContent, ImageContent, ListContent, CalloutContent } from '@/lib/editor/types';
import { Info, Lightbulb, AlertTriangle, Flame } from 'lucide-react';

// ─── Individual Block Renderers ───────────────────────────────────────────────

function RenderParagraph({ content }: { content: ParagraphContent }) {
  return <p className="article-paragraph">{content.text}</p>;
}

function RenderHeading1({ content }: { content: HeadingContent }) {
  return <h2 className="article-h1">{content.text}</h2>;
}

function RenderHeading2({ content }: { content: HeadingContent }) {
  return <h3 className="article-h2">{content.text}</h3>;
}

function RenderImage({ content }: { content: ImageContent }) {
  if (!content.url) return null;
  return (
    <figure className="article-figure">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={content.url} alt={content.alt ?? ''} className="article-img" />
      {content.caption && <figcaption className="article-caption">{content.caption}</figcaption>}
    </figure>
  );
}

function RenderList({ content }: { content: ListContent }) {
  const Tag = content.ordered ? 'ol' : 'ul';
  return (
    <Tag className={`article-list ${content.ordered ? 'article-list--ordered' : 'article-list--unordered'}`}>
      {content.items.map((item, i) => (
        <li key={i} className="article-list-item">{item}</li>
      ))}
    </Tag>
  );
}

const CALLOUT_CONFIG = {
  info: { Icon: Info, cls: 'article-callout--info' },
  tip: { Icon: Lightbulb, cls: 'article-callout--tip' },
  warning: { Icon: AlertTriangle, cls: 'article-callout--warning' },
  danger: { Icon: Flame, cls: 'article-callout--danger' },
} as const;

function RenderCallout({ content }: { content: CalloutContent }) {
  const cfg = CALLOUT_CONFIG[content.variant] ?? CALLOUT_CONFIG.info;
  const { Icon } = cfg;
  return (
    <div className={`article-callout ${cfg.cls}`}>
      <Icon size={18} className="article-callout-icon" />
      <p className="article-callout-text">{content.text}</p>
    </div>
  );
}

// ─── Main Render Engine ───────────────────────────────────────────────────────

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="article-body">
      {blocks.map((block) => {
        switch (block.type) {
          case 'paragraph':
            return <RenderParagraph key={block.id} content={block.content as ParagraphContent} />;
          case 'heading-1':
            return <RenderHeading1 key={block.id} content={block.content as HeadingContent} />;
          case 'heading-2':
            return <RenderHeading2 key={block.id} content={block.content as HeadingContent} />;
          case 'image':
            return <RenderImage key={block.id} content={block.content as ImageContent} />;
          case 'list':
            return <RenderList key={block.id} content={block.content as ListContent} />;
          case 'callout':
            return <RenderCallout key={block.id} content={block.content as CalloutContent} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
