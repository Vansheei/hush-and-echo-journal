import { createFileRoute } from "@tanstack/react-router";
import { ItemsPage } from "@/components/diary/ItemsPage";
export const Route = createFileRoute("/worry-parking")({ ssr: false,
  head: () => ({ meta: [
    { title: "Diary — Worry parking" }, { name: "description", content: "A private place for parked worries." },
    { property: "og:title", content: "Diary — Worry parking" }, { property: "og:description", content: "A private place for parked worries." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: () => <ItemsPage kind="worry" />,
});