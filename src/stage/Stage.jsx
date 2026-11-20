import ModelInspector from '../three/ModelInspector';

// The only module the main bundle lazy-loads for the 3D stage. Importing it
// pulls in the model, and HeadphoneModel preloads the glb at that moment.
export default function Stage({ colorId }) {
  return <ModelInspector colorId={colorId} />;
}
