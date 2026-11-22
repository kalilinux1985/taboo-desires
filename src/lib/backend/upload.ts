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
  await serverPrivacyCheck(ticket.storageId);
  return ticket.storageId;
}

/**
 * The server checks every upload again (scrub-media) and removes anything the
 * browser missed. Files can only be attached once that check has passed, so
 * wait for it here. If the call itself fails, the server's every-minute sweep
 * still checks the file.
 */
async function serverPrivacyCheck(storageId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.functions.invoke<{ status: string }>("scrub-media", { body: { storageId } });
    if (!error && data?.status === "clean") return;
    if (!error && data?.status === "rejected")
      throw new Error("This file couldn't be checked for privacy. Save it as a JPEG, PNG or MP4 and try again.");
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
}
