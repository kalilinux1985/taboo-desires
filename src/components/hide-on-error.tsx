"use client";

import { Component, type ReactNode } from "react";

/**
 * Shows `fallback` (nothing by default) instead of breaking the page when a
 * child fails, e.g. while the deployed backend is older than the app.
 */
export default class HideOnError extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
