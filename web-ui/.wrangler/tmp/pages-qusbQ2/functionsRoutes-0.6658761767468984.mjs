import { onRequest as __api_hello_ts_onRequest } from "/home/harsh/Cinema/web-ui/functions/api/hello.ts"

export const routes = [
    {
      routePath: "/api/hello",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_hello_ts_onRequest],
    },
  ]