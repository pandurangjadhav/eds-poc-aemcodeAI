# Interior Texture Finder

EDS version of the AEM component **Interior Texture Finder Tool**
(`asianpaints.com/resources/tools/interior-texture-finder-tool.html`).

A multi-step recommendation journey in one block:

1. **Hero**: background image, title, description and a "Let’s get started" button
2. **Room**: Living room, Bedroom, Dining room
3. **Natural light**: Low, Medium, High (the images change with the room picked in step 2)
4. **Theme**: Natural Materials, Modern Contemporary, Indian Traditionals (with a hover image)
5. **Lead form**: name, email, mobile, PIN code, two required radio questions, consent text
6. **Result**: the selected room, light and theme, Non-metallic / Metallic tabs with texture cards,
   Download PDF and Restart

Files:

| File | Purpose |
|------|---------|
| `interior-texture-finder.js` | reads the authored tables, builds the steps, validation, analytics, results |
| `interior-texture-finder.css` | styles (mobile first, desktop layout from 992px like the live site) |
| `interior-texture-finder-pdf.js` | builds the PDF with jsPDF; loaded only when "Download PDF" is clicked |

Example page: `/interior-texture-finder-test`. Recommendations sheet: `/texture-recommendations.json`.

---

## Authoring model

The block is **one table** named `Interior Texture Finder`. Inside it are four sub-tables. Each one
starts with its **header row**, and the header row tells the block how to read the rows below it.
Order does not matter, and you can leave out any sub-table you don't need (defaults are used).

### 1. Content table

Header row: `Type | Title | Description | Desktop Image | Mobile Image | Hover Image | Value | Category`

| Type | Category | What it does | Columns used |
|------|----------|--------------|--------------|
| `background` | hero | background of the whole tool | Desktop Image, Mobile Image |
| `intro` | hero | hero title and description (rich text, line breaks kept) | Title, Description |
| `cta` | hero | start button label | Title |
| `question` | room / light / theme | the question of the step | Title; Value = step number (e.g. `01`) |
| `option` | room / light / theme | one selectable card | Title = label, Desktop/Mobile Image, Hover Image (theme), Value = value used for the lookup |
| `light-image` | light | light card images for one room (the "metadata for next screen images") | Title = room value, Value = light value, Desktop/Mobile Image |
| `heading` | result | results heading and the "Based on your inputs -" text | Title, Description |
| `label` | result | label shown in front of each selection | Title = label, Value = `room`, `light` or `theme` |
| `restart` | result | restart button label | Title |
| `download` | result | PDF button label and note. `{category}` is replaced by the active tab | Title, Description |

Example rows:

| Type | Title | Description | Desktop Image | Mobile Image | Hover Image | Value | Category |
|------|-------|-------------|---------------|--------------|-------------|-------|----------|
| background | | | *(image)* | *(image)* | | | hero |
| intro | Find your perfect / interior texture | Answer a few questions to get custom texture recommendations. | | | | | hero |
| cta | Let’s get started | | | | | | hero |
| question | Select a room for texture application. | | | | | 01 | room |
| option | Living room | | *(image)* | *(image)* | | Living room | room |
| question | How much natural light is available in your room? | | | | | 02 | light |
| option | Low | | *(image)* | *(image)* | | Low | light |
| light-image | Bedroom | | *(image)* | *(image)* | | Low | light |
| question | Select your preferred theme. | | | | | 03 | theme |
| option | Natural Materials | | *(image)* | *(image)* | *(image)* | Natural Materials | theme |
| heading | Top interior texture recommendations. | Based on your inputs - | | | | | result |
| label | Room | | | | | room | result |
| restart | Restart | | | | | | result |
| download | Download PDF | Download the PDF to get more details about the {category} Textures. | | | | | result |

### 2. Lead form table

Header row: `Form Section | Label | Placeholder | Validation`

| Form Section | Label | Placeholder | Validation |
|--------------|-------|-------------|------------|
| title | One last step before we recommend you textures. | | |
| subtitle | Share your details and get your personalized texture recommendations instantly! | | |
| name | Full Name | Your Full Name | required name |
| email | Email | Eg: myname@gmail.com | required email |
| mobile | Mobile Number | 10 digits | required mobile |
| pincode | PIN Code | 6 digit PIN code | required pincode |
| consent | *(rich text with the Terms & Conditions and Privacy Policy links)* | | |
| submit | View recommendations | | |
| error | Field is required | | required |
| error | Email is invalid | | email |
| failure | Sorry! | Some error occurred, please try again later. | |
| back | Restart again | | |

Validation rules (use `optional` to make a field not required):

