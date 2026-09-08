from pathlib import Path

path = Path('MOBILE_PARITY.md')
text = path.read_text()

replacements = {
    'This is a staged implementation, **not full desktop parity**.': (
        'Repository-side functional parity is implemented across the audited module scope; '
        'physical-device validation and final native presentation polish are still required '
        'before calling the mobile release fully validated.'
    ),
    'Physical-device microphone/process-death smoke test, richer reader presentation and remaining desktop visual polish': (
        'Physical-device microphone/process-death smoke test and remaining native visual polish'
    ),
    'Native journal/library/program/progress/report tabs; shared contracts, validation, report calculations and SQL repository; V5 additive migration; Expo camera/media-library and app-storage adapter with replacement/deletion/reconciliation': (
        'Native journal/library/program/progress/report tabs; shared contracts, validation, report calculations and SQL repository; '
        'V5 additive migration; Expo camera/media-library and app-storage adapter with replacement/deletion/reconciliation; '
        'advanced native reports with 7/30/90/365/custom periods and program/free-workout, exercise and muscle-group filters, '
        'plus load distribution, exercise analytics, records and daily timeline'
    ),
    'Native Today/Diary/Foods/Recipes/Progress tabs; shared contracts, validation, milli-unit calculations, reports and transactional repository; V6 additive migration with the complete 211-item default catalog; snapshot-preserving logs and JSON meal import': (
        'Native Today/Diary/Foods/Recipes/Progress tabs; shared contracts, validation, milli-unit calculations, reports and transactional repository; '
        'V6 additive migration with the complete 211-item default catalog; snapshot-preserving logs and JSON meal import; '
        'advanced native progress reports with 7/30/90/365/custom periods, meal-type filtering, summary metrics, macro/meal shares, '
        'top items and daily timeline'
    ),
    'A final combined read-only branch gate will revalidate these files together with Diary/Home before temporary verification workflows are removed.': (
        'The same files are included in the final combined branch verification together with Home, Diary and the remaining mobile modules.'
    ),
    'Next finish the combined strict read-only Home/Diary/Music/Tasks checkpoint, remove its temporary verification workflows, then continue only the remaining native presentation and physical-device validation without changing desktop persistence semantics.': (
        'The repository-side functional parity audit is complete for the current 15-module scope: no remaining known business-logic or persistence parity gap was found. '
        'Remaining work is physical-device Android smoke testing (notifications, permissions, microphone/audio, document/share flows, gestures, lifecycle/process-death and image loading) '
        'plus optional native presentation polish; desktop persistence semantics should remain unchanged.'
    ),
}

for before, after in replacements.items():
    if before not in text:
        raise SystemExit(f'Expected MOBILE_PARITY fragment not found: {before}')
    text = text.replace(before, after, 1)

anchor = (
    'Repository-wide formatting and desktop ESLint are not currently clean baseline gates:'
)
checkpoint = (
    'Home/Diary functional checkpoint verified on 2026-09-08 from clean dependencies with scoped formatting, '
    '`npm run lint:mobile`, root `npm run typecheck`, `npm run test:mobile` (**31 files, 147 tests**), '
    'full `npm run test:run` (**189 files, 715 tests**), `npm run db:check`, `npm run build:bundle`, '
    '`npm run export:android`, `npm audit --audit-level=high`, `git diff --check`, and a green final aggregator. '
    'Home now surfaces the durable Calendar/Habits unread reminder inbox with source navigation and persisted acknowledgements; '
    'Diary now includes the native notebook library, Monday-first calendar, persisted paper/cover appearance, page transition and '
    'desktop-aligned range reports without changing persistence.\n\n'
    'Nutrition/Workouts advanced reports checkpoint verified on 2026-09-08 with scoped formatting, mobile lint, root typecheck, '
    '`npm run test:mobile` (**32 files, 150 tests**), full desktop regression (**189 files, 715 tests**), DB check, production bundle, '
    'Android Expo export, high-severity audit gate and whitespace validation. Nutrition Progress now supports 7/30/90/365/custom '
    'periods and meal-type filtering; Workouts Reports supports the same periods plus program/free-workout, exercise and muscle-group '
    'filters. Both reuse the existing shared repositories and validation contracts with no schema migration or desktop behavior change.\n\n'
)

if checkpoint not in text:
    if anchor not in text:
        raise SystemExit('MOBILE_PARITY checkpoint anchor not found')
    text = text.replace(anchor, checkpoint + anchor, 1)

path.write_text(text)
