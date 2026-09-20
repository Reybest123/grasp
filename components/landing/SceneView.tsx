import { ExplainScene } from "@/components/landing/scenes/ExplainScene";
import { QuizScene } from "@/components/landing/scenes/QuizScene";
import { RecordScene } from "@/components/landing/scenes/RecordScene";
import { ResourceScene } from "@/components/landing/scenes/ResourceScene";

/**
 * Resolves a scene id to the scene itself.
 *
 * The registry deliberately holds no component and no render function. It is
 * read by app/page.tsx, a server component, which then hands each entry to a
 * client component as a prop — and a function cannot cross that boundary (the
 * build fails outright on it). So the registry stays plain serialisable data
 * and the mapping to real components lives here, where only client components
 * reach for it.
 */
export function SceneView({ id }: { id: string }) {
  switch (id) {
    case "explain":
      return <ExplainScene />;
    case "quiz":
      return <QuizScene />;
    case "record":
      return <RecordScene />;
    case "resources":
      return <ResourceScene />;
    default:
      return null;
  }
}
