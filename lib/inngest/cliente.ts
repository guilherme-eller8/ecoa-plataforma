import "server-only";
import { Inngest } from "inngest";
import { travarModoDev } from "@/lib/pipeline/env";

travarModoDev();

export const inngest = new Inngest({ id: "ecoa-plataforma" });
