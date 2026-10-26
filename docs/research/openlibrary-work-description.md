# What description Open Library returns for a work

The current-book dialog needs the work description when Open Library has one. Read it from the work JSON the client already requests for subjects. Normalize a string or a `{ "type": "/type/text", "value": "..." }` object to one string. When that text is missing or blank, omit the description. Still show the author, year, page count, and genre. Do not substitute another field.

## What the work record provides

A work is one logical book, not one printing. Its page is `/works/OL…W`. Adding `.json` returns the stored record. The Books API documents that with [Fantastic Mr. Fox](https://openlibrary.org/works/OL45804W.json). Source: [Books API, Works API](https://openlibrary.org/dev/docs/api/books). The same rule is on the [API index](https://openlibrary.org/developers/api): any Open Library identifier plus `.json` is the record.

`/type/work` has one `description` property. Its expected type is `/type/text`, and `unique` is true, so the schema allows a single value, not a list. It is not a required property. Source: [https://openlibrary.org/type/work.json](https://openlibrary.org/type/work.json) (`properties` entry named `description`) and the [type page](https://openlibrary.org/type/work).

`/type/text` is "arbitrary long unicode text" and "values of this type are not indexed." Source: [https://openlibrary.org/type/text](https://openlibrary.org/type/text). That matches search: `description` is not a Solr field. `WorkSearchScheme.non_solr_fields` lists `"description"`, and `WorkSearchScheme.all_fields` does not. Source: [`WorkSearchScheme`](https://github.com/internetarchive/openlibrary/blob/6d66f877b83af3d4557d766f4f156165add8e405/openlibrary/plugins/worksearch/schemes/works.py) in `openlibrary/plugins/worksearch/schemes/works.py` at commit `6d66f877` (`non_solr_fields` and `all_fields`).

The dump docs point at the client schema as the JSON shape of a work. Source: [Open Library Data Dumps](https://openlibrary.org/developers/dumps). That schema requires `key`, `title`, `type`, `revision`, and `last_modified` only. `description` is optional and is a `text_block`: an object with `type` equal to `"/type/text"` and a string `value`, and no other properties. Source: [`work.schema.json`](https://github.com/internetarchive/openlibrary-client/blob/5a9eb3a3545dc0581ef85c91433413482cbf449a/olclient/schemata/work.schema.json) and [`shared_definitions.json`](https://github.com/internetarchive/openlibrary-client/blob/5a9eb3a3545dc0581ef85c91433413482cbf449a/olclient/schemata/shared_definitions.json) `text_block`, openlibrary-client commit `5a9eb3a`.

The live work JSON does not stick to that object. It returns whichever form was stored.

## Description shape

Treat `description` as one of these three:

1. A JSON string. [Fantastic Mr. Fox, `OL45804W`](https://openlibrary.org/works/OL45804W.json) returns `"description": "The main character of Fantastic Mr. Fox…"` (1141 characters). This is the work the Books API uses as its example, so a string is a real response, not a mistake. The client schema does not list this form. Handle it anyway.
2. A `/type/text` object, `{ "type": "/type/text", "value": "<string>" }`. [The Lord of the Rings, `OL27448W`](https://openlibrary.org/works/OL27448W.json) returns that object. `value` is a 2091-character string. The same object form is how `/type/text` stores its own description: [https://openlibrary.org/type/text.json](https://openlibrary.org/type/text.json).
3. The property left out. [Polar Bolero, `OL31438W`](https://openlibrary.org/works/OL31438W.json) and [Oxygen, `OL31522W`](https://openlibrary.org/works/OL31522W.json) are `/type/work` records with a title and authors and no `description` key.

No fetched work used `null`, an array, or a `value` that was not a string. The type says `unique: true`. Open Library's own search code only accepts a string or an object with `.value`. In `WorkSearchScheme.add_non_solr_fields`, a missing description is infogami `Nothing` and is skipped; otherwise:

```python
solr_doc[field_name] = val if isinstance(val, str) else val.value
```

Source: the same `works.py` commit, `add_non_solr_fields`.

Checked against `search.json?fields=key,description` on 2026-10-25:

- `key:/works/OL27448W` returns `description` as a string, the object `value`, length 2091.
- `key:/works/OL45804W` returns `description` as a string, length 1141.
- `key:/works/OL31438W` returns a doc whose only field is `key`. The description key is absent, not `null`.

So search flattens both stored shapes to a string, and omits the field when the work has none. The raw work JSON does not flatten. This client should read the raw work JSON, because that is the request it already makes, and normalize both shapes itself.

Normalization:

- string: use it
- object whose `value` is a string: use `value`
- anything else, including a missing key: no description
- after that, trim; a blank or whitespace-only string is no description

The text is prose, often with `\r\n\r\n` between paragraphs. It can also contain markdown. The Lord of the Rings `value` includes `**Contains**` and links such as `[The Fellowship of the Ring](https://openlibrary.org/works/OL14933414W/The_Fellowship_of_the_Ring)`. Show it as text. Do not render it as HTML.

These are different fields, not a description:

- `first_sentence`, also `/type/text`, on the [work type](https://openlibrary.org/type/work.json)
- `excerpts`, present on `OL27448W` beside `description`
- an edition `description`, which `/type/edition` also allows ([Books API `jscmd=details` sample](https://openlibrary.org/dev/docs/api/books) shows an edition description as a string)

Do not fill a missing work description from those.

## What this client does today

`fetchWorkSubjects` loads `https://openlibrary.org${key}.json` and reads only `subjects` and `subject_places`. The description is on that response and is ignored. Source: `fetchWorkSubjects` and `WorkResponse` in `src/lib/openLibrary.ts`.

`fetchWorkFacts` does not load it either. It calls `search.json` with `SEARCH_FIELDS` (`key,title,author_name,cover_i,subject,first_publish_year,number_of_pages_median`). Source: `SEARCH_FIELDS` and `fetchWorkFacts` in `src/lib/openLibrary.ts`. `useBookFacts` only keeps year and page count, and `formatBookFacts` joins genre, year, and page count. Sources: `useBookFacts` in `src/lib/useBookFacts.ts`, `formatBookFacts` in `src/lib/bookMeta.ts`.

Year and page count stay on that search call. Description stays on the work JSON. Asking search for `fields=description` would also work, and would already be a string, but it is a second request. The work JSON is already fetched for subjects. One response should supply both. Open Library asks callers to cache and stay near one request a second. Source: [API index, Rate Limits](https://openlibrary.org/developers/api).

## When the description is missing

The dialog still opens. Show the author, year, page count, and genre the club already stores. Leave the description out. No "No description", no error, no placeholder.

That is the standing decision for this dialog: the Open Library description when the work has one, plus author, year, page count, and genre. Source: [Get a member through club night on the website](https://github.com/wrigh4d/family-book-club/issues/69).

"Has one" means the normalized string is non-empty. Absent property, failed work fetch, and blank text are the same on screen. `fetchWorkSubjects` already turns a failed work fetch into an empty subject list, so a failed load must not block the dialog.

Do not walk editions for a blurb, and do not use `first_sentence` or `excerpts`.
