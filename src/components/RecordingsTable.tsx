import React, { useState, useMemo } from 'react';
import prednasky from '@site/src/data/nahravky-povinnych-predmetu.json';

/* ───────────────────────── Types ───────────────────────── */

interface YearLink {
  rok: string;
  odkaz: string;
}

interface CoursePredmet {
  kod: string;
  nazev: string;
  odkazy: YearLink[];
}

interface AllCoursesData {
  zimniSemestr: CoursePredmet[];
  letniSemestr: CoursePredmet[];
}

interface Lecture {
  cislo?: number;
  tema: string;
  odkazy?: YearLink[];
  odkaz?: string;
}

interface CoursePart {
  key: string;
  label: string;
}

interface SpecificCourse {
  label: string;
  data: Record<string, Lecture[]>;
  parts: CoursePart[];
  extrasKey?: string;
  extrasLabel?: string;
}

interface RecordedLecturesTableProps {
  courses?: SpecificCourse[];
}

/* ───────────────────────── Styles ──────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'var(--ifm-font-family-base)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
  },
  select: {
    appearance: 'none' as const,
    padding: '0.5rem 2rem 0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1.5px solid var(--ifm-color-emphasis-300)',
    background: `var(--ifm-background-surface-color) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E") no-repeat right 0.75rem center`,
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    color: 'var(--ifm-font-color-base)',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  toggle: {
    display: 'inline-flex',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1.5px solid var(--ifm-color-emphasis-300)',
  },
  toggleBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: 500,
  },
  toggleActive: {
    background: 'var(--ifm-color-primary)',
    color: '#fff',
  },
  toggleInactive: {
    background: 'var(--ifm-background-surface-color)',
    color: 'var(--ifm-font-color-base)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.65rem 0.75rem',
    borderBottom: '2px solid var(--ifm-color-emphasis-300)',
    fontWeight: 600,
    color: 'var(--ifm-font-color-base)',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '0.55rem 0.75rem',
    borderBottom: '1px solid var(--ifm-color-emphasis-200)',
    verticalAlign: 'middle' as const,
  },
  kodCell: {
    fontFamily: 'var(--ifm-font-family-monospace)',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap' as const,
  },
  link: {
    color: 'var(--ifm-color-primary)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  noLink: {
    color: 'var(--ifm-color-emphasis-500)',
    fontStyle: 'italic',
    fontSize: '0.85rem',
  },
  yearBadge: {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 500,
    marginLeft: '0.35rem',
    color: 'var(--ifm-color-primary)',
    background: 'var(--ifm-color-primary-lightest, rgba(0,0,0,0.05))',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  row: {
    transition: 'background 0.15s',
  },
  columnsWrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  },
  columnHeading: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--ifm-font-color-base)',
    marginBottom: '0.75rem',
  },
  extrasHeading: {
    marginTop: '2rem',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--ifm-font-color-base)',
  },
};

/* ───────────────────────── Helpers ─────────────────────── */

function getLinkLabel(url: string): string {
  if (url.includes('youtube.com')) return '▶ YouTube';
  if (url.includes('moodle')) return '📘 Moodle';
  return '🔗 Odkaz';
}

function RowHover({ children }: { children: React.ReactNode }) {
  return (
    <tr
      style={styles.row}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--ifm-color-emphasis-100)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </tr>
  );
}

function LinkCell({ lecture }: { lecture: Lecture }) {
  const links = lecture.odkazy ?? [];

  if (links.length === 1) {
    return (
      <a href={links[0].odkaz} target="_blank" rel="noopener noreferrer" style={styles.link}>
        {getLinkLabel(links[0].odkaz)}
      </a>
    );
  }

  if (links.length > 1) {
    return (
      <>
        {links.map((o) => (
          <a
            key={o.rok}
            href={o.odkaz}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.yearBadge}
            title={o.rok}
          >
            {o.rok}
          </a>
        ))}
      </>
    );
  }

  if (lecture.odkaz) {
    return (
      <a href={lecture.odkaz} target="_blank" rel="noopener noreferrer" style={styles.link}>
        {getLinkLabel(lecture.odkaz)}
      </a>
    );
  }

  return <span style={styles.noLink}>—</span>;
}

/* ──────────────── All Courses (default view) ──────────── */

