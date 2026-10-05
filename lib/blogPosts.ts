// The body of every blog post, keyed by the slug in lib/blog.ts. Server-side
// only in practice: nothing a client component imports reaches this file.
//
// A post is an opening paragraph or two and then sections. Each section's
// heading becomes an <h2>, so a post always has one <h1> (its title) and a flat
// run of <h2>s under it. Write plainly and literally, like the landing page.
// No prices: the blog follows the landing page's rule.

export type BlogBlock =
  | string
  | { list: string[] }
  | { steps: string[] };

export type BlogSection = { heading: string; blocks: BlogBlock[] };

export type BlogBody = { intro: string[]; sections: BlogSection[] };

export const BLOG_BODIES: Record<string, BlogBody> = {
  "jee-neet-board-exam-study-workflow": {
    intro: [
      "Class 11 and 12 ask a lot at once. Board exams test the school syllabus in written answers, JEE or NEET test much of the same material through fast multiple choice and numericals, and school classes and coaching both keep moving whether you have kept up or not.",
      "When exams get close, the searching starts: the best app to record college lectures, free Notion templates for BTech students, free mock tests, an MCQ generator for textbook chapters, the previous year questions (PYQs) for your board or university. Stitching five tools together takes time you do not have.",
      "Burning out usually comes from the same few problems: falling behind in class, losing track of where your notes are, and studying for hours without checking what has actually gone in. This guide is a weekly workflow for each of those. It starts with Class 11 and 12, and the same workflow works for students in engineering and medical colleges, whether that is BTech, BE, MBBS, BDS or BPharm, and for BSc students facing semester exams.",
    ],
    sections: [
      {
        heading: "Treat boards and the entrance exam as one syllabus",
        blocks: [
          "Most of what JEE and NEET test is the Class 11 and 12 syllabus in physics, chemistry and maths or biology. That means one set of notes per subject can serve both exams. What differs is how you practise: boards reward complete written answers in the expected structure, while JEE and NEET reward speed and accuracy on objective questions.",
          "So keep one notebook per subject, and practise in both styles from it, rather than keeping separate notes for school and coaching that slowly drift apart.",
        ],
      },
      {
        heading: "Keep up with fast lessons",
        blocks: [
          "When a teacher moves quickly, trying to write everything down means you stop listening. Write the structure instead: the topic, each main point, and any formula or reaction exactly as given. Leave space under each point and fill it in the same evening, while you still remember the explanation.",
          "Those ten minutes after class matter more than the hour you might spend later. A topic tidied the same day takes minutes; a topic left for a week has to be relearned.",
          "Recording helps too. Plenty of students look for a way to transcribe long lectures, or a YouTube class, into text. Generic voice-to-text apps tend to trip over technical terms, formulas and lessons taught in Hinglish, so treat any transcript as a first draft and check the key terms against your textbook.",
          "If you record lessons, ask your teacher first. Many schools, colleges and coaching centres require permission, and some do not allow it at all.",
        ],
      },
      {
        heading: "Organise every subject the same way",
        blocks: [
          "With five or six subjects across school and coaching, notes end up in different notebooks, apps and photos of the board. Many students spend days building the perfect Notion template, or comparing note-taking apps for an iPad and stylus, and the setup becomes a way of not studying. Pick one place and one layout, and use it for every subject:",
          {
            list: [
              "One notebook per subject, each note titled with the chapter and the date.",
              "A note per lesson or chapter, not one long running document.",
              "Formulas, reactions and definitions written exactly, since these are where small mistakes cost marks.",
            ],
          },
          "The aim is that in December, when you revise a chapter from July, you can find it in seconds.",
        ],
      },
      {
        heading: "Get unstuck on the line, not the whole chapter",
        blocks: [
          "When one step of a derivation or one organic chemistry mechanism does not make sense at night, it is tempting to search YouTube for a twenty-minute explainer on the whole topic. Often you only needed that one step explained. Write down the exact line you are stuck on, ask about that line, and once it makes sense, rewrite it in your notes in your own words so it stays fixed.",
        ],
      },
      {
        heading: "Test yourself every week",
        blocks: [
          "Re-reading notes feels productive but mostly is not. Answering questions from memory, which is called active recall, is what shows you what you know. That is why students hunt for free mock tests, MCQ generators for textbook chapters and ways to make flashcards from a PDF. The best questions, though, come from what you were actually taught. Once a week, for each subject:",
          {
            steps: [
              "Pick the chapters you covered that week.",
              "Answer some multiple choice questions, which is JEE and NEET practice.",
              "Write out one or two full answers, which is board practice.",
              "Mark yourself honestly, and give half credit for half an answer rather than calling it right.",
              "Write down what you got wrong, and start next week's revision there.",
            ],
          },
        ],
      },
      {
        heading: "Aim at what is actually marked",
        blocks: [
          "Previous year questions (PYQs) and marking schemes tell you how answers are marked: which steps carry marks, which words examiners look for, and how long an answer should be. Look at a few before you write practice answers, and check your answers against them. A generic study guide cannot tell you this, because every board and university marks a little differently.",
          "For JEE and NEET, PYQs also show which chapters come up most often, which helps you decide where an extra hour goes. In college, your own university's PYQs and question bank for each semester matter more than any international textbook.",
        ],
      },
      {
        heading: "Protect your sleep and one rest day",
        blocks: [
          "Two years is a long time to keep up a pace that only works for a fortnight. Plan study blocks around your classes and coaching rather than on top of everything, keep one evening or half day a week free, and do not cut sleep to fit more in. Tired study before a test feels like effort, but very little of it is remembered.",
        ],
      },
      {
        heading: "How Grasp helps",
        blocks: [
          "Grasp is an AI notebook built for school. You upload a screenshot of your timetable and it creates a notebook for every subject, with your class times and teachers. You can record a lesson, where your school allows it, and Grasp drafts notes while it listens and saves them to that subject when you stop.",
          "Inside a note you can highlight any line to have it explained, ask follow-up questions, and have the note corrected if something is wrong. Quizzes are written from your own notes, with the mix of multiple choice, short and long answers you choose, and written answers are marked, with half marks for partly right ones. In the Resource Bank you can add a page of your syllabus, a marking scheme or a PYQ paper, and Grasp takes it into account when it writes and marks quizzes, so your practice leans towards what is actually assessed.",
        ],
      },
    ],
  },

  "how-to-take-cornell-notes": {
    intro: [
      "The Cornell method is a way of laying out a page so that the notes you take in class are already set up for revision. It was developed at Cornell University in the 1950s and it is still used because it is simple: one page, three parts.",
      "This guide shows how to set the page up, what goes in each part, and how to study from it later.",
    ],
    sections: [
      {
        heading: "How to set up the page",
        blocks: [
          "Divide the page into three areas before the lesson starts.",
          {
            list: [
              "A wide column on the right, about two thirds of the page. This is for your notes during class.",
              "A narrow column on the left. This is for cues: questions and key words you add afterwards.",
              "A strip across the bottom, a few lines tall. This is for a short summary of the page.",
            ],
          },
          "Write the subject, the topic and the date at the top. It sounds minor, but it is what lets you find the page again in week nine.",
        ],
      },
      {
        heading: "During class: the notes column",
        blocks: [
          "Write in the wide column only. Use short phrases, not full sentences, and leave a blank line between ideas. Do not try to copy the teacher word for word. Write the main point, the reason for it, and one example.",
          "If you miss something, leave a gap and keep going. You can fill it in after class from a friend or the textbook.",
        ],
      },
      {
        heading: "After class: the cue column",
        blocks: [
          "This is the step most people skip, and it is the one that makes the method work. Within a day of the lesson, read your notes and write a question or key word in the left column beside each idea.",
          "A good cue is a question your notes answer. If your notes say that photosynthesis happens in the chloroplasts and needs light, water and carbon dioxide, the cue is \"Where does photosynthesis happen and what does it need?\"",
        ],
      },
      {
        heading: "The summary",
        blocks: [
          "In the strip at the bottom, write two or three sentences that sum up the page in your own words. If you cannot do it, that tells you something useful: you have not understood the page yet, and you know exactly which page to go back to.",
        ],
      },
      {
        heading: "A worked example",
        blocks: [
          "Say the lesson is on the causes of the First World War. The notes column might read:",
          {
            list: [
              "Alliances: Triple Entente (Britain, France, Russia) against Triple Alliance (Germany, Austria-Hungary, Italy).",
              "Militarism: naval race between Britain and Germany.",
              "Trigger: assassination of Archduke Franz Ferdinand, June 1914.",
            ],
          },
          "The cue column beside them would read: \"Which countries were in each alliance?\", \"What was the naval race?\" and \"What event triggered the war?\" The summary would be one or two sentences saying that a system of alliances and an arms race turned one assassination into a continental war.",
        ],
      },
      {
        heading: "How to study from Cornell notes",
        blocks: [
          "Cover the notes column with a sheet of paper so only the cues show. Answer each cue out loud or on scrap paper, then uncover the notes and check. Mark the ones you got wrong and come back to those first next time.",
          "That is the whole point of the layout. The cue column turns a page of notes into a page of questions, and answering questions from memory is a far better use of study time than reading the page again.",
        ],
      },
      {
        heading: "Doing the same thing in Grasp",
        blocks: [
          "If you keep your notes in Grasp, the quiz feature does the cue-column step for you: pick the notes you want to be tested on and it writes questions from them and marks your answers. The habit is the same either way. Take the notes, turn them into questions, and answer the questions from memory.",
        ],
      },
    ],
  },

  "how-to-quiz-yourself-from-your-notes": {
    intro: [
      "Reading your notes again feels productive. The page looks familiar, so it feels like you know it. The problem is that recognising something is much easier than recalling it, and an exam asks you to recall.",
      "Testing yourself is the fix. Pulling an answer out of your memory, often called active recall or retrieval practice, is one of the most consistently supported study techniques in learning research. This guide is about how to do it with the notes you already have.",
    ],
    sections: [
      {
        heading: "Turn headings into questions",
        blocks: [
          "Go through a page of notes and rewrite each heading or main point as a question. \"Causes of inflation\" becomes \"What are the main causes of inflation?\" \"Newton's second law\" becomes \"What does Newton's second law say, and what is the formula?\"",
          "Write the questions on a separate page or on cards, so you can look at them without seeing the answers.",
        ],
      },
      {
        heading: "Mix the kinds of question",
        blocks: [
          "Different questions test different things, and your assessments will use more than one kind.",
          {
            list: [
              "Multiple choice is quick and good for definitions and facts.",
              "Short answer makes you produce the idea yourself, in a sentence or two.",
              "Long answer makes you explain, compare or argue, which is what most written exams reward.",
            ],
          },
          "If your exam has extended responses, your practice should too. A student who only drills multiple choice tends to find out in the exam that they cannot explain the idea in full.",
        ],
      },
      {
        heading: "Answer before you look",
        blocks: [
          "Close the notes. Write or say your answer in full before you check it. Thinking \"I know that one\" and flipping to the answer does not count, because you have not actually retrieved anything.",
          "Getting an answer wrong is fine. A wrong answer you then correct tends to stick better than one you read passively.",
        ],
      },
      {
        heading: "Mark yourself honestly",
        blocks: [
          "Compare your answer to your notes and give it one of three marks: right, partly right, or wrong. Partly right matters. If you named two of three causes, you need to know which one you dropped.",
          "Keep a short list of what you got wrong. That list is your study plan for the next session.",
        ],
      },
      {
        heading: "Come back to it",
        blocks: [
          "One quiz is not enough. Do the same questions again a few days later, and again the week after. Spreading practice out over time works better than doing it all in one night, and the questions you keep missing show you where to spend your time.",
        ],
      },
      {
        heading: "Common mistakes",
        blocks: [
          {
            list: [
              "Writing questions that are too easy, where the answer is one word you would never forget.",
              "Only testing the topics you like.",
              "Checking the answer the moment a question feels hard. The effort of trying is where the learning happens.",
              "Using someone else's question bank that does not match what your class covered.",
            ],
          },
        ],
      },
      {
        heading: "Letting Grasp write the questions",
        blocks: [
          "Writing good questions takes time, and it is the part students tend to skip. In Grasp you pick the notes you want to be tested on, choose how many multiple choice, short answer and long answer questions you want, and it writes the quiz from your own notes. Written answers are marked against your notes, a partly right answer earns half marks, and you can ask why an answer was wrong.",
        ],
      },
    ],
  },

  "how-to-take-notes-in-class": {
    intro: [
      "A teacher talks much faster than anyone can write. If you try to get every word down, you fall behind, stop listening, and end up with half a page of sentences you do not understand.",
      "Good class notes are not a transcript. They are a record of the main ideas, written so that you can rebuild the rest later.",
    ],
    sections: [
      {
        heading: "Before the lesson",
        blocks: [
          "Spend two minutes looking at what the lesson is about: the title on the term planner, the last page of your notes, or the chapter heading. Knowing the topic in advance makes it much easier to tell a main point from a side comment.",
          "Start a new page with the subject, the topic and the date.",
        ],
      },
      {
        heading: "What to write down",
        blocks: [
          {
            list: [
              "Anything the teacher writes on the board or repeats.",
              "Definitions, formulas and dates, exactly as given.",
              "The reason behind a point, not only the point. \"Why\" is what exam questions ask for.",
              "One example for each idea.",
              "Anything introduced with \"this will be in the assessment\" or \"a common mistake is\".",
            ],
          },
        ],
      },
      {
        heading: "What to skip",
        blocks: [
          "Skip stories, repeated explanations of something you already have, and anything that is already word for word on a handout. Put a mark on the handout and move on.",
        ],
      },
      {
        heading: "Write less, in your own words",
        blocks: [
          "Use short phrases and your own abbreviations. \"Govt raised rates, so borrowing fell\" is a complete note. Putting an idea into your own words forces you to process it, which copying does not.",
          "Leave space. A blank line between ideas gives you room to add things later, and makes the page far easier to read.",
        ],
      },
      {
        heading: "When you get lost",
        blocks: [
          "Write a question mark in the margin, leave a gap, and keep listening. Trying to fix one missed point in the moment usually costs you the next three. Ask at the end, or look it up afterwards.",
        ],
      },
      {
        heading: "The ten minutes after class",
        blocks: [
          "Notes are at their most fixable straight after the lesson, while you still remember what was said. Read them through once, fill in the gaps, finish the half sentences, and underline what you did not understand. Ten minutes that day saves an hour in exam week, when the same page would be a puzzle.",
        ],
      },
      {
        heading: "Recording the lesson",
        blocks: [
          "If your school and your teacher allow it, recording a lesson lets you listen properly instead of racing to write. Always check first, since many schools need the teacher's consent.",
          "Grasp can record a lesson, transcribe it and draft notes while it runs, then save the notes into that subject's notebook. The audio is not kept. You still need to read the notes afterwards and fix anything that is off, for the same reason you would check your own.",
        ],
      },
    ],
  },

  "how-to-read-a-marking-rubric": {
    intro: [
      "Most students read the task sheet, skim the rubric, and start writing. Then the marks come back lower than expected, for reasons that were printed on the rubric the whole time.",
      "A rubric, or set of marking criteria, is the closest thing you will get to the marker telling you what they want. Reading it properly before you start is one of the cheapest ways to pick up marks.",
    ],
    sections: [
      {
        heading: "What a rubric is",
        blocks: [
          "A rubric is usually a table. Each row is a criterion, which is one thing you are being marked on, such as knowledge, analysis, or communication. Each column is a level of performance, from the top band down. Each cell describes what work at that level looks like.",
        ],
      },
      {
        heading: "Read the top band first",
        blocks: [
          "Start with the highest level for every criterion. That column is a description of the assignment you are trying to write. Read it slowly and underline the verbs and the describing words.",
        ],
      },
      {
        heading: "Find the words that change between bands",
        blocks: [
          "Compare the top band to the one below it. Usually only a few words change, and those words are what the marks hang on. A typical pair:",
          {
            list: [
              "Top band: \"discerning analysis of relevant evidence\".",
              "Next band: \"effective analysis of evidence\".",
            ],
          },
          "The difference is \"discerning\" and \"relevant\". That tells you the top band is about choosing the right evidence, not using more of it.",
        ],
      },
      {
        heading: "Know what the verbs ask for",
        blocks: [
          {
            list: [
              "Describe: say what something is like.",
              "Explain: say why or how it happens.",
              "Analyse: break it into parts and show how they relate.",
              "Evaluate: make a judgement and back it up with reasons.",
              "Justify: give the evidence for a decision or conclusion.",
            ],
          },
          "If the criterion says \"evaluate\" and you describe, the work can be accurate and well written and still sit in a middle band. Your school or syllabus may publish its own definitions of these terms, and those are the ones to follow.",
        ],
      },
      {
        heading: "Turn the rubric into a checklist",
        blocks: [
          "Rewrite each top-band cell as a question you can answer yes or no. \"Have I made a judgement and given reasons for it?\" \"Is every piece of evidence tied back to the question?\" Keep the list beside you while you plan.",
        ],
      },
      {
        heading: "Check your draft against it",
        blocks: [
          {
            steps: [
              "Go through the draft one criterion at a time.",
              "Highlight the sentences that meet that criterion.",
              "If a criterion has almost nothing highlighted, that is where your marks are being lost.",
              "Fix the weakest criterion first, since it usually has the most marks left to gain.",
            ],
          },
        ],
      },
      {
        heading: "Ask about anything unclear",
        blocks: [
          "Rubric language can be vague. If you cannot tell what a phrase means, ask your teacher early, with the rubric in front of you. \"What would discerning look like in this task?\" is a good question, and most teachers are glad to answer it.",
        ],
      },
      {
        heading: "Keeping the rubric with your notes",
        blocks: [
          "In Grasp, each subject has a Resource Bank where you can add the rubric, the task sheet or the term planner. Grasp reads the document once and takes it into account when it writes notes, explanations and quizzes for that subject, so your practice questions lean towards what is actually assessed.",
        ],
      },
    ],
  },

  "how-to-make-a-study-timetable": {
    intro: [
      "A study timetable usually gets made on a Sunday night in a burst of motivation. Every hour is filled, it looks great, and by Wednesday it has been abandoned.",
      "The timetables that last are the ones with less in them. Here is a way to build one around the week you actually have.",
    ],
    sections: [
      {
        heading: "Start with what is fixed",
        blocks: [
          "Write down everything you cannot move: classes, travel, sport, work shifts, family commitments, meals and sleep. What is left over is your real free time, and it is always less than you expect. Planning from that number is what keeps the timetable honest.",
        ],
      },
      {
        heading: "List what is coming up",
        blocks: [
          "Write every assessment and exam with its date. Then sort by two things: how soon it is, and how confident you are. A subject that is close and shaky goes first. A subject that is far away and comfortable gets a small regular slot and nothing more.",
        ],
      },
      {
        heading: "Plan blocks, not hours",
        blocks: [
          "Break your free time into short blocks of 25 to 45 minutes with a break after each one. A short block you start is worth more than a three hour block you put off.",
          "Give each block a job, not just a subject. \"Maths\" is easy to drift through. \"Ten questions on quadratics, then mark them\" has an end, so you know when you are done.",
        ],
      },
      {
        heading: "Put hard subjects where your energy is",
        blocks: [
          "Work out when you concentrate best, and put the subject you find hardest there. For many students that is soon after getting home, before dinner. Leave easier tasks, like tidying notes, for when you are tired.",
        ],
      },
      {
        heading: "Spread subjects across the week",
        blocks: [
          "Two 30 minute sessions on different days beat one 60 minute session. Coming back to a topic after a gap makes you work to remember it, and that effort is what makes it stick. It also means a bad day costs you one short session and not a whole subject.",
        ],
      },
      {
        heading: "Leave gaps on purpose",
        blocks: [
          "Keep at least one evening free and one empty catch-up block each week. Something will run over or get cancelled. If the timetable has no slack, the first missed session breaks the whole plan, and a broken plan tends to get dropped altogether.",
        ],
      },
      {
        heading: "Review it every week",
        blocks: [
          {
            steps: [
              "Look at what you actually did, not what you planned.",
              "Move anything you missed into next week's catch-up block.",
              "Add any new assessment dates.",
              "Cut anything you skipped twice. It was not realistic, so change it.",
            ],
          },
        ],
      },
      {
        heading: "Where Grasp fits",
        blocks: [
          "Grasp is not a calendar, but it starts from the same place. You upload a screenshot of your school timetable and it builds a notebook for every subject, with your class times attached. You can add assessment dates to each subject, and the dashboard lists them all in order, overdue ones first, so you can see what to plan around.",
        ],
      },
    ],
  },

  "ai-note-taking-for-students": {
    intro: [
      "AI tools can now tidy notes, explain a paragraph, transcribe a lesson and write practice questions. Used well, that saves time on the parts of studying that are slow and mechanical. Used badly, it produces neat notes that you have never really read.",
      "This is a plain look at what AI is good at for school, where it goes wrong, and how to use it so you still learn the material.",
    ],
    sections: [
      {
        heading: "What AI is good at",
        blocks: [
          {
            list: [
              "Cleaning up rough notes: fixing structure, spelling and headings without changing what you wrote.",
              "Explaining one confusing line in simpler words, and answering a follow-up question about it.",
              "Turning a recorded lesson into a first draft of notes.",
              "Writing practice questions from your own notes, and marking your answers.",
            ],
          },
          "What these have in common is that the AI is working on your material. It is starting from what your class covered, not from a general idea of the subject.",
        ],
      },
      {
        heading: "Where it goes wrong",
        blocks: [
          "AI makes mistakes, and it makes them confidently. It can state a wrong date, invent a quotation, or get a calculation wrong while sounding completely sure. It does not know what your teacher emphasised or what your syllabus left out, unless you tell it.",
          "Treat anything it writes the way you would treat a classmate's notes: probably fine, worth checking against the textbook before you rely on it.",
        ],
      },
      {
        heading: "The real risk: notes you did not make",
        blocks: [
          "Writing notes is part of how you learn the content. Deciding what matters and putting it in your own words is work your brain has to do. If a tool does all of it, you end up with excellent notes and very little in your head.",
          "A good rule is to use AI after your own attempt, not in place of it. Write your notes, then have them tidied. Try the question, then ask for the explanation.",
        ],
      },
      {
        heading: "What to look for in a tool",
        blocks: [
          {
            list: [
              "It works from your own notes, not from generic content.",
              "It knows what you are being assessed on, such as your rubric or term planner.",
              "It lets you correct it, and makes it easy to flag a wrong answer.",
              "It keeps you doing the recall, through quizzes or questions, not only reading.",
              "It is clear about what it stores. Check whether recordings and uploads are kept.",
            ],
          },
        ],
      },
      {
        heading: "Using AI honestly at school",
        blocks: [
          "Using AI to study is different from using it to write work you hand in. Schools have their own rules on this, and they vary. Check your school's policy, and ask your teacher if you are unsure whether something is allowed for a particular task. For recording lessons, ask first, since many schools require the teacher's consent.",
        ],
      },
      {
        heading: "How Grasp approaches it",
        blocks: [
          "Grasp is built for school, not for work meetings. You upload your timetable and it creates a notebook per subject. Inside a note you can highlight any line to have it explained, ask follow-up questions, and have the note corrected if something is wrong. Quizzes are written from your own notes, and the Resource Bank lets you add rubrics and planners so the AI knows what is assessed. Every AI answer carries a way to flag it as wrong, because sometimes it will be.",
        ],
      },
    ],
  },
};

/** A rough reading time, at about 220 words a minute. */
export function readingMinutes(body: BlogBody): number {
  const texts: string[] = [...body.intro];
  for (const section of body.sections) {
    texts.push(section.heading);
    for (const block of section.blocks) {
      if (typeof block === "string") texts.push(block);
      else texts.push(...("list" in block ? block.list : block.steps));
    }
  }
  const words = texts.join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
