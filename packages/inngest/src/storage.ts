import fs from "fs";
import path from "path";

declare const process: any;

export interface StorageProvider {
  uploadFile(key: string, body: string | Buffer, contentType: string): Promise<string>;
}

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "apps/web/public/uploads");
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (err) {
        this.baseDir = path.resolve(process.cwd(), ".uploads");
        if (!fs.existsSync(this.baseDir)) {
          fs.mkdirSync(this.baseDir, { recursive: true });
        }
      }
    }
  }

  async uploadFile(key: string, body: string | Buffer, _contentType: string): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, body);
    return `/uploads/${key}`;
  }
}

class S3StorageProvider implements StorageProvider {
  private bucket: string;

  constructor() {
    this.bucket = process.env.AWS_S3_BUCKET || "";
  }

  async uploadFile(key: string, body: string | Buffer, contentType: string): Promise<string> {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });

      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );

      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    } catch (err) {
      console.error("S3 upload failed, falling back to local file storage: ", err);
      const fallback = new LocalStorageProvider();
      return fallback.uploadFile(key, body, contentType);
    }
  }
}

export function getStorageProvider(): StorageProvider {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET) {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
}
