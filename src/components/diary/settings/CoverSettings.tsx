import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BookCover } from "../BookCover";
import { useAppearance, setAppearance, type Cover } from "@/lib/appearance";
export function CoverSettings() {
  const look = useAppearance();
  return <>        <section className="settings-card">
          <h2>Cover</h2>
          <div className="grid grid-cols-3 gap-3">
            {(["green", "plum", "ocean"] as Cover[]).map((c) => (
              <Button variant="ghost" key={c} data-cover={c} aria-pressed={look.cover === c} onClick={() => setAppearance({ cover: c, coverChosen: true })}
                className={`h-auto flex-col whitespace-normal p-2 text-center ${look.cover === c ? "ring-2 ring-foreground" : ""}`}>
                <div className="pointer-events-none w-full origin-top scale-100"><BookCover variant={c} /></div>
                <span className="text-sm">{c === "green" ? "Bottle Green" : c === "plum" ? "Burgundy" : "Midnight Blue"}</span>
              </Button>
            ))}
          </div>
        </section><section className="settings-card"><label className="flex items-center justify-between gap-3">Seasonal scene<Switch aria-label="Seasonal scene" checked={look.seasonalScene} onCheckedChange={seasonalScene => setAppearance({ seasonalScene })} /></label></section></>;
}
