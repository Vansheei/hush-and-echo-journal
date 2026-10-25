import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { SETTINGS_SECTIONS } from "@/lib/settings-sections";
import { SECTIONS } from "@/components/diary/BookIndex";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("includes Settings as an alphabetical S destination", () => {
    const settings = SECTIONS.filter(section => section.to === "/settings");
    expect(settings).toEqual([{ label: "Settings", to: "/settings" }]);
    const sorted = [...SECTIONS].sort((a, b) => a.label.replace(/^The\s+/i, "").localeCompare(b.label.replace(/^The\s+/i, "")));
    const index = sorted.findIndex(section => section.to === "/settings");
    expect(sorted[index - 1]?.label).toBe("Quiet Garden");
    expect(sorted[index + 1]?.label).toBe("Side Characters");
  });
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it.each(SETTINGS_SECTIONS)("opens the $id section independently of the Settings index", ({ id, to }) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(to).map(m => m.routeId)).toEqual([rootRouteId, `/settings_/${id}`]);
  });
});
