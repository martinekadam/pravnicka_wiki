import React, { useState, useMemo, useCallback } from 'react';
import coursesData from './courses.json';
import modulesData from './modules.json';

// Types
interface Course {
  code: string;
  name: string;
  status?: string | null;
  isActive?: boolean;
  type: 'mandatory' | 'compulsory-elective' | 'elective';
  typeCs: string;
  category?: string | null;
  categoryCs?: string | null;
  recommendedYears: number[];
  semesters: ('winter' | 'summer')[];
  completion: string;
  credits: number;
  language?: string;
  exchangeableWith?: string | null;
  sisUrl: string;
  modules?: string[]; // Legacy field, can be ignored
}

interface ModuleGroup {
  group: string;
  minCourses: number;
  courses: string[];
}

interface Module {
  code: string;
  name: string;
  minCourses: number;
  courses: string[];
  groups: ModuleGroup[];
}

// Normalize course data to ensure all fields exist
const normalizeCourse = (c: Course): Course => ({
  ...c,
  status: c.status ?? null,
  isActive: c.isActive ?? true,
  category: c.category ?? (c.type === 'compulsory-elective' ? determineCategoryFromCode(c.code) : null),
  categoryCs: c.categoryCs ?? (c.type === 'compulsory-elective' ? determineCategoryCsFromCode(c.code) : null),
  language: c.language ?? 'čeština',
  exchangeableWith: c.exchangeableWith ?? null,
});

// Helper to determine category from code prefix
const determineCategoryFromCode = (code: string): string => {
  if (code.startsWith('HJPV')) return 'language';
  if (code.startsWith('HSPV')) return 'social';
  if (code.startsWith('HDPV')) return 'skills';
  if (code.startsWith('HXPV')) return 'practice';
  if (code.startsWith('HOPV')) return 'general';
  return 'other';
};

const determineCategoryCsFromCode = (code: string): string => {
  if (code.startsWith('HJPV')) return 'Jazykové předměty';
  if (code.startsWith('HSPV')) return 'Společenskovědní předměty';
  if (code.startsWith('HDPV')) return 'Dovednostní předměty';
  if (code.startsWith('HXPV')) return 'Praxe';
  if (code.startsWith('HOPV')) return 'Obecné povinně volitelné předměty';
  return 'Ostatní';
};

// Normalize all courses on load
const courses: Course[] = (coursesData as Course[]).map(normalizeCourse);

// Load modules
const modules: Module[] = modulesData as Module[];

// Create a mapping from course code to modules it belongs to
const courseToModules: Map<string, Module[]> = new Map();
modules.forEach((module) => {
  module.courses.forEach((courseCode) => {
    const existing = courseToModules.get(courseCode) || [];
    existing.push(module);
    courseToModules.set(courseCode, existing);
  });
});

interface PlannedCourse {
  code: string;
  semester: number;
}

interface PlanData {
  version: number;
  plannedCourses: PlannedCourse[];
  exportedAt: string;
}

type TabType = 'dashboard' | 'catalog' | number; // number = year (1-5)

// Degree requirements
const DEGREE_REQUIREMENTS = {
  totalCredits: 300,
  codeRequirements: [
    { prefix: 'HJPV', minCredits: 12, label: 'Jazykové předměty' },
    { prefix: 'HSPV', minCredits: 3, label: 'Společenskovědní předměty' },
    { prefix: 'HDPV', minCredits: 8, label: 'Dovednostní předměty' },
    { prefix: 'HXPV', minCredits: 4, label: 'Praxe' },
    { prefix: 'HOPV', minCredits: 51, label: 'Obecné povinně volitelné předměty' },
  ],
  // Foreign language requirement: 1 course in non-Czech language OR HXPV0099
  foreignLanguageRequirement: {
    required: 1,
    alternativeCourse: 'HXPV0099',
    label: 'Předmět v cizím jazyce nebo Zahraniční studijní pobyt (HXPV0099)',
  },
  // HPOP3101-HPOP3118 are alternative mandatory courses - need exactly 1
  alternativeMandatory: {
    startCode: 'HPOP3101',
    endCode: 'HPOP3118',
    required: 1,
    label: 'Diplomový seminář',
  },
};

// Category definitions for compulsory-elective filter
const COMPULSORY_CATEGORIES = [
  { key: 'language', prefix: 'HJPV', label: 'Jazykové (HJPV)' },
  { key: 'social', prefix: 'HSPV', label: 'Společenskovědní (HSPV)' },
  { key: 'skills', prefix: 'HDPV', label: 'Dovednostní (HDPV)' },
  { key: 'practice', prefix: 'HXPV', label: 'Praxe (HXPV)' },
  { key: 'general', prefix: 'HOPV', label: 'Obecné PV (HOPV)' },
];

// Helper to check if a code is in the alternative mandatory range
const isAlternativeMandatory = (code: string): boolean => {
  if (!code.startsWith('HPOP31')) return false;
  const num = parseInt(code.slice(4), 10);
  return num >= 3101 && num <= 3118;
};

// Helper to check if course fulfills foreign language requirement
const fulfillsForeignLanguage = (course: Course): boolean => {
  return course.language !== 'čeština' || course.code === 'HXPV0099';
};

// Constants
const YEARS = [1, 2, 3, 4, 5];
const TYPE_LABELS: Record<Course['type'], string> = {
  mandatory: 'Povinný',
  'compulsory-elective': 'Povinně volitelný',
  elective: 'Volitelný',
};
const TYPE_COLORS: Record<Course['type'], string> = {
  mandatory: 'sp-tag-mandatory',
  'compulsory-elective': 'sp-tag-compulsory',
  elective: 'sp-tag-elective',
};

// Generate default mandatory courses placement (excludes alternative mandatory HPOP3101-3118)
const getDefaultMandatoryCourses = (): PlannedCourse[] => {
  const planned: PlannedCourse[] = [];
  courses
    .filter((c) => c.type === 'mandatory' && !isAlternativeMandatory(c.code))
    .forEach((course) => {
      const year = course.recommendedYears[0] || 1;
      // Determine semester: if only winter, use winter (odd); if only summer, use summer (even); if both, use winter
      let semester: number;
      if (course.semesters.includes('winter') && !course.semesters.includes('summer')) {
        semester = (year - 1) * 2 + 1; // Winter = odd
      } else if (course.semesters.includes('summer') && !course.semesters.includes('winter')) {
        semester = (year - 1) * 2 + 2; // Summer = even
      } else {
        // Both or unspecified - default to winter
        semester = (year - 1) * 2 + 1;
      }
      planned.push({ code: course.code, semester });
    });
  return planned;
};

// Helper functions
const getYearLabel = (year: number): string => `${year}. ročník`;

const getSemesterFromYear = (year: number, season: 'winter' | 'summer'): number => {
  return (year - 1) * 2 + (season === 'winter' ? 1 : 2);
};

const getSemesterSeason = (sem: number): 'winter' | 'summer' => {
  return sem % 2 === 1 ? 'winter' : 'summer';
};

