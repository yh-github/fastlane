import type { PlayerState } from '../engine/gameState';
import type { JobDef, ItemDef, EducationDef } from '../engine/dataLoader';

interface InteractionProps {
  player: PlayerState;
  onAction: (actionPayload: any) => void;
}

export function JobBoard({ player, onAction, availableJobs }: InteractionProps & { availableJobs: JobDef[] }) {
  return (
    <div className="interaction-panel">
      <h3>Job Board</h3>
      {availableJobs.map(job => {
        const isCurrentJob = player.currentJobId === job.id;
        return (
          <div key={job.id} className="interaction-item" style={{ marginBottom: '10px', padding: '5px', border: '1px solid #444' }}>
            <strong>{job.title}</strong> - ${job.baseWage}/hr
            <div style={{ fontSize: '12px' }}>
              Reqs: Exp {job.requirements.experience}, Dep {job.requirements.dependability}
              {job.requirements.degrees.length > 0 && `, Degree: ${job.requirements.degrees.join(', ')}`}
            </div>
            <div style={{ marginTop: '5px' }}>
              {isCurrentJob ? (
                <button onClick={() => onAction({ type: 'work', jobId: job.id })} disabled={player.hoursRemaining < 1}>
                  Work Shift (up to 6h)
                </button>
              ) : (
                <button onClick={() => onAction({ type: 'apply', jobId: job.id })} disabled={player.hoursRemaining < 4}>
                  Apply (4h)
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StoreFront({ player, onAction, availableItems }: InteractionProps & { availableItems: ItemDef[] }) {
  return (
    <div className="interaction-panel">
      <h3>Storefront</h3>
      {availableItems.map(item => (
        <div key={item.id} className="interaction-item" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>{item.name} (${item.basePrice})</span>
          <button onClick={() => onAction({ type: 'buy', itemId: item.id })} disabled={player.money < item.basePrice}>
            Buy
          </button>
        </div>
      ))}
    </div>
  );
}

export function UniversityRegistry({ player, onAction, availableDegrees }: InteractionProps & { availableDegrees: EducationDef[] }) {
  const currentDegree = availableDegrees.find(d => d.id === player.currentDegreeId);

  return (
    <div className="interaction-panel">
      <h3>University Registry</h3>
      {currentDegree ? (
        <div style={{ marginBottom: '15px', padding: '10px', border: '1px solid #4aa' }}>
          <strong>Currently Enrolled:</strong> {currentDegree.name}
          <div>Progress: {player.lessonsCompleted} / {currentDegree.lessonsRequired}</div>
          <button style={{ marginTop: '5px' }} onClick={() => onAction({ type: 'study', degreeId: currentDegree.id })} disabled={player.hoursRemaining < 6}>
            Study (6h)
          </button>
        </div>
      ) : (
        <p>You are not currently enrolled.</p>
      )}

      <h4>Available Degrees</h4>
      {availableDegrees.map(deg => {
        const hasDegree = player.degrees.includes(deg.id);
        if (hasDegree) return null;

        return (
          <div key={deg.id} className="interaction-item" style={{ marginBottom: '10px', padding: '5px', border: '1px solid #444' }}>
            <strong>{deg.name}</strong> - Tuition: ${deg.baseTuitionFee}
            <div style={{ fontSize: '12px' }}>Lessons: {deg.lessonsRequired}</div>
            {deg.prerequisites.length > 0 && <div style={{ fontSize: '12px' }}>Prereqs: {deg.prerequisites.join(', ')}</div>}
            {player.currentDegreeId !== deg.id && (
              <button style={{ marginTop: '5px' }} onClick={() => onAction({ type: 'enroll', degreeId: deg.id })} disabled={player.money < deg.baseTuitionFee}>
                Enroll
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
