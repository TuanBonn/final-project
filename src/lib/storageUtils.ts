/**
 * Uploads a file via /api/upload.
 * @param bucketName Target bucket ('avatars', 'products', etc.).
 * @param file The file object.
 * @returns The public URL.
 * @throws If API fails.
 */
export async function uploadFileViaApi(
  bucketName: string,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucketName", bucketName);

  console.log(
    `StorageUtils: Calling /api/upload for file ${file.name} to bucket ${bucketName}...`
  );

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(
        `StorageUtils: API upload failed (${response.status}):`,
        data?.message || data?.error || "Unknown API error"
      );
      throw new Error(
        data?.message ||
          data?.error ||
          `API upload failed with status ${response.status}.`
      );
    }

    if (!data.publicUrl) {
      console.error(
        "StorageUtils: API response OK but missing 'publicUrl':",
        data
      );
      throw new Error("API did not return a public URL after upload.");
    }

    console.log(`StorageUtils: API upload successful: ${data.publicUrl}`);
    return data.publicUrl;
  } catch (error: unknown) {
    console.error("StorageUtils: Error while calling upload API:", error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Unknown error while calling upload API.");
    }
  }
}
