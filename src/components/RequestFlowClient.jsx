"use client";

import axios from "axios";
import { setupRequestFlow } from "@mukul-escion/request-flow/browser";

setupRequestFlow({
    serviceName: "eSeaGrant-RFP-App-browser",
    client: axios,
    targetService: "api",
    enabled: process.env.NEXT_PUBLIC_REQUEST_FLOW_ENABLED === "true"
});

export default function RequestFlowClient() {
    return null;
}