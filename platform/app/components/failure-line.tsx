import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { failureParts, logName } from "@/lib/failure";

/** The reason in the words that act on it: no path in the sentence, the log file name beside it. */
export function FailureLine({ reason, className }: { reason: string; className: string }) {
  const { text, log } = failureParts(reason);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`${className} truncate`}>
          {text}
          {log ? <span className="text-muted-foreground"> · {logName(log)}</span> : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
