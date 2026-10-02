import { S3FileStorage } from "@jobpilot/storage";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** Where document files live: any S3-compatible storage, configured with S3_* in .env. */
@Injectable()
export class Storage extends S3FileStorage {
   constructor(config: ConfigService) {
      super({
         endpoint: config.getOrThrow<string>("S3_ENDPOINT"),
         region: config.getOrThrow<string>("S3_REGION"),
         bucket: config.getOrThrow<string>("S3_BUCKET"),
         accessKeyId: config.getOrThrow<string>("S3_ACCESS_KEY_ID"),
         secretAccessKey: config.getOrThrow<string>("S3_SECRET_ACCESS_KEY"),
      });
   }
}