| Rule | Check |
|------|-------|
| `name` | letters, spaces and `, . ' -`; 2–30 characters |
| `email` | `name@domain.tld` |
| `mobile` | 10 digits starting with 6–9 (shown with the +91 prefix) |
| `pincode` | 6 digits, not starting with 0 |

`error` rows override the message for a rule. The radio questions are always required.

### 3. Question table

Header row: `Question ID | Question | Option`. One row per option; the question text is taken from
the first row of each ID.

| Question ID | Question | Option |
|-------------|----------|--------|
| q1 | Are you looking for a home painting service? | Immediate |
| q1 | | Within a month |
| q1 | | After 1 month |
| q2 | Is there a local painter hired? | Yes |
| q2 | | No |

### 4. Property table (PDF and tool settings)

Header row: `Property | Value`

| Property | Default | Purpose |
|----------|---------|---------|
| recommendations | `/texture-recommendations.json` | sheet with the recommendations (see below) |
| categories | `Non-metallic, Metallic` | tab order |
| submitUrl | *(empty)* | if set, the lead is POSTed here as JSON `{ data: {...} }` before the results show |
| campaignId | | sent with the lead (the `utm_campaign` URL parameter wins) |
| fileName | `Interior_Texture_Recommendations` | PDF file name |
| logo | | logo image at the top of the PDF |
| headerDescription | | rich text below "Dear name," |
| mobileLabel / emailLabel | `Mobile no` / `Email` | contact labels in the PDF |
| recommendedHeading | `Recommended Textures` | PDF section heading |
| serviceImage / serviceDescription | | painting service banner and text (rich text, lists become bullets) |
| footer | | PDF footer text |
| pdfLibrary | jsPDF 2.5.2 from jsDelivr | alternative jsPDF URL |
| previousLabel / nextLabel / detailsLabel | `Previous` / `Next` / `View texture details` | button and link labels |
| productUsedLabel, shadesUsedLabel, topCoatLabel, baseCoatLabel | | card labels |
| emptyMessage | | shown when no recommendation matches |

---

## Recommendations sheet

The AEM component looked recommendations up on the server
(`interiorTextureToolRecomendation.json`). In EDS they come from an authored sheet, which is
published as `/texture-recommendations.json`. Each row is one texture card:

| Column | Example |
|--------|---------|
| room | Living room |
| light | Low |
| theme | Natural Materials |
| category | Non-metallic |
| order | 1 |
| finish | Calcecruda Fuso Hexagon Subway |
| swatch | `/media_…jpg` (image hosted on this site) |
| product | Metal Powder |
| productCode | 6754 |
| topCoatName / topCoatCode / topCoatHex | Clear / 0908 / |
| baseCoatName / baseCoatCode / baseCoatHex | Rose Water / 8111 / #C18089 |
| link | `https://www.asianpaints.com/interior-textures/…html` |
| texture | MSC1016CMB1003 (optional reference) |

Rows match the visitor's answers on room, light and theme (case-insensitive) and are grouped
into tabs by `category`, sorted by `order`. The sheet was filled from the live AEM service
(27 combinations × 2 categories × 3 textures = 162 rows). The swatch images are hosted on this site
through the helper page `/texture-finder-swatches`, so the PDF can embed them.

---

## Behaviour

- **Navigation**: Next stays disabled until an option is picked. Previous goes back one step, or to the hero from step 1.
- **Selection persistence**: answers, the form values and "lead already submitted" are kept in `sessionStorage`. After one submission the form is skipped on the next run, as on AEM.
- **Restart**: clears the answers and goes back to the room step.
- **Mobile (below 992px)**: steps become a swipe carousel. The card in view is taller and dots show the position. Result cards scroll sideways.
- **Accessibility**:
  - options are real radio buttons with their cards as labels, so arrow keys and screen readers work;
  - the result tabs follow the ARIA tab pattern (arrow keys, Home, End);
  - focus moves to the heading of each new step;
  - errors are linked with `aria-describedby` / `aria-invalid`;
  - "View texture details" announces the texture and that it opens in a new tab;
  - reduced-motion preference is respected.
- **Analytics** (same event names as AEM):
  - `Texturetool_start`, `tool_step1`–`tool_step3` (`filter: question|answer`), `custom_cta_click` (Previous);
  - `form_error`, `Texturetool_submit`, `calct_product_view`, `calct_download`, `Texturetool_recalculate`.

  Events go to `_satellite.track()` when Adobe Launch is on the page, to `adobeDataLayer` when present,
  and always as a bubbling `itf:analytics` DOM event.
- **Lead data**: nothing is sent anywhere unless `submitUrl` is set. The AEM version saved leads to
  AP's own database and Salesforce endpoints, which only work on asianpaints.com.
