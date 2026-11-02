/**
 * Illustrative portraits a persona can use instead of initials.
 *
 * Every photo is a stock portrait from Unsplash (free under the Unsplash License), cropped square and
 * self-hosted in `public/personas/avatars`. They are NOT real participants: the label below is shown
 * next to the picture in the editor, the preview and every export. The persona stores only the `id`.
 * The Unsplash License needs no attribution, so photographers are credited here (for provenance) and
 * not in the UI.
 */
export const AVATAR_LABEL = "Illustrative stock photo. Not a real participant.";

export type PersonaAvatar = {
  id: string;
  /** Short, neutral description for assistive tech. */
  alt: string;
  credit: string;
  /** The photo's page on Unsplash. */
  source: string;
};

const photo = (id: string, alt: string, credit: string, unsplashId: string): PersonaAvatar => ({
  id,
  alt,
  credit,
  source: `https://unsplash.com/photos/${unsplashId}`,
});

export const PERSONA_AVATARS: readonly PersonaAvatar[] = [
  photo("01", "Older woman with short grey hair, smiling", "Centre for Ageing Better", "IxacjtwPdGM"),
  photo("02", "Older man with glasses and a grey beard", "Beatriz Cattel", "qCqJC380gLw"),
  photo("03", "Man with short dark hair and a broad smile", "Joseph Gonzalez", "iFgRcqHznqg"),
  photo("04", "Woman with glasses and long dark hair", "Vitaly Gariev", "s3aDHKxHZSc"),
  photo("05", "Woman with curly brown hair, smiling", "Christina @ wocintechchat.com", "SJvDxw0azqw"),
  photo("06", "Man with curly hair, glasses and a beard", "Christian Buehner", "DItYlc26zVI"),
  photo("07", "Young woman with brown hair in front of palm leaves", "Zoey Weesner", "9vDV4GV15rY"),
  photo("08", "Man with short dark hair and light stubble", "Danny Postma", "zNxOw2JFNKs"),
  photo("09", "Smiling young man in a dark jacket", "The Connected Narrative", "N8lRH2uxih4"),
  photo("10", "Young man with glasses in a dark shirt", "Vincenzo De Simone", "BjnXKceifJA"),
  photo("11", "Woman with dark hair in a bun, smiling", "Jake Nackos", "IF9TK5Uy-KI"),
  photo("12", "Man with short dark hair wearing a light shirt", "Jurica Koletić", "7YVZYZeITc8"),
];

const BY_ID = new Map(PERSONA_AVATARS.map((a) => [a.id, a]));

/** Look up a stored avatar id. Unknown or empty ids give `null`, which means "use initials". */
export function getAvatar(id: string | null | undefined): PersonaAvatar | null {
  return (id && BY_ID.get(id)) || null;
}

export const avatarSrc = (avatar: Pick<PersonaAvatar, "id">) => `/personas/avatars/${avatar.id}.jpg`;
