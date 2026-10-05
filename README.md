# Fortis crypto compliance calculators

Three lead-generation calculators for Fortis AML Consulting, hosted on GitHub Pages and ready to embed on the Fortis website.

| Calculator | Link |
|---|---|
| Crypto Compliance Cost Calculator | https://zov911.github.io/fortis-crypto-calculators/cost/ |
| Crypto Compliance Readiness Scorecard | https://zov911.github.io/fortis-crypto-calculators/readiness/ |
| Compliance Savings Calculator | https://zov911.github.io/fortis-crypto-calculators/savings/ |

Integration guide (links, embed code, analytics events): https://zov911.github.io/fortis-crypto-calculators/
Embed demo on a sample host page: https://zov911.github.io/fortis-crypto-calculators/demo/

## Embed on a website

```html
<div data-fortis-calculator="cost"></div>   <!-- cost | readiness | savings -->
<script src="https://zov911.github.io/fortis-crypto-calculators/embed.js" async></script>
```

The iframe resizes itself to its content. Optional attributes: `data-theme="light|dark"`, `data-header="true"`, `data-transparent="true"`, `data-scroll-offset="80"`, `data-min-height="..."`.

Without scripts, a fixed-height iframe also works: `<iframe src=".../cost/?embed=1" style="width:100%;height:1800px;border:0"></iframe>`.

URL parameters for any page: `?embed=1` (compact embedded layout), `?theme=light|dark`, `?header=1`, `?bg=transparent`. UTM parameters on the host page are passed through into the lead payload.

## Configuration

All prices and settings live in [`assets/fortis-core.js`](assets/fortis-core.js) (`CONFIG`), shared by the three calculators:

- `lead_endpoint` – webhook URL (Make.com, Zapier, HubSpot, CRM) that receives each lead as JSON. Empty = demo mode: PDFs still download, nothing is sent.
- `lead_format` – `"text"` (default, no CORS preflight; the body is still JSON) or `"json"`.
- `setup`, `package`, `monthly`, `addons`, `savings` – service names and prices (CAD). Bump `pricing_version` when they change; it is printed on PDFs and included in every lead.

## Analytics

Each calculator pushes events to `window.dataLayer` (GTM). When embedded with `embed.js`, the same events are forwarded to the host page's `dataLayer` with a `fortis_` prefix (`fortis_calculator_start`, `fortis_question_completed`, `fortis_estimate_viewed`, `fortis_pdf_submitted`, `fortis_proposal_submitted`, `fortis_lead_submitted`, `fortis_book_call_clicked`, …) plus a `fortis_calculator` field. Personal data is never sent to the host page.

## What changed from the original single-file versions

- One shared stylesheet and core script: pricing defined once instead of three times.
- jsPDF loads only when a visitor asks for a PDF (with Subresource Integrity), so the first load is ~360 KB lighter.
- Embed support: auto-resizing iframe, embedded pop-ups positioned next to the button, host-page scroll, event forwarding.
- Shareable result links (state in the URL), "copy link" buttons, and lead payloads include the link.
- Accessibility: focus trap in pop-ups, labelled inputs and errors, keyboard shortcuts 1–4 in the scorecard, reduced-motion support.
- Cost calculator: progress badges, "go to next question", reset, explanation of the recommended support tier.
- Readiness scorecard: progress saved in the browser with "resume", "change my answers", multi-line PDF gap text no longer overlaps.
- Savings calculator: typed salary input, adjustable assumptions, 1-year / 3-year view, correct message when a full-time hire is not more expensive.
- PDFs: consistent header and footer, page numbers, characters outside the PDF font are replaced instead of printing as garbage.

## Local preview

Any static server works, for example `npx serve .` and open http://localhost:3000/.
