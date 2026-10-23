# Eco Tracker — Product Overview and Feature Specification

**Tagline:** A little clarity. A greener community.

**Product vision:** Help people identify their waste, understand how to manage it, arrange responsible collection, and receive rewards for verified good disposal habits.

**Document status:** Product description and development specification, reviewed on 23 October 2026. This document distinguishes the current prototype from proposed features. Describing a feature here does not mean it is already available in the app.

## 1. What is Eco Tracker?

Eco Tracker is a mobile-friendly AI waste-management assistant. A user can upload a photograph, describe an item, or point their camera at a waste pile. The app helps identify visible waste, suggests materials, and explains the disposal rules that apply under a supplied local guide.

It is designed to answer practical questions:

- What is this item made of?
- Which parts should I separate?
- Does it belong in recycling, food waste, general waste, glass collection, or special collection?
- What should I clean, empty, flatten, or remove first?
- Can anything be reused or turned into compost?
- Where does this recommendation come from?
- In the proposed next stage, when can someone collect it, and what reward can I earn for handing it over correctly?

The long-term journey is **scan → understand → separate → reuse or prepare → arrange collection → verify handover → receive rewards**.

## 2. The problem we solve

Everyday waste is difficult to sort because materials, contamination, mixed packaging, and local rules all affect the answer. A plastic-lined paper cup may need different handling from plain paper. A pizza box can contain both clean and greasy sections. Batteries and electronic devices need a separate route from ordinary household recycling.

People also face a practical gap after receiving advice: they may not know who will collect the sorted waste or when. A future pickup service should help close that gap. Rewards should encourage repeated, responsible participation without encouraging people to generate more rubbish.

Eco Tracker combines identification, understandable guidance, useful recovery options, and a planned collection-and-rewards service in one experience.

## 3. Who the app is for

| User | What they need |
| --- | --- |
| Households and students | Quick sorting help, simple preparation steps, and an easy way to handle everyday waste. |
| Campus residents and staff | Guidance based on their campus collection rules and access to approved collection services. |
| People disposing of electronics | Help separating e-waste and batteries from ordinary bins and finding an accepted handover route. |
| Waste collectors and collection partners — planned | Clear pickup details, suitable waste categories, manageable slots, and a record of completed handovers. |
| Campus or locality administrators — planned | Approved guides, accepted-material lists, pickup capacity, verified rewards, and service reporting. |

## 4. Current features and planned additions

| Feature | Current status |
| --- | --- |
| Photo upload, mobile photo capture, and text descriptions | Implemented. |
| Multiple waste groups from one photograph | Implemented, with uncertainty and visibility limits. |
| Live camera preview with coloured labels and object tracking | Implemented for supported detections; performance and coverage vary. |
| Gemini analysis through Apinex or Google configuration | Implemented through a server-side provider adapter. |
| Guide-backed categories, preparation instructions, and supporting passages | Implemented using the fictional sample campus guide. |
| Corrections, removal of non-waste detections, and automatic local history | Implemented. |
| Combined disposal, composting, and reuse summary | Implemented. |
| Searchable 141-item household catalog, including 34 electronics, batteries, and bulbs | Implemented. |
| Downloadable catalog and sample-photo demonstration tray | Present in the current working prototype. Samples are demonstrations, not evidence of a newly trained detector. |
| User accounts and cross-device history | Planned. |
| Rewards wallet, verification, and redemption | Planned; no real points or payouts are currently issued. |
| Preferred-slot waste pickup booking | Planned; the app does not currently dispatch collectors. |
| Collector dashboard and pickup verification | Planned. |
| Community dashboard, challenges, and partner offers | Optional future extensions. |

The current source contains working prototype features, but a feature being present locally does not establish that the latest version has been published to the hosted website.

## 5. Current waste-identification experience

### 5.1 Photograph or text

Users can upload a JPG, PNG, or WEBP photograph, use their phone camera to take a photograph, or describe the waste in plain language. The app automatically suggests matching items rather than requiring users to choose a category before analysis.

A photograph may contain one item or a scattered pile. Each distinguishable group receives its own label, suggested material, estimated visible quantity, and disposal guidance where the guide supports it. One unclear object should not block clear results for the rest of the scene.

### 5.2 Live camera scanning

Users start a scan, grant camera permission, and move slowly around the same waste pile. Supported objects receive coloured labels and boxes that follow their movement. Tracking tolerates brief missed detections and removes labels when objects are no longer visibly supported.

