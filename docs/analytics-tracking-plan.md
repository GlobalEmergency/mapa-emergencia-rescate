# Terremoto Venezuela Analytics Tracking Plan

Status: draft for implementation before cloning proposal repos.

## Measurement Readiness Index

Current score: 58 / 100 — Unreliable, but fixable.

Breakdown:

- Decision alignment: 17 / 25
- Event model clarity: 11 / 20
- Data accuracy/integrity: 10 / 20
- Conversion definition quality: 6 / 15
- Attribution/context: 7 / 10
- Governance/maintenance: 7 / 10

Reasoning:

- OpenPanel is installed and production-gated.
- Screen views, outgoing links, attributes, and several completion events exist.
- There is no complete event taxonomy yet.
- Key UX questions are not measurable yet: failed searches, post-search reporting, contextual prompt usefulness, hospital lookup intent, and rescuer/first-line interest.
- Privacy rules are not documented in code-level tracking conventions yet.

Target after implementation: 82 / 100 — Usable with gaps.

## Privacy Rules

Never send these to analytics:

- Names of missing people.
- Names of hospital patients.
- Phone numbers.
- Exact addresses.
- Free-text descriptions.
- Photos or photo URLs.
- Contact fields.
- Hospital patient notes.
- Exact trapped-person coordinates in sensitive flows.
- Admin passwords or tokens.

Allowed context:

- Page path.
- Section name.
- Flow name.
- Boolean flags such as `has_photo`, `has_age`, `has_query`.
- Counts/buckets such as `results_count_bucket`.
- Report type.
- Hospital priority zone.
- Country code if available.
- Generic location confidence such as `country_known` or `region_known`.

## Core Questions

The tracking should answer:

- Which home action do users choose first?
- Are users searching before reporting?
- How often do searches fail?
- Do failed searches lead to missing-person reports?
- Are users finding hospital/patient flows?
- Are people outside Venezuela trying to help?
- Are contextual prompts useful or ignored?
- Which help resources are most used?
- Are volunteers/rescuers trying to access coordination views?
- Which proposal produces the clearest path to critical actions?

## Events