// Styles using Infima CSS variables for Docusaurus theme compatibility
const styles = `
.study-planner {
  /* Use Infima variables - automatically adapts to light/dark mode */
  --sp-primary: var(--ifm-color-primary);
  --sp-primary-hover: var(--ifm-color-primary-dark);
  --sp-primary-light: var(--ifm-color-primary-light);
  --sp-primary-lightest: var(--ifm-color-primary-lightest);
  
  /* Semantic colors - light mode (high contrast) */
  --sp-danger: #dc2626;
  --sp-danger-hover: #b91c1c;
  --sp-success: #16a34a;
  --sp-warning: #ea580c;
  
  /* Theme-aware backgrounds - light mode (more contrast) */
  --sp-bg: #ffffff;
  --sp-bg-secondary: #f1f5f9;
  --sp-bg-tertiary: #e2e8f0;
  --sp-text: #1e293b;
  --sp-text-muted: #64748b;
  --sp-border: #cbd5e1;
  --sp-border-strong: #94a3b8;
  
  /* Progress bar backgrounds - light mode (visible) */
  --sp-progress-bg: #cbd5e1;
  
  /* Semester colors - light mode (saturated) */
  --sp-winter: #2563eb;
  --sp-winter-bg: #dbeafe;
  --sp-summer: #d97706;
  --sp-summer-bg: #fef3c7;
  
  font-family: var(--ifm-font-family-base);
  color: var(--sp-text);
}

/* Dark mode adjustments */
[data-theme="dark"] .study-planner {
  --sp-danger: #f87171;
  --sp-danger-hover: #ef4444;
  --sp-success: #4ade80;
  --sp-warning: #fb923c;
  --sp-bg: var(--ifm-background-color);
  --sp-bg-secondary: rgba(255, 255, 255, 0.05);
  --sp-bg-tertiary: rgba(255, 255, 255, 0.08);
  --sp-text: var(--ifm-font-color-base);
  --sp-text-muted: #a1a1aa;
  --sp-border: rgba(255, 255, 255, 0.1);
  --sp-border-strong: rgba(255, 255, 255, 0.2);
  --sp-progress-bg: rgba(255, 255, 255, 0.15);
  --sp-winter: #60a5fa;
  --sp-winter-bg: rgba(96, 165, 250, 0.15);
  --sp-summer: #fbbf24;
  --sp-summer-bg: rgba(251, 191, 36, 0.15);
}

.sp-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  background: var(--sp-bg-secondary);
  border: 1px solid var(--sp-border);
  border-radius: var(--ifm-border-radius);
  margin-bottom: 1rem;
}

.sp-stats {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.sp-stat-primary {
  font-size: 1.125rem;
  font-weight: 600;
}

.sp-stat-primary span {
  color: var(--sp-primary);
}

.sp-stat-secondary {
  font-size: 0.875rem;
  color: var(--sp-text-muted);
}

.sp-actions {
  display: flex;
  gap: 0.5rem;
}

.sp-btn {
  padding: 0.375rem 0.75rem;
  border-radius: var(--ifm-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s, opacity 0.15s;
}

.sp-btn-primary {
  background: var(--sp-primary);
  color: var(--sp-bg);
}

.sp-btn-primary:hover {
  background: var(--sp-primary-hover);
}

.sp-btn-secondary {
  background: var(--sp-text-muted);
  color: var(--sp-bg);
}

.sp-btn-secondary:hover {
  opacity: 0.85;
}

.sp-btn-danger {
  background: var(--sp-danger);
  color: white;
}

.sp-btn-danger:hover {
  background: var(--sp-danger-hover);
}

.sp-btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.sp-btn-ghost {
  background: var(--sp-bg-secondary);
  color: var(--sp-text);
  border: 1px solid var(--sp-border);
}

.sp-btn-ghost:hover {
  opacity: 0.8;
}

.sp-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--sp-bg-secondary);
  border-radius: var(--ifm-border-radius);
  margin-bottom: 1rem;
}

.sp-tab {
  padding: 0.5rem 1rem;
  border-radius: var(--ifm-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--sp-text-muted);
  transition: all 0.15s;
  position: relative;
}

.sp-tab:hover {
  background: var(--sp-bg);
  color: var(--sp-text);
}

.sp-tab-droppable {
  transition: all 0.15s;
}

.sp-tab-droppable:hover {
  box-shadow: 0 0 0 2px var(--sp-primary);
}

.sp-tab-active {
  background: var(--sp-bg);
  color: var(--sp-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.sp-tab-catalog {
  border-left: 1px solid var(--sp-border);
  margin-left: 0.5rem;
  padding-left: 1.5rem;
}

.sp-tab-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  background: var(--sp-primary);
  color: var(--sp-bg);
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  border-radius: 9999px;
  font-weight: 600;
}

.sp-tab-badge-warning {
  background: var(--sp-warning);
}

.sp-content {
  border: 1px solid var(--sp-border);
  border-radius: var(--ifm-border-radius);
  background: var(--sp-bg);
  min-height: 500px;
}

.sp-catalog {
  padding: 1rem;
}

.sp-filters {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.sp-search {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--sp-border);
  border-radius: var(--ifm-border-radius);
  font-size: 0.875rem;
  background: var(--sp-bg);
  color: var(--sp-text);
}

.sp-search:focus {
  outline: none;
  border-color: var(--sp-primary);
  box-shadow: 0 0 0 3px rgba(44, 14, 140, 0.1);
}

[data-theme="dark"] .sp-search:focus {
  box-shadow: 0 0 0 3px rgba(230, 200, 77, 0.2);
}

.sp-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

/* Filter section with label */
.sp-filter-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sp-filter-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--sp-text-muted);
  min-width: 50px;
}

.sp-filter-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.sp-filter-toggle {
  cursor: pointer;
}

.sp-filter-toggle input {
  display: none;
}

.sp-filter-toggle-btn {
  display: inline-block;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--ifm-border-radius);
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text-muted);
  transition: all 0.15s;
}

.sp-filter-toggle-btn:hover {
  border-color: var(--sp-primary);
}

.sp-filter-toggle-mandatory.active {
  background: rgba(220, 38, 38, 0.1);
  border-color: #dc2626;
  color: #dc2626;
}

.sp-filter-toggle-compulsory.active {
  background: rgba(37, 99, 235, 0.1);
  border-color: #2563eb;
  color: #2563eb;
}

.sp-filter-toggle-elective.active {
  background: rgba(22, 163, 74, 0.1);
  border-color: #16a34a;
  color: #16a34a;
}

.sp-filter-toggle-year.active {
  background: var(--sp-primary);
  border-color: var(--sp-primary);
  color: white;
}

[data-theme="dark"] .sp-filter-toggle-year.active {
  color: #1a1a1a;
}

[data-theme="dark"] .sp-filter-toggle-mandatory.active {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border-color: #f87171;
}

[data-theme="dark"] .sp-filter-toggle-compulsory.active {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
  border-color: #60a5fa;
}

[data-theme="dark"] .sp-filter-toggle-elective.active {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
  border-color: #4ade80;
}

.sp-category-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--sp-border);
  margin-top: 0.5rem;
}

.sp-category-filters-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--sp-text-muted);
  margin-right: 0.25rem;
}

.sp-category-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.sp-category-toggle input {
  display: none;
}

.sp-category-toggle-label {
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  border-radius: 1rem;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text-muted);
  transition: all 0.15s;
}

.sp-category-toggle-label:hover {
  border-color: var(--sp-primary);
}

.sp-category-toggle-active {
  background: var(--sp-primary);
  color: white;
  border-color: var(--sp-primary);
}

[data-theme="dark"] .sp-category-toggle-active {
  color: #1a1a1a;
}

.sp-select {
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--sp-border);
  border-radius: var(--ifm-border-radius);
  font-size: 0.875rem;
  background: var(--sp-bg);
  color: var(--sp-text);
}

.sp-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--sp-text);
  cursor: pointer;
}

.sp-course-count {
  font-size: 0.875rem;
  color: var(--sp-text-muted);
  margin-bottom: 0.5rem;
}

.sp-course-list {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid var(--sp-border);
  border-radius: var(--ifm-border-radius);
}

.sp-course-item {
  padding: 0.875rem;
  border-bottom: 1px solid var(--sp-border);
  transition: background-color 0.15s;
}

.sp-course-item:last-child {
  border-bottom: none;
}

.sp-course-item:hover {
  background: var(--sp-bg-secondary);
}

.sp-course-item-planned {
  opacity: 0.5;
}

.sp-course-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.sp-course-info {
  flex: 1;
  min-width: 0;
}

.sp-course-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.25rem;
}

.sp-course-code {
  font-family: var(--ifm-font-family-monospace);
  font-size: 0.8125rem;
  color: var(--sp-text-muted);
}

.sp-tag {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.sp-tag-mandatory {
  background: #fee2e2;
  color: #991b1b;
}

[data-theme="dark"] .sp-tag-mandatory {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.sp-tag-compulsory {
  background: rgba(44, 14, 140, 0.1);
  color: var(--ifm-color-primary);
}

[data-theme="dark"] .sp-tag-compulsory {
  background: rgba(230, 200, 77, 0.15);
  color: var(--ifm-color-primary);
}

.sp-tag-elective {
  background: #dcfce7;
  color: #166534;
}

[data-theme="dark"] .sp-tag-elective {
  background: rgba(74, 222, 128, 0.15);
  color: #86efac;
}

.sp-course-credits {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--sp-text);
}

.sp-course-name {
  font-weight: 500;
  color: var(--sp-text);
  margin-bottom: 0.25rem;
}

.sp-course-details {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
}

.sp-course-actions {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

/* Year view with two semester columns */
.sp-year-view {
  padding: 1rem;
}

.sp-year-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--sp-border);
}

.sp-year-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--sp-text);
  margin: 0;
}

.sp-year-credits {
  font-size: 1rem;
  font-weight: 600;
  color: var(--sp-primary);
}

.sp-semesters-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 768px) {
  .sp-semesters-grid {
    grid-template-columns: 1fr;
  }
}

.sp-semester-panel {
  border-radius: var(--ifm-border-radius);
  overflow: hidden;
}

.sp-semester-panel-winter {
  border: 2px solid var(--sp-winter);
}

.sp-semester-panel-summer {
  border: 2px solid var(--sp-summer);
}

.sp-semester-panel-header {
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.sp-semester-panel-winter .sp-semester-panel-header {
  background: var(--sp-winter-bg);
  color: var(--sp-winter);
}

[data-theme="dark"] .sp-semester-panel-winter .sp-semester-panel-header {
  background: rgba(96, 165, 250, 0.15);
}

.sp-semester-panel-summer .sp-semester-panel-header {
  background: var(--sp-summer-bg);
  color: var(--sp-summer);
}

[data-theme="dark"] .sp-semester-panel-summer .sp-semester-panel-header {
  background: rgba(251, 191, 36, 0.15);
}

.sp-semester-panel-credits {
  font-size: 0.875rem;
  font-weight: 500;
}

.sp-drop-zone {
  min-height: 200px;
  background: var(--sp-bg);
  transition: all 0.15s;
}

.sp-drop-zone-active {
  background: rgba(44, 14, 140, 0.05);
}

[data-theme="dark"] .sp-drop-zone-active {
  background: rgba(230, 200, 77, 0.05);
}

.sp-drop-zone-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.sp-empty-message {
  text-align: center;
  color: var(--sp-text-muted);
}

.sp-empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.sp-empty-text {
  font-size: 0.875rem;
}

.sp-planned-courses {
  padding: 0.5rem;
}

.sp-planned-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0.75rem;
  margin-bottom: 0.375rem;
  border-radius: var(--ifm-border-radius);
  border: 1px solid;
  cursor: grab;
  transition: all 0.15s;
  font-size: 0.875rem;
}

.sp-planned-item:active {
  cursor: grabbing;
}

.sp-planned-item:last-child {
  margin-bottom: 0;
}

.sp-planned-item-mandatory {
  background: #fef2f2;
  border-color: #fecaca;
}

[data-theme="dark"] .sp-planned-item-mandatory {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.sp-planned-item-compulsory {
  background: rgba(44, 14, 140, 0.05);
  border-color: rgba(44, 14, 140, 0.2);
}

[data-theme="dark"] .sp-planned-item-compulsory {
  background: rgba(230, 200, 77, 0.1);
  border-color: rgba(230, 200, 77, 0.3);
}

.sp-planned-item-elective {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

[data-theme="dark"] .sp-planned-item-elective {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.3);
}

.sp-planned-item-warning {
  box-shadow: 0 0 0 2px var(--sp-warning);
}

.sp-planned-info {
  flex: 1;
  min-width: 0;
}

.sp-planned-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.sp-planned-code {
  font-family: var(--ifm-font-family-monospace);
  font-size: 0.75rem;
  color: var(--sp-text-muted);
}

.sp-planned-name {
  font-weight: 500;
  color: var(--sp-text);
}

.sp-planned-credits {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
}

.sp-planned-warning {
  font-size: 0.6875rem;
  color: var(--sp-warning);
  font-weight: 500;
  margin-top: 0.125rem;
}

.sp-planned-remove {
  background: none;
  border: none;
  font-size: 1.125rem;
  color: var(--sp-text-muted);
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
  border-radius: 0.25rem;
  flex-shrink: 0;
}

.sp-planned-remove:hover {
  color: var(--sp-danger);
  background: rgba(220, 38, 38, 0.1);
}

.sp-legend {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--sp-bg-secondary);
  border: 1px solid var(--sp-border);
  border-radius: var(--ifm-border-radius);
}

.sp-legend-title {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--sp-text);
}

.sp-legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
}

.sp-legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sp-legend-note {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
  margin-top: 0.75rem;
}

.sp-hidden {
  display: none;
}

/* Add course modal */
.sp-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.sp-modal {
  background: var(--sp-bg);
  border-radius: var(--ifm-border-radius);
  padding: 1.5rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.sp-modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--sp-text);
}

.sp-modal-subtitle {
  font-size: 0.875rem;
  color: var(--sp-text-muted);
  margin-bottom: 1rem;
}

.sp-modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.sp-modal-year-label {
  grid-column: 1 / -1;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sp-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--sp-border);
}

.sp-modal-btn {
  padding: 0.625rem 1rem;
  border-radius: var(--ifm-border-radius);
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid var(--sp-border);
  background: var(--sp-bg);
  color: var(--sp-text);
  cursor: pointer;
  transition: all 0.15s;
}

.sp-modal-btn:hover {
  background: var(--sp-bg-secondary);
}

.sp-modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sp-modal-btn-winter {
  border-color: var(--sp-winter);
  color: var(--sp-winter);
}

.sp-modal-btn-winter:hover {
  background: rgba(59, 130, 246, 0.1);
}

.sp-modal-btn-summer {
  border-color: var(--sp-summer);
  color: var(--sp-summer);
}

.sp-modal-btn-summer:hover {
  background: rgba(245, 158, 11, 0.1);
}

.sp-modal-cancel {
  width: 100%;
  padding: 0.5rem;
  background: transparent;
  border: none;
  color: var(--sp-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
}

.sp-modal-cancel:hover {
  color: var(--sp-text);
}

/* Recommended year highlighting in modal */
.sp-modal-year-recommended {
  color: var(--sp-primary);
  font-weight: 600;
}

.sp-modal-recommended-badge {
  display: inline-block;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--sp-primary);
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  margin-left: 0.5rem;
}

[data-theme="dark"] .sp-modal-recommended-badge {
  color: #1a1a1a;
}

.sp-modal-btn-recommended {
  border-width: 2px;
  font-weight: 600;
}

.sp-modal-btn-recommended.sp-modal-btn-winter {
  border-color: var(--sp-winter);
  background: rgba(59, 130, 246, 0.1);
}

.sp-modal-btn-recommended.sp-modal-btn-summer {
  border-color: var(--sp-summer);
  background: rgba(245, 158, 11, 0.1);
}

/* Year tab drop indicator */
.sp-tab-drop-active {
  background: var(--sp-bg);
  box-shadow: 0 0 0 2px var(--sp-primary);
}

/* Dashboard styles */
.sp-dashboard {
  padding: 1.5rem;
}

.sp-dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .sp-dashboard-grid {
    grid-template-columns: 1fr;
  }
}

.sp-dashboard-card {
  background: var(--sp-bg);
  border: 1px solid var(--sp-border);
  border-radius: var(--ifm-border-radius);
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

[data-theme="dark"] .sp-dashboard-card {
  box-shadow: none;
}

.sp-dashboard-card-full {
  grid-column: 1 / -1;
}

.sp-dashboard-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--sp-text-muted);
  margin-bottom: 1rem;
}

/* Total credits display */
.sp-credits-total {
  text-align: center;
  padding: 1rem 0;
}

.sp-credits-big {
  font-size: 3rem;
  font-weight: 700;
  color: var(--sp-primary);
  line-height: 1;
}

.sp-credits-remaining {
  font-size: 1rem;
  color: var(--sp-text-muted);
  margin-top: 0.5rem;
}

.sp-credits-bar {
  height: 8px;
  background: var(--sp-progress-bg);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
}

.sp-credits-bar-fill {
  height: 100%;
  background: var(--sp-primary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.sp-credits-bar-fill-complete {
  background: var(--sp-success);
}

/* Credits by year table */
.sp-credits-table {
  width: 100%;
  border-collapse: collapse;
}

.sp-credits-table th,
.sp-credits-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--sp-border);
}

.sp-credits-table th {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--sp-text-muted);
}

.sp-credits-table td {
  font-size: 0.875rem;
}

.sp-credits-table tr:last-child td {
  border-bottom: none;
}

.sp-credits-table-year {
  font-weight: 500;
}

.sp-credits-table-semester {
  color: var(--sp-text-muted);
  font-size: 0.8125rem;
}

.sp-credits-table-total {
  font-weight: 600;
  color: var(--sp-primary);
}

/* Requirements checklist */
.sp-requirements-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.sp-requirement-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--sp-bg-secondary);
  border-radius: var(--ifm-border-radius);
}

.sp-requirement-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.sp-requirement-icon-met {
  background: var(--sp-success);
  color: white;
}

.sp-requirement-icon-unmet {
  background: var(--sp-progress-bg);
  color: var(--sp-text-muted);
  border: 1px solid var(--sp-border);
}

.sp-requirement-info {
  flex: 1;
  min-width: 0;
}

.sp-requirement-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--sp-text);
}

.sp-requirement-progress {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
  margin-top: 0.125rem;
}

.sp-requirement-bar {
  width: 80px;
  height: 6px;
  background: var(--sp-progress-bg);
  border-radius: 3px;
  overflow: hidden;
  flex-shrink: 0;
}

.sp-requirement-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.sp-requirement-bar-fill-met {
  background: var(--sp-success);
}

.sp-requirement-bar-fill-unmet {
  background: var(--sp-primary);
}

/* Spacer for non-expandable requirement items to align with expandable ones */
.sp-requirement-spacer {
  width: 16px;
  flex-shrink: 0;
}

/* Status banner */
.sp-status-banner {
  padding: 1rem;
  border-radius: var(--ifm-border-radius);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.sp-status-banner-success {
  background: rgba(22, 163, 74, 0.1);
  border: 1px solid var(--sp-success);
  color: var(--sp-success);
}

.sp-status-banner-warning {
  background: rgba(234, 88, 12, 0.1);
  border: 1px solid var(--sp-warning);
  color: var(--sp-warning);
}

.sp-status-banner-icon {
  font-size: 1.5rem;
}

.sp-status-banner-text {
  font-weight: 500;
}

/* Tab with dashboard icon */
.sp-tab-dashboard {
  border-right: 1px solid var(--sp-border);
  margin-right: 0.5rem;
  padding-right: 1.5rem;
}

/* Mandatory courses section */
.sp-mandatory-section {
  margin-top: 0.5rem;
}

.sp-mandatory-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--sp-bg-secondary);
  border-radius: var(--ifm-border-radius);
  cursor: pointer;
  transition: background 0.15s;
}

.sp-mandatory-header:hover {
  opacity: 0.9;
}

.sp-mandatory-header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sp-mandatory-header-toggle {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.sp-mandatory-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--sp-bg-secondary);
  border-radius: var(--ifm-border-radius);
  max-height: 300px;
  overflow-y: auto;
}

.sp-mandatory-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--sp-bg);
  border-radius: var(--ifm-border-radius);
  font-size: 0.8125rem;
}

.sp-mandatory-item-completed {
  opacity: 0.6;
}

.sp-mandatory-item-icon {
  flex-shrink: 0;
}

.sp-mandatory-item-icon-completed {
  color: var(--sp-success);
}

.sp-mandatory-item-icon-missing {
  color: var(--sp-text-muted);
}

.sp-mandatory-item-code {
  font-family: var(--ifm-font-family-monospace);
  font-size: 0.75rem;
  color: var(--sp-text-muted);
}

.sp-mandatory-item-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sp-requirement-expandable {
  cursor: pointer;
}

.sp-requirement-expandable:hover {
  background: var(--sp-bg);
}

/* Module styles */
.sp-modules-card {
  grid-column: 1 / -1;
}

.sp-modules-summary {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--sp-border);
}

.sp-modules-stat {
  text-align: center;
}

.sp-modules-stat-number {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
}

.sp-modules-stat-number-qualified {
  color: var(--sp-success);
}

.sp-modules-stat-number-progress {
  color: var(--sp-primary);
}

.sp-modules-stat-label {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
  margin-top: 0.25rem;
}

.sp-modules-section {
  margin-bottom: 1rem;
}

.sp-modules-section:last-child {
  margin-bottom: 0;
}

.sp-modules-section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--sp-text-muted);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sp-module-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sp-module-item {
  padding: 0.75rem;
  background: var(--sp-bg-secondary);
  border-radius: var(--ifm-border-radius);
  cursor: pointer;
  transition: all 0.15s;
}

.sp-module-item:hover {
  background: var(--sp-bg);
}

.sp-module-item-qualified {
  border-left: 3px solid var(--sp-success);
}

.sp-module-item-progress {
  border-left: 3px solid var(--sp-primary);
}

.sp-module-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sp-module-name {
  font-weight: 500;
  font-size: 0.875rem;
}

.sp-module-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sp-module-badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.sp-module-badge-qualified {
  background: var(--sp-success);
  color: white;
}

.sp-module-badge-progress {
  background: var(--sp-primary);
  color: white;
}

[data-theme="dark"] .sp-module-badge-progress {
  color: #1a1a1a;
}

.sp-module-progress-text {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
}

.sp-module-toggle {
  font-size: 0.75rem;
  color: var(--sp-text-muted);
}

.sp-module-details {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--sp-border);
}

.sp-module-courses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-bottom: 0.75rem;
}

.sp-module-course-tag {
  font-size: 0.6875rem;
  font-family: var(--ifm-font-family-monospace);
  padding: 0.25rem 0.5rem;
  background: var(--sp-bg);
  border-radius: var(--ifm-border-radius);
  color: var(--sp-text-muted);
}

.sp-module-groups {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.sp-module-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.sp-module-group-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  flex-shrink: 0;
}

.sp-module-group-met {
  background: var(--sp-success);
  color: white;
}

.sp-module-group-unmet {
  background: var(--sp-border);
  color: var(--sp-text-muted);
}

.sp-module-group-label {
  color: var(--sp-text-muted);
}

.sp-module-group-count {
  font-weight: 500;
  color: var(--sp-text);
}

/* Module tags in catalog */
.sp-course-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
}

.sp-module-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: rgba(44, 14, 140, 0.1);
  color: var(--sp-primary);
  border-radius: 0.25rem;
  font-weight: 500;
}

[data-theme="dark"] .sp-module-tag {
  background: rgba(230, 200, 77, 0.15);
}

.sp-modules-empty {
  text-align: center;
  padding: 1.5rem;
  color: var(--sp-text-muted);
  font-size: 0.875rem;
}
`;

