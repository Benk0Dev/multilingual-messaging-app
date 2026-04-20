import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";

export class StorageStack extends cdk.NestedStack {
    public readonly s3Bucket: s3.Bucket;

    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        this.s3Bucket = new s3.Bucket(this, "S3Bucket", {
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
            publicReadAccess: true,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.GET,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                    exposedHeaders: ["ETag"],
                    maxAge: 3000,
                },
            ],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true, // for prototype purposes
        });

        new cdk.CfnOutput(this, "S3BucketName", {
            value: this.s3Bucket.bucketName,
        });
    }
}