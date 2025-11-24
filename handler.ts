import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.BUCKET_NAME!;
const CACHE_BUCKET = process.env.CACHE_BUCKET!;

// Helper to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const resize: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse path and query parameters
    const path = event.pathParameters?.proxy || event.path.replace('/resize/', '');
    const width = parseInt(event.queryStringParameters?.width || '0');
    const height = parseInt(event.queryStringParameters?.height || '0');

    // Validate parameters
    if (!path) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Image path is required' }),
      };
    }

    if (width <= 0 && height <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Width or height must be specified' }),
      };
    }

    if (width > 4000 || height > 4000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Maximum dimension is 4000px' }),
      };
    }

    // Generate cache key
    const cacheKey = `resized/${width}x${height}/${path}`;

    // Check if resized image exists in cache
    try {
      const cachedImage = await s3Client.send(
        new HeadObjectCommand({
          Bucket: CACHE_BUCKET,
          Key: cacheKey,
        })
      );

      if (cachedImage) {
        // Return cached image
        const cachedData = await s3Client.send(
          new GetObjectCommand({
            Bucket: CACHE_BUCKET,
            Key: cacheKey,
          })
        );

        const buffer = await streamToBuffer(cachedData.Body as Readable);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': cachedData.ContentType || 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000',
            'X-Cache': 'HIT',
          },
          body: buffer.toString('base64'),
          isBase64Encoded: true,
        };
      }
    } catch (error) {
      // Cache miss, continue to resize
    }

    // Get original image from S3
    let originalImage;
    try {
      originalImage = await s3Client.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: path,
        })
      );
    } catch (error) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Image not found' }),
      };
    }

    // Convert stream to buffer
    const imageBuffer = await streamToBuffer(originalImage.Body as Readable);

    // Detect image format
    const metadata = await sharp(imageBuffer).metadata();
    const format = metadata.format;

    // Validate supported formats
    if (!['jpeg', 'jpg', 'png', 'webp'].includes(format || '')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported image format. Supported: jpg, png, webp' }),
      };
    }

    // Resize image
    const resizeOptions: any = {
      fit: 'inside',
      withoutEnlargement: true,
    };

    if (width > 0) resizeOptions.width = width;
    if (height > 0) resizeOptions.height = height;

    const resizedBuffer = await sharp(imageBuffer)
      .resize(resizeOptions)
      .toBuffer();

    // Determine content type
    const contentType = format === 'png' ? 'image/png' : 'image/jpeg';

    // Save resized image to cache bucket
    await s3Client.send(
      new PutObjectCommand({
        Bucket: CACHE_BUCKET,
        Key: cacheKey,
        Body: resizedBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      })
    );

    // Return resized image
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'MISS',
      },
      body: resizedBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
    };
  }
};