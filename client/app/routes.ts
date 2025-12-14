import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("./layouts/authenticated.tsx", [
    route("recordings", "./pages/recordings.tsx"),
  ]),
] satisfies RouteConfig;
