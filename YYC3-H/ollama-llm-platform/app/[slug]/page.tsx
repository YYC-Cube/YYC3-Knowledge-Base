import { loadTemplates, loadModelConfig } from '@/lib/data-loader';
import LLMPageClient from './LLMPageClient';

export default async function LLMPage({ params }: { params: { slug: string } }) {
  const templates = await loadTemplates(params.slug);
  const modelConfig = await loadModelConfig();
  return <LLMPageClient initialTemplates={templates} modelConfig={modelConfig} />;
}