The app combines on-device detection and visual tracking with periodic Gemini analysis. These are separate processes: smooth label drawing does not mean Gemini analyses 60 images every second. The camera requests up to 60 FPS where supported, but actual camera, display, and detection speed depend on the device and model loading.

Cloud snapshots are analysed at most once every eight seconds, with one request at a time. Nearly unchanged views can be skipped. Earlier discoveries stay in the scan record even after the camera moves away, while the overlay represents currently visible objects.

Users can pause, resume, or finish a scan. Finishing stops the camera and combines selected views into a final result. Navigation away or backgrounding pauses the camera. A failed final analysis preserves partial results and offers retry rather than discarding the scan.

### 5.3 Multiple items and honest uncertainty

The prototype supports up to 30 accumulated item groups per scan. Successive photographs of the same pile do not add together repeated sightings: quantities use the largest observed count and remain estimates.

The app can miss small, hidden, overlapping, or unfamiliar objects. It should request a closer view or a specific material or condition check when needed. It must not claim to recognise every waste item instantly or assign a disposal route simply because an object looks familiar.

People, hands, furniture, animals, and normal possessions should not be treated as waste. Electronic devices should receive waste guidance only when the context indicates that they are being discarded, rather than because a working device happens to appear in the background.

## 6. Waste library and guide-backed sorting

The current catalog contains **141 household entries across seven material families**:

| Family | Examples |
| --- | --- |
| Food scraps | Banana and orange peels, apple cores, vegetable scraps, eggshells, and tea leaves. |
| Paper and cardboard | Cardboard boxes, pizza boxes, newspapers, paper bags, and cardboard tubes. |
| Plastic packaging | Bottles, caps, yogurt tubs, shampoo bottles, and rigid containers. |
| Metal and glass | Drink cans, food tins, glass jars, and glass bottles. |
| Mixed packaging | Coffee cups, snack wrappers, drink cartons, plastic bags, and flexible packaging. |
| E-waste and batteries | Phones, laptops, chargers, cables, power banks, batteries, and bulbs. |
| Other household items | Coffee grounds, dry leaves, clothes, shoes, broken glass, and large appliances. |

There are **34 electronics, battery, and bulb entries**. Twenty-one catalog entries have no applicable collection rule in the supplied sample guide. These keep their known identity but require a collection check. Recognition coverage and disposal-policy coverage are different.

The current eight-rule guide represents **fictional Greenfield Campus**. It is demonstration content, not verified policy for the user's actual locality. Before a real campus launch, replace it with an approved local guide and confirm collection arrangements.

The main result categories are:

- **Dry recycling:** accepted clean paper and cardboard, rigid plastic packaging, and metal packaging.
- **Food waste:** the food scraps explicitly accepted by the supplied guide.
- **Glass collection:** accepted glass bottles and jars.
- **General waste:** the mixed packaging and soiled materials specified in the guide.
- **Special collection:** batteries, bulbs, and small electronics covered by the guide.
- **Separate components:** items whose parts require different destinations.
- **Check collection / needs confirmation:** an identity, condition, or route that the available evidence does not establish.

Each supported recommendation includes its rule ID and supporting passage. Colours help users scan the interface; they are not universal bin standards.

## 7. Overall waste-management summary

After analysis, Eco Tracker presents a practical plan for the whole group of waste rather than leaving the user with isolated labels.

The plan groups items by destination and explains:

1. **What to separate:** food scraps, accepted dry recyclables, glass, general waste, electronics, and items needing a check.
2. **What to prepare:** empty containers, rinse and dry accepted packaging, flatten cardboard, and separate relevant components.
3. **What can be recovered:** suitable reuse opportunities, compostable ingredients, and repair or donation options.
4. **What needs another decision:** unclear materials, hidden objects, and items absent from the guide.
5. **Why the plan says this:** supporting sample-guide passages and separately labelled educational sources.

The plan updates after corrections and removals. Reviewing a saved result derives guidance from the stored identification and current catalog; it is not a guarantee of the exact wording shown when an older scan was created.

### Mixed packaging examples

- **Coffee cup:** the sample guide sends the lined cup body to general waste and a rigid plastic lid, if present, to dry recycling after preparation.
- **Pizza box:** users confirm whether it is clean, greasy, or mixed. Clean sections can be separated from greasy sections under the sample guide.
- **Bottle and cap:** the guide explains preparation and component separation instead of assuming every part stays attached.

