#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { EmrEksAppStack } from '../lib/emr-eks-app-stack';

const app = new cdk.App();
new EmrEksAppStack(app, 'EmrEksAppStack');
