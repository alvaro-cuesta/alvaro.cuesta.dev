import { startXenonExpressDevApp } from "@xenon-ssg/express/dev";

// Imported only once the server listens: loading the site (and every MDX page)
// takes a while, and early requests can wait for it instead of failing.
await startXenonExpressDevApp(async () => {
  const { makeSite } = await import("../src/site.tsx");
  return makeSite();
});
