"use client";
import { toast } from "sonner";

export function notifyAnonymousAiLimit(response: Response) {
  if (!response.ok) return;
  if (response.headers.get("X-Anonymous-AI-Global-Remaining") === "0") {
    toast.info("Why have the judges used 100 API calls already? Chill on the wallet we haven't won yet", { duration: 15000 });
  } else if (response.headers.get("X-Anonymous-AI-Remaining") === "0") {
    toast.info("You’ve used all 3 AI uses available in anonymous mode.", { duration: 10000 });
  }
}
