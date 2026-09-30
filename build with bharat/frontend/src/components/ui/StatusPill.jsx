import React from 'react';
import { Badge } from './Badge';
import { 
  Clock, 
  Truck, 
  CheckCircle2, 
  Flame, 
  ShieldCheck, 
  AlertTriangle, 
  Scale, 
  PackageCheck,
  FileCheck
} from 'lucide-react';

const STATUS_CONFIG = {
  // Batch Lifecycle
  GENERATED: { label: 'Generated', variant: 'warning', icon: Clock },
  COLLECTED: { label: 'Collected', variant: 'info', icon: PackageCheck },
  IN_TRANSIT: { label: 'In Transit', variant: 'primary', icon: Truck },
  RECEIVED: { label: 'Received (CBWTF)', variant: 'info', icon: Scale },
  TREATED: { label: 'Treated', variant: 'success', icon: Flame },
  DISPOSED: { label: 'Disposed & Audited', variant: 'success', icon: ShieldCheck },

  // Risk / Inspection Case Statuses
  ASSIGNED: { label: 'Assigned', variant: 'warning', icon: Clock },
  UNDER_INVESTIGATION: { label: 'Under Investigation', variant: 'warning', icon: AlertTriangle },
  RESOLVED: { label: 'Resolved & Closed', variant: 'success', icon: CheckCircle2 }
};

const CATEGORY_CONFIG = {
  YELLOW: { label: 'Yellow (Anatomical)', className: 'bg-amber-100 text-amber-950 border-amber-300' },
  RED: { label: 'Red (Plastics/Recyclable)', className: 'bg-rose-100 text-rose-950 border-rose-300' },
  WHITE: { label: 'White (Sharps/Needles)', className: 'bg-steel-200 text-steel-950 border-steel-400' },
  BLUE: { label: 'Blue (Glassware/Metallic)', className: 'bg-sky-100 text-sky-950 border-sky-300' }
};

export function StatusPill({ status, size = 'md', className = '' }) {
  const normalized = status ? String(status).toUpperCase() : 'UNKNOWN';
  const config = STATUS_CONFIG[normalized] || {
    label: status || 'Unknown',
    variant: 'neutral',
    icon: null
  };

  return (
    <Badge
      variant={config.variant}
      size={size}
      dot
      icon={config.icon}
      className={className}
    >
      {config.label}
    </Badge>
  );
}

export function CategoryBadge({ category, size = 'sm', className = '' }) {
  const normalized = category ? String(category).toUpperCase() : 'UNKNOWN';
  const config = CATEGORY_CONFIG[normalized] || {
    label: category || 'General',
    className: 'bg-steel-100 text-steel-800 border-steel-200'
  };

  return (
    <span
      className={`inline-flex items-center text-[11px] font-mono font-medium px-2 py-0.5 rounded border whitespace-nowrap ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default StatusPill;
