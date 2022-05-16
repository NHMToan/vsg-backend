import * as AWS from "aws-sdk";
import { FileUpload } from "graphql-upload";
import { v4 as uuid } from "uuid";
export class S3Service {
  AWS_S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;
  s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_S3_BUCKET_REGION,
  });

  async uploadFile(file: FileUpload) {
    const { filename, createReadStream, mimetype } = await file;

    return await this.s3_upload(
      createReadStream(),
      this.AWS_S3_BUCKET,
      filename,
      mimetype
    );
  }

  async s3_upload(file: any, bucket: any, name: any, mimetype: any) {
    const params = {
      Bucket: bucket,
      Key: `${uuid()}-${name}`,
      Body: file,
      ACL: "public-read",
      ContentType: mimetype,
    };

    try {
      let s3Response = await this.s3.upload(params).promise();
      return s3Response;
    } catch (e) {
      throw e;
    }
  }
}
