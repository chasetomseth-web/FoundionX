import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { uploadHtmlFile, uploadAssetFile } from '@/lib/supabase-storage';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const slugParam = formData.get('slug') as string;
    const isHomePage = formData.get('isHomePage') === 'true';
    const storeId = formData.get('storeId') as string;

    if (!file || !name || !storeId) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'file, name, and storeId are required' },
        { status: 400 }
      );
    }

    // Verify the store belongs to the authenticated user's organization
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        organizationId: auth.organizationId,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      );
    }

    // Check file type
    const isHtml = file.type === 'text/html' || file.name.endsWith('.html');
    const isAsset = /\.(css|js|png|jpg|jpeg|webp|svg)$/i.test(file.name);

    if (!isHtml && !isAsset) {
      return NextResponse.json(
        { error: 'Invalid file type', message: 'Only HTML, CSS, JS, and image files are allowed' },
        { status: 400 }
      );
    }

    if (isHtml) {
      // Handle HTML file upload
      const fileContent = await file.text();
      
      // Sanitize slug: lowercase, replace spaces with hyphens, remove special chars
      let slug = slugParam || name;
      slug = slug
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check for slug uniqueness
      const existing = await prisma.htmlStorePage.findUnique({
        where: {
          storeId_slug: {
            storeId,
            slug,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Slug already exists', message: 'A page with this slug already exists' },
          { status: 409 }
        );
      }

      // Upload to Supabase Storage
      const fileName = `${slug}.html`;
      const { path, publicUrl } = await uploadHtmlFile(storeId, fileName, fileContent);

      // If this is set as home page, unset other home pages
      if (isHomePage) {
        await prisma.htmlStorePage.updateMany({
          where: { storeId, isHomePage: true },
          data: { isHomePage: false },
        });
      }

      // Create database record
      const page = await prisma.htmlStorePage.create({
        data: {
          storeId,
          name,
          slug,
          filePath: path,
          isHomePage,
          isPublished: false,
          metadata: { publicUrl },
        },
      });

      return NextResponse.json({
        success: true,
        page,
        publicUrl,
      });
    } else {
      // Handle asset file upload
      const buffer = Buffer.from(await file.arrayBuffer());
      const { path, publicUrl } = await uploadAssetFile(
        storeId,
        file.name,
        buffer,
        file.type
      );

      return NextResponse.json({
        success: true,
        type: 'asset',
        fileName: file.name,
        path,
        publicUrl,
      });
    }
  } catch (error: any) {
    console.error('HTML upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error.message },
      { status: 500 }
    );
  }
}
