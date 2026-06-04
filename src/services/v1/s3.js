import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const DEFAULT_REGION = 'us-east-1';
const AVATAR_CACHE_CONTROL = 'public, max-age=300';

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
    region: process.env.S3_REGION || DEFAULT_REGION,
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

function keyFromAvatarPath(path) {
  if (typeof path !== 'string' || !path) {
    return null;
  }

  const value = trimSlashes(path);
  if (value.startsWith('images/')) {
    return value;
  }

  return null;
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
    const previousKey = keyFromAvatarPath(previousAvatar);
    const { contentType, buffer } = decodeImageDataUrl(imageDataUrl);

    if (previousKey === key) {
      await this.deleteObject(previousKey);
    }

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
}

export { avatarKey, keyFromAvatarPath };
export default new S3Service();
