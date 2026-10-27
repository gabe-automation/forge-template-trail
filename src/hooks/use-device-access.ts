import { useEffect, useState } from "react";
import { canEditOnDevice, MOBILE_MAX_WIDTH } from "@/lib/deviceAccess";

export function useDeviceAccess(role: string = "editor") {
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const update = () => setWidth(window.innerWidth);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return { isMobile: width !== undefined && width <= MOBILE_MAX_WIDTH, readOnly: !canEditOnDevice(width, role) };
}