| Event | Description | Properties | Trigger | Decision Supported |
| --- | --- | --- | --- | --- |
| `home_action_clicked` | User chooses a primary landing action. | `action`, `variant`, `position` | Click on Buscar, Reportar, Necesito ayuda, Quiero ayudar. | Which landing options get used. |
| `contextual_prompt_shown` | Location-based prompt is displayed. | `variant`, `country_code`, `country_known`, `region_known` | Prompt renders. | Whether prompts reach users. |
| `contextual_prompt_clicked` | User acts on contextual prompt. | `variant`, `destination` | Prompt CTA click. | Whether prompts improve routing. |
| `contextual_prompt_dismissed` | User dismisses prompt. | `variant` | Dismiss click. | Whether prompts are noisy. |
| `person_search_started` | User starts a person search. | `source`, `has_query` | Search input debounced or submitted. | Whether search is primary. |
| `person_search_results_loaded` | Search results return. | `results_count_bucket`, `page`, `source` | Missing API results loaded after search. | Search success rate. |
| `person_search_no_results` | Search returns zero results. | `source` | Missing API returns zero for query. | Missing info gaps. |
| `report_missing_cta_after_no_results_clicked` | User reports missing after failed search. | `source` | CTA click after no results. | Whether search-to-report loop works. |
| `missing_report_started` | Missing-person form opened. | `source` | Form opens. | Report intent. |
| `missing_report_submitted` | Missing-person report submitted. | `has_photo`, `has_age`, `has_last_seen`, `has_contact`, `source` | Successful POST. | Completion quality. |
| `found_report_started` | Found-person flow starts. | `source` | Found form opens or report-found action starts. | Found flow discoverability. |
| `found_report_submitted` | Found-person report submitted. | `has_photo`, `source` | Successful mark found/report found. | Reunification outcomes. |
| `seen_in_hospital_report_started` | User starts reporting someone in hospital. | `source` | Hospital/person link flow opens. | Hospital reunification demand. |
| `seen_in_hospital_report_submitted` | Hospital sighting submitted. | `has_hospital`, `has_patient_link`, `source` | Successful submit. | Hospital linkage outcomes. |
| `person_detail_viewed` | Person detail opened. | `status`, `has_photo`, `has_hospital_link`, `source` | Detail modal/page opens. | Whether people inspect records. |
| `hospital_list_viewed` | Hospital list screen viewed. | `source` | Hospital list route/component visible. | Hospital feature interest. |
| `hospital_filter_used` | Hospital filters used. | `filter_type`, `zone` | State/search/zone filter changes. | Which hospital filters matter. |
| `hospital_patient_search_started` | Patient search starts. | `has_query` | Patient search query debounced/submitted. | Patient lookup demand. |
| `hospital_patient_search_results_loaded` | Patient search results load. | `results_count_bucket` | Patient API returns. | Patient search success. |
| `hospital_detail_viewed` | Hospital detail opens. | `priority_zone`, `has_patients_bucket` | Hospital detail page opens. | Which hospitals users inspect. |
| `help_resource_clicked` | User clicks a help resource. | `resource`, `source` | Guia, psicologica, telefonos, acopio click. | Most needed help resources. |
| `psychology_help_requested` | Existing event; keep. | `destination` | Psychology support click. | Mental health support demand. |
| `international_help_clicked` | User opens international help/donation path. | `source`, `country_code` | Click to international help. | Outside-country help demand. |
| `donation_path_clicked` | User chooses a donation path. | `donation_type`, `source` | Donation CTA click. | Donation intent. |
| `volunteer_path_clicked` | User chooses volunteering. | `volunteer_type`, `source` | Volunteer CTA click. | Volunteer supply. |
| `resource_offer_started` | User starts offering resource. | `resource_type`, `source` | Offer-resource form opens. | Available help categories. |
| `map_opened` | User opens map/filters. | `source` | Map route/section viewed. | Map demand. |
| `map_filter_used` | User filters map. | `filter_type`, `report_type` | Filter changes. | Operational map needs. |
| `urgent_trapped_report_started` | User starts trapped-person/urgent location report. | `source` | Urgent report opens. | Rescue flow demand. |
| `urgent_trapped_report_submitted` | Urgent trapped report submitted. | `has_location`, `has_contact_method`, `source` | Successful submit. | Rescue signal. |
| `rescuer_section_opened` | Rescuer/first-line section opened. | `access_level`, `source` | Route/section opens. | First-line demand. |
| `admin_moderation_action_completed` | Admin completes moderation action. | `action`, `object_type` | Delete, restore, verify, hide. | Moderation workload. |
| `form_error_shown` | User sees a form validation/server error. | `form`, `field_group`, `error_type` | Error rendered. | Friction and broken flows. |
| `offline_or_low_bandwidth_detected` | Low bandwidth/offline mode detected. | `mode` | Existing network mode detects low bandwidth/offline. | Need for lightweight UX. |
| `share_clicked` | Existing share event; keep/standardize. | `method`, `source` | Share action. | Virality/help spreading. |

## Conversions

| Conversion | Event | Counting | Used By |
| --- | --- | --- | --- |
| Missing person reported | `missing_report_submitted` | Every successful report | Reunification team/product |
| Found person reported | `found_report_submitted` | Every successful report | Reunification team/product |
| Person seen in hospital reported | `seen_in_hospital_report_submitted` | Every successful report | Reunification/hospitals |
| Urgent trapped report submitted | `urgent_trapped_report_submitted` | Every successful report | Rescue/first-line |
| Hospital patient search completed | `hospital_patient_search_results_loaded` | Every search result load | Hospital lookup UX |
| International help intent | `international_help_clicked` | Every click | Aid coordination |
| Volunteer intent | `volunteer_path_clicked` | Every click | Volunteer coordination |
| Help resource intent | `help_resource_clicked` | Every click | Civilian support UX |

## Implementation Notes

- Keep using `trackEvent` from `frontend/lib/openpanel.ts`.
- Add a small wrapper of named functions to avoid typo-heavy event calls.
- Keep events production-gated.
- Add `variant` once proposal repos exist, using a constant per repo.
- Use buckets instead of exact counts where useful:
  - `0`
  - `1`
  - `2_5`
  - `6_20`
  - `21_plus`
- Add validation screenshots/log checks in production preview when possible.

## Validation Checklist

- Verify each event fires once per user action.
- Verify no PII is present in OpenPanel payloads.
- Verify mobile Safari and Chrome.
- Verify failed search and no-results CTA.
- Verify contextual prompt shown/clicked/dismissed.
- Verify form errors produce non-sensitive `form_error_shown`.
- Verify OpenPanel stays disabled on localhost unless explicitly configured.

