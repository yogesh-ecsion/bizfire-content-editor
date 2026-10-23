"use client";

import { RequestFlowViewer } from "@mukul-escion/request-flow/viewer";

export default function RequestFlowPage() {
  return <RequestFlowViewer endpoint="/api/request-flow" />;
}
