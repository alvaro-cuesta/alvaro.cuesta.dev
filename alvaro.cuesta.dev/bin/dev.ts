import { startXenonExpressDevApp } from "xenon-ssg-express/dev";
import { makeSite } from "../src/site.tsx";

startXenonExpressDevApp(makeSite());
