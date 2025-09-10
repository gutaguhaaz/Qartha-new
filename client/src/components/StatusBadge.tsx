import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  const statusClassMap: Record<string, string> = {
    ok: 'status-green',
    "revisión": 'status-yellow',
    revision: 'status-yellow',
    review: 'status-yellow',
    falla: 'status-red',
    fault: 'status-red',
    libre: 'status-gray',
    available: 'status-gray',
    reservado: 'status-blue',
    reserved: 'status-blue'
  };

  const statusTextMap: Record<string, string> = {
    ok: 'OK',
    "revisión": 'Under Review',
    revision: 'Under Review',
    review: 'Under Review',
    falla: 'Critical Failure',
    fault: 'Critical Failure',
    libre: 'Available',
    available: 'Available',
    reservado: 'Reserved',
    reserved: 'Reserved'
  };

  const getStatusClass = () => statusClassMap[normalizedStatus] || 'status-gray';
  const displayStatus = statusTextMap[normalizedStatus] || status;

  return (
    <span 
      className={cn(
        "px-2 py-1 text-xs rounded-full border",
        getStatusClass(),
        className
      )}
      data-testid={`status-${normalizedStatus}`}
    >
      {displayStatus}
    </span>
  );
}
