import { z } from 'zod';
import type { ContentCatalog } from '../types';
import type { LessonBook } from '../content/lessons/types';

const region = z.object({ x: z.number().min(0), y: z.number().min(0), width: z.number().positive(), height: z.number().positive() })
  .refine(value => value.x + value.width <= 1.000001 && value.y + value.height <= 1.000001, '图像区域越界');
const question = z.object({ id: z.string().min(1), prompt: z.string().min(1), options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().nonnegative(), feedback: z.string().min(1) })
  .refine(value => value.correctIndex < value.options.length, '答案编号超出选项');
const bookSchema = z.object({ id: z.string().min(1), themeId: z.string().min(1), version: z.number().int().positive(),
  title: z.string().min(1), sources: z.array(z.object({ id: z.string().min(1), title: z.string().min(1),
    url: z.union([z.string().url(), z.string().regex(/^\/assets\/[a-zA-Z0-9/_.-]+$/).refine(value => !value.includes('..'))]),
  })).min(1),
  units: z.array(z.object({ id: z.string().min(1), tabLabel: z.string().trim().min(1).max(12), title: z.string().min(1), lead: z.string().min(1).optional(),
    kind: z.enum(['locations', 'motifs', 'geometry', 'animals', 'composition', 'colors', 'review']),
    panels: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), title: z.string().min(1), body: z.string().min(1),
      imageAssetId: z.string().min(1), imageCaption: z.string().min(1), sourceIds: z.array(z.string()).min(1),
      focus: region.optional(), highlights: z.array(region).optional(), swatch: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
    })).min(1), question: question.optional(), questions: z.array(question).optional(),
  })).min(1),
});

export function parseLessonBook(input: unknown, catalog: ContentCatalog): LessonBook {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) throw new Error(`教学配置：${parsed.error.issues.map(issue => `${issue.path.join('.')} ${issue.message}`).join('；')}`);
  const book = parsed.data;
  if (!catalog.themes.some(theme => theme.id === book.themeId)) throw new Error(`教学主题不存在：${book.themeId}`);
  const assets = new Set(catalog.assets.map(asset => asset.id));
  const sourceIds = new Set(book.sources.map(source => source.id));
  if (sourceIds.size !== book.sources.length) throw new Error('教学来源编号重复');
  if (new Set(book.units.map(unit => unit.id)).size !== book.units.length) throw new Error('教学章节编号重复');
  for (const unit of book.units) {
    if (new Set(unit.panels.map(panel => panel.id)).size !== unit.panels.length) throw new Error(`教学 ${unit.id}：图卡编号重复`);
    for (const panel of unit.panels) {
      if (!assets.has(panel.imageAssetId)) throw new Error(`教学 ${unit.id}：图片不存在 ${panel.imageAssetId}`);
      for (const sourceId of panel.sourceIds) if (!sourceIds.has(sourceId)) throw new Error(`教学 ${unit.id}：来源不存在 ${sourceId}`);
    }
    const questions = [...(unit.question ? [unit.question] : []), ...(unit.questions ?? [])];
    if (new Set(questions.map(item => item.id)).size !== questions.length) throw new Error(`教学 ${unit.id}：问题编号重复`);
  }
  return book;
}
