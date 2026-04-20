import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { requiredEnv } from "../utils/requiredEnv";

const bucketName = requiredEnv("S3_BUCKET");
const region = requiredEnv("AWS_REGION");

const s3Client = new S3Client({ region });

const UPLOAD_URL_EXPIRY_SECONDS = 300; // 5 minutes

type ImageExtension = "jpg" | "jpeg" | "png" | "webp";

const CONTENT_TYPE_BY_EXTENSION: Record<ImageExtension, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
};

export async function generateProfilePictureUploadUrl(input: {
    userId: string;
    extension: ImageExtension;
}): Promise<{
    uploadUrl: string;
    publicUrl: string;
    expiresIn: number;
}> {
    const key = `users/${input.userId}/profile/${uuidv4()}.${input.extension}`;
    const contentType = CONTENT_TYPE_BY_EXTENSION[input.extension];

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
    });

    // Bucket is public-read so the object URL works directly once uploaded
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return {
        uploadUrl,
        publicUrl,
        expiresIn: UPLOAD_URL_EXPIRY_SECONDS,
    };
}