export default function StudyPlanner(): JSX.Element {
  const [plannedCourses, setPlannedCourses] = useState<PlannedCourse[]>(() => getDefaultMandatoryCourses());
  const [searchQuery, setSearchQuery] = useState('');
  // Type filters (toggle buttons, all on by default)
  const [typeFilters, setTypeFilters] = useState<Record<string, boolean>>({
    mandatory: true,
    'compulsory-elective': true,
    elective: true,
  });
  // Year filters (toggle buttons, all on by default)
  const [yearFilters, setYearFilters] = useState<Record<number, boolean>>({
    1: true, 2: true, 3: true, 4: true, 5: true,
  });
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true); // ON by default
  const [activeTab, setActiveTab] = useState<TabType>('dashboard'); // Default to dashboard
  const [draggedCourse, setDraggedCourse] = useState<string | null>(null);
  const [addingCourse, setAddingCourse] = useState<string | null>(null); // Course code being added via modal
  const [showMissingMandatory, setShowMissingMandatory] = useState(false);
  const [showAlternativeMandatory, setShowAlternativeMandatory] = useState(false);
  // Expanded modules in dashboard
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  // Category filters for compulsory-elective courses (all enabled by default)
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>(() => 
    Object.fromEntries(COMPULSORY_CATEGORIES.map(c => [c.key, true]))
  );

  // Computed values
  const plannedCodesSet = useMemo(
    () => new Set(plannedCourses.map((pc) => pc.code)),
    [plannedCourses]
  );

  const coursesByCode = useMemo(
    () => new Map(courses.map((c) => [c.code, c])),
    []
  );

  const creditsBySemester = useMemo(() => {
    const credits: Record<number, number> = {};
    for (let sem = 1; sem <= 10; sem++) {
      credits[sem] = plannedCourses
        .filter((pc) => pc.semester === sem)
        .reduce((sum, pc) => {
          const course = coursesByCode.get(pc.code);
          return sum + (course?.credits || 0);
        }, 0);
    }
    return credits;
  }, [plannedCourses, coursesByCode]);

  const creditsByYear = useMemo(() => {
    const credits: Record<number, number> = {};
    YEARS.forEach((year) => {
      const winterSem = getSemesterFromYear(year, 'winter');
      const summerSem = getSemesterFromYear(year, 'summer');
      credits[year] = (creditsBySemester[winterSem] || 0) + (creditsBySemester[summerSem] || 0);
    });
    return credits;
  }, [creditsBySemester]);

  const coursesCountByYear = useMemo(() => {
    const counts: Record<number, number> = {};
    YEARS.forEach((year) => {
      const winterSem = getSemesterFromYear(year, 'winter');
      const summerSem = getSemesterFromYear(year, 'summer');
      counts[year] = plannedCourses.filter(
        (pc) => pc.semester === winterSem || pc.semester === summerSem
      ).length;
    });
    return counts;
  }, [plannedCourses]);

  const totalCredits = useMemo(
    () => Object.values(creditsBySemester).reduce((a, b) => a + b, 0),
    [creditsBySemester]
  );

  // Degree requirements progress
  const requirementsProgress = useMemo(() => {
    const progress: Record<string, { current: number; required: number; met: boolean }> = {};
    
    // Calculate credits by code prefix
    DEGREE_REQUIREMENTS.codeRequirements.forEach(({ prefix, minCredits }) => {
      const credits = plannedCourses
        .filter((pc) => pc.code.startsWith(prefix))
        .reduce((sum, pc) => {
          const course = coursesByCode.get(pc.code);
          return sum + (course?.credits || 0);
        }, 0);
      progress[prefix] = {
        current: credits,
        required: minCredits,
        met: credits >= minCredits,
      };
    });
    
    return progress;
  }, [plannedCourses, coursesByCode]);

  // Mandatory courses (HPOP) progress
  const mandatoryProgress = useMemo(() => {
    // Get all mandatory HPOP courses from the course list
    const allMandatoryCourses = courses.filter(
      (c) => c.type === 'mandatory' && c.code.startsWith('HPOP')
    );
    
    // Split into regular mandatory and alternative mandatory
    const regularMandatory = allMandatoryCourses.filter((c) => !isAlternativeMandatory(c.code));
    const alternativeMandatory = allMandatoryCourses.filter((c) => isAlternativeMandatory(c.code));
    
    // Check which regular mandatory courses are planned
    const plannedRegular = regularMandatory.filter((c) => plannedCodesSet.has(c.code));
    const missingRegular = regularMandatory.filter((c) => !plannedCodesSet.has(c.code));
    
    // Check alternative mandatory courses
    const plannedAlternative = alternativeMandatory.filter((c) => plannedCodesSet.has(c.code));
    
    return {
      regular: {
        total: regularMandatory.length,
        completed: plannedRegular.length,
        missing: missingRegular,
        met: missingRegular.length === 0,
      },
      alternative: {
        total: alternativeMandatory.length,
        completed: plannedAlternative.length,
        required: DEGREE_REQUIREMENTS.alternativeMandatory.required,
        met: plannedAlternative.length >= DEGREE_REQUIREMENTS.alternativeMandatory.required,
        courses: alternativeMandatory,
      },
    };
  }, [plannedCodesSet]);

  // Foreign language requirement progress
  const foreignLanguageProgress = useMemo(() => {
    const plannedForeignLangCourses = plannedCourses.filter((pc) => {
      const course = coursesByCode.get(pc.code);
      return course && fulfillsForeignLanguage(course);
    });
    
    return {
      completed: plannedForeignLangCourses.length,
      required: DEGREE_REQUIREMENTS.foreignLanguageRequirement.required,
      met: plannedForeignLangCourses.length >= DEGREE_REQUIREMENTS.foreignLanguageRequirement.required,
      courses: plannedForeignLangCourses.map(pc => coursesByCode.get(pc.code)!).filter(Boolean),
    };
  }, [plannedCourses, coursesByCode]);

  // Module progress computation
  const moduleProgress = useMemo(() => {
    return modules.map((module) => {
      // Find planned courses that belong to this module
      const plannedFromModule = plannedCourses.filter((pc) =>
        module.courses.includes(pc.code)
      );
      const plannedCodes = new Set(plannedFromModule.map((pc) => pc.code));

      // Calculate group progress
      const groupProgress = module.groups.map((group) => {
        const completedInGroup = group.courses.filter((code) => plannedCodes.has(code)).length;
        return {
          group: group.group,
          completed: completedInGroup,
          required: group.minCourses,
          met: completedInGroup >= group.minCourses,
          courses: group.courses,
        };
      });

      const totalCompleted = plannedFromModule.length;
      const allGroupsMet = groupProgress.every((g) => g.met);
      const totalMet = totalCompleted >= module.minCourses;
      const isQualified = totalMet && allGroupsMet;

      return {
        ...module,
        completed: totalCompleted,
        coursesPlanned: plannedFromModule.map((pc) => ({
          code: pc.code,
          name: coursesByCode.get(pc.code)?.name || pc.code,
        })),
        groupProgress,
        isQualified,
        isInProgress: totalCompleted > 0 && !isQualified,
      };
    });
  }, [plannedCourses, coursesByCode]);

  // Separate qualified and in-progress modules
  const qualifiedModules = useMemo(
    () => moduleProgress.filter((m) => m.isQualified),
    [moduleProgress]
  );
  const inProgressModules = useMemo(
    () => moduleProgress.filter((m) => m.isInProgress),
    [moduleProgress]
  );

  const allRequirementsMet = useMemo(() => {
    if (totalCredits < DEGREE_REQUIREMENTS.totalCredits) return false;
    if (!Object.values(requirementsProgress).every((r) => r.met)) return false;
    if (!mandatoryProgress.regular.met) return false;
    if (!mandatoryProgress.alternative.met) return false;
    if (!foreignLanguageProgress.met) return false;
    return true;
  }, [totalCredits, requirementsProgress, mandatoryProgress, foreignLanguageProgress]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !course.code.toLowerCase().includes(q) &&
          !course.name.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      // Type filter (toggle buttons)
      if (!typeFilters[course.type]) {
        return false;
      }
      // Category filter for compulsory-elective courses (only when that type is selected)
      if (course.type === 'compulsory-elective' && typeFilters['compulsory-elective']) {
        const cat = course.category || 'general'; // Default to general if no category
        if (!categoryFilters[cat]) {
          return false;
        }
      }
      // Year filter (toggle buttons) - show if any selected year matches
      const yearMatches = course.recommendedYears.some(y => yearFilters[y]);
      if (!yearMatches) {
        return false;
      }
      if (showOnlyAvailable && plannedCodesSet.has(course.code)) {
        return false;
      }
      return true;
    });
  }, [searchQuery, typeFilters, yearFilters, showOnlyAvailable, plannedCodesSet, categoryFilters]);

  const plannedCoursesForSemester = useCallback(
    (semester: number) => {
      return plannedCourses
        .filter((pc) => pc.semester === semester)
        .map((pc) => ({ ...pc, course: coursesByCode.get(pc.code) }))
        .filter((item): item is { code: string; semester: number; course: Course } => 
          item.course !== undefined
        );
    },
    [plannedCourses, coursesByCode]
  );

  // Actions
  const addCourse = useCallback((code: string, semester: number) => {
    setPlannedCourses((prev) => {
      if (prev.some((pc) => pc.code === code)) {
        return prev;
      }
      return [...prev, { code, semester }];
    });
  }, []);

  const removeCourse = useCallback((code: string) => {
    setPlannedCourses((prev) => prev.filter((pc) => pc.code !== code));
  }, []);

  const moveCourse = useCallback((code: string, newSemester: number) => {
    setPlannedCourses((prev) =>
      prev.map((pc) => (pc.code === code ? { ...pc, semester: newSemester } : pc))
    );
  }, []);

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, code: string) => {
    setDraggedCourse(code);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedCourse(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSemester = (semester: number) => {
    if (draggedCourse) {
      if (plannedCodesSet.has(draggedCourse)) {
        moveCourse(draggedCourse, semester);
      } else {
        addCourse(draggedCourse, semester);
      }
      setDraggedCourse(null);
    }
  };

  const handleDropOnYear = (year: number) => {
    if (draggedCourse) {
      const course = coursesByCode.get(draggedCourse);
      if (!course) return;
      
      // Determine best semester for this year based on course availability
      const season = course.semesters.includes('winter') ? 'winter' : 'summer';
      const semester = getSemesterFromYear(year, season);
      
      if (plannedCodesSet.has(draggedCourse)) {
        moveCourse(draggedCourse, semester);
      } else {
        addCourse(draggedCourse, semester);
      }
      setDraggedCourse(null);
      setActiveTab(year); // Switch to that year
    }
  };

  const handleAddFromCatalog = (code: string) => {
    // Open the semester selector modal
    setAddingCourse(code);
  };

  const confirmAddCourse = (semester: number) => {
    if (addingCourse) {
      addCourse(addingCourse, semester);
      setAddingCourse(null);
    }
  };

  const cancelAddCourse = () => {
    setAddingCourse(null);
  };

  // Export/Import
  const exportPlan = () => {
    const data: PlanData = {
      version: 1,
      plannedCourses,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studijni-plan-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importPlan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data: PlanData = JSON.parse(event.target?.result as string);
        if (data.version === 1 && Array.isArray(data.plannedCourses)) {
          const validCourses = data.plannedCourses.filter(
            (pc) => coursesByCode.has(pc.code) && pc.semester >= 1 && pc.semester <= 10
          );
          setPlannedCourses(validCourses);
        }
      } catch (err) {
        alert('Nepodařilo se načíst soubor. Zkontrolujte formát.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearPlan = () => {
    if (confirm('Opravdu chcete smazat celý studijní plán? Povinné předměty budou obnoveny.')) {
      setPlannedCourses(getDefaultMandatoryCourses());
    }
  };

  // Render semester panel
  const renderSemesterPanel = (year: number, season: 'winter' | 'summer') => {
    const semester = getSemesterFromYear(year, season);
    const semesterCourses = plannedCoursesForSemester(semester);
    const credits = creditsBySemester[semester] || 0;
    const seasonLabel = season === 'winter' ? 'Zimní semestr' : 'Letní semestr';

    return (
      <div className={`sp-semester-panel sp-semester-panel-${season}`}>
        <div className="sp-semester-panel-header">
          <span>{seasonLabel}</span>
          <span className="sp-semester-panel-credits">{credits} kr.</span>
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={() => handleDropOnSemester(semester)}
          className={`sp-drop-zone ${draggedCourse ? 'sp-drop-zone-active' : ''} ${
            semesterCourses.length === 0 ? 'sp-drop-zone-empty' : ''
          }`}
        >
          {semesterCourses.length === 0 ? (
            <div className="sp-empty-message">
              <div className="sp-empty-icon">📋</div>
              <div className="sp-empty-text">Přetáhněte sem předměty</div>
            </div>
          ) : (
            <div className="sp-planned-courses">
              {semesterCourses.map(({ code, course }) => {
                const isWrongSeason = !course.semesters.includes(season);
                return (
                  <div
                    key={code}
                    draggable
                    onDragStart={(e) => handleDragStart(e, code)}
                    onDragEnd={handleDragEnd}
                    className={`sp-planned-item sp-planned-item-${
                      course.type === 'mandatory'
                        ? 'mandatory'
                        : course.type === 'compulsory-elective'
                        ? 'compulsory'
                        : 'elective'
                    } ${isWrongSeason ? 'sp-planned-item-warning' : ''}`}
                  >
                    <div className="sp-planned-info">
                      <div className="sp-planned-main">
                        <span className="sp-planned-code">{code}</span>
                        <span className="sp-planned-name">{course.name}</span>
                        <span className="sp-planned-credits">({course.credits} kr.)</span>
                      </div>
                      {isWrongSeason && (
                        <div className="sp-planned-warning">
                          ⚠️ Není vypsán v {season === 'winter' ? 'ZS' : 'LS'}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeCourse(code)}
                      className="sp-planned-remove"
                      title="Odebrat předmět"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <div className="study-planner">
        {/* Header */}
        <div className="sp-header">
          <div className="sp-stats">
            <div className="sp-stat-primary">
              Celkem kreditů: <span>{totalCredits}</span>
            </div>
            <div className="sp-stat-secondary">
              Naplánováno předmětů: {plannedCourses.length}
            </div>
          </div>
          <div className="sp-actions">
            <button onClick={exportPlan} className="sp-btn sp-btn-primary">
              Exportovat
            </button>
            <label className="sp-btn sp-btn-secondary" style={{ cursor: 'pointer' }}>
              Importovat
              <input
                type="file"
                accept=".json"
                onChange={importPlan}
                className="sp-hidden"
              />
            </label>
            <button onClick={clearPlan} className="sp-btn sp-btn-danger">
              Smazat vše
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="sp-tabs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`sp-tab sp-tab-dashboard ${activeTab === 'dashboard' ? 'sp-tab-active' : ''}`}
          >
            📊 Dashboard
          </button>
          {YEARS.map((year) => (
            <button
              key={year}
              onClick={() => setActiveTab(year)}
              onDragOver={handleDragOver}
              onDrop={() => handleDropOnYear(year)}
              className={`sp-tab ${activeTab === year ? 'sp-tab-active' : ''} ${
                draggedCourse ? 'sp-tab-droppable' : ''
              }`}
            >
              {getYearLabel(year)}
              {coursesCountByYear[year] > 0 && (
                <span className="sp-tab-badge">
                  {coursesCountByYear[year]}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setActiveTab('catalog')}
            className={`sp-tab sp-tab-catalog ${activeTab === 'catalog' ? 'sp-tab-active' : ''}`}
          >
            📚 Katalog
          </button>
        </div>

        {/* Content */}
        <div className="sp-content">
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="sp-dashboard">
              {/* Status Banner */}
              <div className={`sp-status-banner ${allRequirementsMet ? 'sp-status-banner-success' : 'sp-status-banner-warning'}`}>
                <span className="sp-status-banner-icon">{allRequirementsMet ? '✅' : '⏳'}</span>
                <span className="sp-status-banner-text">
                  {allRequirementsMet
                    ? 'Splňujete všechny podmínky pro získání titulu!'
                    : 'Některé podmínky pro získání titulu ještě nesplňujete.'}
                </span>
              </div>

              <div className="sp-dashboard-grid">
                {/* Total Credits Card */}
                <div className="sp-dashboard-card">
                  <div className="sp-dashboard-card-title">Celkové kredity</div>
                  <div className="sp-credits-total">
                    <div className="sp-credits-big">{totalCredits}</div>
                    <div className="sp-credits-remaining">
                      {totalCredits >= DEGREE_REQUIREMENTS.totalCredits
                        ? `Splněno! (minimum ${DEGREE_REQUIREMENTS.totalCredits})`
                        : `Zbývá ${DEGREE_REQUIREMENTS.totalCredits - totalCredits} kreditů do ${DEGREE_REQUIREMENTS.totalCredits}`}
                    </div>
                    <div className="sp-credits-bar">
                      <div
                        className={`sp-credits-bar-fill ${totalCredits >= DEGREE_REQUIREMENTS.totalCredits ? 'sp-credits-bar-fill-complete' : ''}`}
                        style={{ width: `${Math.min(100, (totalCredits / DEGREE_REQUIREMENTS.totalCredits) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Credits by Year Card */}
                <div className="sp-dashboard-card">
                  <div className="sp-dashboard-card-title">Kredity podle ročníků</div>
                  <table className="sp-credits-table">
                    <thead>
                      <tr>
                        <th>Ročník</th>
                        <th>ZS</th>
                        <th>LS</th>
                        <th>Celkem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {YEARS.map((year) => {
                        const winterSem = getSemesterFromYear(year, 'winter');
                        const summerSem = getSemesterFromYear(year, 'summer');
                        const winterCredits = creditsBySemester[winterSem] || 0;
                        const summerCredits = creditsBySemester[summerSem] || 0;
                        const yearTotal = winterCredits + summerCredits;
                        return (
                          <tr key={year}>
                            <td className="sp-credits-table-year">{year}. ročník</td>
                            <td className="sp-credits-table-semester">{winterCredits}</td>
                            <td className="sp-credits-table-semester">{summerCredits}</td>
                            <td className="sp-credits-table-total">{yearTotal}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Modules Card */}
                <div className="sp-dashboard-card sp-modules-card">
                  <div className="sp-dashboard-card-title">Moduly</div>
                  
                  <div className="sp-modules-summary">
                    <div className="sp-modules-stat">
                      <div className="sp-modules-stat-number sp-modules-stat-number-qualified">
                        {qualifiedModules.length}
                      </div>
                      <div className="sp-modules-stat-label">Získané</div>
                    </div>
                    <div className="sp-modules-stat">
                      <div className="sp-modules-stat-number sp-modules-stat-number-progress">
                        {inProgressModules.length}
                      </div>
                      <div className="sp-modules-stat-label">Rozpracované</div>
                    </div>
                    <div className="sp-modules-stat">
                      <div className="sp-modules-stat-number" style={{ color: 'var(--sp-text-muted)' }}>
                        {modules.length - qualifiedModules.length - inProgressModules.length}
                      </div>
                      <div className="sp-modules-stat-label">Nezapočaté</div>
                    </div>
                  </div>

                  {qualifiedModules.length > 0 && (
                    <div className="sp-modules-section">
                      <div className="sp-modules-section-title">
                        <span>✅</span> Získané moduly
                      </div>
                      <div className="sp-module-list">
                        {qualifiedModules.map((module) => {
                          const isExpanded = expandedModules.has(module.code);
                          return (
                            <div
                              key={module.code}
                              className="sp-module-item sp-module-item-qualified"
                              onClick={() => {
                                setExpandedModules((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(module.code)) {
                                    next.delete(module.code);
                                  } else {
                                    next.add(module.code);
                                  }
                                  return next;
                                });
                              }}
                            >
                              <div className="sp-module-header">
                                <span className="sp-module-name">{module.name}</span>
                                <div className="sp-module-status">
                                  <span className="sp-module-badge sp-module-badge-qualified">Splněno</span>
                                  <span className="sp-module-toggle">{isExpanded ? '▼' : '▶'}</span>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="sp-module-details">
                                  <div className="sp-module-courses">
                                    {module.coursesPlanned.map((c) => (
                                      <span key={c.code} className="sp-module-course-tag" title={c.name}>
                                        {c.code}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="sp-module-groups">
                                    {module.groupProgress.map((g) => (
                                      <div key={g.group} className="sp-module-group">
                                        <span className={`sp-module-group-icon ${g.met ? 'sp-module-group-met' : 'sp-module-group-unmet'}`}>
                                          {g.met ? '✓' : '○'}
                                        </span>
                                        <span className="sp-module-group-label">Skupina {g.group}:</span>
                                        <span className="sp-module-group-count">{g.completed}/{g.required}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {inProgressModules.length > 0 && (
                    <div className="sp-modules-section">
                      <div className="sp-modules-section-title">
                        <span>🔄</span> Rozpracované moduly
                      </div>
                      <div className="sp-module-list">
                        {inProgressModules.map((module) => {
                          const isExpanded = expandedModules.has(module.code);
                          return (
                            <div
                              key={module.code}
                              className="sp-module-item sp-module-item-progress"
                              onClick={() => {
                                setExpandedModules((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(module.code)) {
                                    next.delete(module.code);
                                  } else {
                                    next.add(module.code);
                                  }
                                  return next;
                                });
                              }}
                            >
                              <div className="sp-module-header">
                                <span className="sp-module-name">{module.name}</span>
                                <div className="sp-module-status">
                                  <span className="sp-module-progress-text">
                                    {module.completed}/{module.minCourses} předmětů
                                  </span>
                                  <span className="sp-module-toggle">{isExpanded ? '▼' : '▶'}</span>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="sp-module-details">
                                  <div className="sp-module-courses">
                                    {module.coursesPlanned.map((c) => (
                                      <span key={c.code} className="sp-module-course-tag" title={c.name}>
                                        {c.code}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="sp-module-groups">
                                    {module.groupProgress.map((g) => (
                                      <div key={g.group} className="sp-module-group">
                                        <span className={`sp-module-group-icon ${g.met ? 'sp-module-group-met' : 'sp-module-group-unmet'}`}>
                                          {g.met ? '✓' : '○'}
                                        </span>
                                        <span className="sp-module-group-label">Skupina {g.group}:</span>
                                        <span className="sp-module-group-count">{g.completed}/{g.required}</span>
                                      </div>
                                    ))}
                                    <div className="sp-module-group">
                                      <span className={`sp-module-group-icon ${module.completed >= module.minCourses ? 'sp-module-group-met' : 'sp-module-group-unmet'}`}>
                                        {module.completed >= module.minCourses ? '✓' : '○'}
                                      </span>
                                      <span className="sp-module-group-label">Celkem:</span>
                                      <span className="sp-module-group-count">{module.completed}/{module.minCourses}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {qualifiedModules.length === 0 && inProgressModules.length === 0 && (
                    <div className="sp-modules-empty">
                      Zatím nemáte žádné rozpracované moduly.<br />
                      Přidejte předměty z katalogu pro získání modulů.
                    </div>
                  )}
                </div>

                {/* Requirements Card */}
                <div className="sp-dashboard-card sp-dashboard-card-full">
                  <div className="sp-dashboard-card-title">Podmínky pro absolvování studia</div>
                  <div className="sp-requirements-list">
                    {/* Total credits requirement */}
                    <div className="sp-requirement-item">
                      <div className={`sp-requirement-icon ${totalCredits >= DEGREE_REQUIREMENTS.totalCredits ? 'sp-requirement-icon-met' : 'sp-requirement-icon-unmet'}`}>
                        {totalCredits >= DEGREE_REQUIREMENTS.totalCredits ? '✓' : '○'}
                      </div>
                      <div className="sp-requirement-info">
                        <div className="sp-requirement-label">Celkem alespoň {DEGREE_REQUIREMENTS.totalCredits} kreditů</div>
                        <div className="sp-requirement-progress">
                          {totalCredits} / {DEGREE_REQUIREMENTS.totalCredits} kreditů
                        </div>
                      </div>
                      <div className="sp-requirement-bar">
                        <div
                          className={`sp-requirement-bar-fill ${totalCredits >= DEGREE_REQUIREMENTS.totalCredits ? 'sp-requirement-bar-fill-met' : 'sp-requirement-bar-fill-unmet'}`}
                          style={{ width: `${Math.min(100, (totalCredits / DEGREE_REQUIREMENTS.totalCredits) * 100)}%` }}
                        />
                      </div>
                      <span className="sp-requirement-spacer" />
                    </div>

                    {/* Mandatory courses (HPOP) requirement */}
                    <div className="sp-mandatory-section">
                      <div
                        className="sp-requirement-item sp-requirement-expandable"
                        onClick={() => setShowMissingMandatory(!showMissingMandatory)}
                      >
                        <div className={`sp-requirement-icon ${mandatoryProgress.regular.met ? 'sp-requirement-icon-met' : 'sp-requirement-icon-unmet'}`}>
                          {mandatoryProgress.regular.met ? '✓' : '○'}
                        </div>
                        <div className="sp-requirement-info">
                          <div className="sp-requirement-label">Povinné předměty (HPOP)</div>
                          <div className="sp-requirement-progress">
                            {mandatoryProgress.regular.completed} / {mandatoryProgress.regular.total} předmětů
                            {mandatoryProgress.regular.missing.length > 0 && (
                              <span style={{ color: 'var(--sp-warning)', marginLeft: '0.5rem' }}>
                                (chybí {mandatoryProgress.regular.missing.length})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="sp-requirement-bar">
                          <div
                            className={`sp-requirement-bar-fill ${mandatoryProgress.regular.met ? 'sp-requirement-bar-fill-met' : 'sp-requirement-bar-fill-unmet'}`}
                            style={{ width: `${(mandatoryProgress.regular.completed / mandatoryProgress.regular.total) * 100}%` }}
                          />
                        </div>
                        <span className="sp-mandatory-header-toggle">
                          {showMissingMandatory ? '▼' : '▶'}
                        </span>
                      </div>
                      {showMissingMandatory && mandatoryProgress.regular.missing.length > 0 && (
                        <div className="sp-mandatory-list">
                          {mandatoryProgress.regular.missing.map((course) => (
                            <div key={course.code} className="sp-mandatory-item">
                              <span className="sp-mandatory-item-icon sp-mandatory-item-icon-missing">○</span>
                              <span className="sp-mandatory-item-code">{course.code}</span>
                              <span className="sp-mandatory-item-name" title={course.name}>{course.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alternative mandatory (Diplomový seminář) requirement */}
                    <div className="sp-mandatory-section">
                      <div
                        className="sp-requirement-item sp-requirement-expandable"
                        onClick={() => setShowAlternativeMandatory(!showAlternativeMandatory)}
                      >
                        <div className={`sp-requirement-icon ${mandatoryProgress.alternative.met ? 'sp-requirement-icon-met' : 'sp-requirement-icon-unmet'}`}>
                          {mandatoryProgress.alternative.met ? '✓' : '○'}
                        </div>
                        <div className="sp-requirement-info">
                          <div className="sp-requirement-label">{DEGREE_REQUIREMENTS.alternativeMandatory.label}</div>
                          <div className="sp-requirement-progress">
                            {mandatoryProgress.alternative.completed} / {mandatoryProgress.alternative.required} předmět
                            {mandatoryProgress.alternative.completed === 0 && (
                              <span style={{ color: 'var(--sp-warning)', marginLeft: '0.5rem' }}>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="sp-requirement-bar">
                          <div
                            className={`sp-requirement-bar-fill ${mandatoryProgress.alternative.met ? 'sp-requirement-bar-fill-met' : 'sp-requirement-bar-fill-unmet'}`}
                            style={{ width: `${mandatoryProgress.alternative.met ? 100 : 0}%` }}
                          />
                        </div>
                        <span className="sp-mandatory-header-toggle">
                          {showAlternativeMandatory ? '▼' : '▶'}
                        </span>
                      </div>
                      {showAlternativeMandatory && (
                        <div className="sp-mandatory-list">
                          {mandatoryProgress.alternative.courses.map((course) => {
                            const isPlanned = plannedCodesSet.has(course.code);
                            return (
                              <div
                                key={course.code}
                                className={`sp-mandatory-item ${isPlanned ? 'sp-mandatory-item-completed' : ''}`}
                              >
                                <span className={`sp-mandatory-item-icon ${isPlanned ? 'sp-mandatory-item-icon-completed' : 'sp-mandatory-item-icon-missing'}`}>
                                  {isPlanned ? '✓' : '○'}
                                </span>
                                <span className="sp-mandatory-item-code">{course.code}</span>
                                <span className="sp-mandatory-item-name" title={course.name}>{course.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Code-based requirements */}
                    {DEGREE_REQUIREMENTS.codeRequirements.map(({ prefix, minCredits, label }) => {
                      const progress = requirementsProgress[prefix];
                      return (
                        <div key={prefix} className="sp-requirement-item">
                          <div className={`sp-requirement-icon ${progress.met ? 'sp-requirement-icon-met' : 'sp-requirement-icon-unmet'}`}>
                            {progress.met ? '✓' : '○'}
                          </div>
                          <div className="sp-requirement-info">
                            <div className="sp-requirement-label">{label}</div>
                            <div className="sp-requirement-progress">
                              {progress.current} / {minCredits} kreditů
                            </div>
                          </div>
                          <div className="sp-requirement-bar">
                            <div
                              className={`sp-requirement-bar-fill ${progress.met ? 'sp-requirement-bar-fill-met' : 'sp-requirement-bar-fill-unmet'}`}
                              style={{ width: `${Math.min(100, (progress.current / minCredits) * 100)}%` }}
                            />
                          </div>
                          <span className="sp-requirement-spacer" />
                        </div>
                      );
                    })}

                    {/* Foreign language requirement */}
                    <div className="sp-requirement-item">
                      <div className={`sp-requirement-icon ${foreignLanguageProgress.met ? 'sp-requirement-icon-met' : 'sp-requirement-icon-unmet'}`}>
                        {foreignLanguageProgress.met ? '✓' : '○'}
                      </div>
                      <div className="sp-requirement-info">
                        <div className="sp-requirement-label">{DEGREE_REQUIREMENTS.foreignLanguageRequirement.label}</div>
                        <div className="sp-requirement-progress">
                          {foreignLanguageProgress.completed} / {foreignLanguageProgress.required} předmět
                          {foreignLanguageProgress.completed === 0 && (
                            <span style={{ color: 'var(--sp-text-muted)', marginLeft: '0.5rem' }}>
                            </span>
                          )}
                          {foreignLanguageProgress.completed > 0 && foreignLanguageProgress.courses.length > 0 && (
                            <span style={{ color: 'var(--sp-success)', marginLeft: '0.5rem' }}>
                              ({foreignLanguageProgress.courses[0].code})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="sp-requirement-bar">
                        <div
                          className={`sp-requirement-bar-fill ${foreignLanguageProgress.met ? 'sp-requirement-bar-fill-met' : 'sp-requirement-bar-fill-unmet'}`}
                          style={{ width: `${foreignLanguageProgress.met ? 100 : 0}%` }}
                        />
                      </div>
                      <span className="sp-requirement-spacer" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Catalog View */}
          {activeTab === 'catalog' && (
            <div className="sp-catalog">
              <div className="sp-filters">
                <input
                  type="text"
                  placeholder="Hledat podle kódu nebo názvu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="sp-search"
                />
                
                {/* Type filter toggles */}
                <div className="sp-filter-section">
                  <span className="sp-filter-label">Typ:</span>
                  <div className="sp-filter-toggles">
                    <label className="sp-filter-toggle">
                      <input
                        type="checkbox"
                        checked={typeFilters.mandatory}
                        onChange={(e) => setTypeFilters(prev => ({ ...prev, mandatory: e.target.checked }))}
                      />
                      <span className={`sp-filter-toggle-btn sp-filter-toggle-mandatory ${typeFilters.mandatory ? 'active' : ''}`}>
                        Povinné
                      </span>
                    </label>
                    <label className="sp-filter-toggle">
                      <input
                        type="checkbox"
                        checked={typeFilters['compulsory-elective']}
                        onChange={(e) => setTypeFilters(prev => ({ ...prev, 'compulsory-elective': e.target.checked }))}
                      />
                      <span className={`sp-filter-toggle-btn sp-filter-toggle-compulsory ${typeFilters['compulsory-elective'] ? 'active' : ''}`}>
                        Povinně volitelné
                      </span>
                    </label>
                    <label className="sp-filter-toggle">
                      <input
                        type="checkbox"
                        checked={typeFilters.elective}
                        onChange={(e) => setTypeFilters(prev => ({ ...prev, elective: e.target.checked }))}
                      />
                      <span className={`sp-filter-toggle-btn sp-filter-toggle-elective ${typeFilters.elective ? 'active' : ''}`}>
                        Volitelné
                      </span>
                    </label>
                  </div>
                </div>

                {/* Year filter toggles */}
                <div className="sp-filter-section">
                  <span className="sp-filter-label">Ročník:</span>
                  <div className="sp-filter-toggles">
                    {YEARS.map((year) => (
                      <label key={year} className="sp-filter-toggle">
                        <input
                          type="checkbox"
                          checked={yearFilters[year]}
                          onChange={(e) => setYearFilters(prev => ({ ...prev, [year]: e.target.checked }))}
                        />
                        <span className={`sp-filter-toggle-btn sp-filter-toggle-year ${yearFilters[year] ? 'active' : ''}`}>
                          {year}.
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Hide planned checkbox */}
                <div className="sp-filter-section">
                  <label className="sp-checkbox-label">
                    <input
                      type="checkbox"
                      checked={showOnlyAvailable}
                      onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                    />
                    Skrýt naplánované
                  </label>
                </div>
                
                {/* Category filter toggles for compulsory-elective (only when that type is selected) */}
                {typeFilters['compulsory-elective'] && (
                  <div className="sp-category-filters">
                    <span className="sp-category-filters-label">Podkategorie PV:</span>
                    {COMPULSORY_CATEGORIES.map(({ key, label }) => (
                      <label key={key} className="sp-category-toggle">
                        <input
                          type="checkbox"
                          checked={categoryFilters[key]}
                          onChange={(e) => setCategoryFilters(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                        />
                        <span className={`sp-category-toggle-label ${categoryFilters[key] ? 'sp-category-toggle-active' : ''}`}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="sp-course-count">
                Zobrazeno {filteredCourses.length} z {courses.length} předmětů
              </div>

              <div className="sp-course-list">
                {filteredCourses.map((course) => {
                  const isPlanned = plannedCodesSet.has(course.code);
                  return (
                    <div
                      key={course.code}
                      draggable
                      onDragStart={(e) => handleDragStart(e, course.code)}
                      onDragEnd={handleDragEnd}
                      className={`sp-course-item ${isPlanned ? 'sp-course-item-planned' : ''}`}
                    >
                      <div className="sp-course-header">
                        <div className="sp-course-info">
                          <div className="sp-course-meta">
                            <span className="sp-course-code">{course.code}</span>
                            <span className={`sp-tag ${TYPE_COLORS[course.type]}`}>
                              {TYPE_LABELS[course.type]}
                            </span>
                            <span className="sp-course-credits">{course.credits} kr.</span>
                          </div>
                          <div className="sp-course-name">{course.name}</div>
                          <div className="sp-course-details">
                            {course.recommendedYears.join(', ')}. ročník •{' '}
                            {course.semesters.includes('winter') ? 'ZS' : ''}
                            {course.semesters.includes('winter') && course.semesters.includes('summer') ? '/' : ''}
                            {course.semesters.includes('summer') ? 'LS' : ''} •{' '}
                            {course.completion}
                            {course.language !== 'čeština' && (
                              <> • 🌍 {course.language}</>
                            )}
                            {course.categoryCs && (
                              <> • {course.categoryCs}</>
                            )}
                            {!course.isActive && (
                              <> • <span style={{ color: 'var(--sp-warning)' }}>⚠️ {course.status === 'Z' ? 'Zrušeno' : 'Nevyučuje se'}</span></>
                            )}
                          </div>
                          {/* Module indicators */}
                          {courseToModules.has(course.code) && (
                            <div className="sp-course-modules">
                              {courseToModules.get(course.code)!.map((m) => (
                                <span key={m.code} className="sp-module-tag" title={m.name}>
                                  {m.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="sp-course-actions">
                          {!isPlanned ? (
                            <button
                              onClick={() => handleAddFromCatalog(course.code)}
                              className="sp-btn sp-btn-primary sp-btn-small"
                            >
                              + Přidat
                            </button>
                          ) : (
                            <button
                              onClick={() => removeCourse(course.code)}
                              className="sp-btn sp-btn-danger sp-btn-small"
                            >
                              Odebrat
                            </button>
                          )}
                          <a
                            href={course.sisUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sp-btn sp-btn-ghost sp-btn-small"
                            style={{ textAlign: 'center', textDecoration: 'none' }}
                          >
                            SIS →
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Year View */}
          {typeof activeTab === 'number' && (
            <div className="sp-year-view">
              <div className="sp-year-header">
                <h2 className="sp-year-title">{getYearLabel(activeTab)}</h2>
                <div className="sp-year-credits">
                  Celkem: {creditsByYear[activeTab]} kreditů
                </div>
              </div>

              <div className="sp-semesters-grid">
                {renderSemesterPanel(activeTab, 'winter')}
                {renderSemesterPanel(activeTab, 'summer')}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="sp-legend">
          <div className="sp-legend-title">Legenda</div>
          <div className="sp-legend-items">
            <div className="sp-legend-item">
              <span className="sp-tag sp-tag-mandatory">Povinný</span>
            </div>
            <div className="sp-legend-item">
              <span className="sp-tag sp-tag-compulsory">Povinně volitelný</span>
            </div>
            <div className="sp-legend-item">
              <span className="sp-tag sp-tag-elective">Volitelný</span>
            </div>
            <div className="sp-legend-item">
              <span style={{ color: 'var(--sp-warning)', fontWeight: 500 }}>⚠️ Špatný semestr</span>
            </div>
          </div>
          <div className="sp-legend-note">
            Povinné předměty jsou předvyplněny. Předměty lze přetahovat mezi semestry a ročníky. ZS = zimní semestr, LS = letní semestr.
          </div>
        </div>

        {/* Add Course Modal */}
        {addingCourse && (() => {
          const course = coursesByCode.get(addingCourse);
          if (!course) return null;
          
          const canWinter = course.semesters.includes('winter');
          const canSummer = course.semesters.includes('summer');
          const recommendedYears = course.recommendedYears || [];
          
          return (
            <div className="sp-modal-overlay" onClick={cancelAddCourse}>
              <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
                <div className="sp-modal-title">Přidat předmět</div>
                <div className="sp-modal-subtitle">
                  {course.code} – {course.name}
                </div>
                <div className="sp-modal-grid">
                  {YEARS.map((year) => {
                    const isRecommended = recommendedYears.includes(year);
                    return (
                      <React.Fragment key={year}>
                        <div className={`sp-modal-year-label ${isRecommended ? 'sp-modal-year-recommended' : ''}`}>
                          {year}. ročník
                          {isRecommended && <span className="sp-modal-recommended-badge">doporučeno</span>}
                        </div>
                        <button
                          className={`sp-modal-btn sp-modal-btn-winter ${isRecommended ? 'sp-modal-btn-recommended' : ''}`}
                          onClick={() => confirmAddCourse(getSemesterFromYear(year, 'winter'))}
                          disabled={!canWinter}
                        >
                          Zimní semestr
                        </button>
                        <button
                          className={`sp-modal-btn sp-modal-btn-summer ${isRecommended ? 'sp-modal-btn-recommended' : ''}`}
                          onClick={() => confirmAddCourse(getSemesterFromYear(year, 'summer'))}
                          disabled={!canSummer}
                        >
                          Letní semestr
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
                <button className="sp-modal-cancel" onClick={cancelAddCourse}>
                  Zrušit
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
