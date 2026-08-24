import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function EditPage({ title, backLabel, onBack, children }: {
  title: string;
  backLabel: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <section className="edit-page">
      <button className="button ghost back-button" onClick={onBack}><ArrowLeft /> {backLabel}</button>
      <article className="card editor-card">
        <h1>{title}</h1>
        {children}
      </article>
    </section>
  );
}
