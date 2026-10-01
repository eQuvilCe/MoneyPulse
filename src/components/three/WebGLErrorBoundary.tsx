"use client";

import { Component, ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

export default class WebGLErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    console.warn("[MoneyPulse] WebGL scene failed, using fallback", err);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
