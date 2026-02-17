import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { DatabaseStack } from "./stacks/database-stack"

export class InfraStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, "AppVpc", {
            maxAzs: 2,
            natGateways: 0, // keep cost low (NAT gateways cost money)
            subnetConfiguration: [
                { name: "public", subnetType: ec2.SubnetType.PUBLIC },
                { name: "isolated", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            ],
        });

        const db = new DatabaseStack(this, "Database", { vpc });
    }
}
