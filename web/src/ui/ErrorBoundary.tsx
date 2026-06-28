import { Component, type ReactNode } from "react";

interface Props {
  fallback: ReactNode;
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * Renders `fallback` if a child throws (e.g. the Mixamo FBX hasn't been synced
 * into public/models). Keeps the scene alive with a procedural avatar.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(
      "[CRISTAL] Character model failed to load, using fallback. Run `npm run sync-assets`.",
      error
    );
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
