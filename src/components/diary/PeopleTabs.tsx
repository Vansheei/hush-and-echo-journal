import { Link } from "@tanstack/react-router";

export type PersonTab = { id: string; name: string; color: string };

/** Placeholder people until the people phase wires real data. */
export const SAMPLE_PEOPLE: PersonTab[] = [
  { id: "mama", name: "Mama", color: "bg-tape-1" },
  { id: "sam", name: "Sam", color: "bg-tape-3" },
  { id: "noor", name: "Noor", color: "bg-tape-4" },
  { id: "leo", name: "Leo", color: "bg-tape-2" },
];

/** Thumb-index tabs sticking out of the book's right edge. */
export function PeopleTabs({ people, active, onSelect }: { people: PersonTab[]; active?: string; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="People" className="absolute right-0 top-28 z-10 flex flex-col gap-1.5">
      {people.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          aria-current={active === p.id}
          className={`${p.color} rounded-l-md px-1.5 py-3 font-display text-xl text-paper [writing-mode:vertical-rl] transition-transform ${active === p.id ? "-translate-x-1.5" : ""}`}
        >
          {p.name}
        </button>
      ))}
    </nav>
  );
}

export function PeopleLink() {
  return <Link to="/people">People</Link>;
}
