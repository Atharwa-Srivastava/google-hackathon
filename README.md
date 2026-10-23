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
