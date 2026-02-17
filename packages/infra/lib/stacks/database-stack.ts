import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Duration, RemovalPolicy } from "aws-cdk-lib";

export interface DatabaseStackProps extends cdk.StackProps {
     vpc: ec2.IVpc;
}

export class DatabaseStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: DatabaseStackProps) {
        super(scope, id, props);

        const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
            vpc: props.vpc,
            description: "RDS PostgreSQL security group",
            allowAllOutbound: true,
        });

        const db = new rds.DatabaseInstance(this, "PostgresDb", {
            vpc: props.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            securityGroups: [dbSecurityGroup],
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_17_6,
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T4G,
                ec2.InstanceSize.MICRO
            ),
            multiAz: false,
            allocatedStorage: 20,
            storageType: rds.StorageType.GP2,
            backupRetention: Duration.days(1),
            credentials: rds.Credentials.fromGeneratedSecret("postgres"),
            databaseName: "appdb",
            deletionProtection: false,
            removalPolicy: RemovalPolicy.DESTROY,
            deleteAutomatedBackups: true,
            publiclyAccessible: false,
        });
    }
}