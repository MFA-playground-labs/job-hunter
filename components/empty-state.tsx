import { PageState } from "@/components/page-state";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <PageState title={title} description={description} />;
}

export function ErrorState({ message }: { message: string }) {
  return <PageState kind="error" title="Couldn’t load data" description={message} />;
}
