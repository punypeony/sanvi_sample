import { Component } from 'react';
import { Environment, Lightformer } from '@react-three/drei';

export class SafeBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    console.warn('Scene part failed to load:', err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Studio-style reflections built in code (no HDR download needed).
export function DarkStudio() {
  return (
    <Environment resolution={256} background={false}>
      <color attach="background" args={['#000000']} />
      <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
      <Lightformer form="rect" intensity={3} color="#ffffff" position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[10, 1.2, 1]} />
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[6, 0.5, -3]} rotation-y={-Math.PI / 2} scale={[10, 1, 1]} />
      <Lightformer form="ring" intensity={0.6} position={[0, 1, 6]} scale={4} />
    </Environment>
  );
}
