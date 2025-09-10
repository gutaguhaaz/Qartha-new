import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  
  const getStatusClass = () => {
    switch (normalizedStatus) {
      case 'ok':
        return 'status-green';
      case 'revisión':
      case 'revision':
        return 'status-yellow';
      case 'falla':
        return 'status-red';
      case 'libre':
        return 'status-gray';
      case 'reservado':
        return 'status-blue';
      default:
        return 'status-gray';
    }
  };

  return (
    <span 
      className={cn(
        "px-2 py-1 text-xs rounded-full border",
        getStatusClass(),
        className
      )}
      data-testid={`status-${normalizedStatus}`}
    >
      {status}
    </span>
  );
}
