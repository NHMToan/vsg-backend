import { ReadStream } from "typeorm/platform/PlatformTools";

export type File = {
  filename: string;
  mimetype: string;
  encoding: string;
  stream?: ReadStream;
};

export type UploadedFileResponse = {
  filename: string;
  mimetype: string;
  encoding: string;
  url: string;
};

export interface IUploader {
  singleFileUploadResolver: (
    parent: any,
    { file }: { file: Promise<File> }
  ) => Promise<UploadedFileResponse>;
}
