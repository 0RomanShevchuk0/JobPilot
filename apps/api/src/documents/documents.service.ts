import type { DocumentListItem } from "@jobpilot/contracts";
import type { StoredDocumentFile } from "@jobpilot/db";
import { Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";
import { Storage } from "../infra/storage.js";

export interface DocumentFile extends StoredDocumentFile {
   body: Uint8Array;
   contentType: string;
}

@Injectable()
export class DocumentsService {
   constructor(
      private readonly db: Database,
      private readonly storage: Storage,
   ) {}

   list(userId: string): Promise<DocumentListItem[]> {
      return this.db.documents.listForUser(userId);
   }

   /**
    * One CV per user: a new upload overwrites the file and the record in place.
    * The file goes first, so a failed upload leaves the previous CV intact.
    */
   async saveCv(userId: string, file: { fileName: string; body: Uint8Array }): Promise<string> {
      const filePath = `users/${userId}/cv.pdf`;
      await this.storage.put(filePath, file.body, "application/pdf");
      // the text is extracted in the next step; until then generation has nothing to read
      return this.db.documents.saveBaseCv(userId, {
         filePath,
         fileName: file.fileName,
         content: "",
      });
   }

   /** undefined when the user has no such document or its file is gone */
   async getFile(userId: string, documentId: string): Promise<DocumentFile | undefined> {
      const stored = await this.db.documents.getFile(userId, documentId);
      if (!stored) return undefined;
      const file = await this.storage.get(stored.filePath);
      if (!file) return undefined;
      return {
         ...stored,
         body: file.body,
         contentType: file.contentType ?? "application/octet-stream",
      };
   }

   /**
    * The record goes first: if deleting the file then fails, an orphan file is left in the bucket,
    * which is harmless, rather than a record pointing to nothing. Returns false when not found.
    */
   async delete(userId: string, documentId: string): Promise<boolean> {
      const deleted = await this.db.documents.delete(userId, documentId);
      if (!deleted) return false;
      if (deleted.filePath) await this.storage.delete(deleted.filePath);
      return true;
   }
}
