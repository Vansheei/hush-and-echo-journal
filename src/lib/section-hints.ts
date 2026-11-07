// One plain line under each whimsical section name, shown in the index and on the section page.
export const SECTION_HINTS: Record<string, string> = {
  "Night Companion": "talk it through out loud",
  "Spill the tea": "write an entry instead of recording",
  "The Week’s Tale": "a recap of your last seven days",
  "Unfinished Chapters": "loose ends and open tasks",
  "Quiet Garden": "park a worry here until you're ready",
  "Side Characters": "the people in your entries",
  "Settings": "security, Claude key, cover and backups",
  "Lexicon": "your own words and what they mean",
  "Unsent Letters": "drafts of texts and emails, never sent",
  "Archive": "search everything you've said",
  "Begin a Chapter": "record a new voice or video entry",
  "Inner Universe": "what your companion knows about you",
  "The Keepsakes": "entries you marked with a ribbon",
  "Chapters by day": "every entry, day by day",
};

export const sectionHint = (name: string) => SECTION_HINTS[name];
