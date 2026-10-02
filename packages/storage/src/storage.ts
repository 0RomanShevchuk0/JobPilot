/** Where documents (CVs, cover letters) keep their files. Keys are paths like "users/<id>/cv/<id>.pdf". */
export interface FileStorage {
   put(key: string, body: Uint8Array, contentType: string): Promise<void>;
   /** undefined when there is no file under this key */
   get(key: string): Promise<StoredFile | undefined>;
   /** Deleting a key that doesn't exist is not an error. */
   delete(key: string): Promise<void>;
}

export interface StoredFile {
   body: Uint8Array;
   contentType?: string;
}
