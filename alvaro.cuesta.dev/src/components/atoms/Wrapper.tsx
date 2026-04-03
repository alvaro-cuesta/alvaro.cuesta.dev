type WrapperProps = {
  wrapper: (children: React.ReactNode) => JSX.Element;
  children: React.ReactNode;
};

export function Wrapper({ wrapper, children }: WrapperProps) {
  return wrapper(children);
}
