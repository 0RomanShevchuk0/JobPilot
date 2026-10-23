import {
   BadRequestException,
   Controller,
   Delete,
   Get,
   HttpCode,
   NotFoundException,
   Param,
   Put,
   StreamableFile,
   UploadedFile,
   UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import { CurrentUserId } from "../auth/current-user-id.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { DocumentsService } from "./documents.service.js";

const MAX_CV_BYTES = 5 * 1024 * 1024;
const idPipe = new ZodValidationPipe(z.uuid());

@Controller("documents")
export class DocumentsController {
   constructor(private readonly documents: DocumentsService) {}

   /** My documents: the CV first, then generated ones, newest first. */
   @Get()
   async list(@CurrentUserId() userId: string) {
      return this.documents.list(userId);
   }

   /** Uploads my CV (a PDF up to 5 MB in the "file" form field), replacing the previous one. */
   @Put("cv")
   @UseInterceptors(
      FileInterceptor("file", {
         limits: { fileSize: MAX_CV_BYTES, files: 1 },
         // browsers send file names in UTF-8; multer would read them as latin1 ("Резюме" → "Ð ÐµÐ·...")
         defParamCharset: "utf8",
      }),
   )
   async putCv(
      @CurrentUserId() userId: string,
      @UploadedFile() file: Express.Multer.File | undefined,
   ) {
      if (!file)
         throw new BadRequestException('Send the CV as multipart/form-data in a "file" field');
      // the content type is whatever the client claims; the first bytes are what the file really is
      if (file.buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
         throw new BadRequestException("The CV must be a PDF");
      }
      return this.documents.saveCv(userId, { fileName: file.originalname, body: file.buffer });
   }

   @Get(":id/file")
   async file(@CurrentUserId() userId: string, @Param("id", idPipe) id: string) {
      const file = await this.documents.getFile(userId, id);
      if (!file) throw new NotFoundException("No such document");
      return new StreamableFile(file.body, {
         type: file.contentType,
         // inline: the browser shows the PDF itself; a link with the download attribute still saves it.
         // filename* keeps non-ASCII names ("Резюме.pdf") intact
         disposition: `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      });
   }

   @Delete(":id")
   @HttpCode(204)
   async delete(@CurrentUserId() userId: string, @Param("id", idPipe) id: string) {
      if (!(await this.documents.delete(userId, id)))
         throw new NotFoundException("No such document");
   }
}
