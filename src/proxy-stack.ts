import * as path from 'path';
import { App, Arn, CfnOutput, Duration, Stack, StackProps } from 'monocdk';
import { AccessLogFormat, AuthorizationType, EndpointType, LambdaRestApi, LogGroupLogDestination, MethodLoggingLevel, RestApi } from 'monocdk/aws-apigateway';
import { ArnPrincipal, CompositePrincipal, PolicyStatement, Role } from 'monocdk/aws-iam';
import { LogGroup } from 'monocdk/aws-logs';
import { NodejsFunction } from 'monocdk/lib/aws-lambda-nodejs';

export interface ProxyStackProps extends StackProps {
  readonly targetGateway: {
    readonly invokeUrl: string;
  };
  readonly proxyGateway: {
    readonly stageName: string;
    readonly invokePrincipalARNs: string[];
  };
}

export class ProxyStack extends Stack {

  constructor(scope: App, id: string, props: ProxyStackProps) {
    super(scope, id, props);

    const proxyHandler = new NodejsFunction(this, 'ProxyHandler', {
      entry: path.join(__dirname, 'lambda/proxy.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      bundling: {
        nodeModules: [
          'aws-api-gateway-client',
        ],
      },
      environment: {
        INVOKE_URL: props.targetGateway.invokeUrl,
      },
      initialPolicy: [this.generateInvokePolicyToTarget(props.targetGateway.invokeUrl)],
    });

    const proxy = new LambdaRestApi(this, 'ProxyAPI', {
      handler: proxyHandler,
      options: {
        endpointConfiguration: {
          types: [
            EndpointType.REGIONAL,
          ],
        },
        deployOptions: {
          metricsEnabled: true,
          loggingLevel: MethodLoggingLevel.INFO,
          accessLogDestination: new LogGroupLogDestination(new LogGroup(this, 'GatewayLogs')),
          accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
          stageName: props.proxyGateway.stageName,
        },
        defaultMethodOptions: {
          authorizationType: AuthorizationType.IAM,
        },
      },
    });

    this.grantInvokeToProxy(proxy, props.proxyGateway.invokePrincipalARNs);
  }

  private generateInvokePolicyToTarget(invokeUrl: string): PolicyStatement {
    const endpoint = /(^https?:\/\/[^\/]+)/g.exec(invokeUrl)![1];
    const components = endpoint.replace('https://', '').replace('http://', '').split('.');
    const apiId = components[0];
    const targetRegion = components[2];
    return new PolicyStatement({
      actions: ['execute-api:Invoke'],
      resources: [Arn.format({
        service: 'execute-api',
        resource: apiId,
        sep: '/',
        resourceName: '*/*/*',
        region: targetRegion,
      }, this)],
    });
  }

  private grantInvokeToProxy(proxy: RestApi, arnPrincipals: string[]) {
    const proxyInvokeRole = new Role(this, 'ProxyInvokeRole', {
      assumedBy: new CompositePrincipal(...arnPrincipals.map(p => new ArnPrincipal(p))),
    });

    proxyInvokeRole.addToPolicy(new PolicyStatement({
      actions: ['execute-api:Invoke'],
      resources: [proxy.arnForExecuteApi()],
    }));

    new CfnOutput(this, 'ProxyInvokeRoleARN', {
      value: proxyInvokeRole.roleArn,
    });
  }
}