import * as cdk from 'aws-cdk-lib';
import * as EmrEksApp from '../lib/emr-eks-app-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new EmrEksApp.EmrEksAppStack(app, 'MyTestStack');
    
});
