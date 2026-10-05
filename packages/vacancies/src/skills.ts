/**
 * Spellings of the same technology → one canonical name.
 * Keys are compared after lowercasing and dropping spaces and dots: "Node.js", "NodeJS", "node js" → "nodejs".
 */
const ALIASES: Record<string, string> = {
   nodejs: "node.js",
   node: "node.js",
   javascript: "javascript",
   js: "javascript",
   typescript: "typescript",
   ts: "typescript",
   nestjs: "nestjs",
   nest: "nestjs",
   expressjs: "express",
   express: "express",
   reactjs: "react",
   react: "react",
   nextjs: "next.js",
   next: "next.js",
   vuejs: "vue",
   vue: "vue",
   angularjs: "angular",
   angular: "angular",
   postgresql: "postgresql",
   postgres: "postgresql",
   mongodb: "mongodb",
   mongo: "mongodb",
   k8s: "kubernetes",
   kubernetes: "kubernetes",
   golang: "go",
   go: "go",
   amazonwebservices: "aws",
   aws: "aws",
   googlecloud: "gcp",
   googlecloudplatform: "gcp",
   gcp: "gcp",
   "ci/cd": "ci/cd",
   cicd: "ci/cd",
   restapi: "rest",
   rest: "rest",
   graphql: "graphql",
};

export function normalizeSkill(skill: string): string {
   const trimmed = skill.trim().toLowerCase();
   // the alias key drops spaces and dots ("Node.js", "node js" → "nodejs"); otherwise runs of spaces → one
   return ALIASES[trimmed.replace(/[\s.]+/g, "")] ?? trimmed.replace(/\s+/g, " ");
}

/** Canonical names, duplicates removed, order kept. */
export function normalizeSkills(skills: string[]): string[] {
   const normalized = skills.map(normalizeSkill).filter(Boolean);
   return [...new Set(normalized)];
}
