import {
   DeleteObjectCommand,
   GetObjectCommand,
   NoSuchKey,
   PutObjectCommand,
   S3Client,
} from "@aws-sdk/client-s3";
import type { FileStorage, StoredFile } from "./storage.js";

export interface S3StorageOptions {
   /** e.g. https://storage.googleapis.com, an R2 or a B2 endpoint */
   endpoint: string;
   region: string;
   bucket: string;
   accessKeyId: string;
   secretAccessKey: string;
}

/** Any S3-compatible storage: Google Cloud Storage (interoperability mode), Cloudflare R2, Backblaze B2. */
export class S3FileStorage implements FileStorage {
   private readonly client: S3Client;
   private readonly bucket: string;

   constructor({ endpoint, region, bucket, accessKeyId, secretAccessKey }: S3StorageOptions) {
      this.bucket = bucket;
      this.client = new S3Client({
         endpoint,
         region,
         credentials: { accessKeyId, secretAccessKey },
         // the SDK adds its own checksums by default; S3-compatible services don't all accept them
         requestChecksumCalculation: "WHEN_REQUIRED",
         responseChecksumValidation: "WHEN_REQUIRED",
      });
   }

   async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
      await this.client.send(
         new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
         }),
      );
   }

   async get(key: string): Promise<StoredFile | undefined> {
      try {
         const object = await this.client.send(
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
         );
         if (!object.Body) return undefined;
         return { body: await object.Body.transformToByteArray(), contentType: object.ContentType };
      } catch (err) {
         if (err instanceof NoSuchKey) return undefined;
         throw err;
      }
   }

   async delete(key: string): Promise<void> {
      try {
         await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch (err) {
         // AWS answers 204 for a missing key, Google Cloud Storage 404: either way it is gone
         if (err instanceof NoSuchKey) return;
         throw err;
      }
   }
}
