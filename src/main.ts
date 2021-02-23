import { App } from 'monocdk';
import { ProxyStack } from './proxy-stack';

const app = new App();

new ProxyStack(app, `DevProxyStack-${process.env.USER}`, {
  targetGateway: {
    invokeUrl: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/Beta',
  },
  proxyGateway: {
    stageName: `${process.env.USER || 'default-user'}-devo`,
    invokePrincipalARNs: [
      'arn:aws:iam::123456789012:role/aloha',
    ],
  },
  env: {
    region: 'us-west-2',
  },
});

app.synth();