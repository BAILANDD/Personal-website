# Local portfolio

Run from the parent directory: `python3 -m http.server 8765 --bind 127.0.0.1 --directory newweb`.

## Navigation

Home → Design directory → project detail → Design directory. Operations has a separate directory. About, Files and Links open desktop windows; Experiments is a separate page.

## Shared design template

The homepage File Explorer has a Design → TASTOID motion prototype in `explorer-motion.js` and `explorer-lightbox.js`. The official GSAP 3.15.1 browser bundles (core, Flip and ScrollTrigger) are vendored from npm so the prototype also works when opening `index.html` directly, without a CDN or a build step.

All seven projects use `project.html?project=ID`, `project.css`, and `project.js`. `projects.js` stores the content, cover, metadata and section list. `bodyHtml` contains the original ordered content blocks; the shared renderer applies the new style, chapter navigation and image enlargement.

## Legacy import

`python3 newweb/scripts/migrate-projects.py` rebuilds project data from `website/index.html` and copies the referenced media and directory covers. It overwrites `projects.js`; make content changes at the source before reimporting. `migration-report.json` lists imported projects, section/image counts and video links.

Imported: scomparsa, corallo, lillit, mengyouji, suicidio, laststop, tastoid. All original paragraphs, 77 image occurrences and six external video links are retained. Desktop artwork and layout are separate from this import.

## Photography

Click the arch on the desktop to enter `photography.html`. The hit area uses the same centered-cover geometry as the monitor, defined in `scene-geometry.js`. A small alternate link appears when the arch is cropped out. The background asset is untouched.

Add photographs in `photos.js`: each entry has `id`, `src`, `title`, `album`, `date`, and `location`. Use a local asset path in `src`; `null` deliberately shows a labeled placeholder. Albums are generated from the data.
