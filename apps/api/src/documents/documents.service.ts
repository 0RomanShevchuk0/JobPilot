import type { DocumentListItem } from "@jobpilot/contracts";
import type { StoredDocumentFile } from "@jobpilot/db";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Database } from "../infra/database.js";
import { Storage } from "../infra/storage.js";
import { MatchQueue } from "../matching/match-queue.service.js";
import { pdfText } from "./pdf-text.js";

export interface DocumentFile extends StoredDocumentFile {
   body: Uint8Array;
   contentType: string;
}

@Injectable()
export class DocumentsService {
   constructor(
      private readonly db: Database,
      private readonly storage: Storage,
      private readonly matchQueue: MatchQueue,
   ) {}

   list(userId: string): Promise<DocumentListItem[]> {
      return this.db.documents.listForUser(userId);
   }

   /**
    * One CV per user: a new upload overwrites the file and the record in place. The text is read first
    * (an unreadable PDF is refused before anything changes), then the file goes up, then the record:
    * a failed upload leaves the previous CV intact.
    */
   async saveCv(
      userId: string,
      file: { fileName: string; body: Uint8Array },
   ): Promise<{ id: string; hasText: boolean }> {
      let content: string;
      try {
         content = await pdfText(file.body);
      } catch {
         throw new BadRequestException("The PDF can't be read: it may be damaged");
      }
      const filePath = `users/${userId}/cv.pdf`;
      await this.storage.put(filePath, file.body, "application/pdf");
      const id = await this.db.documents.saveBaseCv(userId, {
         filePath,
         fileName: file.fileName,
         content,
      });
      await this.cvChanged(userId);
      // no text (a scan, an image export): the file still works for applications, not for generation
      return { id, hasText: content.length > 0 };
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
      if (deleted.wasBaseCv) await this.cvChanged(userId);
      return true;
   }

   /** Scoring reads the CV: like a profile change, it makes every evaluation stale. */
   private async cvChanged(userId: string) {
      const version = await this.db.profiles.bumpVersion(userId);
      if (version !== undefined) await this.matchQueue.rematchUser(userId); // no profile, nothing to rematch
   }
}
