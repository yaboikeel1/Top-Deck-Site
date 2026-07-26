TOP DECK OS V7.2.1 — FLAT UPLOAD PACKAGE

Upload all files directly into your existing admin-portal folder.
Do not create another nested folder.

Files:
- index.html
- admin-v7.2.1.js

Required Supabase columns:
- topdeck_release_id
- workflow_status
- artist_completion
- label_completion
- isrc_source
- upc_source
- copyright_review_complete
- distribution_approved

ISRC/UPC choices:
- existing: code must be entered
- top_deck: counts as handled; Top Deck will assign
- not_required: bypass for now
- pending: remains incomplete
