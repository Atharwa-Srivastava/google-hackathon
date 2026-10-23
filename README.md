# WasteWise prototype

Run `npm start` in this directory, then open http://127.0.0.1:4173. No dependencies or build step. Run `npm test` for catalog checks.

Includes responsive photo/text input, 20 item types, clarification for ambiguity and pizza-box contamination, mixed coffee-cup component guidance, exact guide passages, correction, and browser-local disposal history with deletion.

## Demo and Gemini

The default demo is deterministic and requires no key. It does not recognize images: uploaded photos lead to explicit manual confirmation. Try the four example cards, a greasy pizza box, or an ambiguous “bottle”.

Use the top-right Demo mode button to enter a Gemini API key from Google AI Studio. The key is held in memory only and sent directly to Google's generateContent endpoint. Photos, user text and the complete sample guide are sent only when you request analysis. Uses gemini-2.5-flash. Live API calls require a valid key and available quota; the app reports failures rather than silently pretending to analyze. This prototype's browser-side key entry is for individual development; a production app should use a server-side secret and authentication.

Gemini proposes catalog identification and a guide rule ID. The app verifies the ID against its catalog and renders exact stored guide passages rather than unverified model-generated disposal instructions. Uncertain outputs lead to clarification.

## Guide scope

Greenfield Campus is fictional. No real local guide was supplied. `dist/catalog.js` contains the clearly labeled sample guide and item mapping. Replace both with an approved local guide before real use. This prototype supports one bundled guide, not arbitrary guide uploads. History stores text results only, up to 100 entries on the current browser; it never stores photos or API keys.

## Demo walkthrough

1. Plastic bottle → dry recycling, rinse and dry, rule R1; save result.
2. Pizza box → condition question → split clean and greasy sections, rule R2.
3. Coffee cup → separate lined cup and rigid plastic lid, rule R6.
4. Upload an unclear photo → manual confirmation in demo mode, or uncertainty-aware Gemini analysis with a key.
5. Correct identification and save; reload and review My history.

API reference: https://ai.google.dev/api/generate-content

## AI providers and automatic history
AI settings supports Apinex at https://api.apinex.bond/v1/chat/completions (default editable model gemini/3.8-flash) and direct Google Gemini (default editable model gemini-3.8-flash). Enter the exact model ID available in your provider account. Free access is determined by the provider. Keys are held separately in tab memory and never stored in history. Browser requests require provider CORS support. No live provider calls were verified without a key.
Successful identifications save automatically, including demo results. Corrections replace the current history entry; reviewing an entry does not create a duplicate. Unresolved questions and failed requests are not saved as completed disposals.

## Multiple-item photos
AI scans the full scene and returns up to 30 visible groups, with labels, positions, visible counts and individual uncertainty. Supported clear items receive validated guide rules and save automatically. Unknown or unclear objects stay pending and are not saved as confirmed disposals. Edits update only the selected item; removing a non-waste detection removes its current group entry from history. Objects outside the 20-item catalog require campus guidance. Very crowded scenes are explicitly marked incomplete. The mixed pile demo exercises this without a key; live accuracy depends on the provider and photo quality.
