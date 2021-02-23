// @ts-ignore
import apigClientFactory from 'aws-api-gateway-client';

const invokeUrl: string = process.env.INVOKE_URL ?? '';
const region: string = process.env.ENDPOINT_REGION ?? 'us-east-1';

const discardHeaderKeys = [
  'accept-encoding',
  'content-type',
  'Host',
  //   'User-Agent',
  'X-Amz-Date',
  'X-Amz-Security-Token',
  'X-Amzn-Trace-Id',
  'X-Forwarded-For',
  'X-Forwarded-Port',
  'X-Forwarded-Proto',
  'forwarded',
  'via',
  //   'x-forwarded-host',
  //   'x-original-uri',
  'accept',
//   'Accept-Encoding',
//   'Accept-Language',
//   'Cache-Control',
//   'pragma',
];

export async function handler(event: AWSLambda.APIGatewayProxyEvent): Promise<AWSLambda.APIGatewayProxyResult> {
  console.log(JSON.stringify(event, undefined, 2));

  const apigClient = apigClientFactory.newClient({
    invokeUrl,
    region,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });

  const pathParams: any = { ...event.pathParameters };
  delete pathParams.proxy; // clean up the proxy param
  console.log(`path params: ${JSON.stringify(pathParams)}`);

  const pathTemplate: string = event.path;
  console.log(`path template: ${pathTemplate}`);

  const method: string = event.httpMethod;
  console.log(`http method: ${method}`);

  const headers: any = { ...event.headers };
  discardHeaderKeys.forEach(k => delete headers[k]);
  console.log(`headers: ${JSON.stringify(headers)}`);

  const queryParams: any = event.queryStringParameters ? event.queryStringParameters : {};
  console.log(`query params: ${JSON.stringify(queryParams)}`);

  const additionalParams: any = queryParams ? { headers, queryParams } : { headers };
  console.log(`additional params: ${JSON.stringify(additionalParams)}`);

  const body: Object = (event.body === null) ? {} : JSON.parse(event.body);
  console.log(`body: ${JSON.stringify(body)}`);

  const ogResponse: any = await apigClient.invokeApi(pathParams, pathTemplate, method, {
    headers,
  }, body);
  console.log(ogResponse);
  const response: AWSLambda.APIGatewayProxyResult = {
    statusCode: ogResponse.status,
    headers: ogResponse.headers,
    body: ogResponse.data ? JSON.stringify(ogResponse.data) : '',
  };

  return response;
}
