import type { FormatterName } from "formatly";

export interface DetectionMeta {
	excludedWorkflowFiles: number;
	files: string[];
	formatter: FormatterName | null;
	headSha: string;
	pullRequestNumber: number;
}

export type Mode = "apply" | "detect" | "offer" | "resolve";
