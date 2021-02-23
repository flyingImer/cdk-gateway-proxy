import '@monocdk-experiment/assert/jest';
import { App } from 'monocdk';
import { ProxyStack } from '../src/proxy-stack';

test('Snapshot', () => {
  const app = new App();
  const stack = new ProxyStack(app, 'test', {
    targetGateway: {
      invokeUrl: 'https://xxxxxxxx.execute-api.us-east-1.amazonaws.com/Beta',
    },
    proxyGateway: {
      stageName: 'test',
      invokePrincipalARNs: ['arn:aws:iam::123456789012:role/aloha'],
    },
  });

  expect(stack).not.toHaveResource('AWS::S3::Bucket');
  expect(app.synth().getStackArtifact(stack.artifactId).template).toMatchSnapshot();
});