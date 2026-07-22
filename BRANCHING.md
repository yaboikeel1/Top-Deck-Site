# Top Deck Git Branching Guide

## Permanent branches

### `main`
The production branch. Netlify should deploy this branch to the live website.

### `develop`
The working branch for approved website updates before they are released.

## Recommended workflow

1. Start new work from `develop`.
2. Create a short-lived feature branch when a change is larger than a quick edit.
3. Test the change.
4. Merge the feature branch into `develop`.
5. When the release is ready, merge `develop` into `main`.
6. Netlify deploys the updated `main` branch.

## Feature branch examples

- `feature/music-vault`
- `feature/top-deck-code`
- `feature/founders-hall`
- `fix/booking-form`
- `content/new-release`

## Commit message examples

- `feat: add Top Deck Code page`
- `fix: correct booking form redirect`
- `content: add Circle K release details`
- `style: improve mobile navigation`
- `docs: update deployment instructions`

## Rule

Never build experimental changes directly on `main`. Keep `main` stable and ready for deployment.
