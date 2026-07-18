// React Three Fiber v8 augments the *global* JSX namespace, but @types/react 19
// resolves intrinsic elements from React.JSX. Without this bridge, <mesh>,
// <meshStandardMaterial>, <ambientLight>, etc. fail with TS2339.
import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
