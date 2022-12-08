#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EmrEksAppStack } from '../lib/emr-eks-app-stack';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;



new EmrEksAppStack(app, 'EmrEksAppStack', {
    env: { account, region }
});
