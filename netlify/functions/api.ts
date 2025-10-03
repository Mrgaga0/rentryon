import type { Handler } from "@netlify/functions";
import serverlessHttp from "serverless-http";
import { createExpressApp } from "../../server/app";

const serverlessHandlerPromise = createExpressApp({ rethrowErrors: false }).then((app) =>
  serverlessHttp(app, {
    basePath: "/.netlify/functions/api",
    binary: ["multipart/form-data", "application/octet-stream", "image/*"],
  }),
);

export const handler: Handler = async (event, context) => {
  const proxy = await serverlessHandlerPromise;
  return proxy(event, context);
};
