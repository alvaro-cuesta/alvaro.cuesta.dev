import cx from "classnames";

type IconSize = 0.33 | 2 | 3 | 4 | 5;

type IconPull = "left" | "right";

type IconAnimation = "spin" | "pulse";

type IconRotation = 90 | 180 | 270;

type IconFlip = "horizontal" | "vertical";

// TODO: fa-stack-1x fa-stack-2x (fa-stack in parent)

type IconProps = {
  collection?:
    | "fa" // ??
    | "fas" // fa-solid
    | "fab"; // fa-brands
  name: string;
  size?: IconSize;
  fixedWidth?: boolean;
  /** Needs `fa-ul` class in parent */
  listItem?: boolean;
  bordered?: boolean;
  pull?: IconPull;
  animation?: IconAnimation;
  rotation?: IconRotation;
  flip?: IconFlip;
  className?: string;
} & (
  | {
      "aria-hidden": "true" | true;
    }
  | {
      "aria-hidden"?: "false" | false | never;
      title: string;
    }
  | {
      "aria-hidden"?: "false" | false | never;
      "aria-label": string;
    }
);

export const Icon: React.FC<IconProps> = ({
  collection = "fa",
  name,
  className,
  size = 1,
  fixedWidth = false,
  listItem = false,
  bordered = false,
  pull,
  animation,
  rotation,
  flip,
  ...restProps
}) => (
  <span
    className={cx(className, collection, `fa-${name}`, fixedWidth && "fa-fw", {
      // `size` prop
      "fa-lg": size === 0.33,
      // "fa-1x": size === 1, // This class doesn't actually exist
      "fa-2x": size === 2,
      "fa-3x": size === 3,
      "fa-4x": size === 4,
      "fa-5x": size === 5,
      //
      "fa-fw": fixedWidth,
      "fa-li": listItem,
      "fa-border": bordered,
      // `pull` prop
      "fa-pull-left": pull === "left",
      "fa-pull-right": pull === "right",
      // `animation` prop
      "fa-spin": animation === "spin",
      "fa-pulse": animation === "pulse",
      // `rotation` prop
      "fa-rotate-90": rotation === 90,
      "fa-rotate-180": rotation === 180,
      "fa-rotate-270": rotation === 270,
      // `flip` prop
      "fa-flip-horizontal": flip === "horizontal",
      "fa-flip-vertical": flip === "vertical",
    })}
    {...restProps}
  />
);