Component rows describe parts of the same object; they must not be presented as extra independently counted objects.

## 8. Composting, fertilizer, and reuse education

Eco Tracker should help users see waste as a potential resource where that is appropriate.

For confirmed suitable scraps, the summary explains a basic home-composting process: remove packaging, prepare scraps, mix suitable greens with browns, manage moisture and air, and allow decomposition and curing. It explains how mature compost can improve garden soil or serve as mulch.

Raw peels and fresh kitchen scraps are not ready-to-use fertilizer. Compost should not be presented as a guaranteed substitute for every plant's fertilizer requirements. A basic home pile is also not a suitable destination for every item labelled organic or compostable.

The app separates this education from collection policy. For example, coffee grounds may be suitable for a home compost system even though the sample campus guide supplies no collection rule for them. A home-compost option does not grant permission to use a particular campus bin.

Electronics guidance encourages repair or donation where suitable, removal of personal data before handover, and use of an accepted collection service. Users should follow manufacturer instructions for removable batteries rather than dismantling sealed devices.

Educational references currently used by the product:

- [EPA: Composting at Home](https://www.epa.gov/recycle/composting-home)
- [EPA: Electronics Donation and Recycling](https://www.epa.gov/recycle/electronics-donation-and-recycling)
- [EPA: Used Household Batteries](https://www.epa.gov/recycle/used-household-batteries)

These sources support general education; they do not define the campus's local collection rules.

## 9. Corrections and automatic history

Users can correct an item's identity and relevant condition or remove a detection that is not waste. The related result and management plan update accordingly.

Photo and text results save automatically in the same browser, with up to 100 item-history entries. Live scans save grouped results, draft status, and selected JPEG snapshots using IndexedDB. Each live scan retains the first snapshot and seven latest retained snapshots, up to eight in total.

Users can review history, reopen interrupted live drafts, correct results, and delete stored scans together with their photographs. Storage failures must be visible: the app pauses capture when it cannot save rather than claiming that photographs were stored.

Current history is device-local. There is no implemented account-based cloud history or cross-device synchronisation.

## 10. Rewards for responsible waste disposal — planned

### 10.1 Purpose

Users should receive rewards for properly separated waste that is handed over through an accepted route. Rewards make the benefit of responsible participation visible and encourage users to keep practising it.

The system must reward **verified good handling**, not waste generation. An AI identification or photograph alone cannot prove that an item was disposed of correctly.

### 10.2 What users can earn rewards for

- Handing over eligible, correctly separated recyclables during a verified pickup.
- Delivering eligible e-waste or batteries to a confirmed collection partner.
- Completing a supported campus drop-off verified by staff or a handover code.
- Completing an approved composting or reuse activity when the programme has a suitable verification process.
- Taking part consistently in approved collection programmes, subject to published limits.

Which categories qualify, how much they earn, and how activities are verified must be configured for the local programme. Not every type of rubbish needs to earn points.

### 10.3 Proposed reward calculation

For categories measured by weight:

`Earned points = verified accepted weight × published category rate × applicable quality factor`

Use a measured handover weight, not weight guessed from a photograph. For activities that are unsuitable for weight-based rewards, use a published fixed reward per verified eligible handover or activity.

Rates, bonuses, caps, and redemption values remain to be agreed with participating partners. The prototype does not currently establish a monetary conversion or promise cash payouts.

Before booking, show an **estimated or potential reward** with the relevant conditions. After verification, show the accepted quantity, final calculation, and reason for any adjustment. Do not add estimated points to the spendable balance.

### 10.4 Wallet and redemption

The planned wallet should show pending, available, redeemed, and reversed points, with a transaction history linked to each handover. Possible future redemptions include partner coupons, campus benefits, or programme-funded offers, only when the relevant partners and terms are in place.

Prevent duplicate rewards for the same waste across repeated scans, duplicate bookings, and multiple accounts. A completed handover should have one unique reward transaction. User corrections or disagreements should have a review route rather than silently changing an available balance.

## 11. Book a waste collector at a preferred slot — planned

### 11.1 Household booking flow

1. **Start from a scan or manual list.** Select the waste groups to be collected and correct mistakes before booking.
2. **Confirm acceptance.** Show which materials the partner accepts, any minimum quantity, and any special arrangements. A collector who accepts bottles may not accept batteries or large appliances.
3. **Add pickup details.** Enter the service address, contact details, estimated quantity, access instructions, and optional relevant photographs.
4. **Choose a preferred date and time window.** Show real partner availability. A preference becomes a confirmed booking only when capacity is reserved or the partner accepts it.
5. **Review the booking.** Show accepted categories, preparation instructions, any applicable collection fee, the preferred or confirmed slot, and the estimated reward conditions.
6. **Receive confirmation.** Provide a booking reference and status. If no slot or collector is available, offer another slot or an accepted drop-off option without pretending collection is booked.
7. **Prepare and hand over.** Keep the agreed waste streams separate. The collector confirms the accepted items and any measured quantity.
8. **Complete verification.** Record handover confirmation and release eligible rewards after the required checks.

Users should be able to view upcoming and past pickups, request rescheduling, cancel within the programme's stated rules, and report a missed or disputed collection.

### 11.2 Booking status

The proposed lifecycle is **Requested → Confirmed → Assigned → On the way → Collected → Verified → Completed**. Cancellation, rescheduling, rejection, and failed pickup are additional outcomes.

Show clear explanations when a booking cannot proceed. Cancelling or rescheduling must also update reserved slot capacity and any pending reward record.

### 11.3 Collector experience

The planned collector dashboard should show assigned or available jobs, the requested time window, accepted waste categories, estimated load, and the relevant pickup instructions. Collectors can accept eligible jobs, update arrival status, record accepted quantities, and confirm handover with the user.

A handover code or QR confirmation can link the collector and household records. Such confirmation proves agreement to a recorded handover; additional checks may still be necessary to verify material quality or measured weight.

Collectors should not be assigned specialist waste they are not equipped or approved to handle. Rejected items need an explanation and an appropriate next step for the household.

The programme may also introduce **collector incentives** for verified, timely, correctly completed jobs. Any collector reward must be recorded separately from the user's reward and must not allow a collector to approve their own disputed incentive.

## 12. How pickups and rewards work together

Consider a household scan showing plastic bottles, cardboard, banana peels, a broken charger, and used batteries.

The current prototype can identify supported groups, explain guide-backed separation, suggest suitable composting education, and save the results locally.

In the planned service, the user then selects the accepted dry recyclables for a collector and requests a preferred slot. If that partner does not accept batteries or electronics, the app keeps those items out of that booking and shows a separate eligible collection option when one is configured.

At handover, the collector records the actual accepted materials and measured quantities. The user confirms the handover. The app verifies the event and credits only the rewards the programme allows. Compost guidance remains available for the food scraps; viewing that advice alone does not earn a disposal reward.

The household finishes with one understandable record: what was identified, how it should be handled, what was collected, what still needs action, and what reward was earned.

## 13. AI and dataset approach

### DLC: dry-bin camera station (implemented prototype)

DLC is accessible from Home and Actions. A laptop webcam represents a bin-mounted camera. After local model warm-up and empty-view calibration, users show one item before dropping it. Confident accepted material/packaging matches turn the screen green; unsuitable or unverified items turn it red with a rejection beep. The current bin follows sample rules R1–R3 for dry recycling. It excludes food, batteries, glass, textiles and unsupported packaging. Two fresh matching observations, confidence/margin/similarity checks and packaging evidence limit premature approval. Unverified items fail closed at the two-second target. No timing or universal-accuracy guarantee is made.

DLC inference runs locally in a worker, with one request at a time, no video upload and no Gemini queue. Camera and model processing stop when the station is closed or backgrounded. This prototype cannot verify hidden contents, cleanliness or physical deposits, operate a real lid, or issue verified rewards. Existing photo/live sorting, corrections and history remain available. Real collection rules and field testing are required before a public bin pilot. Technical provenance and setup are in `docs/dlc.md`.

The current app uses existing trained browser models for supported litter and household detections, visual tracking between detections, and Gemini for broader image understanding. Server-side prompts connect identified items to the supplied guide. The 141-item knowledge catalog helps recognition and corrections; it is not a set of 141 newly trained camera classes. The interactive prototype includes a curated 8-class benchmark dataset demonstration tray featuring plastic, metal, cardboard, paper, biological waste, battery, glass, and fabric/clothes.

The local archive has now been inspected and used to train the DLC material classifier. One standardized image variant contains 12,259 images across ten classes: metal, glass, biological waste, paper, battery, trash, cardboard, shoes, clothes, and plastic. The earlier screenshot's total differs from the files actually present. No pretrained waste weights were found in that archive. The shipped model uses pretrained MobileNetV2 pooled features and a newly fitted ten-class material head. A deterministic 8,581 / 1,839 / 1,839 train / validation / test split produced 90.8% internal held-out image classification accuracy. This is not webcam bin-decision accuracy; near-duplicate leakage and real-world domain shifts remain possible.

Image folders can support material classification, but detecting several objects and placing separate boxes around them requires location annotations or a suitable object-detection model. A material classifier alone does not establish whether a plastic item is accepted locally or whether an electronic device is actually waste.

The next dataset work should check licensing, labels, duplicates, class balance, and train/validation/test separation, then evaluate clutter, overlapping objects, household lighting, and non-waste backgrounds. Keep benchmark samples separate from training and report performance on unseen images. Do not treat a curated demonstration as evidence that every waste item is detected reliably.

## 14. Product architecture and data boundaries

| Area | Current prototype | Required for the proposed service |
| --- | --- | --- |
| Mobile interface | Responsive browser app with photo, text, and live scan flows. | Booking, wallet, collector, and administrator views. |
| AI backend | Server-side Apinex/Google adapters and guide-controlled analysis. | Continued provider management and monitored service limits. |
| Personal history | Browser-local localStorage and IndexedDB. | Authenticated shared records if cross-device access is offered. |
| Pickup operations | Not implemented. | Service areas, partner acceptance, slot capacity, assignments, and handover records. |
| Rewards | Not implemented. | A server-controlled ledger, published rules, verification, redemption, and dispute handling. |
| Administration | Guide/catalog maintained in source. | Approved guide updates, partner management, programme settings, and operational review. |

API credentials stay on the server; visitors do not need to supply them. Live video is not recorded or continuously streamed to Gemini. Selected snapshots are stored locally and sent through the server when required for analysis; there is no implemented cloud photo archive.

Future pickup records introduce addresses and contact details that the present sorting flow does not need. Collect those only for the relevant service and restrict them to the user and assigned service roles. AI prompts should not require a user's address or reward balance to identify waste.

## 15. Relationship to the original problem statement

| Original minimum requirement | Eco Tracker response |
| --- | --- |
| Accept an item photograph or text description | Both input methods are implemented; live camera scanning is an additional flow. |
| Suggest material and ask clarifying questions | Materials, uncertain detections, editable identifications, and condition checks are implemented. |
| Recommend a category using the supplied guide | Applicable results map to the current eight-rule sample guide. Unsupported routes require confirmation. |
| Explain guide-supported preparation | Preparation and component separation appear with supporting passages. |
| Display the supporting rule or passage | Rule IDs and exact sample-guide passages are shown. |
| Allow corrections and save disposal history | Implemented with local automatic saving and editable results. |
| Use Gemini image and document understanding | Gemini analyses images and receives the guide text in its prompt. Automatic ingestion of an arbitrary uploaded guide or PDF is not currently implemented. |
| Support one locality and a manageable set of common items | The prototype uses one fictional campus and 141 catalog entries. Real locality approval remains necessary. |
| Demonstrate mixed packaging and an unclear image | Mixed-item demonstrations and uncertainty handling are available; real-camera checks remain necessary. |

Rewards and pickup booking extend the original scope. They should build on reliable sorting and verified local collection rather than replace those foundations.

## 16. Development priorities and release checks

### First: reliable local sorting

Replace the fictional guide for a real deployment, confirm accepted materials, evaluate the expanded library on unseen household scenes, and test actual Android Chrome and iPhone Safari camera behaviour. Keep unclear identities and unsupported routes explicit.

### Next: a limited pickup pilot

Start with one service area, a small set of collection partners, agreed material categories, real available slots, and an administrator-assisted booking process. Test slot conflicts, unavailable collectors, cancellations, rescheduling, rejected items, and missed pickups before wider release.

### Then: verified rewards

Introduce a wallet only after handover verification works. Test duplicate submissions, retries, partial acceptance, adjusted quantities, reversals, and disputes. Replaying a completion request must not credit points twice.

### Later: community features

Potential additions include a household waste dashboard, recycling knowledge challenges, partner-funded offers, multilingual guidance, and more approved localities. Report verified quantities and participation separately from AI estimates. Environmental-impact claims need a documented measurement method.

Success means users can understand the advice, prepare waste correctly, complete an accepted handover, and understand exactly why they did or did not receive a reward. Eco Tracker should make that process useful and approachable while being honest about what the AI and collection service can confirm.
