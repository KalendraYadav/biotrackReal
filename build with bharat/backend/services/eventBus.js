import { EventEmitter } from 'events';

class BioTraceEventBus extends EventEmitter {}

export const eventBus = new BioTraceEventBus();

// Maximum listener limits for high-frequency GPS pings
eventBus.setMaxListeners(50);

export function emitVehiclePing(vehicleId, telemetry) {
  eventBus.emit('telemetry:ping', {
    vehicle_id: vehicleId,
    ...telemetry,
    broadcast_at: new Date().toISOString()
  });
}

export function emitRiskAlert(riskCase) {
  eventBus.emit('risk:alert', {
    case: riskCase,
    broadcast_at: new Date().toISOString()
  });
}

export function emitCustodyEvent(batchId, event, updatedBatchStatus) {
  eventBus.emit('custody:event', {
    batch_id: batchId,
    event,
    updated_batch_status: updatedBatchStatus,
    broadcast_at: new Date().toISOString()
  });
}

export default {
  eventBus,
  emitVehiclePing,
  emitRiskAlert,
  emitCustodyEvent
};
