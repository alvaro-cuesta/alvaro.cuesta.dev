import { startXenonExpressDevApp } from "xenon-ssg-express/src/dev";
import { makeSite } from "../src/site";

startXenonExpressDevApp(makeSite());
