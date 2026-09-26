import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Google Translate / React DOM Stability Patch
// This prevents React from crashing when Google Translate modifies DOM nodes
const originalRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    return child;
  }
  return originalRemoveChild.call(this, child);
};

const originalInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
  if (referenceNode && referenceNode.parentNode !== this) {
    return newNode;
  }
  return originalInsertBefore.call(this, newNode, referenceNode);
};

createRoot(document.getElementById("root")!).render(<App />);
