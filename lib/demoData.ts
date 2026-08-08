// Demo data for the Grasp first-demo build.
// In production this comes from Postgres (see CLAUDE.md §5). Here it's in-memory
// so the demo runs with zero setup and no API keys.

export type Note = {
  id: string;
  title: string;
  updated: string;
  body: string; // plain text; paragraphs split on blank lines
};

export type Resource = {
  id: string;
  name: string;
  kind: "Assessment criteria" | "Term planner" | "Past paper" | "Syllabus" | "Rubric";
  note: string;
};

export type Subject = {
  id: string;
  name: string;
  emoji: string;
  color: string; // tailwind gradient stops
  teacher: string;
  slots: string; // when it happens, from the timetable
  notes: Note[];
  resources: Resource[];
  quizTopics: string[];
};

export const SUBJECTS: Subject[] = [
  {
    id: "biology",
    name: "Biology",
    emoji: "🧬",
    color: "from-emerald-400 to-teal-500",
    teacher: "Ms. Fournier",
    slots: "Mon 9:00 · Wed 11:00 · Fri 9:00",
    quizTopics: ["Cell structure", "Osmosis & diffusion", "Enzymes", "Photosynthesis"],
    notes: [
      {
        id: "n1",
        title: "Cell Structure & Organelles",
        updated: "2 hours ago",
        body: `The cell is the basic unit of life. Eukaryotic cells have a membrane-bound nucleus; prokaryotic cells do not.

Key organelles: the nucleus stores DNA and controls the cell. Mitochondria are the site of aerobic respiration and release energy as ATP. Ribosomes are where protein synthesis happens.

The cell membrane is partially permeable and controls what enters and leaves the cell. In plant cells, the cell wall (made of cellulose) provides structural support and the chloroplast carries out photosynthesis.`,
      },
      {
        id: "n2",
        title: "Osmosis & Diffusion",
        updated: "yesterday",
        body: `Diffusion is the net movement of particles from a region of higher concentration to a region of lower concentration, down a concentration gradient.

Osmosis is the diffusion of water molecules across a partially permeable membrane, from a dilute solution (high water potential) to a concentrated solution (low water potential).

Active transport moves substances against the concentration gradient and requires energy from respiration.`,
      },
    ],
    resources: [
      { id: "r1", name: "IGCSE Bio Assessment Criteria.pdf", kind: "Assessment criteria", note: "Paper 2 weights cell biology heavily — 22% of marks." },
      { id: "r2", name: "Term 1 Planner.pdf", kind: "Term planner", note: "Enzymes covered week 4, mock exam week 6." },
    ],
  },
  {
    id: "history",
    name: "History",
    emoji: "🏛️",
    color: "from-amber-400 to-orange-500",
    teacher: "Mr. Owens",
    slots: "Tue 10:00 · Thu 13:00",
    quizTopics: ["Causes of WW1", "Treaty of Versailles", "Rise of dictators"],
    notes: [
      {
        id: "n3",
        title: "Causes of World War One",
        updated: "3 days ago",
        body: `The long-term causes are often summarised as MAIN: Militarism, Alliances, Imperialism, and Nationalism.

The alliance system split Europe into two blocs: the Triple Entente (Britain, France, Russia) and the Triple Alliance (Germany, Austria-Hungary, Italy).

The trigger (short-term cause) was the assassination of Archduke Franz Ferdinand in Sarajevo in June 1914, which set off a chain of ultimatums and mobilisations.`,
      },
    ],
    resources: [
      { id: "r3", name: "Source Analysis Rubric.pdf", kind: "Rubric", note: "Marks reward comparing provenance of two sources." },
    ],
  },
  {
    id: "maths",
    name: "Mathematics",
    emoji: "📐",
    color: "from-sky-400 to-indigo-500",
    teacher: "Dr. Patel",
    slots: "Mon 13:00 · Wed 9:00 · Fri 11:00",
    quizTopics: ["Quadratics", "Trigonometry", "Simultaneous equations"],
    notes: [
      {
        id: "n4",
        title: "Solving Quadratics",
        updated: "1 week ago",
        body: `A quadratic equation has the form ax² + bx + c = 0.

Three main methods: factorising, completing the square, and the quadratic formula x = (-b ± √(b²-4ac)) / 2a.

The discriminant b²-4ac tells you how many real roots there are: positive = two roots, zero = one repeated root, negative = no real roots.`,
      },
    ],
    resources: [
      { id: "r4", name: "Past Paper 2023.pdf", kind: "Past paper", note: "Q7 always tests the quadratic formula." },
    ],
  },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
