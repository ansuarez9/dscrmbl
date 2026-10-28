# Authoring theme explanations

Add optional `explanation` content to a theme in `public/themes.json`. Use a concise
`summary` connecting all five answers. Add `wordNotes` only for connections needing
clarification, keyed by the exact word in `wordList`, not its position. Rendered
content is plain text. Run `npm test` to check structure and note alignment.

An explanation must account for missed answers as well as solved ones. Review all
five connections; when one is uncertain, flag it for editorial review and leave
the explanation absent rather than inventing a rationale. Do not silently change
the puzzle's words or public description to make an explanation fit.

The initial batch covers October 28–November 10, 2026. All other entries, including
the unrelated `_fallback` word mix, remain without explanations. November 10 uses
a broad storytelling connection: a parable is not necessarily a fairy tale.
November 2 describes religious imagery without claiming that All Saints' Day
falls on that date. Review that existing title/date pairing separately before
making calendar-specific claims; this feature does not change event metadata.

References checked for cultural and specialized content:

- November 1: [Smithsonian — Exploring Día de los Muertos](https://americanhistory.si.edu/explore/stories/exploring-dia-de-los-muertos-sandra-cisneros)
  and [Altered Altars](https://folklife.si.edu/magazine/altered-altars-changing-traditions-dia-de-los-muertos).
- November 5: [National Park Service — Blacksmith Shop Interior](https://www.nps.gov/places/blacksmith-shop-interior.htm).
- November 8: [Smithsonian — Diwali](https://asia.si.edu/whats-on/events/celebrations/diwali/)
  and [Asian Art Museum — Celebrate Diwali](https://asianart.org/cultural-celebrations/celebrate-diwali/).

New completions save the round's explanation together with its words and date.
Editing the catalog does not rewrite a completed player's saved explanation.
Older results without this content intentionally omit the disclosure.
