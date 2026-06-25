globalThis.DEFAULT_COURSES = {
  "גורמי אנוש": "https://moodle.bgu.ac.il/moodle/course/view.php?id=61297",
  "קבלת החלטות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=61296",
  "רגרסיה לינארית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62506",
  "ניתוח ועיצוב מערכות מידע": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62675",
  "סימולציה": "https://moodle.bgu.ac.il/moodle/course/view.php?id=60482",
  "הנדסת חשמל": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62514",
  "תכנון ופיקוח על ייצור 2": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59568",
  "הנדסת מכונות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59562",
  "בסיסי נתונים": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57627",
  "חקר ביצועים": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57107",
  "אלגברה לינארית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=49403",
  "חדוא 1": "https://moodle.bgu.ac.il/moodle/course/view.php?id=49406",
  "יסודות מערכות מידע": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54012",
  "פתמע": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57105",
  "תכנון ופיקוח על ייצור 2 (תפי 2)": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59568",
  "חוויה מוזיקלית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62465",
  "סדנת מיומנויות בין אישית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=62672",
  "כלכלה": "https://moodle.bgu.ac.il/moodle/course/view.php?id=60047",
  "פיזיקה 2ב": "https://moodle.bgu.ac.il/moodle/course/view.php?id=58569",
  "שיטות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=59566",
  "פיזיקה 1ב": "https://moodle.bgu.ac.il/moodle/course/view.php?id=55048",
  "אלגוריתמים": "https://moodle.bgu.ac.il/moodle/course/view.php?id=55007",
  "תכנון ופיקוח על ייצור 1 (תפי 1)": "https://moodle.bgu.ac.il/moodle/course/view.php?id=57106",
  "משוואות דיפרנציאליות רגילות / מישדיפ": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54013",
  "מבוא לתכנות / תכנות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54082",
  "מבוא להסתברות / הסתברות": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54009",
  "חדוא 2": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54008",
  "גרפיקה הנדסית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=54010",
  "דיסקרטית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=51130",
  "מבוא לחשבונאות פיננסית וניהולית": "https://moodle.bgu.ac.il/moodle/course/view.php?id=49107",
  "אוטומציה / automation": "https://moodle.bgu.ac.il/moodle/course/view.php?id=63443",
  "iot / אינטרנט": "https://moodle.bgu.ac.il/moodle/course/view.php?id=64661",
  "איכות / quality": "https://moodle.bgu.ac.il/moodle/course/view.php?id=64662",
  "מימון / finance": "https://moodle.bgu.ac.il/moodle/course/view.php?id=65670",
  "פרויקטים / projects": "https://moodle.bgu.ac.il/moodle/course/view.php?id=63518",
  "גמר / finals": "https://moodle.bgu.ac.il/moodle/course/view.php?id=16797",
  "רובוטיקה קוגנטיבית / cognitive robotics": "https://moodle.bgu.ac.il/moodle/course/view.php?id=64670"
};

// --- Moodle URL migration -------------------------------------------------
// As of the June 2026 Moodle 4.5 upgrade, BGU Moodle is served under a
// "/moodle/" sub-path (M.cfg.wwwroot === "https://moodle.bgu.ac.il/moodle").
// Links saved by older versions of the extension point at the legacy root
// (e.g. ".../course/view.php?id=...") and now return "File not found".
// migrateCourseUrl rewrites those legacy BGU Moodle links to the new path.
globalThis.migrateCourseUrl = function migrateCourseUrl(url) {
  try {
    const parsed = new URL(url, "https://moodle.bgu.ac.il");
    if (parsed.hostname !== "moodle.bgu.ac.il") return url;
    if (parsed.pathname.startsWith("/moodle/") || parsed.pathname === "/moodle") {
      return url;
    }
    // Only rewrite known Moodle app paths so we don't touch unrelated links.
    if (/^\/(course|mod|local|user|grade|my|calendar|message|login|blocks|pluginfile|admin)\b/.test(parsed.pathname)) {
      parsed.pathname = "/moodle" + parsed.pathname;
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
};

// Returns { courses, changed }. Rewrites legacy URLs and merges in any
// curated default courses that are missing from the stored set.
globalThis.upgradeStoredCourses = function upgradeStoredCourses(courses) {
  const out = {};
  let changed = false;

  for (const [name, url] of Object.entries(courses || {})) {
    const migrated = globalThis.migrateCourseUrl(url);
    if (migrated !== url) changed = true;
    out[name] = migrated;
  }

  for (const [name, url] of Object.entries(globalThis.DEFAULT_COURSES || {})) {
    if (!(name in out)) {
      out[name] = url;
      changed = true;
    }
  }

  return { courses: out, changed };
};