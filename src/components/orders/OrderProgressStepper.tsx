import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderStatus, OrderTimeline, ORDER_PROGRESS_STEPS, ORDER_PROGRESS_LABELS } from '@/types/order';

interface OrderProgressStepperProps {
    currentStatus: OrderStatus;
    timeline: OrderTimeline[];
    className?: string;
}

// Map various statuses to their progress step equivalent
const mapStatusToProgressStep = (status: OrderStatus): OrderStatus => {
    const statusMapping: Record<string, OrderStatus> = {
        'confirmed': 'order_booked',
        'payment_pending': 'order_booked',
        'paid': 'order_booked',
        'packed': 'processing',
        'completed': 'delivered',
    };
    return statusMapping[status] || status;
};

// Check if order is rejected/cancelled
const isRejectedStatus = (status: OrderStatus): boolean => {
    return ['cancelled', 'rejected', 'returned', 'refunded'].includes(status);
};

export function OrderProgressStepper({ currentStatus, timeline, className }: OrderProgressStepperProps) {
    const isRejected = isRejectedStatus(currentStatus);
    const mappedCurrentStatus = mapStatusToProgressStep(currentStatus);

    // Find the index of current status in progress steps
    const currentStepIndex = ORDER_PROGRESS_STEPS.indexOf(mappedCurrentStatus);

    // For rejected orders, find the last completed step before rejection
    const getLastCompletedStepBeforeRejection = (): number => {
        if (!isRejected) return -1;

        // Look through timeline to find the last valid progress step
        for (let i = timeline.length - 1; i >= 0; i--) {
            const timelineStatus = mapStatusToProgressStep(timeline[i].status);
            const stepIndex = ORDER_PROGRESS_STEPS.indexOf(timelineStatus);
            if (stepIndex !== -1 && !isRejectedStatus(timeline[i].status)) {
                return stepIndex;
            }
        }
        return 0; // Default to first step
    };

    const rejectionStepIndex = isRejected ? getLastCompletedStepBeforeRejection() : -1;

    // Get date for a specific step from timeline
    const getStepDate = (stepStatus: OrderStatus): string | null => {
        // Check for exact match first
        const exactMatch = timeline.find(t => t.status === stepStatus);
        if (exactMatch) return exactMatch.timestamp;

        // Check for mapped statuses
        const mappedStatuses: Record<string, OrderStatus[]> = {
            'order_booked': ['confirmed', 'payment_pending', 'paid', 'order_booked'],
            'processing': ['processing', 'packed'],
            'shipped': ['shipped'],
            'delivered': ['delivered', 'completed'],
        };

        const possibleStatuses = mappedStatuses[stepStatus] || [stepStatus];
        for (const status of possibleStatuses) {
            const match = timeline.find(t => t.status === status);
            if (match) return match.timestamp;
        }

        return null;
    };

    // Determine step state
    const getStepState = (stepIndex: number): 'completed' | 'current' | 'pending' | 'rejected' => {
        if (isRejected) {
            if (stepIndex < rejectionStepIndex) return 'completed';
            if (stepIndex === rejectionStepIndex) return 'rejected';
            return 'pending';
        }

        if (stepIndex < currentStepIndex) return 'completed';
        if (stepIndex === currentStepIndex) return 'current';
        return 'pending';
    };

    return (
        <div className={cn('w-full py-4', className)}>
            {/* Progress Steps Container */}
            <div className="relative flex items-start justify-between">
                {ORDER_PROGRESS_STEPS.map((step, index) => {
                    const state = getStepState(index);
                    const stepDate = getStepDate(step);
                    const isLast = index === ORDER_PROGRESS_STEPS.length - 1;

                    return (
                        <div key={step} className="flex flex-col items-center flex-1 relative">
                            {/* Connector Line (before circle) */}
                            {index > 0 && (
                                <div
                                    className={cn(
                                        'absolute top-4 right-1/2 h-0.5 w-full -translate-y-1/2',
                                        state === 'completed' ? 'bg-green-500' :
                                            state === 'rejected' ? 'bg-red-500' :
                                                state === 'current' ? 'bg-gradient-to-r from-green-500 to-amber-400' :
                                                    'bg-gray-200'
                                    )}
                                    style={{ zIndex: 0 }}
                                />
                            )}

                            {/* Circle - REMOVED animate-pulse */}
                            <div
                                className={cn(
                                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                                    state === 'completed' && 'bg-green-500 border-green-500 text-white',
                                    state === 'current' && 'bg-amber-400 border-amber-400 text-white',
                                    state === 'pending' && 'bg-gray-100 border-gray-300 text-gray-400',
                                    state === 'rejected' && 'bg-red-500 border-red-500 text-white'
                                )}
                            >
                                {state === 'completed' && <Check className="h-4 w-4" />}
                                {state === 'current' && <div className="h-2 w-2 rounded-full bg-white" />}
                                {state === 'pending' && <div className="h-2 w-2 rounded-full bg-gray-300" />}
                                {state === 'rejected' && <X className="h-4 w-4" />}
                            </div>

                            {/* Label */}
                            <p
                                className={cn(
                                    'mt-2 text-xs font-medium text-center px-1',
                                    state === 'completed' && 'text-green-700',
                                    state === 'current' && 'text-amber-700',
                                    state === 'pending' && 'text-gray-400',
                                    state === 'rejected' && 'text-red-700'
                                )}
                            >
                                {ORDER_PROGRESS_LABELS[step]}
                            </p>

                            {/* Date */}
                            <p
                                className={cn(
                                    'text-[10px] text-center mt-0.5',
                                    state === 'completed' ? 'text-green-600' :
                                        state === 'rejected' ? 'text-red-600' :
                                            state === 'current' ? 'text-amber-600' :
                                                'text-gray-300'
                                )}
                            >
                                {state === 'rejected' ? 'REJECTED' :
                                    (state === 'completed' || state === 'current') && stepDate
                                        ? format(new Date(stepDate), 'MMM dd')
                                        : '—'}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-gray-600">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <span className="text-gray-600">Current</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-gray-200 border border-gray-300" />
                    <span className="text-gray-600">Pending</span>
                </div>
                {isRejected && (
                    <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-gray-600">Rejected</span>
                    </div>
                )}
            </div>
        </div>
    );
}