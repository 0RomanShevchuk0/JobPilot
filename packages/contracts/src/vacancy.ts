import type { EmploymentType, Language, Location, Salary, Seniority, WorkMode } from "./posting.js";

/** A vacancy as merged from its postings. Empty arrays mean "unknown". */
export interface VacancyFields {
   title: string;
   description: string; // markdown
   seniority?: Seniority;
   employmentTypes: EmploymentType[];
   workModes: WorkMode[];
   locations: Location[];
   languages: Language[];
   salary?: Salary;
   skills: string[]; // normalized: "node.js", not "NodeJS"
   experienceYears?: number;
   /** null while at least one posting is still active */
   closedAt: Date | null;
}