function AllCoursesView() {
  const data = prednasky as AllCoursesData;

  const years = useMemo(() => {
    const yearSet = new Set<string>();
    [...data.zimniSemestr, ...data.letniSemestr].forEach((p) =>
      p.odkazy.forEach((o) => yearSet.add(o.rok))
    );
    return [...yearSet].sort().reverse();
  }, [data]);

  const [selectedYear, setSelectedYear] = useState(years[0] ?? '2025/2026');
  const [semestr, setSemestr] = useState<'zimni' | 'letni'>('zimni');

  const items = semestr === 'zimni' ? data.zimniSemestr : data.letniSemestr;

  const getLinkForYear = (odkazy: YearLink[]): string | null => {
    const match = odkazy.find((o) => o.rok === selectedYear);
    return match?.odkaz ?? null;
  };

  return (
    <>
      <div style={styles.controls}>
        <select
          style={styles.select}
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <div style={styles.toggle}>
          <button
            style={{
              ...styles.toggleBtn,
              ...(semestr === 'zimni' ? styles.toggleActive : styles.toggleInactive),
            }}
            onClick={() => setSemestr('zimni')}
          >
            Zimní semestr
          </button>
          <button
            style={{
              ...styles.toggleBtn,
              ...(semestr === 'letni' ? styles.toggleActive : styles.toggleInactive),
            }}
            onClick={() => setSemestr('letni')}
          >
            Letní semestr
          </button>
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Kód</th>
            <th style={styles.th}>Název předmětu</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Přednášky</th>
          </tr>
        </thead>
        <tbody>
          {items.map((predmet) => {
            const link = getLinkForYear(predmet.odkazy);
            return (
              <RowHover key={predmet.kod}>
                <td style={{ ...styles.td, ...styles.kodCell }}>{predmet.kod}</td>
                <td style={styles.td}>{predmet.nazev}</td>
                <td style={{ ...styles.td, textAlign: 'right' }}>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                    >
                      {getLinkLabel(link)}
                    </a>
                  ) : (
                    <span style={styles.noLink}>—</span>
                  )}
                </td>
              </RowHover>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

/* ──────────────── Specific Course View ────────────────── */

function PartColumn({ part, lectures }: { part: CoursePart; lectures: Lecture[] }) {
  return (
    <div>
      <div style={styles.columnHeading}>{part.label}</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Téma</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Odkaz</th>
          </tr>
        </thead>
        <tbody>
          {lectures.map((lecture, i) => (
            <RowHover key={i}>
              <td style={styles.td}>{lecture.tema}</td>
              <td style={{ ...styles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                <LinkCell lecture={lecture} />
              </td>
            </RowHover>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpecificCourseView({ course }: { course: SpecificCourse }) {
  const extras: Lecture[] = course.extrasKey ? course.data[course.extrasKey] ?? [] : [];

  return (
    <>
      <div style={styles.columnsWrapper}>
        {course.parts.map((part) => (
          <PartColumn
            key={part.key}
            part={part}
            lectures={course.data[part.key] ?? []}
          />
        ))}
      </div>

      {extras.length > 0 && (
        <>
          <div style={styles.extrasHeading}>
            {course.extrasLabel ?? 'Doplňkové přednášky'}
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Téma</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Odkaz</th>
              </tr>
            </thead>
            <tbody>
              {extras.map((item, i) => (
                <RowHover key={i}>
                  <td style={styles.td}>{item.tema}</td>
                  <td style={{ ...styles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <LinkCell lecture={item} />
                  </td>
                </RowHover>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

/* ──────────────────── Main Component ──────────────────── */

const ALL_COURSES_KEY = '__all__';

export default function RecordedLecturesTable({ courses = [] }: RecordedLecturesTableProps) {
  const [activeView, setActiveView] = useState(ALL_COURSES_KEY);

  const tabs = [
    { key: ALL_COURSES_KEY, label: 'Povinné předměty' },
    ...courses.map((c, i) => ({ key: `course-${i}`, label: c.label })),
  ];

  if (courses.length === 0) {
    return (
      <div style={styles.container}>
        <AllCoursesView />
      </div>
    );
  }

  const activeCourseIndex = courses.findIndex(
    (_, i) => `course-${i}` === activeView
  );

  return (
    <div style={styles.container}>
      <div style={styles.controls}>
        <div style={styles.toggle}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.toggleBtn,
                ...(activeView === tab.key
                  ? styles.toggleActive
                  : styles.toggleInactive),
              }}
              onClick={() => setActiveView(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeView === ALL_COURSES_KEY ? (
        <AllCoursesView />
      ) : activeCourseIndex >= 0 ? (
        <SpecificCourseView course={courses[activeCourseIndex]} />
      ) : null}
    </div>
  );
}