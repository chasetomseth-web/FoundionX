import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role for storage operations
function getStorageClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials for storage operations');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Upload an HTML file to Supabase Storage
 */
export async function uploadHtmlFile(
  storeId: string,
  fileName: string,
  fileContent: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getStorageClient();
  const path = `${storeId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('html-stores')
    .upload(path, fileContent, {
      contentType: 'text/html',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload HTML file: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('html-stores').getPublicUrl(path);

  return { path: data.path, publicUrl };
}

/**
 * Upload an asset file (CSS, JS, images) to Supabase Storage
 */
export async function uploadAssetFile(
  storeId: string,
  fileName: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getStorageClient();
  const path = `${storeId}/assets/${fileName}`;

  const { data, error } = await supabase.storage
    .from('html-stores')
    .upload(path, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload asset file: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('html-stores').getPublicUrl(path);

  return { path: data.path, publicUrl };
}

/**
 * Delete an HTML file from Supabase Storage
 */
export async function deleteHtmlFile(
  storeId: string,
  fileName: string
): Promise<void> {
  const supabase = getStorageClient();
  const path = `${storeId}/${fileName}`;

  const { error } = await supabase.storage.from('html-stores').remove([path]);

  if (error) {
    throw new Error(`Failed to delete HTML file: ${error.message}`);
  }
}

/**
 * Get a signed URL for private assets
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getStorageClient();

  const { data, error } = await supabase.storage
    .from('html-stores')
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Upload a product image to Supabase Storage, returning the public URL
 */
export async function uploadProductImage(
  storeId: string,
  base64Data: string,
  fileName: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getStorageClient();

  // Strip data:image/...;base64, prefix
  const base64Image = base64Data.split('base64,')[1];
  if (!base64Image) {
    throw new Error('Invalid base64 image data');
  }

  const buffer = Buffer.from(base64Image, 'base64');
  const path = `products/${storeId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, buffer, {
      contentType: fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload product image: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('product-images').getPublicUrl(path);

  return { path: data.path, publicUrl };
}

/**
 * Upload a product image from a buffer to Supabase Storage
 */
export async function uploadProductImageBuffer(
  storeId: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getStorageClient();
  const path = `products/${storeId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload product image: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('product-images').getPublicUrl(path);

  return { path: data.path, publicUrl };
}

/**
 * Upload a product file (digital product, PDF, etc.) to Supabase Storage
 */
export async function uploadProductFile(
  storeId: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<{ path: string; publicUrl: string }> {
  const supabase = getStorageClient();
  const path = `products/${storeId}/${Date.now()}-${fileName}`;

  try {
    // Try to upload to product-files bucket first
    const { data, error } = await supabase.storage
      .from('product-files')
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(error.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('product-files').getPublicUrl(path);

    return { path: data.path, publicUrl };
  } catch (err) {
    // Fallback to product-images bucket if product-files doesn't exist
    try {
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(path, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload product file: ${error.message}`);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('product-images').getPublicUrl(path);

      return { path: data.path, publicUrl };
    } catch (fallbackErr) {
      throw new Error(`Failed to upload product file: ${(err as Error).message}`);
    }
  }
}

/**
 * Get file content from storage
 */
export async function getFileContent(path: string): Promise<string> {
  const supabase = getStorageClient();

  const { data, error } = await supabase.storage
    .from('html-stores')
    .download(path);

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }

  return await data.text();
}
