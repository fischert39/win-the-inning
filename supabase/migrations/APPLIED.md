# Applied migrations

Code deploys automatically when pushed. **Database changes don't** — each file
here is run by hand in Supabase → SQL Editor. Record it below when you do, so
production never quietly drifts from these files again (019 sat unapplied for
months while the app showed achievements that couldn't be earned).

Deploy order rule: **apply a migration before pushing code that depends on it.**

| File | In production | Notes |
|---|---|---|
| 015_push_subscriptions.sql | ✅ | |
| 016_activity_feed.sql | ✅ | |
| 017_teams.sql | ✅ | |
| 018_join_page.sql | ✅ | |
| 019_team_achievements.sql | ⛔ never applied | Superseded by 029 — do not run |
| 020_team_palette.sql | ✅ | |
| 021_admin_stats.sql | ✅ | |
| 022_profile_timezone.sql | ✅ | |
| 023_pinch_hitter.sql | ✅ | |
| 024_security_hardening.sql | ✅ Jul 13 2026 | |
| 025_week_planner.sql | ✅ Sep 2026 | Was misnumbered 021 |
| 026_notify_dedupe.sql | ✅ Sep 2026 | Was misnumbered 022 |
| 027_reopen_window.sql | ✅ Sep 15 2026 | Re-open 48h window |
| 028_dedupe_innings_unique.sql | ✅ Sep 15 2026 | Removed 11 duplicate innings + 1 duplicate week from two past seasons |
| 029_team_scoring.sql | ✅ Sep 15 2026 | Replaces 019; team achievements + scoreboards |
| 030_team_security.sql | ✅ Oct 4 2026 | Closes team-takeover hole; team admin always kept |
| 031_join_request_fix.sql | ✅ Nov 16 2026 | Approving a join request requires a real pending request. Apply any time |
| 032_nudges_server_only.sql | ⏳ not yet | Nudges written only by /api/nudge. **Apply AFTER the matching code is live** (exception to the rule above) |

Checking what's really there beats trusting this table — e.g. in the SQL editor:
`select proname from pg_proc where pronamespace = 'public'::regnamespace order by 1;`
