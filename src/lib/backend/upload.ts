import { supabase } from "./client.ts";
import type { Id } from "./types.ts";
import { stripMetadata } from "../strip-metadata.ts";

type UploadTicket = {
  storageId: Id<"_storage">;
  bucket: string;
  path: string;
  token: string;
};
type Visibility = "public" | "private";

/**
 * Uploads a file with a signed upload URL from `listings.generateUploadUrl`
 * and returns its storage id. Use "private" for locked (paid) originals and
 * verification photos; everything else is "public".
 */
export async function uploadFile(
  generateUploadUrl: (args: {
    visibility?: Visibility;
  }) => Promise<UploadTicket>,
  file: Blob,
  visibility: Visibility = "public",
): Promise<Id<"_storage">> {
  // Photos and videos lose their location and other hidden details before they leave the device
  if (file.type.startsWith("image/") || file.type.startsWith("video/") || file.type === "") file = await stripMetadata(file);
  const ticket = await generateUploadUrl({ visibility });
  const { error } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type || undefined,
    });
  if (error) throw new Error("Upload failed");
  return ticket.storageId;
}
