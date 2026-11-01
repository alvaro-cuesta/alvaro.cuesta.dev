import { Suspense, type JSX, type ReactNode } from "react";
import {
  LinkProvider,
  type LinkProviderProps,
} from "./generate/LinkContext.tsx";

type RootProps = {
  children: ReactNode;
  addLink: LinkProviderProps["addLink"];
  basepath: LinkProviderProps["basepath"];
};

export function Root({ children, addLink, basepath }: RootProps): JSX.Element {
  return (
    // A top-level suspense will help in case the user tries to use suspense features while not
    // providing their own suspense boundary
    <Suspense>
      <LinkProvider addLink={addLink} basepath={basepath}>
        {children}
      </LinkProvider>
    </Suspense>
  );
}
