import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const AVATAR_CACHE_CONTROL = 'public, max-age=300';
const IMAGE_CACHE_CONTROL = 'public, max-age=300';
const INFOGRAPHIC_VARIANTS = {
  infographic: {
    folder: 'infographic',
    fileName: 'original',
  },
  infographicSolution: {
    folder: 'infographic',
    fileName: 'solution',
  },
};

function getBooleanEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`${name} is not configured`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function trimSlashes(value) {
  return value.replace(/^\/+|\/+$/g, '');
}

function getS3Client() {
  const config = {
    region: process.env.S3_REGION || "auto",
    forcePathStyle: getBooleanEnv('S3_FORCE_PATH_STYLE', true),
  };

  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
  }

  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    };
  }

  return new S3Client(config);
}

function avatarKey(entityType, entityId) {
  return `images/${entityType}/${entityId}/avatar/original.webp`;
}

function extensionFromContentType(contentType) {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}

function leiaInfographicKey(leiaId, variant, contentType = 'image/png') {
  const config = INFOGRAPHIC_VARIANTS[variant];
  if (!config) {
    const error = new Error(`Unsupported infographic variant: ${variant}`);
    error.statusCode = 500;
    throw error;
  }

  return `images/leias/${leiaId}/${config.folder}/${config.fileName}.${extensionFromContentType(contentType)}`;
}

function decodeImageDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string') {
    const error = new Error('Avatar image must be a data URL');
    error.statusCode = 502;
    throw error;
  }

  const match = dataUrl.match(/^data:(image\/webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    const error = new Error('Avatar generator must return a base64 webp data URL');
    error.statusCode = 502;
    throw error;
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function keyFromStoredImagePath(path) {
  if (typeof path !== 'string' || !path) {
    return null;
  }

  const value = trimSlashes(path);
  if (value.startsWith('images/')) {
    return value;
  }

  return null;
}

const keyFromAvatarPath = keyFromStoredImagePath;

function publicReadPolicy(bucket) {
  return JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/images/*`],
      },
    ],
  });
}

function bufferFromImageValue(image) {
  if (Buffer.isBuffer(image)) {
    return image;
  }

  if (Array.isArray(image)) {
    return Buffer.from(image);
  }

  if (image?.type === 'Buffer' && Array.isArray(image.data)) {
    return Buffer.from(image.data);
  }

  const error = new Error('Image generator must return binary image data');
  error.statusCode = 502;
  throw error;
}

function normalizeContentType(contentType) {
  if (typeof contentType === 'string' && contentType.startsWith('image/')) {
    return contentType;
  }

  return 'image/png';
}

class S3Service {
  constructor() {
    this.client = getS3Client();
    this.bucketReady = false;
  }

  async ensureBucket() {
    if (this.bucketReady) {
      return;
    }

    const bucket = requiredEnv('S3_BUCKET');

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error) {
      const statusCode = error?.$metadata?.httpStatusCode;
      if (statusCode && statusCode !== 404) {
        throw error;
      }
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    if (getBooleanEnv('S3_PUBLIC_READ')) {
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: bucket,
          Policy: publicReadPolicy(bucket),
        })
      );
    }

    this.bucketReady = true;
  }

  async deleteObject(key) {
    if (!key) {
      return;
    }

    await this.ensureBucket();
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: requiredEnv('S3_BUCKET'),
        Key: key,
      })
    );
  }

  async saveAvatar({ entityType, entityId, imageDataUrl, previousAvatar }) {
    await this.ensureBucket();

    const key = avatarKey(entityType, entityId);
    const previousKey = keyFromStoredImagePath(previousAvatar);
    const { contentType, buffer } = decodeImageDataUrl(imageDataUrl);

    const putParams = {
      Bucket: requiredEnv('S3_BUCKET'),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: AVATAR_CACHE_CONTROL,
    };

    if (getBooleanEnv('S3_PUBLIC_READ')) {
      putParams.ACL = 'public-read';
    }

    await this.client.send(new PutObjectCommand(putParams));

    return {
      key,
      previousKey,
      contentType,
      sizeBytes: buffer.length,
    };
  }

  async saveLeiaInfographic({ leiaId, variant, image, contentType, previousImage }) {
    await this.ensureBucket();

    const normalizedContentType = normalizeContentType(contentType);
    const key = leiaInfographicKey(leiaId, variant, normalizedContentType);
    const previousKey = keyFromStoredImagePath(previousImage);
    const buffer = bufferFromImageValue(image);

    const putParams = {
      Bucket: requiredEnv('S3_BUCKET'),
      Key: key,
      Body: buffer,
      ContentType: normalizedContentType,
      CacheControl: IMAGE_CACHE_CONTROL,
    };

    if (getBooleanEnv('S3_PUBLIC_READ')) {
      putParams.ACL = 'public-read';
    }

    await this.client.send(new PutObjectCommand(putParams));

    return {
      key,
      previousKey,
      contentType: normalizedContentType,
      sizeBytes: buffer.length,
    };
  }
}

export { avatarKey, keyFromAvatarPath, keyFromStoredImagePath, leiaInfographicKey };
export default new S3Service();
