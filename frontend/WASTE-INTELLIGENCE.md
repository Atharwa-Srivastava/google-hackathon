# Waste Intelligence MVP update

The cream, sage and periwinkle theme remains. Existing photo upload, mixed-item results, live scanning, text search, guide quotations, corrections, DLC station, rewards, account history, QR tools and language switch remain available.

## Added
- Home introduction and Explore Waste hub.
- Expandable next-life report on existing result cards: material, reported condition, potential reuse/repair/donation/recycling/compost routes, and original guide passages.
- Editable condition, conservative uncertain-item handling, specialist routes for electronics, and food/farm recovery information.
- Clearly labelled sample INR ranges and a sample destination directory. Enquiry forms produce a simulation only; no third-party contact, booking or transaction occurs.
- Selected actions save in the existing signed-in account history. Completion is self-reported; it never awards camera-verified reward points.
- Account dashboard counts loaded history and self-reported actions. Actual recovered value is unmeasured rather than invented.
- Future-feature cards for marketplace, business dashboards, administration and collection/robotics.

## Connection
All new features use the same WASTEWISE_API_BASE_URL as existing features. Change that value in the frontend server environment and restart/redeploy. Provider secrets stay in the backend. See CONNECT-BACKEND.md for existing authentication and environment setup.

Backend additions:
- POST /api/intelligence: {item, condition?, certain?, confidence?}
- GET /api/intelligence/destinations?family=organic
- POST /api/intelligence/offers: {item, condition?, destinationId, quantity}

The intelligence endpoint enriches an existing identification; image recognition remains in /api/analyze. Recovery scores are transparent prototype heuristics, not a trained valuation model. All prices and businesses are explicit samples. No live geolocation, buyer verification, sales, pickup booking or environmental-weight claims are implemented.

## Validation
Backend: 132 automated tests pass. Frontend: 43 tests pass, including existing account isolation, rewards and API connection tests. TypeScript and production build pass. Browser checks cover exploration, report loading, sample enquiry and responsive layouts. Physical camera accuracy and real Firebase login were not tested in this copy: supply the existing Firebase project settings to test account flows end to end.

Launch locally with Start-Frontend.cmd, then open http://localhost:5186 (backend must also run on the configured base URL).
