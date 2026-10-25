import { createFileRoute } from "@tanstack/react-router";
import { ItemsPage } from "@/components/diary/ItemsPage";
export const Route = createFileRoute("/loose-ends")({ ssr: false,
  head: () => ({ meta: [
    { title: "Diary — Loose ends" }, { name: "description", content: "Private unfinished thoughts and tasks." },
    { property: "og:title", content: "Diary — Loose ends" }, { property: "og:description", content: "Private unfinished thoughts and tasks." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: () => <ItemsPage kind="loose" />,
});