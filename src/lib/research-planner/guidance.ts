/** Short, step-level help shown beside each step of the wizard. */
export const STEP_GUIDANCE: Record<number, { intro: string; tips: string[] }> = {
  1: {
    intro: "Good research starts with a clear picture of the situation. Keep it brief; you can refine it later.",
    tips: [
      "Write for someone who has never heard of this project.",
      "Describe the problem you see, not the solution you have in mind.",
      "If you are not sure about the business background, a sentence is enough.",
    ],
  },
  2: {
    intro: "Goals keep the study focused. Questions should be answerable by the method you choose next.",
    tips: [
      "One primary goal is better than five. Everything else can be an objective.",
      "Good questions are open (“How do…”, “Why do…”), not yes/no.",
      "Business questions are about decisions; user questions are about people's behaviour and needs.",
    ],
  },
  3: {
    intro: "Pick the methods you plan to use. Suggestions are optional and only a starting point.",
    tips: [
      "Match the method to the question, not the other way round.",
      "Combining a qualitative and a quantitative method is common but never required.",
      "Be realistic about time and recruiting effort.",
    ],
  },
  4: {
    intro: "Describe who should take part so recruiting (and later analysis) is easy.",
    tips: [
      "Define behaviours, not just demographics: what do they do or need?",
      "Exclusion criteria protect your findings, for example people who work for competitors.",
      "Screening questions should not reveal the 'right' answer.",
    ],
  },
  5: {
    intro: "Starter materials are drafts built from your answers. Edit them freely. Bracketed text is a placeholder to complete.",
    tips: [
      "Ask about past behaviour (“Tell me about the last time…”) rather than hypotheticals.",
      "Test your guide with a colleague before real sessions.",
      "Remove anything that leads participants towards an answer.",
    ],
  },
  6: {
    intro: "A realistic plan has dates, people and a clear definition of what you will hand over.",
    tips: [
      "Include time for recruiting and analysis, not just sessions.",
      "Name who does what, even if it is only you.",
      "List risks you can already see, such as low turnout or tight deadlines.",
    ],
  },
  7: {
    intro: "Check the whole plan, adjust any section, then preview and export it.",
    tips: [
      "Empty sections are left out of exports.",
      "Use the arrows to change the order of sections in the document.",
      "You can keep editing after exporting. Export again whenever you like.",
    ],
  },
};
