import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import productImage from "@/assets/studio-product.jpg";

function Website({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const image = useTexture(productImage);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.Texture();
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    ctx.fillStyle = color("--showcase-paper"); ctx.fillRect(0, 0, 1600, 960);
    ctx.fillStyle = color("--showcase-ink"); ctx.font = "bold 24px sans-serif";
    ctx.fillText("COMMON GROUND", 65, 65);
    ctx.font = "18px sans-serif"; ctx.fillText("Objects     Our studio     Journal", 1060, 65);
    ctx.fillRect(65, 98, 1470, 1);
    ctx.font = "bold 86px sans-serif"; ctx.fillText("Less noise.", 65, 213); ctx.fillText("More presence.", 65, 308);
    ctx.font = "22px sans-serif"; ctx.fillText("Thoughtful objects for everyday living.", 900, 215);
    ctx.fillStyle = color("--showcase-accent"); ctx.fillRect(900, 248, 235, 58);
    ctx.fillStyle = color("--showcase-paper"); ctx.font = "20px sans-serif"; ctx.fillText("Explore collection  ↗", 922, 284);
    ctx.drawImage(image.image as CanvasImageSource, 65, 350, 1470, 570);
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [image]);
  useEffect(() => () => texture.dispose(), [texture]);
  const colors = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    return { paper: css.getPropertyValue("--showcase-paper").trim(), ink: css.getPropertyValue("--showcase-ink").trim(), accent: css.getPropertyValue("--showcase-accent").trim() };
  }, []);
  useFrame(({ pointer, clock }, dt) => {
    if (!group.current) return;
    const k = 1 - Math.exp(-4 * Math.min(dt, 0.05));
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -0.12 - (reduced ? 0 : pointer.y * 0.07), k);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -0.12 + (reduced ? 0 : pointer.x * 0.14), k);
    group.current.position.y = reduced ? 0 : Math.sin(clock.elapsedTime * 0.8) * 0.045;
  });
  return <group ref={group} rotation={[-0.12, -0.12, 0.025]}>
    <RoundedBox args={[7.7, 4.95, 0.12]} radius={0.06} position={[0.10, -0.09, -0.13]}><meshStandardMaterial color={colors.accent}/></RoundedBox>
    <RoundedBox args={[7.7, 4.95, 0.12]} radius={0.06}><meshStandardMaterial color={colors.paper}/></RoundedBox>
    <mesh position={[0, -0.13, 0.065]}><planeGeometry args={[7.5, 4.5]}/><meshBasicMaterial map={texture}/></mesh>
    {[-3.47, -3.3, -3.13].map((x) => <mesh key={x} position={[x, 2.29, 0.075]}><circleGeometry args={[0.035, 16]}/><meshBasicMaterial color={colors.ink}/></mesh>)}
    <mesh position={[0, 2.29, 0.07]}><planeGeometry args={[2.3, 0.12]}/><meshBasicMaterial color={colors.paper}/></mesh>
  </group>;
}

export default function HeroScene() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReduced(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0.2, 9.2], fov: 40 }} gl={{ alpha: true }} aria-label="Animated website design">
    <ambientLight intensity={2}/><directionalLight position={[0, 5, 7]} intensity={2}/><Website reduced={reduced}/>
  </Canvas>;
}
