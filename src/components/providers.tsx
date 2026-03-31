'use client';

import { ReactFlowProvider } from '@xyflow/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
