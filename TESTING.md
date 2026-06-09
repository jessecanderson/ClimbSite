# ClimbSite Tester Checklist

Use the deployed app at `https://climbsite.vercel.app`.

## What To Test

- Browse `/areas` and confirm source links open the external climbing/access source.
- Open a climbing area detail page and compare nearby campground options.
- Browse `/hubs` and confirm each hub gives a useful weekend planning view.
- Sign in and create a trip from `/trips/new`.
- Rename the trip and edit trip notes.
- Add one or more climbing stops.
- Edit stop notes.
- Select a campground for each stop.
- Use `Copy trip summary` and confirm the copied text is useful.
- Delete a test trip and confirm it disappears from `/trips`.

## Admin Testing

Admin users can open `/admin/imports`.

- Confirm recent import runs are visible.
- Filter candidates by status and entity type.
- Use `Source details` to inspect the upstream record.
- Use `Needs research` for broad or low-confidence records.
- Use `Ignore` for records that should not be reviewed again.
- Use `Link reference` when an import matches an existing public record.
- Use `Accept as new` only when the candidate has enough location/source context to publish as a
  `needs_review` imported record.

## Feedback We Want

- Which climbing areas or campgrounds are missing for Southeast weekend planning?
- Which source links are too broad or not useful?
- Where does the trip workflow feel slow, confusing, or incomplete?
- Does the copied trip summary contain the right information?
- Are the source-of-truth boundaries clear enough?

## Intentional Boundaries

- ClimbSite is not a route guide.
- ClimbSite does not publish route names, grades, or guidebook-style details.
- ClimbSite does not sell reservations.
- Always verify route, access, permit, closure, and booking details with the linked source sites.
