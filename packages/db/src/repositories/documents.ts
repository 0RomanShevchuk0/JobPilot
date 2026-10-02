import type { DocumentListItem } from "@jobpilot/contracts";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Drizzle } from "../drizzle.js";
import { documents } from "../schema.js";

export interface StoredDocumentFile {
   /** key in the file storage */
   filePath: string;
   fileName: string;
}

export interface DocumentsRepository {
   listForUser(userId: string): Promise<DocumentListItem[]>;
   /** Where the document's file is; undefined when the user has no such document or it has no file. */
   getFile(userId: string, documentId: string): Promise<StoredDocumentFile | undefined>;
   /** Creates the user's base CV or replaces it in place (same id). Returns the id. */
   saveBaseCv(userId: string, file: StoredDocumentFile & { content: string }): Promise<string>;
   /** Returns the deleted document's file, or undefined when the user has no such document. */
   delete(userId: string, documentId: string): Promise<{ filePath: string | null } | undefined>;
}

export function createDocumentsRepository(db: Drizzle): DocumentsRepository {
   const own = (userId: string, documentId: string) =>
      and(eq(documents.userId, userId), eq(documents.id, documentId));

   return {
      async listForUser(userId) {
         const rows = await db
            .select({
               id: documents.id,
               type: documents.type,
               isBase: documents.isBase,
               fileName: documents.fileName,
               createdAt: documents.createdAt,
            })
            .from(documents)
            .where(eq(documents.userId, userId))
            .orderBy(desc(documents.isBase), desc(documents.createdAt));
         return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
      },

      async getFile(userId, documentId) {
         const [row] = await db
            .select({ filePath: documents.filePath, fileName: documents.fileName })
            .from(documents)
            .where(own(userId, documentId));
         if (!row?.filePath || !row.fileName) return undefined;
         return { filePath: row.filePath, fileName: row.fileName };
      },

      async saveBaseCv(userId, { filePath, fileName, content }) {
         const [row] = await db
            .insert(documents)
            .values({ userId, type: "cv", isBase: true, filePath, fileName, content })
            .onConflictDoUpdate({
               target: documents.userId,
               targetWhere: sql`${documents.type} = 'cv' AND ${documents.isBase}`,
               set: { filePath, fileName, content, createdAt: sql`now()` },
            })
            .returning({ id: documents.id });
         return row.id;
      },

      async delete(userId, documentId) {
         const [row] = await db
            .delete(documents)
            .where(own(userId, documentId))
            .returning({ filePath: documents.filePath });
         return row;
      },
   };
}
