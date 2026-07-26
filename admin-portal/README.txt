TOP DECK OS V7.1 — RELEASE READINESS
========================================

FILES
- index.html
- admin-v7.1.js

DEPLOYMENT
1. In GitHub, open the admin-portal folder.
2. Upload index.html and admin-v7.1.js from this package.
3. Delete admin-v7.js only after confirming index.html references admin-v7.1.js.
4. Commit with message: Deploy Top Deck OS V7.1 Release Readiness
5. Wait for Netlify to deploy.
6. Open /admin-portal/ and hard refresh the browser.

TEST CHECKLIST
- Sign in as admin.
- Open Distribution, then open a release workspace.
- Confirm readiness meter and checklist appear.
- Enter ISRC, UPC, Publisher, Copyright Owner, and Marketing status.
- Save and confirm “Distribution update saved.”
- Reopen the release and confirm the values persist.
- At 100%, confirm “Send to Distribution” enables.
- Click it and confirm status becomes “Ready for Distribution.”

DATABASE COLUMNS REQUIRED
- isrc text
- upc text
- publisher text
- copyright_owner text
- marketing_complete boolean
- readiness_score integer

ROLLBACK
Restore the previous V7 index.html and admin-v7.js files from GitHub history.
