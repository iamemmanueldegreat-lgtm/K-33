---
name: Curriculum data model
description: How NBTE/CCMAS curriculum courses are stored and filtered — critical for Library and Home page queries
---

## Rule
NBTE polytechnic courses are stored with `school: 'NBTE'`. CCMAS university courses use `school: 'CCMAS'`.
When filtering courses for a student, the query must include these shared-curriculum schools alongside their specific school.

## Why
All polytechnics share the same NBTE curriculum. Storing `school: 'NBTE'` (instead of 'Auchi Polytechnic') lets every polytechnic student see the curriculum without duplicating courses per school.

## How to apply
In any page that queries courses by school (Library.tsx, Home.tsx):
```js
const isPoly = isPolytechnic(user.school);
const schoolMatch =
  c.school === user.school ||
  (isPoly && c.school === 'NBTE') ||
  (!isPoly && c.school === 'CCMAS');
```

## Course fields added for curriculum
- `semester: 1 | 2` — semester number; legacy courses without this show in all semesters
- `credit_units: number` — NBTE credit/contact hours
- `program_type: 'polytechnic' | 'university'`
- `source: 'NBTE' | 'CCMAS' | 'custom'`

## Admin import flow
Admin → "Import Curriculum" tab → paste PDF text → POST /api/parse-curriculum → preview → save.
Firestore doc ID format: `${dept}-${level}-${code}` (lowercased, non-alphanumeric stripped).
Topics stored as subcollection `courses/{courseId}/topics`.
